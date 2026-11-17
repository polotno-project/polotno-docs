// The sample sticker: a sun badge and two words, all drawn here so the demo
// carries no third-party artwork. Upload a transparent PNG to replace it.

const SUN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="#ffb300">
    ${Array.from({ length: 12 }, (_, i) => `<path d="M100 6 L111 40 L89 40 Z" transform="rotate(${i * 30} 100 100)"/>`).join('')}
  </g>
  <circle cx="100" cy="100" r="58" fill="#ffd54a" stroke="#f57c00" stroke-width="6"/>
  <circle cx="80" cy="92" r="7" fill="#3e2723"/>
  <circle cx="120" cy="92" r="7" fill="#3e2723"/>
  <path d="M74 116 Q100 140 126 116" fill="none" stroke="#3e2723" stroke-width="7" stroke-linecap="round"/>
</svg>`;

export const svgDataUrl = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** Elements for a page of the given size in px (mm converted by the caller). */
export function sampleArtwork(mm) {
  return [
    {
      type: 'svg',
      name: 'sun',
      src: svgDataUrl(SUN),
      x: mm(20),
      y: mm(8),
      width: mm(50),
      height: mm(50),
    },
    {
      type: 'text',
      name: 'words',
      text: 'GOOD DAY',
      x: mm(5),
      y: mm(57),
      width: mm(80),
      fontSize: mm(13),
      lineHeight: 1, // close enough that one cut line goes around everything
      fontFamily: 'Rubik Mono One',
      fill: '#263238',
      align: 'center',
    },
  ];
}
