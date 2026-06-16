export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'workspace';
}

export async function generateUniqueSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(name).slice(0, 100);
  let slug = base;
  let counter = 1;

  while (await exists(slug)) {
    const suffix = `-${counter}`;
    slug = `${base.slice(0, 120 - suffix.length)}${suffix}`;
    counter += 1;
  }

  return slug;
}
