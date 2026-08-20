import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Trava didatica do exercise-match-letter: o 1o audio de palavra so libera
// depois do audio de instrucao, e cada seguinte depois do item anterior ser
// respondido. Se o gate `instructionAudioPlayed` nunca abrir, o exercicio
// inteiro fica mudo e o aluno nao tem como avancar — era o bug "todas as
// palavras mudas". Estes testes fecham os dois caminhos em que o gate ficava
// presa para sempre.

const screenUrl = new URL("./LearnerLessonScreenView.tsx", import.meta.url);

test("o gate de audio abre quando a fala de fallback nao esta disponivel", async () => {
  const source = await readFile(screenUrl, "utf8");

  // speakWithBrowserVoice devolve false (e nunca chama onEnd) quando nao ha
  // texto, nao ha voz no runtime, ou Platform.OS !== 'web' — ou seja SEMPRE no
  // app nativo. Sem liberar o gate nesse caso, nenhuma palavra toca.
  assert.match(
    source,
    /if \(!spoke && audioKey\.startsWith\("instruction-"\)\) \{\s*setInstructionAudioPlayed\(true\);/,
    "sem `spoke === false` liberando o gate, o exercicio fica mudo no app nativo",
  );
});

test("o gate de audio abre quando o audio de instrucao falha ao carregar", async () => {
  const source = await readFile(screenUrl, "utf8");

  // O `catch` de playAudioUrl cobre 404, codec nao suportado e bloqueio de
  // autoplay. O fallback de fala ali nao recebe onEnd, entao o gate precisa ser
  // liberado explicitamente.
  const playAudioUrlBlock = source.match(
    /const playAudioUrl = useCallback\([\s\S]*?\n {4}\[playingAudioKey, stopCurrentAudio\],/,
  );
  assert.ok(playAudioUrlBlock, "corpo de playAudioUrl nao encontrado");
  const catchBlock = playAudioUrlBlock[0].match(/\} catch \{[\s\S]*$/);
  assert.ok(catchBlock, "bloco catch de playAudioUrl nao encontrado");
  assert.match(
    catchBlock[0],
    /setInstructionAudioPlayed\(true\)/,
    "audio de instrucao que falha ao carregar deixaria as palavras mudas para sempre",
  );
});

test("a trava progressiva continua valendo quando o audio toca normalmente", async () => {
  const source = await readFile(screenUrl, "utf8");

  // A liberacao nao pode virar "sempre disponivel": o encadeamento por item
  // anterior respondido e a regra didatica pedida no relatorio de bugs.
  assert.match(
    source,
    /const isWordAudioEnabled =\s*!isInteractionLocked &&\s*\(previousItem\s*\? completedMatchSet\.has\(previousItem\.id\)\s*: instructionAudioPlayed\)/,
  );
});
