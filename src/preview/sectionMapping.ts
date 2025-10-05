// Helper for mapping arbitrary section titles to canonical IDs used in tabbed theme
// Keeps logic independent of VS Code APIs for easy unit testing.

export function canonicalSectionId(title: string): string {
  const slug = title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const map: Record<string, string> = {
    'frequently-asked-questions': 'faq',
    'faq': 'faq',
    'description': 'description',
    'installation': 'installation',
    'changelog': 'changelog',
    'screenshots': 'screenshots'
  };
  return map[slug] || slug;
}

export function isCanonicalTab(id: string): boolean {
  return ['description','installation','faq','changelog'].includes(id);
}
