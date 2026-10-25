export function normalizePlayerSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export function matchesPlayerSearch(query: string, values: Array<string | null>) {
  const normalizedQuery = normalizePlayerSearchText(query);
  if (!normalizedQuery) return true;

  return values.some(
    (value) =>
      value !== null &&
      normalizePlayerSearchText(value).includes(normalizedQuery),
  );
}
