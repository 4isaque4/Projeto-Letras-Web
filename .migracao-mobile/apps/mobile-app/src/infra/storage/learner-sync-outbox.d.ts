export type LearnerSyncOutboxKind =
  | "progress"
  | "completion"
  | "help"
  | "session";

export type LearnerSyncOutboxMethod = "POST" | "PATCH" | "PUT";

export interface LearnerSyncOutboxEntry {
  idempotencyKey: string;
  learnerId: string;
  kind: LearnerSyncOutboxKind;
  endpoint: string;
  method: LearnerSyncOutboxMethod;
  payload: Record<string, unknown>;
  attempts?: number;
  lastError?: string | null;
  createdAt: string;
}

export interface LearnerSyncStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface CreateLearnerSyncOutboxOptions {
  storage: LearnerSyncStorageAdapter;
  storageKey?: string;
}

export interface LearnerSyncOutbox {
  enqueue(entry: LearnerSyncOutboxEntry): Promise<LearnerSyncOutboxEntry[]>;
  pending(learnerId?: string): Promise<LearnerSyncOutboxEntry[]>;
  ack(idempotencyKey: string): Promise<void>;
  drain(
    sender: (entry: LearnerSyncOutboxEntry) => Promise<unknown>,
    learnerId?: string,
  ): Promise<LearnerSyncOutboxEntry[]>;
}

export const OUTBOX_STORAGE_KEY: string;

export function addEntry(
  entries: LearnerSyncOutboxEntry[],
  entry: LearnerSyncOutboxEntry,
): LearnerSyncOutboxEntry[];

export function removeEntry(
  entries: LearnerSyncOutboxEntry[],
  idempotencyKey: string,
): LearnerSyncOutboxEntry[];

export function markAttempt(
  entries: LearnerSyncOutboxEntry[],
  idempotencyKey: string,
  error?: string | null,
): LearnerSyncOutboxEntry[];

export function createLearnerSyncOutbox(
  options: CreateLearnerSyncOutboxOptions,
): LearnerSyncOutbox;
