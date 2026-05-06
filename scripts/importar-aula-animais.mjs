/**
 * Cria uma aula real com todos os arquivos informados pelo usuário.
 *
 * Executar:
 *   node scripts/importar-aula-animais.mjs
 *
 * Requer:
 *   - API local em http://localhost:8082
 *   - apps/api/.env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 */

import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const API = "http://localhost:8082/api/v1";
const ENV_PATH = resolve("apps/api/.env");
dotenv.config({ path: ENV_PATH });

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "letras-assets";
const AUDIO_CACHE_DIR = resolve("artifacts/importar-aula-animais/audio");
const MAX_DIRECT_UPLOAD_BYTES = 45 * 1024 * 1024;

const AUDIOS_DIR = "C:/Users/Black/Downloads/letras/AUDIOS";
const VIDEOS_DIR = "C:/Projetos/letras-mobile-ref/docs/Conteudos das telas/Videos e Imagens";
const IMAGES_DIR = "C:/Projetos/letras-mobile-ref/docs/Conteudos das telas/Animais Imagens";

const DOCX_PATH = `${AUDIOS_DIR}/Áudios Alfabetizador Online.docx`;

const AUDIOS = {
  intro: `${AUDIOS_DIR}/001.WAV`,
  anzol: `${AUDIOS_DIR}/002.WAV`,
  sal: `${AUDIOS_DIR}/003.WAV`,
  rato: `${AUDIOS_DIR}/004.WAV`,
  galo: `${AUDIOS_DIR}/005.WAV`,
  marcarE: `${AUDIOS_DIR}/006.WAV`,
};

const MEDIA = {
  aranhaVideo: `${VIDEOS_DIR}/Aranha Video.mp4`,
  whatsappVideo: `${VIDEOS_DIR}/WhatsApp Video 2026-04-01 at 19.22.172.mp4`,
  whatsappImage: `${VIDEOS_DIR}/WhatsApp Image 2026-04-01 at 19.22.17.jpeg`,
};

const IMAGES = {
  abacate: `${IMAGES_DIR}/Abacate.jpeg`,
  abacaxi: `${IMAGES_DIR}/Abacaxi.jpeg`,
  abelha: `${IMAGES_DIR}/Abelha.jpeg`,
  agulha: `${IMAGES_DIR}/Agulha.jpeg`,
  alicate: `${IMAGES_DIR}/Alicate.jpeg`,
  anzol: `${IMAGES_DIR}/Anzol.jpeg`,
  aviao: `${IMAGES_DIR}/Avião.jpeg`,
  cachorro: `${IMAGES_DIR}/Cachorro.jpeg`,
  elefante: `${IMAGES_DIR}/Elefante imagem.jpeg`,
  escorpiao: `${IMAGES_DIR}/Escorpião.jpeg`,
  galo: `${IMAGES_DIR}/Galo.jpeg`,
  girafa: `${IMAGES_DIR}/Girafa.jpeg`,
  labios: `${IMAGES_DIR}/Labios.jpeg`,
  rato: `${IMAGES_DIR}/Rato.jpeg`,
  sal: `${IMAGES_DIR}/Sal.jpeg`,
};

const AUDIO_TEXTS = {
  intro:
    "Agora, vamos encontrar a letra A nas palavras. Primeiro você vai ver o desenho. Embaixo dele aparecem quadradinhos, e cada quadradinho corresponde a uma letra da palavra. Aperte o quadrado onde a letra A está escondida.",
  anzol:
    "A palavra é ANZOL. Anzol tem 5 letras, portanto tem 5 quadradinhos embaixo. Em qual deles está escondida a letra A?",
  sal:
    "A palavra é SAL. Sal tem 3 letras, portanto tem 3 quadradinhos embaixo. Em qual deles está escondida a letra A?",
  rato:
    "A palavra é RATO. Rato tem 4 letras, portanto tem 4 quadradinhos embaixo. Em qual deles está escondida a letra A?",
  galo:
    "A palavra é GALO. Galo tem 4 letras, portanto tem 4 quadradinhos embaixo. Em qual deles está escondida a letra A?",
  marcarE:
    "Parabéns! Você foi muito bem no último desafio. Agora olhe os desenhos abaixo e encontre dois animais que começam com a letra E. Quando achar, aperte em cima de cada um deles e confirme na setinha verde.",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function log(message) {
  console.log(`[importar-aula] ${message}`);
}

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(`Supabase não configurado. Confira ${ENV_PATH}.`);
  }
}

function mimeTypeFor(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".mp4") return "video/mp4";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

function assetKindFor(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".mp4") return "mp4";
  if (extension === ".png") return "png";
  if (extension === ".jpg" || extension === ".jpeg") return "jpg";
  return "mp3";
}

function safeObjectName(filePath) {
  const extension = extname(filePath).toLowerCase() || ".bin";
  const base = basename(filePath, extension)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
  return `${base || "arquivo"}-${randomUUID()}${extension}`;
}

function publicUrlFor(objectPath) {
  const base = SUPABASE_URL.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`;
}

function resolveFfmpegPath() {
  const candidates = [
    process.env.FFMPEG_PATH,
    resolve(tmpdir(), "letras-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe"),
    resolve(tmpdir(), "letras-ffmpeg/node_modules/ffmpeg-static/ffmpeg"),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function prepareUploadPath(filePath) {
  const extension = extname(filePath).toLowerCase();
  if (extension !== ".wav") {
    return filePath;
  }

  const ffmpegPath = resolveFfmpegPath();
  if (!ffmpegPath && statSync(filePath).size > MAX_DIRECT_UPLOAD_BYTES) {
    throw new Error(
      "WAV grande demais para o Storage e ffmpeg não encontrado. Instale ffmpeg ou rode: npm --prefix %TEMP%\\letras-ffmpeg install ffmpeg-static --no-save",
    );
  }
  if (!ffmpegPath) {
    return filePath;
  }

  mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
  const outputBaseName = basename(filePath).replace(/\.[^.]+$/, "").toLowerCase();
  const outputPath = resolve(AUDIO_CACHE_DIR, `${outputBaseName}.mp3`);
  if (existsSync(outputPath) && statSync(outputPath).size > 0) {
    return outputPath;
  }

  log(`  convertendo ${basename(filePath)} para MP3...`);
  execFileSync(ffmpegPath, [
    "-y",
    "-i",
    filePath,
    "-filter:a",
    "pan=mono|c0=c0",
    "-codec:a",
    "libmp3lame",
    "-b:a",
    "96k",
    outputPath,
  ], { stdio: "ignore" });

  return outputPath;
}

async function ensureApi() {
  const response = await fetch("http://localhost:8082/health");
  if (!response.ok) {
    throw new Error("API local não respondeu no /health.");
  }
}

async function post(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${path} falhou (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function patch(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`PATCH ${path} falhou (${response.status}): ${await response.text()}`);
  }

  return response.json();
}

async function ensureBucket() {
  const { data: bucket, error: getError } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (!getError && bucket) {
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: true,
  });

  if (createError && !String(createError.message).toLowerCase().includes("already exists")) {
    throw new Error(`Falha ao preparar bucket ${STORAGE_BUCKET}: ${createError.message}`);
  }
}

async function uploadAndRegister(filePath, activityId, title, metadata = {}) {
  if (!existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const uploadPath = prepareUploadPath(filePath);
  const fileBuffer = readFileSync(uploadPath);
  const mimeType = mimeTypeFor(uploadPath);
  const kind = assetKindFor(uploadPath);
  const objectPath = `acervo/aula-real-letra-a/${safeObjectName(uploadPath)}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload falhou para ${basename(filePath)}: ${uploadError.message}`);
  }

  const publicUrl = publicUrlFor(objectPath);
  const { data: asset, error: insertError } = await supabase
    .from("content_assets")
    .insert({
      activity_id: activityId,
      kind,
      storage_path: publicUrl,
      mime_type: mimeType,
      status: "publicado",
      metadata: {
        source: "importar-aula-animais",
        title,
        originalFileName: basename(filePath),
        uploadedFileName: basename(uploadPath),
        convertedFrom: uploadPath === filePath ? null : basename(filePath),
        objectPath,
        bytes: fileBuffer.byteLength,
        ...metadata,
      },
    })
    .select("id, storage_path")
    .single();

  if (insertError) {
    throw new Error(`Registro do asset falhou para ${basename(filePath)}: ${insertError.message}`);
  }

  log(`  ✓ ${title}: ${basename(filePath)}`);
  return asset.storage_path;
}

function missingFiles() {
  const files = [DOCX_PATH, ...Object.values(AUDIOS), ...Object.values(MEDIA), ...Object.values(IMAGES)];
  return files.filter((filePath) => !existsSync(filePath));
}

function imageItem(id, label, imageUrl, isCorrect, notes = "") {
  return {
    id,
    label,
    imageUrl,
    isCorrect,
    isCorrectTarget: isCorrect,
    audioUrl: null,
    notes,
  };
}

function matchItem({ id, label, imageUrl, audioUrl, options, correctOptions, audioText }) {
  return {
    id,
    label,
    imageUrl,
    audioUrl,
    wordAudioUrl: audioUrl,
    spellingAudioUrl: null,
    options,
    correctOptions,
    notes: audioText,
  };
}

async function main() {
  requireConfig();

  const notFound = missingFiles();
  if (notFound.length > 0) {
    throw new Error(`Arquivos ausentes:\n${notFound.join("\n")}`);
  }

  await ensureApi();
  await ensureBucket();

  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
  log("Criando tema, módulo e atividade...");

  const theme = await post("/painel/conteudo/temas", {
    title: "Animais e Letras",
    slug: `animais-letra-a-${stamp}`,
    description: "Aula real com vídeos, áudios e imagens para reconhecimento das letras A e E.",
    sortOrder: 20,
    isActive: true,
  });

  const module = await post("/painel/conteudo/modulos", {
    themeId: theme.id,
    title: "Etapa 2 - Aula real: letra A e animais com E",
    description:
      "Sequência completa: assistir, localizar a letra A nas palavras e marcar animais que começam com E.",
    stageNumber: 2,
    sortOrder: 0,
    isActive: true,
  });

  const activity = await post("/painel/conteudo/atividades", {
    moduleId: module.id,
    title: "Aula real - letra A nas palavras e animais com E",
    type: "letra",
    instructions: null,
    sortOrder: 0,
    isPublished: false,
  });

  log("Subindo e registrando todos os arquivos...");
  const audioUrls = {
    intro: await uploadAndRegister(AUDIOS.intro, activity.id, "001 - Explicação inicial", {
      transcript: AUDIO_TEXTS.intro,
      sourceDocx: basename(DOCX_PATH),
    }),
    anzol: await uploadAndRegister(AUDIOS.anzol, activity.id, "002 - Palavra ANZOL", {
      transcript: AUDIO_TEXTS.anzol,
      sourceDocx: basename(DOCX_PATH),
    }),
    sal: await uploadAndRegister(AUDIOS.sal, activity.id, "003 - Palavra SAL", {
      transcript: AUDIO_TEXTS.sal,
      sourceDocx: basename(DOCX_PATH),
    }),
    rato: await uploadAndRegister(AUDIOS.rato, activity.id, "004 - Palavra RATO", {
      transcript: AUDIO_TEXTS.rato,
      sourceDocx: basename(DOCX_PATH),
    }),
    galo: await uploadAndRegister(AUDIOS.galo, activity.id, "005 - Palavra GALO", {
      transcript: AUDIO_TEXTS.galo,
      sourceDocx: basename(DOCX_PATH),
    }),
    marcarE: await uploadAndRegister(AUDIOS.marcarE, activity.id, "006 - Marcar animais com E", {
      transcript: AUDIO_TEXTS.marcarE,
      sourceDocx: basename(DOCX_PATH),
    }),
  };

  const mediaUrls = {
    aranhaVideo: await uploadAndRegister(MEDIA.aranhaVideo, activity.id, "Vídeo - Aranha"),
    whatsappVideo: await uploadAndRegister(MEDIA.whatsappVideo, activity.id, "Vídeo - Apoio WhatsApp"),
    whatsappImage: await uploadAndRegister(MEDIA.whatsappImage, activity.id, "Imagem - Capa de apoio"),
  };

  const imageUrls = {
    abacate: await uploadAndRegister(IMAGES.abacate, activity.id, "Imagem - Abacate"),
    abacaxi: await uploadAndRegister(IMAGES.abacaxi, activity.id, "Imagem - Abacaxi"),
    abelha: await uploadAndRegister(IMAGES.abelha, activity.id, "Imagem - Abelha"),
    agulha: await uploadAndRegister(IMAGES.agulha, activity.id, "Imagem - Agulha"),
    alicate: await uploadAndRegister(IMAGES.alicate, activity.id, "Imagem - Alicate"),
    anzol: await uploadAndRegister(IMAGES.anzol, activity.id, "Imagem - Anzol"),
    aviao: await uploadAndRegister(IMAGES.aviao, activity.id, "Imagem - Avião"),
    cachorro: await uploadAndRegister(IMAGES.cachorro, activity.id, "Imagem - Cachorro"),
    elefante: await uploadAndRegister(IMAGES.elefante, activity.id, "Imagem - Elefante"),
    escorpiao: await uploadAndRegister(IMAGES.escorpiao, activity.id, "Imagem - Escorpião"),
    galo: await uploadAndRegister(IMAGES.galo, activity.id, "Imagem - Galo"),
    girafa: await uploadAndRegister(IMAGES.girafa, activity.id, "Imagem - Girafa"),
    labios: await uploadAndRegister(IMAGES.labios, activity.id, "Imagem - Lábios"),
    rato: await uploadAndRegister(IMAGES.rato, activity.id, "Imagem - Rato"),
    sal: await uploadAndRegister(IMAGES.sal, activity.id, "Imagem - Sal"),
  };

  log("Montando a aula composta...");
  const lessonPayload = {
    schema: "letras-stage2-v1",
    screenTemplate: "composite",
    title: activity.title,
    sourceDocx: {
      fileName: basename(DOCX_PATH),
      path: DOCX_PATH,
      extractedAudioTexts: AUDIO_TEXTS,
    },
    educatorGuidance:
      "Aula criada a partir dos áudios oficiais: primeiro o aluno identifica a letra A nos quadradinhos das palavras; depois marca dois animais que começam com E.",
    learnerSpeech:
      "Vamos observar os desenhos, ouvir as palavras e encontrar as letras pedidas com calma.",
    blocks: [
      {
        id: "bloco-01-video-aranha",
        type: "video",
        videoUrl: mediaUrls.aranhaVideo,
        coverImageUrl: mediaUrls.whatsappImage,
        instrText:
          "Assista ao vídeo de abertura. A aranha ajuda a entrar no tema de animais e letras.",
        instrAudioUrl: null,
        notes: "Abertura visual da aula com o vídeo Aranha Video.mp4.",
      },
      {
        id: "bloco-02-letra-a",
        type: "exercise-match-letter",
        letraAlvo: "A",
        targetLetter: "A",
        instructionText: AUDIO_TEXTS.intro,
        instructionAudioUrl: audioUrls.intro,
        progressiveUnlock: false,
        exercise: {
          template: "exercise-match-letter",
          targetLetter: "A",
          expectedSelections: 1,
          items: [
            matchItem({
              id: "anzol",
              label: "ANZOL",
              imageUrl: imageUrls.anzol,
              audioUrl: audioUrls.anzol,
              options: ["A", "N", "Z", "O", "L"],
              correctOptions: ["A"],
              audioText: AUDIO_TEXTS.anzol,
            }),
            matchItem({
              id: "sal",
              label: "SAL",
              imageUrl: imageUrls.sal,
              audioUrl: audioUrls.sal,
              options: ["S", "A", "L"],
              correctOptions: ["A"],
              audioText: AUDIO_TEXTS.sal,
            }),
            matchItem({
              id: "rato",
              label: "RATO",
              imageUrl: imageUrls.rato,
              audioUrl: audioUrls.rato,
              options: ["R", "A", "T", "O"],
              correctOptions: ["A"],
              audioText: AUDIO_TEXTS.rato,
            }),
            matchItem({
              id: "galo",
              label: "GALO",
              imageUrl: imageUrls.galo,
              audioUrl: audioUrls.galo,
              options: ["G", "A", "L", "O"],
              correctOptions: ["A"],
              audioText: AUDIO_TEXTS.galo,
            }),
          ],
        },
      },
      {
        id: "bloco-03-animais-com-e",
        type: "exercise-mark-images",
        targetLetter: "E",
        instructionText: AUDIO_TEXTS.marcarE,
        instructionAudioUrl: audioUrls.marcarE,
        expectedSelections: 2,
        exercise: {
          template: "exercise-mark-images",
          targetLetter: "E",
          expectedSelections: 2,
          items: [
            imageItem("abacate", "Abacate", imageUrls.abacate, false),
            imageItem("abacaxi", "Abacaxi", imageUrls.abacaxi, false),
            imageItem("abelha", "Abelha", imageUrls.abelha, false),
            imageItem("agulha", "Agulha", imageUrls.agulha, false),
            imageItem("alicate", "Alicate", imageUrls.alicate, false),
            imageItem("anzol-img", "Anzol", imageUrls.anzol, false),
            imageItem("aviao", "Avião", imageUrls.aviao, false),
            imageItem("cachorro", "Cachorro", imageUrls.cachorro, false),
            imageItem("elefante", "Elefante", imageUrls.elefante, true, "Animal que começa com E."),
            imageItem("escorpiao", "Escorpião", imageUrls.escorpiao, true, "Animal que começa com E."),
            imageItem("galo-img", "Galo", imageUrls.galo, false),
            imageItem("girafa", "Girafa", imageUrls.girafa, false),
            imageItem("labios", "Lábios", imageUrls.labios, false),
            imageItem("rato-img", "Rato", imageUrls.rato, false),
            imageItem("sal-img", "Sal", imageUrls.sal, false),
          ],
        },
      },
      {
        id: "bloco-04-video-final",
        type: "video",
        videoUrl: mediaUrls.whatsappVideo,
        coverImageUrl: mediaUrls.whatsappImage,
        instrText:
          "Encerramento: relembre as palavras, veja o vídeo final e avance depois de reconhecer a letra A e os animais com E.",
        instrAudioUrl: null,
        notes: "Usa o vídeo WhatsApp e a imagem de apoio informados pelo usuário.",
      },
    ],
  };

  await patch(`/painel/conteudo/atividades/${activity.id}`, {
    instructions: JSON.stringify(lessonPayload, null, 2),
    isPublished: true,
  });

  const verifyResponse = await fetch(`${API}/painel/conteudo?scope=cms`);
  const cms = await verifyResponse.json();
  const created = cms.activities?.find((item) => item.id === activity.id);

  if (!created?.is_published) {
    throw new Error("A atividade foi criada, mas a verificação não confirmou publicação.");
  }

  log("");
  log("Aula criada e publicada com sucesso.");
  log(`Tema: ${theme.title} (${theme.id})`);
  log(`Módulo: ${module.title} (${module.id})`);
  log(`Atividade: ${created.title} (${activity.id})`);
  log(`Assets registrados: ${Object.keys(audioUrls).length + Object.keys(mediaUrls).length + Object.keys(imageUrls).length}`);
  log(`Editar/ver: http://localhost:5173/admin/conteudo/nova-aula?id=${activity.id}`);
  log(`Dashboard: http://localhost:5173/admin/conteudo`);
}

main().catch((error) => {
  console.error("[importar-aula] Erro:", error instanceof Error ? error.message : error);
  process.exit(1);
});
