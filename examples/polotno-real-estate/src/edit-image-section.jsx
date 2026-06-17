import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Spinner, Textarea } from 'polotno/primitives';
import { SectionTab } from 'polotno/side-panel';
import { getKey } from 'polotno/utils/validate-key';
import { getImageSize, getCrop } from 'polotno/utils/image';

const LISTING_TOOLS = [
  {
    id: 'declutter-interior',
    label: 'Declutter interior',
    prompt:
      'Clean up and declutter this interior room photo. Remove clutter, mess, and personal items. Make the room look tidy, spacious, and presentable for a real estate listing.',
  },
  {
    id: 'declutter-exterior',
    label: 'Declutter exterior',
    prompt:
      'Clean up the exterior of this property photo. Remove clutter, debris, and distracting items from the yard and surroundings. Make the exterior look clean and well-maintained for a real estate listing.',
  },
  {
    id: 'empty-room',
    label: 'Empty room',
    prompt:
      'Remove all furniture and items from this room. Show the room completely empty with clean walls, floors, and windows. Keep the room structure, lighting, and architectural features intact.',
  },
  {
    id: 'virtual-stage',
    label: 'Virtual stage',
    prompt:
      'Virtually stage this room with modern, appealing furniture and decor. Add tasteful furniture, rugs, artwork, and plants. Make it look like a professionally staged home for a real estate listing.',
  },
  {
    id: 'replace-sky',
    label: 'Replace sky',
    prompt:
      'Replace the sky in this photo with a beautiful blue sky with some white clouds. Keep the rest of the image the same. Make it look natural and appealing for a real estate listing.',
  },
  {
    id: 'improve-lighting',
    label: 'Improve lighting',
    prompt:
      'Improve the lighting in this photo. Make it brighter, more natural, and more inviting. Fix any dark areas or harsh shadows. Make the space look warm and welcoming for a real estate listing.',
  },
];

const INTENSITY_PROMPTS = {
  Strong:
    ' Apply strong, dramatic changes. Make the transformation very noticeable.',
  Medium: ' Apply moderate changes. Keep a natural balance.',
  Low: ' Apply subtle, minimal changes. Keep the image mostly the same.',
};

const DrillDownPanel = observer(({ store, tool, onBack, onClose }) => {
  const [intensity, setIntensity] = React.useState('Strong');
  const [showCustomPrompt, setShowCustomPrompt] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const handleRun = async () => {
    const element = store.selectedElements[0];
    if (!element || element.type !== 'image') return;

    setLoading(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + 2;
      });
    }, 600);

    try {
      const imageUrl = element.src;
      const finalPrompt =
        (customPrompt || tool.prompt) + INTENSITY_PROMPTS[intensity];

      const response = await fetch(
        'https://api.polotno.com/api/ai/image-to-image?KEY=' + getKey(),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: imageUrl,
            prompt: finalPrompt,
            model: 'nano-banana',
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${errorText}`);
      }

      const data = await response.json();
      setProgress(100);

      const newSize = await getImageSize(data.url);
      const crop = getCrop(element, newSize);
      element.set({ src: data.url, ...crop });
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image: ' + error.message);
    } finally {
      setLoading(false);
      clearInterval(progressInterval);
    }
  };

  return (
    <div className="drill-down-panel">
      <div className="drill-down-header">
        <button className="back-button" onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M15 9H3M3 9L8 4M3 9L8 14"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <span className="title">{tool.label}</span>
        <button className="close-button" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
            <path d="M1 1l12 12M13 1L1 13" stroke="white" strokeWidth="2" />
          </svg>
        </button>
      </div>
      <div className="drill-down-body">
        <label>Intensity</label>
        <div className="intensity-group">
          {['Strong', 'Medium', 'Low'].map((level) => (
            <button
              key={level}
              className={`intensity-button${
                intensity === level ? ' active' : ''
              }`}
              onClick={() => setIntensity(level)}
            >
              {level}
            </button>
          ))}
        </div>

        {!showCustomPrompt ? (
          <button
            className="custom-prompt-toggle"
            onClick={() => setShowCustomPrompt(true)}
          >
            + Add a custom prompt
          </button>
        ) : (
          <div style={{ marginBottom: '12px' }}>
            <label>Custom prompt</label>
            <Textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe what you want to change..."
              style={{
                backgroundColor: '#262626',
                border: '1px solid #393939',
                color: 'white',
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '10px 0',
              marginBottom: '8px',
            }}
          >
            <Spinner size={24} />
            <div
              style={{
                marginTop: '6px',
                fontSize: '12px',
                color: '#a8a8a8',
              }}
            >
              Processing... {progress}%
            </div>
          </div>
        )}

        <Button
          className="run-button"
          onClick={handleRun}
          disabled={loading}
        >
          Run
        </Button>
      </div>
    </div>
  );
});

const EditImageMainPanel = observer(({ store, onSelectTool }) => {
  const element = store.selectedElements[0];
  const [processingAction, setProcessingAction] = React.useState(null);

  if (!element || element.type !== 'image') {
    return (
      <div className="edit-image-panel">
        <p style={{ color: '#a8a8a8' }}>Select an image to edit it.</p>
      </div>
    );
  }

  const handleAiTool = async (action) => {
    setProcessingAction(action);
    try {
      const imageUrl = element.src;

      let data;
      if (action === 'remove-background') {
        const response = await fetch(
          'https://api.polotno.com/api/remove-image-background?KEY=' + getKey(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl }),
          },
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${errorText}`);
        }
        data = await response.json();
      } else {
        let prompt = '';
        switch (action) {
          case 'extend':
            prompt =
              'Extend this image outward, generating natural content beyond the current borders. Keep the style consistent.';
            break;
          case 'upscale':
            prompt =
              'Upscale and enhance the resolution of this image. Make it sharper and more detailed.';
            break;
          case 'enhance':
            prompt =
              'Enhance this image quality. Improve colors, contrast, sharpness and overall visual appeal.';
            break;
          default:
            return;
        }

        const response = await fetch(
          'https://api.polotno.com/api/ai/image-to-image?KEY=' + getKey(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: imageUrl,
              prompt,
              model: 'nano-banana',
            }),
          },
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${errorText}`);
        }
        data = await response.json();
      }

      const newSize = await getImageSize(data.url);
      const crop = getCrop(element, newSize);
      element.set({ src: data.url, ...crop });
    } catch (error) {
      console.error('Error with AI tool:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="edit-image-panel">
      <h3>Edit image</h3>

      <div className="button-row">
        <Button
          className="tool-button"
          size="sm"
          onClick={() => store.openSidePanel('effects')}
        >
          Effects
        </Button>
        <Button
          className="tool-button"
          size="sm"
          onClick={() => store.openSidePanel('animation')}
        >
          Animate
        </Button>
        <Button
          className="tool-button"
          size="sm"
          onClick={() => store.openSidePanel('image-clip')}
        >
          Apply mask
        </Button>
      </div>

      <div className="section-header">AI Tools</div>

      <div className="button-row">
        <Button
          className="tool-button"
          size="sm"
          disabled={processingAction === 'remove-background'}
          onClick={() => handleAiTool('remove-background')}
        >
          Remove background
        </Button>
      </div>
      <div className="button-row">
        <Button
          className="tool-button"
          size="sm"
          disabled={processingAction === 'extend'}
          onClick={() => handleAiTool('extend')}
        >
          Extend
        </Button>
        <Button
          className="tool-button"
          size="sm"
          disabled={processingAction === 'upscale'}
          onClick={() => handleAiTool('upscale')}
        >
          Upscale
        </Button>
        <Button
          className="tool-button"
          size="sm"
          disabled={processingAction === 'enhance'}
          onClick={() => handleAiTool('enhance')}
        >
          Enhance
        </Button>
      </div>
      <div className="section-header">Listing Tools</div>

      <div className="button-row">
        {LISTING_TOOLS.slice(0, 2).map((tool) => (
          <Button
            key={tool.id}
            className="tool-button"
            size="sm"
            onClick={() => onSelectTool(tool)}
          >
            {tool.label}
          </Button>
        ))}
      </div>
      <div className="button-row">
        {LISTING_TOOLS.slice(2, 4).map((tool) => (
          <Button
            key={tool.id}
            className="tool-button"
            size="sm"
            onClick={() => onSelectTool(tool)}
          >
            {tool.label}
          </Button>
        ))}
      </div>
      <div className="button-row">
        {LISTING_TOOLS.slice(4, 6).map((tool) => (
          <Button
            key={tool.id}
            className="tool-button"
            size="sm"
            onClick={() => onSelectTool(tool)}
          >
            {tool.label}
          </Button>
        ))}
      </div>
    </div>
  );
});

const EditImagePanel = observer(({ store }) => {
  const [selectedTool, setSelectedTool] = React.useState(null);

  const handleBack = () => setSelectedTool(null);

  const handleClose = () => {
    setSelectedTool(null);
    store.selectElements([]);
  };

  if (selectedTool) {
    return (
      <DrillDownPanel
        store={store}
        tool={selectedTool}
        onBack={handleBack}
        onClose={handleClose}
      />
    );
  }

  return <EditImageMainPanel store={store} onSelectTool={setSelectedTool} />;
});

export const EditImageSection = {
  name: 'edit-image',
  Tab: (props) => null,
  Panel: EditImagePanel,
};
