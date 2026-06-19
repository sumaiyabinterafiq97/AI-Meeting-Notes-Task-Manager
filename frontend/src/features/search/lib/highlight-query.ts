export function highlightQueryInText(text: string, query: string): string {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const safeText = escapeHtml(text);
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length >= 2);

  if (terms.length === 0) {
    return safeText;
  }

  const pattern = terms.map(escapeRegex).join('|');
  return safeText.replace(new RegExp(`(${pattern})`, 'gi'), '<em>$1</em>');
}
