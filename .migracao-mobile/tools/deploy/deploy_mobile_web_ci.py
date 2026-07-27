"""Deploy mobile.letras.cloud (Expo web export pós-processado) — versão CI.

Mesma lógica do script Paramiko local (Sandbox Web/artifacts), com
credenciais via ambiente (GitHub Actions):

  DEPLOY_HOST      IP/host do VPS
  DEPLOY_USER      usuário SSH
  DEPLOY_PASSWORD  senha SSH

Pré-requisito: apps/mobile-app/dist-fresh-build já exportado (o workflow
roda `expo export` antes).

Sequência:
 1. Pós-processo: clona dist-fresh-build em dist-deploy e reescreve refs
    /_expo/ -> /mobile-expo/, /assets/ -> /mobile-assets/,
    /favicon.ico -> /mobile/favicon.ico; injeta CSS user-select:none.
 2. Upload SFTP para /srv/letras-mobile-web/_releases/<TS>-mobile-web/
 3. Backup das pastas atuais (mobile, mobile-expo, mobile-assets)
 4. Promoção da release
 5. Smoke tests
"""
import os
import re
import shutil
import sys
import time
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASSWORD", "")

if not HOST or not PASS:
    print("[FATAL] DEPLOY_HOST/DEPLOY_PASSWORD não definidos no ambiente.")
    sys.exit(2)

TS = time.strftime("%Y%m%d-%H%M%S")
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOCAL_SOURCE = os.path.join(REPO_ROOT, "apps", "mobile-app", "dist-fresh-build")
LOCAL_DEPLOY = os.path.join(REPO_ROOT, "apps", "mobile-app", "dist-deploy")
REMOTE_BASE = "/srv/letras-mobile-web"
REMOTE_RELEASE_DIR = f"{REMOTE_BASE}/_releases/{TS}-mobile-web"

REWRITE_HTML = [
    (re.compile(rb"/_expo/"), b"/mobile-expo/"),
    (re.compile(rb'"/favicon\.ico"'), b'"/mobile/favicon.ico"'),
]
REWRITE_JS = [
    (re.compile(rb'"/assets/'), b'"/mobile-assets/'),
    (re.compile(rb"'/assets/"), b"'/mobile-assets/"),
    (re.compile(rb'"/_expo/'), b'"/mobile-expo/'),
    (re.compile(rb"'/_expo/"), b"'/mobile-expo/"),
]

CSS_INJECT = b"""
<style id="letras-no-select">
  *{-webkit-user-select:none;user-select:none;cursor:default;-webkit-touch-callout:none}
  input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text;cursor:text}
</style>"""


def run(cli, cmd, *, label=None, fatal=True, timeout=60):
    if label:
        print(f"\n----- {label} -----")
    print(f"$ {cmd}")
    _, out, err = cli.exec_command(cmd, timeout=timeout)
    o = out.read().decode("utf-8", "replace").rstrip()
    e = err.read().decode("utf-8", "replace").rstrip()
    rc = out.channel.recv_exit_status()
    if o:
        print(o)
    if e:
        print(f"[stderr] {e}")
    if rc != 0:
        msg = f"[rc={rc}] {cmd}"
        if fatal:
            raise RuntimeError(msg)
        print(f"[WARN] {msg}")
    return rc, o


def post_process():
    if os.path.isdir(LOCAL_DEPLOY):
        shutil.rmtree(LOCAL_DEPLOY)
    shutil.copytree(LOCAL_SOURCE, LOCAL_DEPLOY)
    print(f"== copiou {LOCAL_SOURCE} -> {LOCAL_DEPLOY}")

    rewritten = 0
    for root, _, files in os.walk(LOCAL_DEPLOY):
        for fn in files:
            path = os.path.join(root, fn)
            ext = fn.lower().rsplit(".", 1)[-1] if "." in fn else ""
            if ext == "html":
                rules = REWRITE_HTML + REWRITE_JS
            elif ext in ("js", "json", "css", "map"):
                rules = REWRITE_JS
            else:
                continue
            with open(path, "rb") as fh:
                data = fh.read()
            new = data
            for pat, rep in rules:
                new = pat.sub(rep, new)
            if new != data:
                with open(path, "wb") as fh:
                    fh.write(new)
                rewritten += 1
    print(f"== {rewritten} arquivo(s) reescritos")

    idx_path = os.path.join(LOCAL_DEPLOY, "index.html")
    with open(idx_path, "rb") as fh:
        html = fh.read()
    html = html.replace(b"</head>", CSS_INJECT + b"</head>", 1)
    with open(idx_path, "wb") as fh:
        fh.write(html)

    with open(idx_path, "rb") as fh:
        html = fh.read()
    assert b"/mobile-expo/" in html, "index.html nao tem ref /mobile-expo/"
    assert b"/mobile/favicon.ico" in html, "index.html nao tem ref /mobile/favicon.ico"
    assert b"letras-no-select" in html, "index.html nao tem CSS user-select"
    print("== sanity check index.html OK")


def sftp_upload_dir(sftp, local_dir, remote_dir):
    for root, _dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir).replace("\\", "/")
        target = remote_dir if rel == "." else f"{remote_dir}/{rel}"
        try:
            sftp.stat(target)
        except IOError:
            parts = target.split("/")
            cur = ""
            for p in parts:
                if not p:
                    continue
                cur = f"{cur}/{p}"
                try:
                    sftp.stat(cur)
                except IOError:
                    sftp.mkdir(cur)
        for fn in files:
            sftp.put(os.path.join(root, fn), f"{target}/{fn}")
    print(f"== upload concluído em {remote_dir}")


def main():
    if not os.path.isdir(LOCAL_SOURCE):
        print(f"[FATAL] dist-fresh-build não encontrado: {LOCAL_SOURCE}")
        sys.exit(2)
    post_process()

    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, username=USER, password=PASS, timeout=30, allow_agent=False, look_for_keys=False)
    print(f"== conectado em {HOST} ==")

    run(cli, f"mkdir -p {REMOTE_RELEASE_DIR}", label="mkdir release")

    print(f"\n----- SFTP upload -> {REMOTE_RELEASE_DIR} -----")
    sftp = cli.open_sftp()
    try:
        sftp_upload_dir(sftp, LOCAL_DEPLOY, REMOTE_RELEASE_DIR)
    finally:
        sftp.close()

    run(cli, f"cp -a {REMOTE_BASE}/mobile {REMOTE_BASE}/mobile.prev-{TS}", label="backup mobile")
    run(cli, f"cp -a {REMOTE_BASE}/mobile-expo {REMOTE_BASE}/mobile-expo.prev-{TS}", label="backup mobile-expo")
    run(cli, f"cp -a {REMOTE_BASE}/mobile-assets {REMOTE_BASE}/mobile-assets.prev-{TS}", label="backup mobile-assets")

    run(cli, f"rm -rf {REMOTE_BASE}/mobile && mkdir -p {REMOTE_BASE}/mobile && cp -a {REMOTE_RELEASE_DIR}/. {REMOTE_BASE}/mobile/", label="promote mobile/")
    run(cli, f"rm -rf {REMOTE_BASE}/mobile-expo && mkdir -p {REMOTE_BASE}/mobile-expo && cp -a {REMOTE_RELEASE_DIR}/_expo/. {REMOTE_BASE}/mobile-expo/", label="promote mobile-expo/")
    run(cli, f"rm -rf {REMOTE_BASE}/mobile-assets && mkdir -p {REMOTE_BASE}/mobile-assets && cp -a {REMOTE_RELEASE_DIR}/assets/. {REMOTE_BASE}/mobile-assets/", label="promote mobile-assets/")
    run(cli, f"chown -R www-data:www-data {REMOTE_BASE}/mobile {REMOTE_BASE}/mobile-expo {REMOTE_BASE}/mobile-assets", label="chown")

    print("\n===== SMOKE TESTS =====")
    run(cli, "curl -sS -o /dev/null -w 'mobile root: HTTP %{http_code}\\n' https://mobile.letras.cloud/", label="mobile root", fatal=False)
    run(cli, "curl -sS https://mobile.letras.cloud/ | grep -oE 'mobile-expo/static/js/web/[^\"]*' | head -3", label="refs do bundle", fatal=False)
    run(cli, "curl -sS -o /dev/null -w 'bundle: HTTP %{http_code} (%{size_download} bytes)\\n' \"https://mobile.letras.cloud/mobile-expo/static/js/web/$(ls /srv/letras-mobile-web/mobile-expo/static/js/web/ | head -1)\"", label="bundle js", fatal=False)

    cli.close()
    print(f"\n== DEPLOY MOBILE OK release={TS}-mobile-web ==")


if __name__ == "__main__":
    main()
