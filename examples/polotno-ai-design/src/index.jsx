import React from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';

import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { DEFAULT_SECTIONS, SectionTab, SidePanel } from 'polotno/side-panel';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { createStore } from 'polotno/model/store';

import {
  Button,
  Callout,
  ProgressBar,
  Spinner,
  TextArea,
} from '@blueprintjs/core';

import AiOutlineExperiment from '@meronex/icons/ai/AiOutlineExperiment';

const POLOTNO_KEY = 'nFA5H9elEytDyPyvKL7T';

const store = createStore({
  // this is a demo key just for that project
  // (!) please don't use it in your projects
  // to create your own API key please go here: https://polotno.com/cabinet
  key: POLOTNO_KEY,
  // you can hide back-link on a paid license
  // but it will be good if you can keep it for Polotno project support
  showCredit: true,
});
store.addPage();

const AIDesignPanel = observer(({ store }) => {
  const [prompt, setPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [success, setSuccess] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const successTimerRef = React.useRef(null);
  const progressTimerRef = React.useRef(null);
  const abortControllerRef = React.useRef(null);

  React.useEffect(
    () => () => {
      clearTimeout(successTimerRef.current);
      clearInterval(progressTimerRef.current);
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    setProgress(0);

    const DURATION = 90000; // ~90 seconds to reach 90%
    const INTERVAL = 400;
    const startTime = Date.now();
    let displayed = 0;
    clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      // ease-out curve: fast start, slows down toward the end
      const base = 1 - Math.pow(1 - t, 2.5);
      // small random jitter so speed feels organic
      const jitter = (Math.random() - 0.5) * 0.02;
      const target = Math.min(base * 0.9 + jitter, 0.9);
      // only move forward, never backward
      displayed = Math.max(displayed, target);
      setProgress(displayed);
    }, INTERVAL);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(
        `https://api.polotno.com/api/ai/design/create?KEY=${POLOTNO_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed (${response.status})`);
      }

      const data = await response.json();
      store.loadJSON(data.design);

      setSuccess(true);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      if (err.name === 'AbortError') {
        // request was cancelled by the user
      } else {
        setError(err.message);
      }
    } finally {
      abortControllerRef.current = null;
      clearInterval(progressTimerRef.current);
      setProgress(1);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
      }}
    >
      <p>
        Describe what you want and let AI generate a complete design for you.
      </p>

      <TextArea
        rows={5}
        fill
        placeholder="Describe your design... e.g., A modern business card with gradient background"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
        growVertically={false}
      />

      {loading && (
        <div>
          <ProgressBar
            intent="primary"
            value={progress}
            animate={progress < 0.9}
          />
          <p
            style={{
              textAlign: 'center',
              marginTop: '5px',
              fontSize: '12px',
              color: '#5c7080',
            }}
          >
            {Math.round(progress * 100)}% —{' '}
            {progress < 0.9
              ? 'Generating your design...'
              : 'Almost there, finalizing...'}
          </p>
        </div>
      )}

      {!loading && (
        <Callout icon="time" intent="primary">
          AI generation can take up to 2 minutes. Please be patient while your
          design is being created.
        </Callout>
      )}

      {error && (
        <Callout intent="danger" icon="error">
          {error}
        </Callout>
      )}

      {success && (
        <Callout intent="success" icon="tick-circle">
          Design generated successfully!
        </Callout>
      )}

      <Button
        intent="primary"
        large
        fill
        disabled={loading || !prompt.trim()}
        onClick={handleGenerate}
        icon={loading ? <Spinner size={18} /> : 'clean'}
        text={loading ? 'Generating...' : 'Generate Design'}
      />

      {loading && (
        <Button
          intent="danger"
          outlined
          fill
          onClick={handleCancel}
          icon="cross"
          text="Cancel request"
        />
      )}
    </div>
  );
});

const AIDesignSection = {
  name: 'ai-design',
  Tab: (props) => (
    <SectionTab name="AI Design" {...props}>
      <AiOutlineExperiment />
    </SectionTab>
  ),
  Panel: AIDesignPanel,
};

const sections = [AIDesignSection, ...DEFAULT_SECTIONS];

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
