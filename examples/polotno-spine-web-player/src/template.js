// Demo template data with Spine Player example
export const demoTemplate = {
  width: 1080,
  height: 1080,
  pages: [
    {
      id: '2evYZKCmwY',
      children: [
        {
          id: 'NRU00rfEml',
          type: 'spinePlayer',
          name: 'spine-player-1',
          opacity: 1,
          skeleton:
            'https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy-pro.json',
          atlas:
            'https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy-pma.atlas',
          x: 340,
          y: 340,
          width: 400,
          height: 400,
        },
        {
          id: '1ISL5LzZKy',
          type: 'text',
          name: 'text-1',
          x: 174.99999999999997,
          y: 101.02985074626332,
          width: 730,
          height: 184,
          text: 'Download as HTML to see Spine Player',
          fontSize: 76,
          fontFamily: 'Roboto',
        },
      ],
    },
  ],
  schemaVersion: 2,
};
