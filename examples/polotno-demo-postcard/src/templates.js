/**
 * Postcard template catalog for the "Custom Postcard UI" demo.
 *
 * Each card is a real Polotno scene JSON (front + back) authored on the layer-name
 * convention so the toolbars can drive it without hard-coded ids:
 *   *-accent      → recoloured by the Accent control
 *   *background*  → recoloured by the Background control
 *   *placeholder* → click-to-replace photo area
 *   greeting*     → the message text (Font / Colour / Size on the Back step)
 *
 * The Style grid shows only a tiny static preview image — the heavy scene JSON is
 * lazy-loaded (dynamic import → its own chunk) the moment a card is picked, so the
 * first step is instant and no big JSON is parsed up front.
 */

import justListedPreview from './templates/previews/just_listed.jpg';
import wishPreview from './templates/previews/wish_you_were_here.jpg';

/** Handwritten set — greeting-card cards. Includes 'Aguafina Script' (the Wish default). */
const HANDWRITTEN_FONTS = [
  'Aguafina Script',
  'Caveat',
  'Dancing Script',
  'Pacifico',
  'Satisfy',
  'Sacramento',
  'Shadows Into Light',
  'Great Vibes',
];

export const POSTCARD_TEMPLATES = {
  just_listed: {
    name: 'Just Listed',
    preview: justListedPreview,
    colors: [
      'rgba(139,87,42,1)',
      'rgba(17,17,17,1)',
      '#0b4f8a',
      '#7a1f1f',
      '#2c3e50',
      '#f4f4f4',
    ],
    // Formal, real-estate-appropriate set (display + editorial serif + clean sans).
    fonts: [
      'Anton',
      'Oswald',
      'Archivo',
      'Montserrat',
      'Playfair Display',
      'Cormorant Garamond',
      'Roboto Mono',
      'IBM Plex Sans',
    ],
    load: () => import('./templates/just-listed.json').then((m) => structuredClone(m.default)),
  },

  wish_you_were_here: {
    name: 'Wish you were here',
    preview: wishPreview,
    colors: [
      'rgba(6,132,99,1)',
      'rgba(237,168,220,1)',
      '#0b4f8a',
      '#e75050',
      '#161616',
      '#f4f4f4',
    ],
    fonts: HANDWRITTEN_FONTS,
    load: () => import('./templates/wish-you-were-here.json').then((m) => structuredClone(m.default)),
  },
};

/** Cards shown in the Style grid. */
export const TEMPLATE_IDS = ['just_listed', 'wish_you_were_here'];

/** Fallback font set (handwritten) for any template that doesn't define its own `fonts`. */
export const FONTS = HANDWRITTEN_FONTS;

/** Ink colours typical for handwriting (+ the custom picker in ColorDropdown). */
export const INK_COLORS = ['#000000', '#0b1f3a', '#12306e', '#1f2a5a', '#2c3e50', '#3b2f2f'];

/** Example photos offered in the "Replace photo" side panel (scenery / property). */
export const PHOTO_EXAMPLES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=70',
];

/** House examples for property placeholders (name contains `property`) — homes for sale. */
export const HOUSE_EXAMPLES = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=70',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=70',
];

/** Portrait examples for headshot placeholders (name contains `headshot`). */
export const HEADSHOT_EXAMPLES = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=70',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=70',
];
