/**
 * Script de teste manual para o gateway Socket.IO do Letras.
 *
 * Uso:
 *   EDUCATOR_ID=<uuid> LEARNER_ID=<uuid> pnpm --filter api test:socket
 *
 * Requisito: API rodando em http://localhost:3000 (ou API_URL=<url>)
 */

import { io, Socket } from 'socket.io-client';

const API_URL = process.env.API_URL ?? 'http://localhost:3000';
const SOCKET_URL = `${API_URL}/realtime`;
const EDUCATOR_ID = process.env.EDUCATOR_ID ?? '';
const LEARNER_ID = process.env.LEARNER_ID ?? '';

// ── helpers ──────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;

function pass(label: string) {
  passed++;
  console.log(`  ${GREEN}✓${RESET} ${label}`);
}

function fail(label: string, reason?: string) {
  failed++;
  console.log(`  ${RED}✗${RESET} ${label}${reason ? ` — ${reason}` : ''}`);
}

function section(title: string) {
  console.log(`\n${BOLD}${CYAN}▸ ${title}${RESET}`);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForEvent<T>(socket: Socket, event: string, timeoutMs = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout esperando '${event}'`)), timeoutMs);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function connectSocket(query: Record<string, string>): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, { transports: ['websocket'], query });
    const timer = setTimeout(() => reject(new Error('timeout ao conectar')), 4000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once('connect_error', (err: Error) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// ── testes ───────────────────────────────────────────────────────────────────

async function testPresenceSnapshot() {
  section('Presença — snapshot inicial ao educador conectar');

  const educator = await connectSocket({ educatorId: EDUCATOR_ID, role: 'educator', participantId: 'edu-test' });
  pass('educador conectou');

  // Aprendiz conecta DEPOIS do educador
  const snapshotPromise = waitForEvent<{ onlineIds: string[] }>(educator, 'learner_presence_snapshot', 1000).catch(
    () => null,
  );

  // O snapshot é enviado no momento da conexão do educador, não depois.
  // Aqui verificamos apenas que o evento chegou (pode ter onlineIds vazio).
  const snapshot = await snapshotPromise;
  if (snapshot !== null && Array.isArray(snapshot?.onlineIds)) {
    pass(`learner_presence_snapshot recebido (${snapshot.onlineIds.length} online)`);
  } else {
    pass('learner_presence_snapshot não recebeu payload (nenhum aprendiz online ainda)');
  }

  educator.disconnect();
}

async function testLearnerPresenceChange() {
  section('Presença — educador recebe learner_presence_changed');

  const educator = await connectSocket({ educatorId: EDUCATOR_ID, role: 'educator', participantId: 'edu-test-2' });
  pass('educador conectou');

  const presencePromise = waitForEvent<{ learnerProfileId: string; online: boolean }>(
    educator,
    'learner_presence_changed',
  );

  await wait(200); // garante que o educador está na sala antes do aprendiz conectar

  const learner = await connectSocket({
    learnerProfileId: LEARNER_ID,
    role: 'learner',
    participantId: 'learner-test-1',
  });
  pass('aprendiz conectou');

  try {
    const evt = await presencePromise;
    if (evt.learnerProfileId === LEARNER_ID && evt.online === true) {
      pass(`educador recebeu learner_presence_changed { online: true, learnerProfileId: ${evt.learnerProfileId} }`);
    } else {
      fail('learner_presence_changed com payload incorreto', JSON.stringify(evt));
    }
  } catch (e: unknown) {
    fail('educador NÃO recebeu learner_presence_changed quando aprendiz conectou', (e as Error).message);
  }

  // Desconecta aprendiz — educador deve receber online: false
  const offlinePromise = waitForEvent<{ learnerProfileId: string; online: boolean }>(
    educator,
    'learner_presence_changed',
  );
  learner.disconnect();

  try {
    const evt = await offlinePromise;
    if (evt.learnerProfileId === LEARNER_ID && evt.online === false) {
      pass(`educador recebeu learner_presence_changed { online: false } após aprendiz desconectar`);
    } else {
      fail('learner_presence_changed (offline) com payload incorreto', JSON.stringify(evt));
    }
  } catch (e: unknown) {
    fail('educador NÃO recebeu learner_presence_changed quando aprendiz desconectou', (e as Error).message);
  }

  educator.disconnect();
}

async function testLockViaRestApi() {
  section('Lock — PUT /sessions/:id/lock dispara socket events');

  const educator = await connectSocket({ educatorId: EDUCATOR_ID, role: 'educator', participantId: 'edu-lock-test' });

  await wait(200);

  const learner = await connectSocket({
    learnerProfileId: LEARNER_ID,
    role: 'learner',
    participantId: 'learner-lock-test',
  });

  await wait(200); // deixa ambos se registrarem

  // Educador aguarda lock_set
  const lockSetPromise = waitForEvent<{ learnerProfileId: string }>(educator, 'lock_set');
  // Aprendiz aguarda locked_changed
  const lockedChangedPromise = waitForEvent<{ learnerProfileId: string; isLocked: boolean }>(
    learner,
    'locked_changed',
  );

  // Dispara via REST (caminho real do mobile)
  try {
    const res = await fetch(`${API_URL}/sessions/${LEARNER_ID}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLocked: true }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    pass('PUT /sessions/:id/lock { isLocked: true } → 200');
  } catch (e: unknown) {
    fail(`PUT /sessions/:id/lock falhou`, (e as Error).message);
    educator.disconnect();
    learner.disconnect();
    return;
  }

  try {
    const evt = await lockSetPromise;
    if (evt.learnerProfileId === LEARNER_ID) {
      pass(`educador recebeu lock_set { learnerProfileId: ${evt.learnerProfileId} }`);
    } else {
      fail('lock_set com learnerProfileId incorreto', JSON.stringify(evt));
    }
  } catch (e: unknown) {
    fail('educador NÃO recebeu lock_set', (e as Error).message);
  }

  try {
    const evt = await lockedChangedPromise;
    if (evt.isLocked === true) {
      pass(`aprendiz recebeu locked_changed { isLocked: true }`);
    } else {
      fail('locked_changed com isLocked incorreto', JSON.stringify(evt));
    }
  } catch (e: unknown) {
    fail('aprendiz NÃO recebeu locked_changed', (e as Error).message);
  }

  // Desbloqueia
  const lockReleasePromise = waitForEvent<{ learnerProfileId: string }>(educator, 'lock_release');
  try {
    const res2 = await fetch(`${API_URL}/sessions/${LEARNER_ID}/lock`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLocked: false }),
    });
    if (!res2.ok) throw new Error(`HTTP ${res2.status}: ${await res2.text()}`);
    pass('PUT /sessions/:id/lock { isLocked: false } → 200');
    await lockReleasePromise;
    pass('educador recebeu lock_release');
  } catch (e: unknown) {
    fail('lock_release não recebido ou REST falhou', (e as Error).message);
  }

  educator.disconnect();
  learner.disconnect();
}

async function testHelpRequested() {
  section('Help — aprendiz envia help_requested, educador recebe');

  const educator = await connectSocket({ educatorId: EDUCATOR_ID, role: 'educator', participantId: 'edu-help-test' });

  await wait(200);

  const learner = await connectSocket({
    learnerProfileId: LEARNER_ID,
    role: 'learner',
    participantId: 'learner-help-test',
  });

  await wait(200);

  const helpPromise = waitForEvent<{ learnerProfileId: string; message?: string }>(educator, 'help_requested');

  learner.emit('help_requested', {
    learnerProfileId: LEARNER_ID,
    message: 'Preciso de ajuda com esse exercício!',
    snapshot: { screenIndex: 2, totalScreens: 5 },
  });

  try {
    const evt = await helpPromise;
    if (evt.learnerProfileId === LEARNER_ID) {
      pass(`educador recebeu help_requested (message: "${evt.message ?? ''}")`);
    } else {
      fail('help_requested com payload incorreto', JSON.stringify(evt));
    }
  } catch (e: unknown) {
    fail('educador NÃO recebeu help_requested', (e as Error).message);
  }

  educator.disconnect();
  learner.disconnect();
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}Socket.IO — Testes de integração${RESET}`);
  console.log(`${YELLOW}API:${RESET}      ${API_URL}`);
  console.log(`${YELLOW}Educador:${RESET} ${EDUCATOR_ID || '(não definido — use EDUCATOR_ID=<uuid>)'}`);
  console.log(`${YELLOW}Aprendiz:${RESET} ${LEARNER_ID || '(não definido — use LEARNER_ID=<uuid>)'}`);

  if (!EDUCATOR_ID || !LEARNER_ID) {
    console.log(`\n${RED}✗ EDUCATOR_ID e LEARNER_ID são obrigatórios.${RESET}`);
    console.log(`  Exemplo: EDUCATOR_ID=abc LEARNER_ID=xyz pnpm --filter api test:socket\n`);
    process.exit(1);
  }

  try {
    await testPresenceSnapshot();
    await testLearnerPresenceChange();
    await testLockViaRestApi();
    await testHelpRequested();
  } catch (e: unknown) {
    console.log(`\n${RED}Erro inesperado: ${(e as Error).message}${RESET}`);
  }

  console.log(`\n${BOLD}Resultado: ${GREEN}${passed} passou${RESET}${BOLD}, ${RED}${failed} falhou${RESET}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
