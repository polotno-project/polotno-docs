// A two-page flyer with every kind of link. `href` is part of the design
// JSON, so it survives store.toJSON() and store.loadJSON().
const text = (id, attrs) => ({
  id,
  type: 'text',
  x: 80,
  width: 920,
  fontSize: 40,
  fontFamily: 'Roboto',
  fill: '#0f172a',
  align: 'center',
  ...attrs,
});

const LINK_BLUE = '#2563eb';

export const design = {
  width: 1080,
  height: 1080,
  pages: [
    {
      id: 'flyer',
      background: '#f8fafc',
      children: [
        text('title', {
          y: 120,
          text: 'Design Weekend',
          fontSize: 100,
          fontWeight: 'bold',
        }),
        text('dates', {
          y: 260,
          text: 'Two days of hands-on workshops, June 12 and 13 at Riverside Hall.',
          fill: '#475569',
        }),
        {
          // A web link on a group: the shape and its label both open it.
          id: 'book',
          type: 'group',
          href: 'https://example.com/tickets',
          children: [
            {
              id: 'book-shape',
              type: 'figure',
              subType: 'rect',
              x: 320,
              y: 420,
              width: 440,
              height: 120,
              cornerRadius: 60,
              fill: LINK_BLUE,
            },
            text('book-label', {
              x: 320,
              y: 454,
              width: 440,
              text: 'Book a seat',
              fontSize: 44,
              fontWeight: 'bold',
              fill: '#ffffff',
            }),
          ],
        },
        text('to-schedule', {
          y: 620,
          text: 'See the schedule on page 2',
          fill: LINK_BLUE,
          textDecoration: 'underline',
          // A page jump: '#' and the ID of the page.
          href: '#schedule',
        }),
        text('phone', {
          y: 840,
          text: 'Call +1 555 123 4567',
          fontSize: 36,
          href: 'tel:+15551234567',
        }),
        text('email', {
          y: 900,
          fontSize: 36,
          fill: '#475569',
          // Rich text links only the words inside <a href>. A link draws like
          // the text around it, so the span gives it a color and an underline.
          text: `<p>Questions? Write to <a href="mailto:hello@example.com"><span style="color: ${LINK_BLUE};"><u>hello@example.com</u></span></a>.</p>`,
        }),
      ],
    },
    {
      id: 'schedule',
      background: '#f8fafc',
      children: [
        text('schedule-title', {
          y: 120,
          text: 'Schedule',
          fontSize: 100,
          fontWeight: 'bold',
        }),
        text('days', {
          y: 280,
          fontSize: 44,
          lineHeight: 1.6,
          text: '<p><strong>Saturday:</strong> typography, color and layout</p><p><strong>Sunday:</strong> branding, print and export</p>',
        }),
        text('back', {
          y: 900,
          text: 'Back to page 1',
          fill: LINK_BLUE,
          textDecoration: 'underline',
          href: '#flyer',
        }),
      ],
    },
  ],
};
