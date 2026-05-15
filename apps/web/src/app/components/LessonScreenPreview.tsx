// Componente read-only que renderiza, no painel do alfabetizador, a replica
// visual da tela em que o alfabetizando travou. O dado vem do support_request:
// quando o aluno aperta "PRECISO DE AJUDA" no mobile, o snapshot da tela atual
// (modulo/aula/exercicio/midia) e gravado em support_requests.metadata.snapshot
// e propagado para o painel via GET /painel/fila.
//
// O componente nao tenta reproduzir o LearnerLessonScreen pixel-a-pixel; ele
// foca em mostrar EXATAMENTE o que o aluno esta vendo no momento do pedido:
// titulo + posicao na aula + midia + fala/instrucao + itens do exercicio.

export interface LearnerExerciseItem {
  id: string;
  label: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  wordAudioUrl?: string | null;
  options?: string[];
  correctOptions?: string[];
  isCorrectTarget?: boolean;
}

export interface LearnerExercise {
  template?: "exercise-match-letter" | "exercise-mark-images" | string;
  targetLetter?: string | null;
  instructionText?: string | null;
  instructionAudioUrl?: string | null;
  expectedSelections?: number | null;
  items?: LearnerExerciseItem[];
}

export interface LearnerScreenSnapshot {
  moduleId?: string;
  lessonId?: string;
  moduleLabel?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  screenIndex?: number;
  totalScreens?: number;
  stage?: string;
  screenId?: string;
  screenTitle?: string;
  screenTemplate?: string;
  mediaUrl?: string | null;
  mediaKind?: "video" | "audio" | "image" | null;
  learnerSpeech?: string | null;
  highlightMessage?: string | null;
  exercise?: LearnerExercise | null;
}

interface LessonScreenPreviewProps {
  snapshot: LearnerScreenSnapshot;
  learnerName?: string;
}

function formatScreenPosition(snapshot: LearnerScreenSnapshot): string | null {
  const { screenIndex, totalScreens, stage } = snapshot;
  if (typeof screenIndex !== "number" || typeof totalScreens !== "number") {
    return stage ? `Etapa ${stage}` : null;
  }
  const position = `Tela ${screenIndex + 1} de ${totalScreens}`;
  return stage ? `${position} da Etapa ${stage}` : position;
}

export function LessonScreenPreview({ snapshot, learnerName }: LessonScreenPreviewProps) {
  const screenPosition = formatScreenPosition(snapshot);
  const exercise = snapshot.exercise ?? null;
  const exerciseItems = exercise?.items ?? [];

  return (
    <div className="border border-dashed border-gray-400 bg-gray-50 p-3 space-y-3">
      <div>
        {learnerName ? (
          <p className="text-xs text-gray-600">Alfabetizando {learnerName}</p>
        ) : null}
        {screenPosition ? (
          <p className="text-xs text-gray-600">{screenPosition}</p>
        ) : null}
        {snapshot.screenTitle ? (
          <p className="text-sm font-bold text-gray-900 mt-1">{snapshot.screenTitle}</p>
        ) : null}
      </div>

      {snapshot.mediaUrl && snapshot.mediaKind === "image" ? (
        <img
          src={snapshot.mediaUrl}
          alt={snapshot.screenTitle ?? "Imagem da aula"}
          className="w-full max-h-48 object-contain bg-white border border-gray-300"
        />
      ) : null}

      {snapshot.mediaUrl && snapshot.mediaKind === "video" ? (
        <video
          src={snapshot.mediaUrl}
          controls
          preload="metadata"
          className="w-full bg-black border border-gray-300"
        />
      ) : null}

      {snapshot.mediaUrl && snapshot.mediaKind === "audio" ? (
        <div className="border border-gray-300 bg-white p-2">
          <p className="text-xs font-bold text-gray-800 mb-1">Áudio da aula</p>
          <audio src={snapshot.mediaUrl} controls preload="metadata" className="w-full" />
        </div>
      ) : null}

      {snapshot.learnerSpeech ? (
        <div className="border border-gray-300 bg-white p-2 text-sm text-gray-900">
          {snapshot.learnerSpeech}
        </div>
      ) : null}

      {snapshot.highlightMessage ? (
        <div className="border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {snapshot.highlightMessage}
        </div>
      ) : null}

      {exercise && exerciseItems.length > 0 ? (
        <div className="space-y-2">
          {exercise.instructionText ? (
            <p className="text-xs text-gray-700 italic">{exercise.instructionText}</p>
          ) : null}
          {exercise.targetLetter ? (
            <p className="text-xs text-gray-600">
              Letra-alvo: <span className="font-bold text-gray-900">{exercise.targetLetter}</span>
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            {exerciseItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-300 bg-white p-2 flex flex-col items-center gap-1"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.label}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    sem imagem
                  </div>
                )}
                <p className="text-xs font-semibold text-gray-900 text-center">{item.label}</p>
                {item.options && item.options.length > 0 ? (
                  <p className="text-[10px] text-gray-500">
                    {item.options.join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!snapshot.mediaUrl && !snapshot.learnerSpeech && !exerciseItems.length ? (
        <p className="text-xs text-gray-500 italic">
          Esta tela não enviou conteúdo visual no snapshot. Use a mensagem e o tipo de
          atividade para entender o contexto.
        </p>
      ) : null}
    </div>
  );
}
