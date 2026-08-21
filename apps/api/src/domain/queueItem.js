const MOBILE_LOCK_PREFIX = "mobile-lock-";

export function parseMobileLockStudentId(queueItemId) {
  const value = String(queueItemId ?? "").trim();
  if (!value.startsWith(MOBILE_LOCK_PREFIX)) return null;
  return value.slice(MOBILE_LOCK_PREFIX.length).trim() || null;
}
