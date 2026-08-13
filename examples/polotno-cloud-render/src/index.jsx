import React from 'react';
import ReactDOM from 'react-dom/client';
import { DEFAULT_JSON } from './sample';

const downloadFile = async (url, filename) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
};

// this is a demo key just for that project
// (!) please don't use it in your projects
// to create your own API key please go here: https://polotno.com/cabinet
const KEY = 'nFA5H9elEytDyPyvKL7T';

const FORMATS = ['png', 'jpeg', 'pdf', 'gif', 'mp4'];

// Small labeled control group for the options bar.
const Field = ({ label, children }) => (
  <label className="field">
    <span className="field-label">{label}</span>
    {children}
  </label>
);

const Switch = ({ checked, onChange, disabled }) => (
  <span className={'switch' + (disabled ? ' switch--disabled' : '')}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="switch-track" />
  </span>
);

const App = () => {
  const [format, setFormat] = React.useState('png');
  const [pixelRatio, setPixelRatio] = React.useState(1);
  const [dpi, setDPI] = React.useState('auto'); // 'auto' uses value from design JSON
  const [fps, setFps] = React.useState(24);
  const [vector, setVector] = React.useState(false);
  const [printReady, setPrintReady] = React.useState(false); // PDF/X-4
  const [colorSpace, setColorSpace] = React.useState('RGB');
  const [profile, setProfile] = React.useState('FOGRA39');
  const [includeBleed, setIncludeBleed] = React.useState(false);
  const [skipFontError, setSkipFontError] = React.useState(false);
  const [skipImageError, setSkipImageError] = React.useState(false);
  const [textOverflow, setTextOverflow] = React.useState('change-font-size');
  const [webhook, setWebhook] = React.useState('');
  const [showMore, setShowMore] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [image, setImage] = React.useState(null);
  const [downloaded, setDownloaded] = React.useState(null);

  const [jsonText, setJsonText] = React.useState(
    JSON.stringify(DEFAULT_JSON, null, 2)
  );
  const [jsonError, setJsonError] = React.useState(null);
  const textareaRef = React.useRef(null);

  const isPdf = format === 'pdf';
  const canCmyk = format === 'jpeg' || isPdf;
  const isDownloadFormat = isPdf || format === 'mp4' || format === 'gif';

  // Build only the options that matter for the selected format,
  // so the payload mirrors what you would send from your own code.
  const buildRenderOptions = () => {
    const options = { format, outputFormat: 'url' };
    if (!(isPdf && vector)) {
      // quality of rasterization; vector PDF has no raster to scale
      options.pixelRatio = pixelRatio;
    }
    if (isPdf && dpi !== 'auto') {
      options.dpi = parseInt(dpi, 10);
    }
    if (format === 'mp4') {
      options.fps = fps;
    }
    if (isPdf) {
      options.includeBleed = includeBleed;
      if (vector) {
        options.vector = true;
        if (printReady) {
          options.pdfx = 'x-4';
        }
      }
    }
    if (canCmyk && colorSpace === 'CMYK') {
      options.color = { space: 'CMYK', profile };
    }
    if (skipFontError) {
      options.skipFontError = true;
    }
    if (skipImageError) {
      options.skipImageError = true;
    }
    if (textOverflow !== 'change-font-size') {
      options.textOverflow = textOverflow;
    }
    if (webhook) {
      options.webhook = webhook;
    }
    return options;
  };

  const handleRender = async () => {
    setLoading(true);
    setImage(null);
    setDownloaded(null);
    setProgress(0);
    try {
      let json;
      try {
        json = JSON.parse(jsonText);
        setJsonError(null);
      } catch (e) {
        setJsonError(e.message);
        textareaRef.current?.focus();
        setLoading(false);
        return;
      }

      const finish = (job) => {
        const url = job.output;
        if (isDownloadFormat) {
          downloadFile(url, 'export.' + format);
          setDownloaded('export.' + format);
        } else {
          setImage(url);
        }
      };

      const req = await fetch(
        'https://api.polotno.com/api/renders?KEY=' + KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Prefer: 'wait' },
          body: JSON.stringify({ design: json, ...buildRenderOptions() }),
        }
      );
      const job = await req.json();
      if (job.status === 'error') {
        alert('Error: ' + job.error);
      } else if (job.status === 'done') {
        finish(job);
      } else {
        // poll until the job completes
        for (let i = 0; i < 100; i++) {
          const req = await fetch(
            'https://api.polotno.com/api/renders/' + job.id + '?KEY=' + KEY
          );
          const polled = await req.json();
          if (polled.status === 'error') {
            alert('Error: ' + polled.error);
            break;
          }
          if (polled.status === 'progress') {
            setProgress(polled.progress);
          }
          if (polled.status === 'done') {
            finish(polled);
            break;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    } catch (e) {
      console.error(e);
      alert('Something went wrong...');
    }
    setLoading(false);
    setProgress(0);
  };

  return (
    <div className="app">
      <div className="layout">
        <div className="pane">
          <div className="pane-header">
            <span className="pane-title">Design JSON</span>
            {jsonError && <span className="error">{jsonError}</span>}
          </div>
          <textarea
            ref={textareaRef}
            className="json-input"
            spellCheck={false}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            onBlur={() => {
              try {
                JSON.parse(jsonText);
                setJsonError(null);
              } catch (e) {
                setJsonError(e.message);
              }
            }}
          />
        </div>
        <div className="pane">
          <div className="pane-header">
            <span className="pane-title">Preview</span>
          </div>
          <div className="preview">
            {image ? (
              <img src={image} alt="Rendered output" />
            ) : (
              <span className="preview-hint">
                {downloaded
                  ? `Downloaded ${downloaded}`
                  : 'Render result appears here'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="options-bar">
        {/* a div, not <Field>'s <label>: buttons inside a label lose their
            own accessible names */}
        <div className="field">
          <span className="field-label">Format</span>
          <div className="segmented">
            {FORMATS.map((f) => (
              <button
                key={f}
                className={f === format ? 'active' : ''}
                onClick={() => setFormat(f)}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {!(isPdf && vector) && (
          <Field label={`Quality ×${pixelRatio}`}>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.5"
              value={pixelRatio}
              onChange={(e) => setPixelRatio(parseFloat(e.target.value))}
            />
          </Field>
        )}

        {format === 'mp4' && (
          <Field label={`FPS ${fps}`}>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value, 10))}
            />
          </Field>
        )}

        {isPdf && (
          <>
            <Field label="DPI">
              <select value={dpi} onChange={(e) => setDPI(e.target.value)}>
                <option value="auto">Auto</option>
                <option value="72">72</option>
                <option value="150">150</option>
                <option value="300">300</option>
              </select>
            </Field>
            <Field label="Vector">
              <Switch checked={vector} onChange={setVector} />
            </Field>
            {vector && (
              <Field label="Print-ready (PDF/X-4)">
                <Switch checked={printReady} onChange={setPrintReady} />
              </Field>
            )}
            <Field label="Bleed">
              <Switch checked={includeBleed} onChange={setIncludeBleed} />
            </Field>
          </>
        )}

        {canCmyk && (
          <Field label="Color">
            <select
              value={colorSpace}
              onChange={(e) => setColorSpace(e.target.value)}
            >
              <option value="RGB">RGB</option>
              <option value="CMYK">CMYK</option>
            </select>
          </Field>
        )}

        {canCmyk && colorSpace === 'CMYK' && (
          <Field label="Profile">
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
            >
              <option value="FOGRA39">FOGRA39</option>
              <option value="USWebCoatedSWOP">US Web Coated (SWOP)</option>
            </select>
          </Field>
        )}

        <button
          className="more-button"
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? 'Less options' : 'More options'}
        </button>

        <button
          className="render-button"
          onClick={handleRender}
          disabled={loading}
        >
          {loading
            ? progress > 0
              ? `Rendering ${progress}%`
              : 'Rendering…'
            : isDownloadFormat
              ? 'Render & Download'
              : 'Render'}
        </button>
      </div>

      {showMore && (
        <div className="options-bar options-bar--secondary">
          <Field label="Skip font errors">
            <Switch checked={skipFontError} onChange={setSkipFontError} />
          </Field>
          <Field label="Skip image errors">
            <Switch checked={skipImageError} onChange={setSkipImageError} />
          </Field>
          <Field label="Text overflow">
            <select
              value={textOverflow}
              onChange={(e) => setTextOverflow(e.target.value)}
            >
              <option value="change-font-size">Change font size</option>
              <option value="resize">Resize</option>
              <option value="ellipsis">Ellipsis</option>
            </select>
          </Field>
          <Field label="Webhook">
            <input
              className="text-input"
              type="text"
              placeholder="https://…"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
          </Field>
        </div>
      )}
      {loading && (
        <div className="progress-line">
          <div style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
