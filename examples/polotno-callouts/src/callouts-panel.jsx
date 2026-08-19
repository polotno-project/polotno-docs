/**
 * The side panel section with the ready callouts.
 *
 * The same three cards insert a callout in the way the toggle selects, so you
 * can put the two ways beside each other on one page and compare them.
 *
 * `ImagesGrid` is the grid that every asset panel of Polotno uses. It gives
 * the same look as the other panels, and drag and drop onto the canvas.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { ToggleGroup, ToggleGroupItem } from 'polotno/primitives';
import { SectionTab } from 'polotno/side-panel';
import { ImagesGrid } from 'polotno/side-panel/images-grid';

import { PRESET_CARDS } from './shared/presets';
import { addBuiltinCallout } from './builtin/callout';
import { addCustomCallout } from './custom-element/add-callout';

const CalloutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path
      d="M4 4h16v11H9l-5 5V4z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

const WAYS = {
  builtin: {
    label: 'Built-in elements',
    add: addBuiltinCallout,
    about: (
      <>
        The balloon is an <b>svg</b> element, drawn again each time you change
        it, and the text is a <b>text</b> element. The settings live in the{' '}
        <b>custom</b> attribute of the group. No new element type, so every
        export path knows this design.
      </>
    ),
  },
  custom: {
    label: 'Custom element',
    add: addCustomCallout,
    about: (
      <>
        The balloon is a <b>callout</b> element, a new element type registered
        in Polotno. Select one: a blue handle appears on the canvas, drag it to
        point the tail. That handle is what the other way cannot do.
      </>
    ),
  },
};

export const CalloutsSection = {
  name: 'callouts',
  Tab: (props) => (
    <SectionTab name="Callouts" {...props}>
      <CalloutIcon />
    </SectionTab>
  ),
  Panel: observer(({ store }) => {
    const [way, setWay] = React.useState('builtin');

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ paddingBottom: '10px' }}>Made from:</div>
        <ToggleGroup
          variant="outline"
          value={[way]}
          onValueChange={([next]) => next && setWay(next)}
        >
          {Object.keys(WAYS).map((key) => (
            <ToggleGroupItem key={key} value={key} style={{ flex: 1 }}>
              {WAYS[key].label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p>{WAYS[way].about}</p>
        <ImagesGrid
          images={PRESET_CARDS}
          getPreview={(card) => card.preview}
          getAlt={(card) => card.preset.name}
          getCredit={(card) => card.preset.name}
          shadowEnabled={false}
          rowsNumber={2}
          isLoading={false}
          onSelect={({ preset }, pos) => {
            // `pos` is the position of the drop. It is empty on a click.
            const { width, height } = preset.attrs;
            WAYS[way].add(
              store,
              preset,
              pos && { x: pos.x - width / 2, y: pos.y - height / 2 },
            );
          }}
        />
      </div>
    );
  }),
};
