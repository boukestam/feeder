export function stripHTML(html: string) {
  return html.replace(/<[^>]*>?/gm, '');
}