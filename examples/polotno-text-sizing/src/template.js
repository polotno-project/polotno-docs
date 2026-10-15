// A template with four variable text fields. Each carries its own sizing
// policy, so the layout survives any value a user types.
const field = (name, attrs) => ({
  id: name,
  type: 'text',
  custom: { field: name },
  fontFamily: 'Roboto',
  fill: '#1f2933',
  // a thin border around the text makes the drawn size easy to see
  borderColor: '#9aa5b1',
  borderSize: 2,
  ...attrs,
});

export const template = {
  width: 1080,
  height: 1080,
  pages: [
    {
      id: 'page-1',
      children: [
        field('name', {
          // 'fit' draws the largest size between 24px and 160px that fits
          // the box. fontSize stays the authored 96px; it is never rewritten.
          text: 'Alexandra Konstantinopolsky',
          x: 80,
          y: 120,
          width: 920,
          height: 240,
          fontSize: 96,
          fontWeight: 'bold',
          align: 'center',
          textOverflow: 'fit',
          minFontSize: 24,
          maxFontSize: 160,
        }),
        field('description', {
          // 'resize' keeps the authored size and grows the box, but never
          // past two lines: the rest ends in "…".
          text: 'Senior product designer. Speaks at conferences about type.',
          x: 80,
          y: 400,
          width: 920,
          fontSize: 40,
          align: 'center',
          textOverflow: 'resize',
          maxLines: 2,
        }),
        field('price', {
          // a small fixed box: the price shrinks as the number gets longer
          text: '$19',
          x: 80,
          y: 620,
          width: 300,
          height: 300,
          fontSize: 140,
          fontWeight: 'bold',
          align: 'center',
          fill: '#ffffff',
          backgroundEnabled: true,
          backgroundColor: '#d64545',
          backgroundPadding: 0,
          backgroundCornerRadius: 0,
          textOverflow: 'fit',
          minFontSize: 20,
        }),
        field('footer', {
          // 'ellipsis' keeps the size and the box and cuts the text
          text: 'Terms and conditions apply. Offer valid while supplies last.',
          x: 440,
          y: 720,
          width: 560,
          height: 100,
          fontSize: 32,
          textOverflow: 'ellipsis',
        }),
      ],
    },
  ],
};
