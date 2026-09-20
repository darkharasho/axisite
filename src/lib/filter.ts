export function matches(
  card: { search: string; category: string },
  query: string,
  active: string | null,
): boolean {
  if (active && card.category !== active) return false;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((t) => card.search.includes(t));
}
