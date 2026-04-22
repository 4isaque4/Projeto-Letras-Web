# Glossário do produto Letras

Documento canônico de conceitos do produto. Em caso de divergência com wireframes, copy de UI ou PRs, este glossário prevalece.

## Tema

**Tema é o universo de interesse do alfabetizando** — algo que ele goste, tenha familiaridade ou facilidade de se conectar. Serve como vetor pedagógico de engajamento.

Exemplos reais de tema:

- Animais
- Comida
- Zona rural / campo
- Profissões (policial, bombeiro, médico)
- Desenhos animados
- Esportes

**Tema NÃO é estrutura didática.** Não são tema:

- "Alfabeto — Vogais"
- "Etapa 2 — Reconhecimento"
- "Fonemas"
- "Sílabas simples"

Essas classificações são **estrutura de aprendizado** e vão no nome do **módulo** ou da **aula**.

### Por que essa distinção importa

A pedagogia do Letras usa o interesse do aluno como porta de entrada. O mesmo exercício `RN121` de "marcar a letra A" pode ser montado com imagens do universo **Animais** (abelha, aranha, anzol) ou do universo **Profissões** (ambulância, ator, advogado), dependendo do que aquele alfabetizando se identifica.

Consequências práticas:

- O tema escolhido define as **imagens** e **áudios** usados no exercício.
- O tema NÃO define a sequência de aprendizado — isso é papel do módulo.
- Um mesmo alfabetizando pode ter aulas distribuídas em múltiplos temas, desde que conectados ao interesse dele.

## Módulo

Agrupamento didático dentro de um tema. É aqui que entra a estrutura de aprendizado:

- "Etapa 2 — Reconhecimento da letra A"
- "Fonemas vocálicos"
- "Sílabas simples com a letra M"

Cada módulo vive dentro de um tema e agrupa uma sequência de aulas.

## Aula (activity)

Tela ou exercício individual que o alfabetizando executa no app mobile. Tipos possíveis: `video`, `audio`, `quiz`, `letra`. Exercícios estruturados (RN121, RN123) usam payload JSON no schema `letras-stage2-v1`.

## Hierarquia resumida

```
Tema (universo de interesse)
 └── Módulo (estrutura didática)
      └── Aula (tela/exercício)
           └── Mídias (imagens, áudios, vídeos)
```

## Alfabetizando vs Alfabetizador

- **Alfabetizando**: o aluno adulto. Usa o app mobile.
- **Alfabetizador**: o voluntário/professor que acompanha o alfabetizando. Usa o painel web.

## Telas-base (blueprints)

Templates de tela importados via `/admin/conteudo/importar-telas`. Servem de base visual para montar aulas no wizard. Não são publicadas diretamente — são usadas como referência ao montar uma aula concreta.

## Etapa

Divisão macro da jornada pedagógica. No MVP atual: Etapa 1 (tutoriais, base) e Etapa 2 (reconhecimento de letras). A etapa é um atributo do módulo (`stage_number`).
