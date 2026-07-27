import { LearnerScreenSnapshot } from '@letras/shared-types';

// Texto de orientação pedagógica exibido ao alfabetizador abaixo da moldura do
// espelho, variando conforme o tipo de tela que o alfabetizando está vendo.
//
// Fonte dos textos:
//   - CONFIRMADOS no Figma (super prompt "Etapa 2 – Demonstração da tela de
//     atividade"): a orientação da seta AVANÇAR e a do ícone de áudio verde.
//   - AUTORADOS (marcados abaixo): os demais tipos ainda não têm texto no Figma
//     disponível no repositório (docs/mockups traz só telas de auth); usam um
//     texto pedagógico coerente + fallback genérico. Ver resumo da entrega.

// CONFIRMADO (Figma): tela de conteúdo com seta verde AVANÇAR.
const GUIDANCE_ADVANCE =
  'Informe que este ícone leva ele para a próxima página, como se ele estivesse ' +
  'folheando um caderno. Peça que ele toque na seta verde quando terminar de ver esta tela.';

// CONFIRMADO (Figma): ícone de áudio na cor verde.
const GUIDANCE_AUDIO =
  'Informe que todas as vezes em que aparecer este ícone na cor verde, ele deve ' +
  'apertar para ouvir as orientações da atividade.';

// AUTORADO: exercício de encontrar/marcar a letra nos quadradinhos.
const GUIDANCE_MATCH_LETTER =
  'Nesta atividade o alfabetizando ouve a palavra e deve tocar no quadrado da ' +
  'letra pedida. Oriente-o a apertar o ícone verde para ouvir a palavra antes de escolher.';

// AUTORADO: exercício de marcar as imagens corretas.
const GUIDANCE_MARK_IMAGES =
  'Nesta atividade ele deve marcar as imagens corretas. Peça que aperte o ícone ' +
  'verde para ouvir a instrução e só então toque nas figuras que correspondem.';

// AUTORADO: tela de vídeo.
const GUIDANCE_VIDEO =
  'Esta tela mostra um vídeo. Oriente o alfabetizando a assistir com atenção e, ' +
  'ao terminar, tocar na seta verde para avançar.';

// AUTORADO: tela bloqueada aguardando apoio (pedido de ajuda ativo).
const GUIDANCE_LOCKED =
  'O alfabetizando pediu apoio e a tela dele está aguardando. Combine a orientação ' +
  'e libere a tela quando ele estiver pronto para continuar.';

// AUTORADO: introdução da aula.
const GUIDANCE_INTRO =
  'O alfabetizando está na abertura da aula. Explique o objetivo e peça que toque ' +
  'para começar quando estiver pronto.';

// AUTORADO: conclusão da aula.
const GUIDANCE_CONCLUSION =
  'O alfabetizando concluiu esta aula. Parabenize-o e combine o próximo passo.';

// AUTORADO: tela inicial do aplicativo do alfabetizando.
const GUIDANCE_HOME =
  'O alfabetizando está na tela inicial, escolhendo uma aula. Ajude-o a tocar na ' +
  'aula liberada para começar.';

// AUTORADO (fallback genérico): quando o tipo de tela não tem texto específico.
const GUIDANCE_GENERIC =
  'Acompanhe o que o alfabetizando está vendo e oriente-o conforme os ícones verdes ' +
  'que aparecem na tela.';

// Templates cujo texto ainda é autorado/genérico (não confirmado no Figma) —
// exposto para o resumo da entrega.
export const MIRROR_GUIDANCE_UNCONFIRMED_TEMPLATES = [
  'exercise-match-letter',
  'exercise-mark-images',
  'video',
  'locked',
  'lesson-intro',
  'lesson-activity',
  'lesson-conclusion',
  'home',
];

/**
 * Resolve a orientação pedagógica a partir do snapshot da tela do aprendiz.
 * Prioriza o conteúdo real da tela (áudio verde, exercício) sobre o template
 * cru, pois é o ícone visível que a orientação descreve.
 */
export function resolveMirrorGuidance(
  snapshot: LearnerScreenSnapshot | null | undefined,
): string {
  if (!snapshot) {
    return GUIDANCE_GENERIC;
  }

  const template = String(snapshot.screenTemplate ?? '').trim();

  switch (template) {
    case 'exercise-match-letter':
      return GUIDANCE_MATCH_LETTER;
    case 'exercise-mark-images':
      return GUIDANCE_MARK_IMAGES;
    case 'locked':
      return GUIDANCE_LOCKED;
    case 'lesson-intro':
      return GUIDANCE_INTRO;
    case 'lesson-conclusion':
      return GUIDANCE_CONCLUSION;
    case 'home':
      return GUIDANCE_HOME;
    default:
      break;
  }

  // Sem template específico: decide pelo conteúdo/ícone presente na tela.
  if (snapshot.mediaKind === 'video' || template === 'video') {
    return GUIDANCE_VIDEO;
  }
  if (snapshot.mediaKind === 'audio' || template === 'audio') {
    return GUIDANCE_AUDIO;
  }
  if (template === 'default' || template === 'text' || template === 'image' || template === 'lesson-activity') {
    return GUIDANCE_ADVANCE;
  }

  return GUIDANCE_GENERIC;
}
