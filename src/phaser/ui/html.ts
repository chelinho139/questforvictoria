/** Text made safe to put in HTML (names and room names come from other players). */
export function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}
