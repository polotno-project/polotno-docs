import React from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';

import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';
import { SectionTab } from 'polotno/side-panel';

import {
  Button,
  TextArea,
  HTMLSelect,
  RadioGroup,
  Radio,
  Callout,
  Spinner,
} from '@blueprintjs/core';

import MdAutoAwesome from '@meronex/icons/md/MdAutoAwesome';

const store = createStore({ key: 'nFA5H9elEytDyPyvKL7T', showCredit: true });
store.addPage();

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  panel: {
    padding: '20px',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    background: 'linear-gradient(180deg, rgba(30,40,60,0.25) 0%, transparent 40%)',
  },
  header: {
    textAlign: 'center',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '0.3px',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  titleIcon: {
    fontSize: '22px',
    color: '#7c5cfc',
  },
  subtitle: {
    fontSize: '12px',
    opacity: 0.55,
    marginTop: '6px',
    lineHeight: 1.4,
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    opacity: 0.7,
    marginBottom: '6px',
    display: 'block',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  textArea: {
    resize: 'vertical',
    borderRadius: '8px',
    fontSize: '13px',
    lineHeight: 1.5,
  },
  selectWrapper: {
    borderRadius: '8px',
    overflow: 'hidden',
  },
  infoBanner: {
    borderRadius: '8px',
    fontSize: '12px',
    padding: '10px 12px',
    background: 'rgba(124,92,252,0.08)',
    border: '1px solid rgba(124,92,252,0.2)',
  },
  generateBtn: {
    borderRadius: '8px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    background: 'linear-gradient(135deg, #7c5cfc 0%, #5a3de8 100%)',
    boxShadow: '0 4px 14px rgba(124,92,252,0.35)',
    border: 'none',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  generateBtnDisabled: {
    borderRadius: '8px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    background: 'linear-gradient(135deg, #7c5cfc 0%, #5a3de8 100%)',
    boxShadow: '0 2px 8px rgba(124,92,252,0.2)',
    border: 'none',
    opacity: 0.85,
    animation: 'pulse 1.8s ease-in-out infinite',
  },
  errorCallout: {
    borderRadius: '8px',
    fontSize: '13px',
  },
  successCallout: {
    borderRadius: '8px',
    fontSize: '13px',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
    margin: '2px 0',
    border: 'none',
  },
};

// Keyframes injected once for the pulse animation
const PULSE_KEYFRAMES_ID = 'ai-design-pulse-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(PULSE_KEYFRAMES_ID)) {
  const styleEl = document.createElement('style');
  styleEl.id = PULSE_KEYFRAMES_ID;
  styleEl.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 0.85; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.015); }
    }
  `;
  document.head.appendChild(styleEl);
}

// ---------------------------------------------------------------------------
// AI Design Panel
// ---------------------------------------------------------------------------

const AIDesignPanel = observer(({ store }) => {
  const [prompt, setPrompt] = React.useState('');
  const [provider, setProvider] = React.useState('gemini');
  const [mode, setMode] = React.useState('json');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);
  const successTimerRef = React.useRef(null);

  React.useEffect(() => () => clearTimeout(successTimerRef.current), []);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `https://api.polotno.com/api/ai/design/create?KEY=nFA5H9elEytDyPyvKL7T`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider, type: mode }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      if (mode === 'json') {
        const data = await response.json();
        store.loadJSON(data);
      } else {
        const svgText = await response.text();
        store.activePage?.addElement({
          type: 'svg',
          svg: svgText,
          x: 50,
          y: 50,
          width: 500,
          height: 500,
        });
      }

      setSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          <MdAutoAwesome style={styles.titleIcon} />
          AI Design
        </h3>
        <p style={styles.subtitle}>
          Describe what you want and let AI generate a complete design for you.
        </p>
      </div>

      {/* Prompt */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Prompt</label>
        <TextArea
          rows={5}
          fill
          style={styles.textArea}
          placeholder="Describe your design... e.g., A modern business card with gradient background"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          growVertically={false}
        />
      </div>

      <hr style={styles.divider} />

      {/* Provider */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>AI Provider</label>
        <HTMLSelect
          fill
          style={styles.selectWrapper}
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          disabled={loading}
          options={[
            { label: 'Gemini', value: 'gemini' },
            { label: 'Anthropic', value: 'anthropic' },
            { label: 'OpenAI', value: 'openai' },
          ]}
        />
      </div>

      {/* Mode */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Output Mode</label>
        <RadioGroup
          selectedValue={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={loading}
          inline
        >
          <Radio label="JSON (full design)" value="json" />
          <Radio label="SVG (element)" value="svg" />
        </RadioGroup>
      </div>

      <hr style={styles.divider} />

      {/* Info banner */}
      <Callout
        icon="time"
        intent="primary"
        style={styles.infoBanner}
      >
        AI generation can take up to 2 minutes. Please be patient while
        your design is being created.
      </Callout>

      {/* Error */}
      {error && (
        <Callout intent="danger" icon="error" style={styles.errorCallout}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span>{error}</span>
            <Button
              minimal
              small
              icon="cross"
              onClick={() => setError(null)}
              style={{ minWidth: 'auto', minHeight: 'auto', flexShrink: 0 }}
            />
          </div>
        </Callout>
      )}

      {/* Success */}
      {success && (
        <Callout
          intent="success"
          icon="tick-circle"
          style={styles.successCallout}
        >
          Design generated successfully!
        </Callout>
      )}

      {/* Generate button */}
      <Button
        intent="primary"
        large
        fill
        style={loading ? styles.generateBtnDisabled : styles.generateBtn}
        disabled={loading || !prompt.trim()}
        onClick={handleGenerate}
        icon={loading ? <Spinner size={18} /> : 'clean'}
        text={loading ? 'Generating...' : 'Generate Design'}
      />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Section definition
// ---------------------------------------------------------------------------

const AIDesignSection = {
  name: 'ai-design',
  Tab: (props) => (
    <SectionTab name="AI Design" {...props}>
      <MdAutoAwesome />
    </SectionTab>
  ),
  Panel: AIDesignPanel,
};

const sections = [AIDesignSection, ...DEFAULT_SECTIONS];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export const App = () => (
  <PolotnoContainer className="bp5-scope">
    <SidePanelWrap>
      <SidePanel store={store} sections={sections} defaultSection="ai-design" />
    </SidePanelWrap>
    <WorkspaceWrap>
      <Toolbar store={store} downloadButtonEnabled />
      <Workspace store={store} />
      <ZoomButtons store={store} />
      <PagesTimeline store={store} />
    </WorkspaceWrap>
  </PolotnoContainer>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
