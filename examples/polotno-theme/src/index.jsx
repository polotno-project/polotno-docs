import React from 'react';
import ReactDOM from 'react-dom/client';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';

import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';

// Polotno ships shadcn-style UI primitives, themed by the same CSS variables
// as the editor — so the configurator controls recolor with the chosen theme.
import {
  Navbar,
  NavbarGroup,
  Button,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from 'polotno/primitives';

import { Sun, Moon } from 'lucide-react';

import { themes } from './themes';

// create store
const store = createStore({
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.com/cabinet
  key: 'nFA5H9elEytDyPyvKL7T',
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});
// add to global namespace for debugging
window.store = store;

// add page and element instantly
store.addPage();

// `null` light/dark = Polotno's built-in theme (no overrides). Listed first so
// users land on the stock editor and can reset to it at any time.
const DEFAULT_OPTION = { slug: 'default', name: 'Default (Polotno)', light: null, dark: null };
const options = [DEFAULT_OPTION, ...themes];
const themeItems = Object.fromEntries(options.map((t) => [t.slug, t.name]));

// Build a copy-pasteable CSS snippet for the selected theme.
// Emits a full :root (light) block + a .dark block so it works in any mode.
function buildCss(theme, usePrefix) {
  if (!theme.light) {
    return `/* Default Polotno theme — no CSS variables needed. */\n/* For dark mode, add the \`dark\` class to a container\n   (or set data-polotno-theme="dark"). */`;
  }
  const p = usePrefix ? '--pn-' : '--';
  const block = (vars) =>
    Object.entries(vars)
      .map(([key, value]) => `  ${p}${key}: ${value};`)
      .join('\n');
  return `:root {\n${block(theme.light)}\n}\n\n.dark {\n${block(theme.dark)}\n}`;
}

// Apply a theme to :root so the editor, the top panel, and portaled popups
// (Select / Dialog render into document.body) all recolor together.
// We set the plain `--*` names: Polotno resolves var(--pn-X, var(--X, …)), so
// plain vars theme everything. The `--pn-` form is offered in the code modal
// for users who want to isolate the editor from their own app styles.
function applyTheme(theme, mode, prevNames) {
  const root = document.documentElement;
  prevNames.forEach((name) => root.style.removeProperty(name));

  const applied = [];
  // theme[mode] is null for "Default" — clear overrides, fall back to built-in
  for (const [key, value] of Object.entries(theme[mode] ?? {})) {
    const name = '--' + key;
    root.style.setProperty(name, value);
    applied.push(name);
  }

  // switch Polotno's built-in dark styles to match the previewed mode
  if (mode === 'dark') root.setAttribute('data-polotno-theme', 'dark');
  else root.removeAttribute('data-polotno-theme');

  return applied;
}

function CodeDialog({ open, onOpenChange, theme, usePrefix, setUsePrefix }) {
  const [copied, setCopied] = React.useState(false);
  const css = buildCss(theme, usePrefix);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable (e.g. insecure context) — ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* portaled popups render outside `.polotno-ui`; add the class so they
          inherit the themed foreground color (the dialog sets bg but no text color) */}
      <DialogContent className="polotno-ui">
        <DialogHeader>
          <DialogTitle>Theme CSS</DialogTitle>
          <DialogDescription>
            Drop this into your stylesheet to apply the theme to the Polotno editor.
          </DialogDescription>
        </DialogHeader>

        {theme.light && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Switch checked={usePrefix} onCheckedChange={(c) => setUsePrefix(c)} />
            <span>
              Use <code>--pn-</code> prefix
              <span style={{ opacity: 0.6 }}> (isolate from your app's styles)</span>
            </span>
          </label>
        )}

        <pre
          style={{
            margin: 0,
            maxHeight: '50vh',
            overflow: 'auto',
            padding: 16,
            borderRadius: 8,
            background: 'var(--muted, #f4f4f5)',
            color: 'var(--foreground, #161616)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 12,
            lineHeight: 1.6,
            whiteSpace: 'pre',
          }}
        >
          {css}
        </pre>

        <DialogFooter>
          <Button onClick={copy}>{copied ? 'Copied!' : 'Copy CSS'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const App = () => {
  const [themeSlug, setThemeSlug] = React.useState(DEFAULT_OPTION.slug);
  const [mode, setMode] = React.useState('light');
  const [usePrefix, setUsePrefix] = React.useState(true);
  const [codeOpen, setCodeOpen] = React.useState(false);

  const appliedRef = React.useRef([]);
  const theme = options.find((t) => t.slug === themeSlug) ?? DEFAULT_OPTION;

  React.useEffect(() => {
    appliedRef.current = applyTheme(theme, mode, appliedRef.current);
  }, [theme, mode]);

  return (
    // `polotno-ui` puts the top panel inside Polotno's CSS context — it picks up
    // the themed background, foreground, and font, matching the editor exactly.
    <div className="app polotno-ui">
      {/* flat bar with a divider that follows the theme — `attached`/`elevated`
          cast a drop shadow that bleeds onto the side panel below, so we draw the
          line ourselves with the theme's `--border` token. Falls back to a neutral
          currentColor hairline for the Default theme (which sets no `--border`). */}
      <Navbar
        elevated={false}
        style={{
          borderBottom:
            '1px solid var(--border, color-mix(in srgb, currentColor 14%, transparent))',
        }}
      >
        <NavbarGroup align="left">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, opacity: 0.7 }}>Theme</span>
            <Select
              items={themeItems}
              value={themeSlug}
              onValueChange={(v) => v && setThemeSlug(v)}
            >
              <SelectTrigger size="sm" style={{ minWidth: 170 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_OPTION.slug}>
                  {DEFAULT_OPTION.name}
                </SelectItem>
                <SelectSeparator />
                {themes.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>

          {/* taller separator that matches the bottom divider — the Navbar
              primitive's own divider is only 20px tall. Uses the theme's
              `--border`, with a neutral currentColor fallback for Default. */}
          <span
            aria-hidden
            style={{
              alignSelf: 'stretch',
              width: 1,
              margin: '10px 6px',
              background:
                'var(--border, color-mix(in srgb, currentColor 14%, transparent))',
            }}
          />

          <ToggleGroup
            variant="outline"
            value={[mode]}
            onValueChange={(v) => v[0] && setMode(v[0])}
          >
            <ToggleGroupItem value="light" aria-label="Light mode">
              <Sun size={16} />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark mode">
              <Moon size={16} />
            </ToggleGroupItem>
          </ToggleGroup>
        </NavbarGroup>

        <NavbarGroup align="right">
          <Button variant="outline" size="sm" onClick={() => setCodeOpen(true)}>
            Show code
          </Button>
        </NavbarGroup>
      </Navbar>

      <div className="editor-wrap">
        <PolotnoContainer className="polotno-app-container">
          <SidePanelWrap>
            <SidePanel store={store} />
          </SidePanelWrap>
          <WorkspaceWrap>
            <Toolbar store={store} />
            <Workspace store={store} />
            <ZoomButtons store={store} />
            <PagesTimeline store={store} />
          </WorkspaceWrap>
        </PolotnoContainer>
      </div>

      <CodeDialog
        open={codeOpen}
        onOpenChange={setCodeOpen}
        theme={theme}
        usePrefix={usePrefix}
        setUsePrefix={setUsePrefix}
      />
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
