function timestamp(value) {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/** Ordena uma copia da lista da data mais recente para a mais antiga. */
export function orderByNewest(items, selectDate) {
  return [...(items ?? [])].sort(
    (left, right) => timestamp(selectDate(right)) - timestamp(selectDate(left)),
  );
}
