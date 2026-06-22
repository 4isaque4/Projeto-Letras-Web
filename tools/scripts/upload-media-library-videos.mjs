/**
 * upload-media-library-videos.mjs
 *
 * Sobe os 14 vídeos locais para o bucket cms-videos do Supabase e atualiza
 * public_url + storage_path em cada linha de media_library.
 *
 * Pré-requisitos:
 *   npm install @supabase/supabase-js   (ou pnpm add)
 *
 * Variáveis obrigatórias:
 *   SUPABASE_URL              → URL do projeto (ex: https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY → service_role key (Supabase dashboard → Project Settings → API)
 *
 * Variável opcional:
 *   VIDEOS_DIR  → caminho para a pasta com os .mov (padrão: pasta local do projeto)
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node tools/scripts/upload-media-library-videos.mjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tools/scripts/upload-media-library-videos.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { createReadStream, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const DRY_RUN = process.argv.includes("--dry-run");
const CHECK_FILES = process.argv.includes("--check-files");
const BUCKET = "cms-videos";

// Mapeamento estático dos 14 vídeos (da migration 20260618) — usado por --check-files
const KNOWN_FILENAMES = [
  "IMG_6872.mov", "IMG_6873.mov", "IMG_6874.mov", "IMG_6875.mov",
  "IMG_6876.mov", "IMG_6877.mov", "IMG_6879.mov", "IMG_6881.mov",
  "IMG_6882.mov", "IMG_6884.mov", "IMG_6890.mov", "IMG_6895.mov",
  "IMG_6896.mov", "VÍDEO LETRAS-01.mov",
];

const DEFAULT_VIDEOS_DIR = resolve(
  __dirname,
  "../../output/tutorial-videos/videos-2/VÍDEOS 2"
);
const VIDEOS_DIR = process.env.VIDEOS_DIR
  ? resolve(process.env.VIDEOS_DIR)
  : DEFAULT_VIDEOS_DIR;

// ── Validação de configuração ─────────────────────────────────────────────────

// --check-files não precisa de credenciais — só verifica arquivos locais
if (!CHECK_FILES && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
  console.error(
    "\n❌  SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.\n" +
    "   Obtenha a service_role key em: Supabase Dashboard → Project Settings → API Keys\n" +
    "\n   Para verificar apenas arquivos locais (sem credenciais):\n" +
    "   node tools/scripts/upload-media-library-videos.mjs --check-files\n" +
    "\n   Para upload completo:\n" +
    "   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node tools/scripts/upload-media-library-videos.mjs\n"
  );
  process.exit(1);
}

if (DRY_RUN) {
  console.log("🔍  Modo DRY-RUN — nenhum arquivo será enviado nem o banco atualizado.\n");
}

// ── Supabase client (lazy — não instanciado em --check-files) ─────────────────

let supabase;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabase;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mimeForFile(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    mov: "video/quicktime",
    mp4: "video/mp4",
    m4v: "video/x-m4v",
  };
  return map[ext] || "application/octet-stream";
}

function storagePath(filename) {
  return `media-library/${filename}`;
}

async function uploadFile(filename) {
  const match = findLocalFile(filename);
  if (!match) {
    return { ok: false, reason: `Arquivo não encontrado: ${filename}` };
  }

  const { path: localPath, stat } = match;
  const buffer = await readFile(localPath);
  const path = storagePath(filename);
  const mime = mimeForFile(filename);

  const { error } = await getSupabase().storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (error) {
    return { ok: false, reason: error.message };
  }

  const { data: urlData } = getSupabase().storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, publicUrl: urlData.publicUrl, storagePath: path, bytes: stat.size };
}

async function patchMediaLibrary(id, publicUrl, path) {
  const { error } = await getSupabase()
    .from("media_library")
    .update({
      public_url: publicUrl,
      storage_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Check-files mode (sem credenciais) ────────────────────────────────────────

function findLocalFile(filename) {
  // Tenta exato primeiro; se falhar, tenta NFC/NFD normalizados
  const variants = [filename, filename.normalize("NFC"), filename.normalize("NFD")];
  for (const v of variants) {
    const p = resolve(VIDEOS_DIR, v);
    try {
      return { path: p, stat: statSync(p) };
    } catch {}
  }
  return null;
}

function runCheckFiles() {
  console.log(`📁  Verificando arquivos em: ${VIDEOS_DIR}\n`);
  let found = 0;
  let missing = 0;
  for (const filename of KNOWN_FILENAMES) {
    const match = findLocalFile(filename);
    if (match) {
      console.log(`  ✅  ${filename}  (${Math.round(match.stat.size / 1024 / 1024)} MB)`);
      found++;
    } else {
      console.log(`  ❌  ${filename}  — NÃO ENCONTRADO`);
      missing++;
    }
  }
  console.log(`\n  Encontrados: ${found}/${KNOWN_FILENAMES.length}   Faltando: ${missing}`);
  if (missing === 0) {
    console.log("\n✅  Todos os arquivos estão presentes. Pronto para upload.\n");
    console.log("   Próximo passo:");
    console.log("   SUPABASE_URL=https://wfyjprjjhmcejovfozug.supabase.co \\");
    console.log("   SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key> \\");
    console.log("   node tools/scripts/upload-media-library-videos.mjs\n");
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (CHECK_FILES) {
    runCheckFiles();
    return;
  }

  console.log(`📦  Bucket: ${BUCKET}`);
  console.log(`📁  Vídeos: ${VIDEOS_DIR}\n`);

  // 1. Busca todos os itens sem public_url
  const { data: items, error: fetchError } = await getSupabase()
    .from("media_library")
    .select("id, slug, title, metadata, public_url, storage_path")
    .order("created_at");

  if (fetchError) {
    console.error("❌  Erro ao buscar media_library:", fetchError.message);
    process.exit(1);
  }

  const pending = items.filter((item) => {
    const filename = item.metadata?.filename;
    return filename && !item.public_url;
  });

  const alreadyDone = items.filter((item) => item.public_url);

  console.log(`Total de itens em media_library: ${items.length}`);
  console.log(`  ✅ Com public_url:    ${alreadyDone.length}`);
  console.log(`  ⏳ Sem public_url:    ${pending.length}\n`);

  if (pending.length === 0) {
    console.log("✅  Todos os vídeos já têm URL configurada. Nada a fazer.");
    return;
  }

  // 2. Para cada item pendente, sobe o arquivo e atualiza o banco
  let ok = 0;
  let fail = 0;

  for (const item of pending) {
    const filename = item.metadata.filename;
    process.stdout.write(`  ⬆  ${filename} (${item.slug}) ... `);

    if (DRY_RUN) {
      const exists = Boolean(findLocalFile(filename));
      console.log(exists ? "✔ arquivo local encontrado" : "✘ arquivo local NÃO encontrado");
      if (exists) ok++;
      else fail++;
      continue;
    }

    const result = await uploadFile(filename);
    if (!result.ok) {
      console.log(`❌  FALHA — ${result.reason}`);
      fail++;
      continue;
    }

    try {
      await patchMediaLibrary(item.id, result.publicUrl, result.storagePath);
      const kb = Math.round(result.bytes / 1024);
      console.log(`✅  OK (${kb} KB) → ${result.publicUrl}`);
      ok++;
    } catch (patchErr) {
      console.log(`⚠️  Upload OK mas falha ao atualizar banco: ${patchErr.message}`);
      fail++;
    }
  }

  console.log(`\n── Resultado ${DRY_RUN ? "(dry-run)" : ""} ──`);
  console.log(`  Sucesso: ${ok}`);
  console.log(`  Falha:   ${fail}`);

  if (!DRY_RUN && ok > 0) {
    console.log("\n✅  Vídeos enviados. Acesse /admin/conteudo/videos para confirmar.");
  }
}

main().catch((err) => {
  console.error("❌  Erro inesperado:", err.message);
  process.exit(1);
});
