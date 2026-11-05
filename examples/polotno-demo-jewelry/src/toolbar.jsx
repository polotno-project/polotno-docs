import React from 'react';
import { observer } from 'mobx-react-lite';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Popover, PopoverContent, PopoverTrigger, Button, SliderField } from 'polotno/primitives';
import { Sun, Moon, Image as ImageIcon, FileJson } from 'lucide-react';
import { setTheme, theme, withSolidBackground } from './theme.js';
import { designData } from './parts.js';
import { CUTS, STONES, stoneById } from './gems.js';
import { SHANKS } from './metal.js';
import { kindOf, updatePart, applySetting, settingOf, metalParts, rotateAroundCenter } from './parts.js';
import { MetalToggle, StoneSwatches, SizeSelect, SettingSelect } from './panels.jsx';

// Polotno's toolbar takes extra controls for SVG elements as `Svg*`
// components. These show only for jewelry parts and replace the stock
// colour and filter controls, which would fight the part's own drawing.

const row = { display: 'flex', alignItems: 'center', gap: 6 };
const sep = { width: 1, alignSelf: 'stretch', background: 'rgba(127,127,127,0.25)', margin: '4px 4px' };

const each = (elements, kind, fn) => elements.filter((e) => kindOf(e) === kind).forEach(fn);

const StonePicker = observer(({ elements, value }) => {
  const s = stoneById(value);
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="sm" aria-label="Stone" />}>
        <span style={{ width: 16, height: 16, borderRadius: 8, display: 'inline-block', background: `radial-gradient(circle at 35% 35%, ${s.ramp[4]}, ${s.ramp[2]} 55%, ${s.ramp[0]})` }} />
        <span style={{ marginLeft: 6 }}>{s.label}</span>
      </PopoverTrigger>
      <PopoverContent align="start" style={{ width: 210, padding: 10 }}>
        <StoneSwatches
          value={value}
          onChange={(stone) => {
            each(elements, 'gem', (e) => updatePart(e, { stone }));
            each(elements, 'pave', (e) => updatePart(e, { stone }));
          }}
        />
      </PopoverContent>
    </Popover>
  );
});

const gemsIn = (elements) => elements.filter((e) => kindOf(e) === 'gem');

const GemStone = observer(({ elements }) => <StonePicker elements={elements} value={gemsIn(elements)[0].custom.stone} />);

const GemCut = observer(({ store, elements }) => {
  const gems = gemsIn(elements);
  return (
    <Select value={gems[0].custom.cut} onValueChange={(cut) => store.history.transaction(() => gems.forEach((e) => updatePart(e, { cut })))}>
      <SelectTrigger size="sm" style={{ minWidth: 100 }} aria-label="Cut">
        <SelectValue>{(v) => CUTS.find((c) => c.id === v)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start" sideOffset={4} style={{ minWidth: "var(--anchor-width)" }}>
        {CUTS.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

const GemSize = observer(({ store, elements }) => {
  const gems = gemsIn(elements);
  const g = gems[0].custom;
  return (
    <SizeSelect
      value={g.size}
      cut={g.cut}
      stone={g.stone}
      onChange={(size) => store.history.transaction(() => gems.forEach((e) => updatePart(e, { size })))}
    />
  );
});

// How the selected stones are held. Settings take the ring's metal.
const GemSetting = observer(({ store, elements }) => {
  const gems = gemsIn(elements);
  const page = store.activePage;
  const setting = settingOf(page, gems[0]);
  const shank = page.children.find((e) => kindOf(e) === 'shank');
  const metal = setting?.custom.metal || shank?.custom.metal || 'white';
  return (
    <SettingSelect
      value={setting?.custom.setting}
      onChange={(id) => store.history.transaction(() => gems.forEach((g) => applySetting(store, g, id, metal)))}
    />
  );
});

const ShankControls = observer(({ elements }) => {
  const shank = elements.find((e) => kindOf(e) === 'shank');
  return (
    <div style={row}>
      <Select value={shank.custom.shank} onValueChange={(id) => updatePart(shank, { shank: id })}>
        <SelectTrigger size="sm" style={{ minWidth: 120 }} aria-label="Shank">
          <SelectValue>{(v) => SHANKS.find((s) => s.id === v)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align="start" sideOffset={4} style={{ minWidth: "var(--anchor-width)" }}>
          {SHANKS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <MetalToggle value={shank.custom.metal} onChange={(metal) => updatePart(shank, { metal })} />
    </div>
  );
});

const PaveControls = observer(({ elements }) => {
  const pave = elements.find((e) => kindOf(e) === 'pave');
  const set = (patch) => each(elements, 'pave', (e) => updatePart(e, patch));
  return (
    <div style={row}>
      <StonePicker elements={elements} value={pave.custom.stone} />
      <Popover>
        <PopoverTrigger render={<Button variant="ghost" size="sm" />}>
          {pave.custom.count} × {pave.custom.size} mm
        </PopoverTrigger>
        <PopoverContent align="start" style={{ width: 240, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SliderField label="Stones" value={pave.custom.count} min={2} max={21} step={1} onChange={(count) => set({ count })} />
          <SliderField label="Stone size, mm" value={pave.custom.size} min={0.8} max={2.5} step={0.1} onChange={(size) => set({ size })} />
          <SliderField label="Bend" value={pave.custom.bend} min={-3} max={3} step={0.1} onChange={(bend) => set({ bend })} />
        </PopoverContent>
      </Popover>
      <MetalToggle value={pave.custom.metal} onChange={(metal) => set({ metal })} />
    </div>
  );
});

// Rotation presets, like the angle wheel in desktop jewelry CAD.
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const AngleControl = observer(({ store, elements }) => {
  const el = elements[0];
  const value = String(((Math.round(el.rotation) % 360) + 360) % 360);
  return (
    <Select
      value={ANGLES.map(String).includes(value) ? value : 'custom'}
      onValueChange={(v) => v !== 'custom' && store.history.transaction(() => elements.forEach((e) => rotateAroundCenter(e, Number(v))))}
    >
      <SelectTrigger size="sm" style={{ minWidth: 78 }} aria-label="Angle">
        <SelectValue>{(v) => (v === 'custom' ? `${Math.round(el.rotation)}°` : `${v}°`)}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align="start" sideOffset={4} style={{ minWidth: "var(--anchor-width)" }}>
        {ANGLES.map((a) => (
          <SelectItem key={a} value={String(a)}>
            {a}°
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

// One kind of part selected, or nothing to show.
const onlyKind = (elements) => {
  const kinds = new Set(elements.map(kindOf));
  return kinds.size === 1 && !kinds.has(undefined) ? [...kinds][0] : null;
};

// Each control is its own toolbar item, so on a narrow screen they fold into
// the overflow menu one by one instead of all at once.
//
// Items that don't apply render an empty span, not null: the toolbar's
// overflow list counts rendered children to decide how many items fit, so a
// null item would shift every control after it into the "more" menu.
const Empty = () => <span />;

const forKind = (kind, Inner) =>
  observer(({ store, elements }) => (onlyKind(elements) === kind ? <Inner store={store} elements={elements} /> : <Empty />));

const Hidden = Empty;

// --- light / dark ---------------------------------------------------------------

const ThemeSwitch = observer(({ store }) => {
  const next = theme.name === 'dark' ? 'light' : 'dark';
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(store, next)}>
      {theme.name === 'dark' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
    </Button>
  );
});

// --- export --------------------------------------------------------------------------

function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const MenuItem = ({ icon: I, title, note, onClick }) => (
  <Button variant="ghost" onClick={onClick} style={{ height: 'auto', justifyContent: 'flex-start', gap: 10, padding: '8px 10px', textAlign: 'left' }}>
    <I size={16} strokeWidth={1.5} />
    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 13 }}>{title}</span>
      <span style={{ fontSize: 11.5, color: 'var(--pn-muted-foreground)', fontWeight: 400 }}>{note}</span>
    </span>
  </Button>
);

// A quiet Export menu: the picture of the ring, or the design as data.
const ExportMenu = ({ store }) => {
  const [open, setOpen] = React.useState(false);
  const png = async () => {
    setOpen(false);
    await withSolidBackground(store, () => store.saveAsImage({ fileName: 'ring-design.png', pixelRatio: 1 }));
  };
  const json = () => {
    setOpen(false);
    const data = JSON.stringify({ unit: 'mm', parts: designData(store) }, null, 2);
    saveBlob(new Blob([data], { type: 'application/json' }), 'ring-design.json');
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            style={{ background: 'transparent', borderColor: 'var(--pn-border)', color: 'var(--pn-muted-foreground)', fontWeight: 400, letterSpacing: '0.04em', padding: '0 14px' }}
          />
        }
      >
        Export
      </PopoverTrigger>
      <PopoverContent align="end" style={{ width: 260, padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <MenuItem icon={ImageIcon} title="Image · PNG" note="The design at full resolution, 1200 dpi" onClick={png} />
        <MenuItem icon={FileJson} title="Design data · JSON" note="Every part with its position and size in mm" onClick={json} />
      </PopoverContent>
    </Popover>
  );
};

// Right end of the toolbar: theme switch, then Export.
const ActionControls = ({ store }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <ThemeSwitch store={store} />
    <ExportMenu store={store} />
  </div>
);

export const TOOLBAR_COMPONENTS = {
  ActionControls,
  // Generic design-tool buttons that don't fit jewelry parts. Duplicate and
  // delete stay in the menu above the selection.
  Opacity: Hidden,
  // The work area is always solid black, so no page background picker.
  PageBackground: Hidden,
  PageDuration: Hidden,
  Lock: Hidden,
  Duplicate: Hidden,
  CopyStyle: Hidden,
  SvgFlip: Hidden,
  SvgColors: Hidden,
  SvgFilters: Hidden,
  SvgCrop: Hidden,
  SvgFitToPage: Hidden,
  SvgAnimations: Hidden,
  SvgGemStone: forKind('gem', GemStone),
  SvgGemCut: forKind('gem', GemCut),
  SvgGemSize: forKind('gem', GemSize),
  SvgGemSetting: forKind('gem', GemSetting),
  SvgShank: forKind('shank', ShankControls),
  SvgPave: forKind('pave', PaveControls),
  SvgAngle: observer(({ store, elements }) => (onlyKind(elements) ? <AngleControl store={store} elements={elements} /> : <Empty />)),
};

export { metalParts };
