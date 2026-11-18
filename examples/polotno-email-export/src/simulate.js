// A rough look at what each client does to the same HTML, done in the browser:
// enough to see the differences without sending a test email.

export const CLIENTS = {
  apple: { label: 'Apple Mail', note: 'Apple Mail and iOS load web fonts and show every effect.' },
  gmail: { label: 'Gmail', note: 'Gmail shows the fallback font and drops text outlines and shadows.' },
  outlook: { label: 'Outlook', note: 'Classic Outlook: fallback fonts, no outlines or shadows, and always the desktop page.' },
  noimages: { label: 'Images off', note: 'Many clients block images until the reader allows them. Live text and cell colours still show.' },
};

const stripWebFonts = (html) =>
  html
    .replace(/@import\s+url\([^)]*\)[^;]*;/g, '')
    .replace(/@font-face\s*{[^}]*}/g, '')
    .replace(/<link[^>]+fonts\.googleapis[^>]*>/g, '');

const stripEffects = (html) => html.replace(/(-webkit-)?text-stroke[^;"]*;?/g, '').replace(/text-shadow:[^;"]*;?/g, '');

// Outlook ignores media queries, so it never switches to the mobile page.
const stripMediaQueries = (html) => html.replace(/@media[^{]*{([^{}]*{[^}]*})*[^}]*}/g, '');

const stripImages = (html) =>
  html
    .replace(/<img\b[^>]*>/g, '')
    .replace(/background-image:\s*url\([^)]*\);?/g, '')
    .replace(/\sbackground="[^"]*"/g, '');

export function simulate(html, client) {
  if (!html) return html;
  switch (client) {
    case 'gmail':
      return stripEffects(stripWebFonts(html));
    case 'outlook':
      return stripMediaQueries(stripEffects(stripWebFonts(html)));
    case 'noimages':
      return stripImages(html);
    default:
      return html;
  }
}
