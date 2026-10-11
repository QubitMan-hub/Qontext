// Text that travels: project names end up in CSS comments, JavaScript configs, SVG files and Figma. These
// helpers make sure a name can never break out of the place it is written into.

const CONTROL = (c) => c < 0x20 || (c >= 0x7f && c < 0xa0) || c === 0x2028 || c === 0x2029;

/** Printable, single-line text: control characters and line breaks become spaces, runs of space collapse. */
export function oneLine(s) {
  return Array.from(String(s ?? ''), (ch) => (CONTROL(ch.codePointAt(0)) ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escapes text for XML and HTML content and attribute values. */
export function xmlEscape(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

/** Text safe inside a CSS or JavaScript block comment. */
export const commentSafe = (s) => oneLine(s).replace(/\*\//g, '* /');
