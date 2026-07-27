import { CompletionStatus, PrismaClient, SessionRole } from '@prisma/client';
import { hashPassword } from '../src/common/security/password-hash';

const prisma = new PrismaClient();

async function seedThemeTrabalhoERenda() {
  const theme = await prisma.theme.upsert({
    where: { name: 'Trabalho e Renda' },
    update: {
      description: 'Palavras do cotidiano ligadas ao trabalho, renda e autonomia.',
    },
    create: {
      name: 'Trabalho e Renda',
      description: 'Palavras do cotidiano ligadas ao trabalho, renda e autonomia.',
    },
  });

  await prisma.learningUnit.deleteMany({ where: { themeId: theme.id } });

  const unit1 = await prisma.learningUnit.create({
    data: {
      themeId: theme.id,
      title: 'Palavras do dia a dia no trabalho',
      description: 'Reconhecimento de palavras frequentes.',
      order: 1,
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        learningUnitId: unit1.id,
        prompt: 'Leia a palavra: SALARIO',
        content: { answer: 'SALARIO' },
        order: 1,
      },
      {
        learningUnitId: unit1.id,
        prompt: 'Associe a palavra ao desenho: FERRAMENTA',
        content: { answer: 'FERRAMENTA' },
        type: 'MATCHING',
        order: 2,
      },
    ],
  });

  const unit2 = await prisma.learningUnit.create({
    data: {
      themeId: theme.id,
      title: 'Escrita funcional',
      description: 'Escrita de palavras usadas no cotidiano profissional.',
      order: 2,
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        learningUnitId: unit2.id,
        prompt: 'Escreva a palavra: CONTRATO',
        content: { answer: 'CONTRATO' },
        type: 'WRITING',
        order: 1,
      },
      {
        learningUnitId: unit2.id,
        prompt: 'Leia em voz alta a frase: "Eu conheco meus direitos"',
        content: { answer: 'Leitura em voz alta' },
        type: 'SPEAKING',
        order: 2,
      },
    ],
  });

  return theme;
}

async function seedThemeComunidadeESaude() {
  const theme = await prisma.theme.upsert({
    where: { name: 'Comunidade e Saude' },
    update: {
      description: 'Vocabulário para participação social e cuidado com a saúde.',
    },
    create: {
      name: 'Comunidade e Saude',
      description: 'Vocabulário para participação social e cuidado com a saúde.',
    },
  });

  await prisma.learningUnit.deleteMany({ where: { themeId: theme.id } });

  const unit = await prisma.learningUnit.create({
    data: {
      themeId: theme.id,
      title: 'Servicos da comunidade',
      description: 'Leitura de palavras em placas e cartazes.',
      order: 1,
    },
  });

  await prisma.activity.createMany({
    data: [
      {
        learningUnitId: unit.id,
        prompt: 'Leia a palavra: POSTO',
        content: { answer: 'POSTO' },
        order: 1,
      },
      {
        learningUnitId: unit.id,
        prompt: 'Associe: FARMACIA',
        content: { answer: 'FARMACIA' },
        type: 'MATCHING',
        order: 2,
      },
    ],
  });

  return theme;
}

async function main() {
  const educator = await prisma.educator.upsert({
    where: { email: 'educadora@letras.app' },
    update: {
      name: 'Educadora Ana',
      cpf: '11111111111',
      phoneDigits: '11988887777',
      passwordHash: hashPassword('123456'),
    },
    create: {
      name: 'Educadora Ana',
      email: 'educadora@letras.app',
      cpf: '11111111111',
      phoneDigits: '11988887777',
      passwordHash: hashPassword('123456'),
    },
  });

  const [themeA, themeB] = await Promise.all([
    seedThemeTrabalhoERenda(),
    seedThemeComunidadeESaude(),
  ]);

  let learner = await prisma.learnerProfile.findFirst({
    where: {
      displayName: 'Maria do Carmo',
      educatorId: educator.id,
    },
  });

  if (!learner) {
    learner = await prisma.learnerProfile.create({
      data: {
        displayName: 'Maria do Carmo',
        notes: 'Perfil inicial para demonstração.',
        educatorId: educator.id,
      },
    });
  }

  await prisma.learnerTheme.upsert({
    where: {
      learnerProfileId_themeId: {
        learnerProfileId: learner.id,
        themeId: themeA.id,
      },
    },
    update: {},
    create: {
      learnerProfileId: learner.id,
      themeId: themeA.id,
    },
  });

  await prisma.learnerTheme.upsert({
    where: {
      learnerProfileId_themeId: {
        learnerProfileId: learner.id,
        themeId: themeB.id,
      },
    },
    update: {},
    create: {
      learnerProfileId: learner.id,
      themeId: themeB.id,
    },
  });

  const session = await prisma.learnerSession.upsert({
    where: {
      learnerProfileId: learner.id,
    },
    update: {
      deviceId: 'demo-android-01',
      role: SessionRole.LEARNER,
      connectedAt: new Date(),
    },
    create: {
      learnerProfileId: learner.id,
      deviceId: 'demo-android-01',
      role: SessionRole.LEARNER,
      connectedAt: new Date(),
    },
  });

  await prisma.sessionState.upsert({
    where: { sessionId: session.id },
    update: {
      currentView: 'activity',
      statePayload: {
        activeThemeName: themeA.name,
        unitOrder: 1,
      },
      isLocked: false,
    },
    create: {
      sessionId: session.id,
      currentView: 'activity',
      statePayload: {
        activeThemeName: themeA.name,
        unitOrder: 1,
      },
      isLocked: false,
    },
  });

  const firstActivity = await prisma.activity.findFirst({
    orderBy: [{ createdAt: 'asc' }],
  });

  if (firstActivity) {
    await prisma.completion.upsert({
      where: {
        learnerProfileId_activityId: {
          learnerProfileId: learner.id,
          activityId: firstActivity.id,
        },
      },
      update: {
        status: CompletionStatus.COMPLETED,
        score: 100,
        elapsedSeconds: 45,
        completedAt: new Date(),
      },
      create: {
        learnerProfileId: learner.id,
        activityId: firstActivity.id,
        status: CompletionStatus.COMPLETED,
        score: 100,
        elapsedSeconds: 45,
        completedAt: new Date(),
      },
    });
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
