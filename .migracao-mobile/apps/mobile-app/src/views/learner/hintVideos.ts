// Mapeamento de tipo de tela → slug do clipe de dica no media_library (CMS).
// A URL é resolvida em learnerFlowMapper (resolveHintVideoUrl) buscando o slug
// no media_library. Nenhuma URL ou nome de arquivo de vídeo é hardcoded aqui.
//
// Prioridade de resolução da dica (ver resolveHintVideoUrl):
//   1. activity.hint_video_id explícito (escolhido no painel web) — vence sempre.
//   2. este mapa por tipo de tela — quando não há vínculo explícito.
//
// Telas sem clipe correspondente NÃO mostram o card "Está com dúvidas?" no
// fallback (retorna null). Decisão de produto: não exibir um vídeo que não
// explica aquela atividade — o apoio em vídeo dessas telas vem só de um
// hint_video_id vinculado à atividade no painel web.
//
// Conteúdo dos clipes referenciados (confirmado por transcrição em 2026-06-30):
//   etapa2-formas-cores — sistema de formas e cores p/ o aluno navegar
//   geral-e-simples     — "parece complicado, mas não é" (encorajamento genérico)

const HINT_SLUG_BY_TEMPLATE: Record<string, string> = {
  // Exercício de marcar imagens/caixas — navegação por formas e cores.
  'exercise-mark-images': 'etapa2-formas-cores',
  // Telas de conteúdo (RN042: o card "Está com dúvidas?" aparece em todos os
  // modelos de tela de aula) — encorajamento genérico. Os blocos do painel
  // usam o type do bloco como template, então cada tipo precisa do mapeamento
  // (só 'default' deixava text/image/audio/video sem card).
  'default': 'geral-e-simples',
  'text': 'geral-e-simples',
  'image': 'geral-e-simples',
  'audio': 'geral-e-simples',
  'video': 'geral-e-simples',
  // Tela bloqueada aguardando apoio — encorajamento genérico.
  'locked': 'geral-e-simples',
  // 'exercise-match-letter' propositalmente AUSENTE: nenhum dos 14 vídeos
  // explica achar-a-letra; sem fallback, só vínculo explícito no painel.
};

// Retorna o slug do clipe de dica para um screenTemplate, ou null quando não
// há clipe de fallback para aquele tipo de tela (o card não é exibido).
export function getHintSlugForTemplate(
  screenTemplate: string | null | undefined,
): string | null {
  if (!screenTemplate) return null;
  return HINT_SLUG_BY_TEMPLATE[screenTemplate] ?? null;
}
