// conteudo-planilha.ts
// Fonte: Roteiro Conteúdo Aulas - Exemplo.xlsx
// Objetivo: substituir leitura direta de Excel por estrutura JSON/TS no app.

export type MediaKind = "text" | "audio" | "video" | "image";

export interface ContentBlock {
  kind: MediaKind;
  value: string;
}

export interface ActivityContent {
  id: string;
  numeroAtividade: number;
  numeroTela: number;
  numeroAula: number;
  numeroModulo: number;
  titulo?: string;
  conteudo: ContentBlock[];
  orientacaoParaAlfabetizador?: string;
  orientacaoParaAlfabetizando?: string;
  conclusao?: ContentBlock[];
}

export interface ScreenContent {
  id: string;
  numeroTela: number;
  numeroAula: number;
  numeroModulo: number;
  titulo?: string;
  conteudo: ContentBlock[];
  orientacaoParaAlfabetizador?: string;
  orientacaoParaAlfabetizando?: string;
  atividades: ActivityContent[];
}

export interface LessonContent {
  id: string;
  numeroAula: number;
  numeroModulo: number;
  titulo: string;
  objetivo?: string;
  abertura?: ContentBlock[];
  conclusao?: ContentBlock[];
  telas: ScreenContent[];
}

export interface ModuleContent {
  id: string;
  numeroModulo: number;
  titulo: string;
  aulas: LessonContent[];
}

// Map de chaves de mídia → caminhos reais dos assets no projeto
// Os vídeos estão em /src/imports/
export const mediaAssetsByKey: Record<string, string> = {
  "VID-M01-A01-T04":
    "/src/imports/WhatsApp_Video_2026-04-01_at_19.22.17.mp4",
  "VID-M01-A01-T04-AT01":
    "/src/imports/WhatsApp_Video_2026-04-01_at_19.22.172.mp4",
};

export const conteudoPlanilha: ModuleContent[] = [
  {
    id: "M01",
    numeroModulo: 1,
    titulo: "Vogais",
    aulas: [
      {
        id: "M01-A01",
        numeroAula: 1,
        numeroModulo: 1,
        titulo: "Introdução geral",
        objetivo: "Acolhimento e introdução do método",
        abertura: [
          {
            kind: "text",
            value:
              "Bem-vindo à sua primeira aula! Vamos começar uma jornada incrível pelo mundo das letras.",
          },
        ],
        conclusao: [
          {
            kind: "text",
            value:
              "Parabéns! Você completou a introdução. Agora já conhece as vogais e está pronto para avançar!",
          },
        ],
        telas: [
          {
            id: "M01-A01-T01",
            numeroTela: 1,
            numeroAula: 1,
            numeroModulo: 1,
            titulo: "A importância das palavras",
            conteudo: [],
            orientacaoParaAlfabetizador:
              "Explique, com suas próprias palavras, o que se segue:",
            orientacaoParaAlfabetizando:
              "As palavras são essenciais para a comunicação humana. Elas nos permitem expressar ideias, sentimentos, construir realidades e dialogar uns com os outros.\nSão a base da linguagem e o instrumento mais universal para transmitir mensagens, possibilitando o entendimento mútuo e a criação de um mundo compartilhado.\nPodemos nos expressar de muitas maneiras: por meio de gestos, sinais, por meio da fala e da escrita, pois eles fazem parte da nossa vida.",
            atividades: [],
          },
          {
            id: "M01-A01-T02",
            numeroTela: 2,
            numeroAula: 1,
            numeroModulo: 1,
            titulo: "O Alfabeto",
            conteudo: [],
            orientacaoParaAlfabetizador: "Informe ao Alfabetizando",
            orientacaoParaAlfabetizando:
              "O alfabeto possui 26 letras. É formado por vogais e consoantes.",
            atividades: [],
          },
          {
            id: "M01-A01-T03",
            numeroTela: 3,
            numeroAula: 1,
            numeroModulo: 1,
            titulo: "Conhecendo as Vogais",
            conteudo: [],
            orientacaoParaAlfabetizador:
              "Apresente as vogais. Procure pronunciar cada letra articulando bem a boca. Peça ao alfabetizando que repita por 5 vezes.",
            atividades: [],
          },
          {
            id: "M01-A01-T04",
            numeroTela: 4,
            numeroAula: 1,
            numeroModulo: 1,
            titulo: "A letra A – Aranha",
            conteudo: [{ kind: "video", value: "VID-M01-A01-T04" }],
            orientacaoParaAlfabetizador:
              "Nesta unidade de estudo, vamos conhecer a letra A.\nPeça ao alfabetizando para pensar em uma aranha. Repita com ele a palavra \"aranha\".",
            atividades: [
              {
                id: "M01-A01-T04-AT01",
                numeroAtividade: 1,
                numeroTela: 4,
                numeroAula: 1,
                numeroModulo: 1,
                titulo: "Formas de escrever a letra A",
                conteudo: [
                  { kind: "video", value: "VID-M01-A01-T04-AT01" },
                ],
                orientacaoParaAlfabetizador:
                  "Apresente as formas de escrever a letra A",
                orientacaoParaAlfabetizando:
                  "Veja como a letra A pode ser escrita de diferentes formas. Tente copiar cada uma!",
                conclusao: [
                  {
                    kind: "text",
                    value:
                      "Muito bem! Você conheceu as diferentes formas de escrever a letra A.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
