import React from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Card } from '@blueprintjs/core';
import { templateStore } from './template-store';
import { jsonToSVG } from 'polotno/utils/to-svg';
import { svgToURL } from 'polotno/utils/svg';

// Component to render a single template preview with lazy loading
const TemplatePreview = observer(({ template }) => {
  const [previewUrl, setPreviewUrl] = React.useState(template.preview);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    // If template doesn't have a preview, generate it
    if (!template.preview && template.json && !isLoading) {
      setIsLoading(true);
      jsonToSVG({ json: template.json })
        .then((svgString) => svgToURL(svgString))
        .then((url) => {
          setPreviewUrl(url);
        })
        .catch((error) => {
          console.error('Error generating preview:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [template]);

  if (isLoading) {
    return (
      <span style={{ color: '#999', fontSize: '12px' }}>Generating...</span>
    );
  }

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt="Template preview"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    );
  }

  return <span style={{ color: '#999', fontSize: '12px' }}>No preview</span>;
});

const TemplateGrid = observer(({ store }) => {
  const handleTemplateClick = async (template) => {
    try {
      const page = store.activePage;
      if (!page) {
        alert('No active page');
        return;
      }

      // Parse the template JSON and insert elements into current page
      const templateData = JSON.parse(JSON.stringify(template.json));

      // Get elements from template
      const elements = templateData.pages[0]?.children || [];

      // Calculate center position on current page
      const centerX = page.computedWidth / 2;
      const centerY = page.computedHeight / 2;
      const templateWidth = templateData.width;
      const templateHeight = templateData.height;

      // Offset to center the template
      const offsetX = centerX - templateWidth / 2;
      const offsetY = centerY - templateHeight / 2;

      // Add each element to the page
      elements.forEach((elementData) => {
        const adjustedData = {
          ...elementData,
          x: elementData.x + offsetX,
          y: elementData.y + offsetY,
        };
        page.addElement(adjustedData);
      });

      // Select all newly added elements
      const newElements = page.children.slice(-elements.length);
      store.selectElements(newElements.map((e) => e.id));
    } catch (error) {
      console.error('Error inserting template:', error);
      alert('Failed to insert template');
    }
  };

  const handleDeleteTemplate = (e, templateId) => {
    e.stopPropagation();
    templateStore.removeTemplate(templateId);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3>Saved Templates</h3>

      {templateStore.templates.length === 0 && (
        <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>
          No templates saved yet. Select elements on the canvas and click "Save
          as Template" to create one.
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: '15px',
          marginTop: '20px',
        }}
      >
        {templateStore.templates.map((template) => (
          <Card
            key={template.id}
            interactive
            elevation={1}
            style={{
              padding: '10px',
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={() => handleTemplateClick(template)}
          >
            <div
              style={{
                width: '100%',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                marginBottom: '8px',
                overflow: 'hidden',
                borderRadius: '4px',
              }}
            >
              <TemplatePreview template={template} />
            </div>

            <div
              style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}
            >
              {new Date(template.createdAt).toLocaleDateString()}
            </div>

            <Button
              icon="trash"
              small
              minimal
              intent="danger"
              style={{ position: 'absolute', top: '5px', right: '5px' }}
              onClick={(e) => handleDeleteTemplate(e, template.id)}
            />
          </Card>
        ))}
      </div>
    </div>
  );
});

// Define the custom section panel
export const TemplatesSection = {
  name: 'elements-templates',
  Tab: (props) => (
    <SectionTab name="Items" {...props}>
      <div style={{ fontSize: '20px' }}>📋</div>
    </SectionTab>
  ),
  Panel: TemplateGrid,
};
