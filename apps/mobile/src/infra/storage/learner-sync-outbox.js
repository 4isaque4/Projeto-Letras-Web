// Outbox de sincronizacao do alfabetizando.
//
// Escritas de progresso, conclusao, ajuda e sessao passam por aqui quando a
// rede falha. Cada item carrega uma idempotencyKey; reenfileirar o mesmo item
// nao duplica o envio, e o servidor confirma cada item individualmente ao
// drenar. A logica e pura e recebe o storage por injecao (mesmo contrato do
// AsyncStorage: getItem/setItem/removeItem) para poder ser testada com
// `node --test`, sem depender do React Native.

export const OUTBOX_STORAGE_KEY = "@letras/learner-sync-outbox";

// Insere ou atualiza um item pela idempotencyKey, preservando a contagem de
// tentativas ja acumulada quando o item ja existia.
export function addEntry(entries, entry) {
  const index = entries.findIndex(
    (item) => item.idempotencyKey === entry.idempotencyKey,
  );
  if (index === -1) {
    return [...entries, entry];
  }
  const next = entries.slice();
  next[index] = { ...entries[index], ...entry, attempts: entries[index].attempts ?? 0 };
  return next;
}

// Remove um item confirmado pelo servidor.
export function removeEntry(entries, idempotencyKey) {
  return entries.filter((item) => item.idempotencyKey !== idempotencyKey);
}

// Registra uma tentativa falha sem descartar o item.
export function markAttempt(entries, idempotencyKey, error) {
  return entries.map((item) =>
    item.idempotencyKey === idempotencyKey
      ? { ...item, attempts: (item.attempts ?? 0) + 1, lastError: error ?? null }
      : item,
  );
}

export function createLearnerSyncOutbox(options) {
  const storage = options?.storage;
  const storageKey = options?.storageKey ?? OUTBOX_STORAGE_KEY;
  if (!storage || typeof storage.getItem !== "function") {
    throw new Error("createLearnerSyncOutbox: storage adapter invalido");
  }

  async function readAll() {
    const raw = await storage.getItem(storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function writeAll(entries) {
    await storage.setItem(storageKey, JSON.stringify(entries));
  }

  return {
    async enqueue(entry) {
      if (!entry || typeof entry.idempotencyKey !== "string" || !entry.idempotencyKey) {
        throw new Error("outbox.enqueue: idempotencyKey obrigatoria");
      }
      const entries = await readAll();
      const next = addEntry(entries, { attempts: 0, ...entry });
      await writeAll(next);
      return next;
    },

    async pending(learnerId) {
      const entries = await readAll();
      if (typeof learnerId !== "string" || !learnerId) {
        return entries;
      }
      return entries.filter((item) => item.learnerId === learnerId);
    },

    async ack(idempotencyKey) {
      const entries = await readAll();
      await writeAll(removeEntry(entries, idempotencyKey));
    },

    // Envia cada item pendente via `sender(entry)`. Sucesso remove apenas
    // aquele item; falha mantem o item e incrementa a tentativa, sem
    // interromper os demais. Retorna os itens que continuam pendentes.
    async drain(sender, learnerId) {
      const all = await readAll();
      const target =
        typeof learnerId === "string" && learnerId
          ? all.filter((item) => item.learnerId === learnerId)
          : all;

      let current = all;
      for (const entry of target) {
        try {
          await sender(entry);
          current = removeEntry(current, entry.idempotencyKey);
          await writeAll(current);
        } catch (error) {
          const message =
            error && typeof error === "object" && "message" in error
              ? String(error.message)
              : String(error);
          current = markAttempt(current, entry.idempotencyKey, message);
          await writeAll(current);
        }
      }
      return current;
    },
  };
}
