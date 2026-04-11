export interface Modulo {
  id: number;
  titulo: string;
  totalAulas: number;
  aulasCompletas: number;
}

export interface Aula {
  id: number;
  moduloId: number;
  titulo: string;
  objetivo: string;
  totalTelas: number;
  telasCompletas: number;
  videoAula?: string;
  imagemAula?: string;
  textoConclusao?: string;
}

export interface Tela {
  id: number;
  aulaId: number;
  moduloId: number;
  titulo: string;
  texto?: string;
  audio?: string;
  video?: string;
  imagem?: string;
  orientacaoAlfabetizador?: string;
  orientacaoParaAluno?: string;
}

export interface Atividade {
  id: number;
  telaId: number;
  aulaId: number;
  moduloId: number;
  titulo: string;
  texto?: string;
  imagem?: string;
  video?: string;
  orientacaoAlfabetizador?: string;
  orientacaoParaAluno?: string;
  textoConclusao?: string;
  tipo: "multipla-escolha" | "escrita" | "audio" | "associacao";
  opcoes?: string[];
  respostaCorreta?: string;
}

export const modulos: Modulo[] = [
  { id: 1, titulo: "Módulo 1 – Vogais e Sons Iniciais", totalAulas: 4, aulasCompletas: 2 },
  { id: 2, titulo: "Módulo 2 – Consoantes Simples", totalAulas: 5, aulasCompletas: 0 },
  { id: 3, titulo: "Módulo 3 – Sílabas e Palavras", totalAulas: 4, aulasCompletas: 0 },
];

export const aulas: Aula[] = [
  { id: 1, moduloId: 1, titulo: "Aula 1 – Conhecendo as Vogais", objetivo: "Identificar e reconhecer as 5 vogais (A, E, I, O, U) em diferentes contextos.", totalTelas: 6, telasCompletas: 6, textoConclusao: "Parabéns! Você completou a Aula 1. O alfabetizando agora conhece as 5 vogais!" },
  { id: 2, moduloId: 1, titulo: "Aula 2 – Sons das Vogais", objetivo: "Associar cada vogal ao seu som e identificá-las em palavras do dia a dia.", totalTelas: 5, telasCompletas: 3, textoConclusao: "Ótimo trabalho! O aprendiz já identifica os sons das vogais." },
  { id: 3, moduloId: 1, titulo: "Aula 3 – Vogais no Nome", objetivo: "Reconhecer as vogais presentes no próprio nome.", totalTelas: 4, telasCompletas: 0 },
  { id: 4, moduloId: 1, titulo: "Aula 4 – Revisão de Vogais", objetivo: "Revisar todas as vogais aprendidas.", totalTelas: 5, telasCompletas: 0 },
  { id: 5, moduloId: 2, titulo: "Aula 1 – Letra B e P", objetivo: "Identificar e diferenciar B e P.", totalTelas: 5, telasCompletas: 0 },
];

export const telas: Tela[] = [
  {
    id: 1, aulaId: 1, moduloId: 1,
    titulo: "Apresentação das Vogais",
    texto: "As vogais são as letras mais importantes do alfabeto. São elas: A, E, I, O, U. Toda palavra tem pelo menos uma vogal!",
    orientacaoAlfabetizador: "Apresente as vogais uma a uma. Peça ao alfabetizando para repetir cada som. Use objetos do ambiente para exemplificar.",
    orientacaoParaAluno: "Vamos conhecer as vogais? Repita comigo: A... E... I... O... U... Muito bem!",
  },
  {
    id: 2, aulaId: 1, moduloId: 1,
    titulo: "A Vogal A",
    texto: "A letra A é a primeira do alfabeto. Palavras com A: Amor, Amigo, Água, Abelha.",
    orientacaoAlfabetizador: "Mostre a letra A em diferentes tamanhos. Peça ao aprendiz para desenhar no ar e depois no papel.",
    orientacaoParaAluno: "Olhe a letra A. Consegue ver ela no seu nome? Vamos procurar!",
  },
  {
    id: 3, aulaId: 1, moduloId: 1,
    titulo: "A Vogal E",
    texto: "A letra E aparece em muitas palavras. Palavras com E: Estrela, Escola, Elefante.",
    orientacaoAlfabetizador: "Peça para o aprendiz falar palavras que começam com E.",
    orientacaoParaAluno: "Agora vamos ver a letra E. Ela está em 'Estrela'. Que outras palavras com E você conhece?",
  },
  {
    id: 4, aulaId: 1, moduloId: 1,
    titulo: "Vídeo – As Vogais Cantadas",
    texto: "Assista ao vídeo e cante junto! As vogais são divertidas.",
    video: "/src/imports/WhatsApp_Video_2026-04-01_at_19.22.17.mp4",
    orientacaoAlfabetizador: "Reproduza o vídeo. Incentive o aprendiz a cantar junto e bater palmas a cada vogal.",
    orientacaoParaAluno: "Vamos cantar as vogais? Preste atenção no vídeo!",
  },
  {
    id: 5, aulaId: 1, moduloId: 1,
    titulo: "Prática – Identificando Vogais",
    texto: "Agora é hora de praticar! Vamos ver se você consegue encontrar as vogais.",
    orientacaoAlfabetizador: "Acompanhe o aprendiz na atividade. Ajude se necessário.",
    orientacaoParaAluno: "Toque nas vogais que aparecem na tela!",
  },
  {
    id: 6, aulaId: 1, moduloId: 1,
    titulo: "As Vogais I, O, U",
    texto: "I de Igreja, O de Ovo, U de Uva. Cada vogal tem um som especial!",
    orientacaoAlfabetizador: "Finalize apresentando I, O e U. Faça uma revisão rápida de todas.",
    orientacaoParaAluno: "Muito bem! Você já conhece todas as vogais: A, E, I, O, U!",
  },
];

export const atividades: Atividade[] = [
  {
    id: 1, telaId: 5, aulaId: 1, moduloId: 1,
    titulo: "Encontre a Vogal",
    texto: "Qual destas letras é uma vogal?",
    tipo: "multipla-escolha",
    opcoes: ["B", "A", "C", "D"],
    respostaCorreta: "A",
    orientacaoAlfabetizador: "Leia as opções para o aprendiz se necessário.",
    orientacaoParaAluno: "Toque na letra que é uma vogal!",
    textoConclusao: "Isso mesmo! A letra A é uma vogal!",
  },
  {
    id: 2, telaId: 5, aulaId: 1, moduloId: 1,
    titulo: "Som da Vogal",
    texto: "Qual vogal tem o som de 'Eeee'?",
    tipo: "multipla-escolha",
    opcoes: ["A", "E", "O", "U"],
    respostaCorreta: "E",
    orientacaoAlfabetizador: "Reproduza o som para o aprendiz.",
    orientacaoParaAluno: "Escute o som e escolha a vogal correta!",
    textoConclusao: "Muito bem! A letra E faz o som 'Eeee'!",
  },
];
