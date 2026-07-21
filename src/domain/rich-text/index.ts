export function richTextPlainText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasMeaningfulRichText(value: string | null | undefined): boolean {
  return richTextPlainText(value).length > 0
}
