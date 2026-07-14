"""Deploy painel.letras.cloud (frontend Vite + API Express) — versão CI.

Igual ao artifacts/deploy_painel_20260506.py, mas com credenciais e branch
vindas de variáveis de ambiente (para GitHub Actions):

  DEPLOY_HOST      IP/host do VPS
  DEPLOY_USER      usuário SSH
  DEPLOY_PASSWORD  senha SSH
  DEPLOY_BRANCH    branch a resetar no VPS (default: branch de deploy atual)

Pré-requisito: apps/web/dist já buildado (o workflow builda antes).
"""
import os
import sys
import time
import paramiko

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

HOST = os.environ.get("DEPLOY_HOST", "")
USER = os.environ.get("DEPLOY_USER", "root")
PASS = os.environ.get("DEPLOY_PASSWORD", "")
BRANCH = os.environ.get("DEPLOY_BRANCH", "main")

if not HOST or not PASS:
    print("[FATAL] DEPLOY_HOST/DEPLOY_PASSWORD não definidos no ambiente.")
    sys.exit(2)

TS = time.strftime("%Y%m%d-%H%M%S")
RELEASE = f"painel-{TS}"
REMOTE_RELEASE_DIR = f"/srv/letras-painel/_releases/{RELEASE}"
REMOTE_DIST = "/srv/letras-painel/dist"
REMOTE_PRELIVE = f"/srv/letras-painel/_releases/{RELEASE}-prelive"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOCAL_DIST = os.path.join(REPO_ROOT, "apps", "web", "dist")
ENV_FILE = "/etc/letras-painel-api.env"


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
    return rc, o, e


def sftp_upload_dir(sftp, local_dir, remote_dir):
    for root, _dirs, files in os.walk(local_dir):
        rel = os.path.relpath(root, local_dir).replace("\\", "/")
        target = remote_dir if rel == "." else f"{remote_dir}/{rel}"
        try:
            sftp.stat(target)
        except IOError:
            sftp.mkdir(target)
        for fn in files:
            sftp.put(os.path.join(root, fn), f"{target}/{fn}")
    print(f"== upload concluído em {remote_dir}")


def main():
    if not os.path.isdir(LOCAL_DIST):
        print(f"[FATAL] dist local não encontrado: {LOCAL_DIST}")
        sys.exit(2)

    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, username=USER, password=PASS, timeout=30, allow_agent=False, look_for_keys=False)
    print(f"== conectado em {HOST} ==")

    run(cli, "cd /srv/letras-painel/repo && git stash push -u -m 'pre-deploy-stash' || true", label="git stash (best-effort)")
    run(cli, f"cd /srv/letras-painel/repo && git fetch origin {BRANCH}", label="git fetch")
    run(cli, f"cd /srv/letras-painel/repo && git reset --hard origin/{BRANCH}", label="git reset --hard")
    run(cli, "cd /srv/letras-painel/repo && git log --oneline -3", label="git log (depois)")

    run(cli, f"mkdir -p {REMOTE_RELEASE_DIR}", label="mkdir release")

    print(f"\n----- SFTP upload dist -> {REMOTE_RELEASE_DIR} -----")
    sftp = cli.open_sftp()
    try:
        sftp_upload_dir(sftp, LOCAL_DIST, REMOTE_RELEASE_DIR)
    finally:
        sftp.close()

    run(cli, f"cp -a {REMOTE_DIST} {REMOTE_PRELIVE}", label="backup prelive")
    run(cli, f"rm -rf {REMOTE_DIST} && cp -a {REMOTE_RELEASE_DIR} {REMOTE_DIST} && chown -R www-data:www-data {REMOTE_DIST}", label="promote")

    run(cli, f"sed -i 's/^UPLOAD_MAX_FILE_MB=.*/UPLOAD_MAX_FILE_MB=200/' {ENV_FILE}", label="UPLOAD_MAX_FILE_MB=200", fatal=False)
    run(cli, "systemctl restart letras-painel-api", label="restart API")

    # A API demora alguns segundos para subir — espera ficar saudável antes
    # dos smoke tests (evita falso-negativo HTTP 000 dos deploys manuais).
    print("\n===== SMOKE TESTS =====")
    rc = 1
    for attempt in range(10):
        time.sleep(3)
        rc, _, _ = run(
            cli,
            "curl -sS -o /dev/null -w '%{http_code}' 'http://127.0.0.1:8090/api/v1/painel/conteudo' | grep -q 200",
            label=f"API local (tentativa {attempt + 1})",
            fatal=False,
        )
        if rc == 0:
            break
    if rc != 0:
        raise RuntimeError("API local não respondeu 200 após restart — verificar logs (journalctl -u letras-painel-api).")

    run(cli, "curl -sS -o /dev/null -w 'painel root: HTTP %{http_code}\\n' https://painel.letras.cloud/ -k", label="painel root", fatal=False)
    run(cli, "curl -sS -o /dev/null -w 'dicas: HTTP %{http_code}\\n' 'http://127.0.0.1:8090/api/v1/painel/dicas'", label="dicas", fatal=False)

    cli.close()
    print(f"\n== DEPLOY OK release={RELEASE} ==")


if __name__ == "__main__":
    main()
