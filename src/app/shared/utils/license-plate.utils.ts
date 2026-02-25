const LICENSE_PLATE_CLASSES =
  'inline-flex items-center !text-base px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-mono font-semibold uppercase tracking-widest';

export function licensePlateBadge(value: string | null | undefined): string {
  const text = value ? String(value).trim() : '';
  if (!text) return '';
  return `<span class="${LICENSE_PLATE_CLASSES}">${escapeHtml(text)}</span>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
