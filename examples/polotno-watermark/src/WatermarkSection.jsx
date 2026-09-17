import React from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import {
  Button,
  Input,
  NumericInput,
  Separator,
  Switch,
  ToggleGroup,
  ToggleGroupItem,
} from 'polotno/primitives';

import { DEFAULT_CONFIG, WATERMARK, renderWatermark } from './watermark';

/** Inline styles, not classes: the published CSS only ships `pn:` utilities. */
const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    height: '100%',
    overflowY: 'auto',
    paddingBottom: 24,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 500, opacity: 0.75 },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  hint: { fontSize: 12, lineHeight: 1.45, opacity: 0.6, margin: 0 },
};

export const WatermarkSection = {
  name: 'watermark',
  Tab: (props) => (
    <SectionTab name="Watermark" {...props}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect
          x="2.5"
          y="2.5"
          width="15"
          height="15"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M4.5 12.5 12.5 4.5M8.5 16.5 16.5 8.5M3.5 8.5 8.5 3.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </SectionTab>
  ),
  Panel: observer(({ store }) => {
    const fileInput = React.useRef(null);

    const element = store.pages
      .flatMap((page) => page.children)
      .find((el) => el.name === WATERMARK);

    const config = { ...DEFAULT_CONFIG, ...(element?.custom || {}) };

    const update = (patch) => renderWatermark(store, { ...config, ...patch });

    const handleLogo = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loaded) =>
        update({ mode: 'logo', logoSrc: loaded.target.result });
      reader.readAsDataURL(file);
      event.target.value = '';
    };

    if (!element) return null;

    const isLogo = config.mode === 'logo';

    return (
      <div style={styles.panel}>
        <div style={styles.field}>
          <span style={styles.label}>Watermark with</span>
          <ToggleGroup
            variant="outline"
            value={[config.mode]}
            onValueChange={([next]) => next && update({ mode: next })}
          >
            <ToggleGroupItem value="text" style={{ flex: 1 }}>
              Text
            </ToggleGroupItem>
            <ToggleGroupItem value="logo" style={{ flex: 1 }}>
              Logo
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {isLogo ? (
          <div style={styles.field}>
            <span style={styles.label}>Logo image</span>
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              {config.logoSrc ? 'Replace logo' : 'Upload a logo'}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogo}
            />
            <p style={styles.hint}>
              Any shape works. The tile takes its height from the logo&apos;s own
              proportions, so nothing is squashed or cropped.
            </p>
          </div>
        ) : (
          <div style={styles.field}>
            <span style={styles.label}>Watermark text</span>
            <Input
              value={config.text}
              placeholder="CONFIDENTIAL"
              onChange={(event) => update({ text: event.target.value })}
            />
          </div>
        )}

        <div style={styles.field}>
          <span style={styles.label}>{isLogo ? 'Logo size' : 'Text size'}</span>
          <NumericInput
            value={config.scale}
            min={12}
            max={140}
            onValueChange={(scale) => scale && update({ scale })}
          />
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Tile spacing</span>
          <ToggleGroup
            variant="outline"
            value={[String(config.gap)]}
            onValueChange={([next]) => next && update({ gap: Number(next) })}
          >
            <ToggleGroupItem value="1.4" style={{ flex: 1 }}>
              Dense
            </ToggleGroupItem>
            <ToggleGroupItem value="2" style={{ flex: 1 }}>
              Medium
            </ToggleGroupItem>
            <ToggleGroupItem value="3.2" style={{ flex: 1 }}>
              Sparse
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Angle</span>
          <ToggleGroup
            variant="outline"
            value={[String(config.angle)]}
            onValueChange={([next]) => next && update({ angle: Number(next) })}
          >
            <ToggleGroupItem value="-35" style={{ flex: 1 }}>
              Diagonal
            </ToggleGroupItem>
            <ToggleGroupItem value="0" style={{ flex: 1 }}>
              Straight
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Opacity</span>
          <NumericInput
            value={Math.round(config.opacity * 100)}
            min={5}
            max={100}
            onValueChange={(next) =>
              next && update({ opacity: next / 100 })
            }
          />
        </div>

        <Separator />

        <div style={styles.row}>
          <span style={styles.label}>Locked on canvas</span>
          <Switch
            checked={!element.selectable}
            onCheckedChange={(locked) => element.set({ selectable: !locked })}
          />
        </div>
        <p style={styles.hint}>
          Locked, the watermark cannot be selected, dragged, or deleted by the
          person editing. Unlock to see the difference.
        </p>

        <Separator />

        <div style={styles.row}>
          <span style={styles.label}>Include in export</span>
          <Switch
            checked={element.showInExport}
            onCheckedChange={(showInExport) => element.set({ showInExport })}
          />
        </div>
        <p style={styles.hint}>
          On, the watermark lands in the downloaded file. Off, it stays a
          canvas-only guide and the export comes out clean.
        </p>
      </div>
    );
  }),
};
