/**
 * The controls of a callout, for the top toolbar.
 *
 * They know nothing about how the callout is built. They read a `settings`
 * object and send changes to `onChange`:
 *
 *   - the "built-in elements" way keeps the settings in `group.custom.callout`
 *   - the "custom element" way keeps them in the attributes of the element
 *
 * The UI uses the primitives of the editor (`polotno/primitives`), so the
 * controls look the same as the built-in ones. `ElementContainer` is the row
 * every built-in toolbar uses: it gives the standard spacing, and it moves the
 * controls into a "more" popover when the toolbar is too small.
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  Button,
  FieldRow,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SliderField,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'polotno/primitives';
import { ColorPicker } from 'polotno/toolbar/color-picker';
import { ElementContainer } from 'polotno/toolbar/element-container';

import { TailPad } from './tail-pad';

const Swatch = ({ label, children }) => (
  <Tooltip>
    <TooltipTrigger
      render={<div style={{ display: 'flex' }}>{children}</div>}
    />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

const CalloutFill = observer(({ store, settings, onChange }) => (
  <Swatch label="Fill">
    <ColorPicker
      value={settings.fill}
      onChange={(fill) => onChange({ fill })}
      store={store}
    />
  </Swatch>
));

const CalloutStroke = observer(({ store, settings, onChange }) => (
  <Swatch label="Border color">
    <ColorPicker
      value={settings.stroke}
      onChange={(stroke) => onChange({ stroke })}
      store={store}
    />
  </Swatch>
));

const CalloutSettings = observer(({ settings, onChange, madeFrom }) => (
  <Popover>
    <Tooltip>
      <TooltipTrigger
        render={
          <PopoverTrigger
            render={
              <Button variant="ghost" size="sm">
                Callout
              </Button>
            }
          />
        }
      />
      <TooltipContent>Shape and tail</TooltipContent>
    </Tooltip>
    <PopoverContent align="start">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* which of the two ways drew this callout */}
        <div style={{ opacity: 0.6 }}>Made from: {madeFrom}</div>
        <FieldRow label="Shape">
          <ToggleGroup
            variant="outline"
            value={[settings.shape]}
            onValueChange={([shape]) => shape && onChange({ shape })}
          >
            <ToggleGroupItem value="ellipse">Balloon</ToggleGroupItem>
            <ToggleGroupItem value="rect">Box</ToggleGroupItem>
          </ToggleGroup>
        </FieldRow>
        <FieldRow label="Tail">
          <ToggleGroup
            variant="outline"
            value={[settings.tail]}
            onValueChange={([tail]) => tail && onChange({ tail })}
          >
            <ToggleGroupItem value="triangle">Filled</ToggleGroupItem>
            <ToggleGroupItem value="line">Line</ToggleGroupItem>
          </ToggleGroup>
        </FieldRow>
        <SliderField
          label="Border width"
          value={settings.strokeWidth}
          onChange={(strokeWidth) => onChange({ strokeWidth })}
          min={0}
          max={20}
        />
        <SliderField
          label="Tail width"
          value={Math.round(settings.tailWidth * 100)}
          onChange={(value) => onChange({ tailWidth: value / 100 })}
          min={5}
          max={80}
        />
        <div>
          <FieldRow label="Tail direction" style={{ paddingBottom: '5px' }} />
          <TailPad
            shape={settings.shape}
            tipX={settings.tipX}
            tipY={settings.tipY}
            inset={settings.inset}
            onChange={onChange}
          />
        </div>
      </div>
    </PopoverContent>
  </Popover>
));

/** The three controls, one by one. The toolbar of the app arranges them. */
export const CALLOUT_ITEMS = { CalloutFill, CalloutStroke, CalloutSettings };

/** The three controls in a row, for the toolbar of one type of element. */
export const CalloutControls = observer((props) => (
  <ElementContainer
    items={Object.keys(CALLOUT_ITEMS)}
    itemRender={(item) => {
      const Component = CALLOUT_ITEMS[item];
      return <Component {...props} />;
    }}
  />
));
