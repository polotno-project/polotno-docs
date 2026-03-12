import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Position, Tooltip } from '@blueprintjs/core';
import { templateStore } from './template-store';
import { getTotalClientRect } from 'polotno/utils/math';
import { forEveryChild } from 'polotno/model/group-model';

// Function to serialize selected elements with adjusted positions
function serializeElementsAsTemplate(store) {
  const selectedElements = store.selectedElements;

  if (selectedElements.length === 0) {
    alert('Please select at least one element to save as template');
    return null;
  }

  const shapes = [];
  forEveryChild({ children: selectedElements }, (child) => {
    if (child.type !== 'group') {
      shapes.push(child.toJSON());
    }
  });

  // Calculate bounding box
  const bbox = getTotalClientRect(shapes);

  // Serialize elements with adjusted positions
  const elements = store.selectedElements.map((element) => {
    return JSON.parse(JSON.stringify(element.toJSON()));
  });
  forEveryChild({ children: elements }, (child) => {
    if (child.type !== 'group') {
      child.x = child.x - bbox.x;
      child.y = child.y - bbox.y;
    }
  });

  // Create a complete Polotno store JSON
  const templateJson = {
    width: Math.ceil(bbox.width),
    height: Math.ceil(bbox.height),
    fonts: [],
    pages: [
      {
        id: 'template-page',
        children: elements,
        background: 'transparent',
      },
    ],
    unit: 'px',
    dpi: 72,
    schemaVersion: 2,
  };

  return templateJson;
}

export const SaveTemplateButton = observer(({ store }) => {
  const hasSelection = store.selectedElements.length > 0;

  const handleSaveTemplate = async () => {
    const templateJson = serializeElementsAsTemplate(store);

    if (!templateJson) {
      return;
    }

    // Save to template store
    templateStore.addTemplate({
      json: templateJson,
      createdAt: Date.now(),
    });
  };

  return (
    <Tooltip
      content="Save as Template"
      position={Position.BOTTOM}
      disabled={!hasSelection}
    >
      <Button
        icon="floppy-disk"
        onClick={handleSaveTemplate}
        disabled={!hasSelection}
        minimal
      >
        Save as Template
      </Button>
    </Tooltip>
  );
});
