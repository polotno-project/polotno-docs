import React from 'react';
import ReactDOM from 'react-dom/client';
import { observer } from 'mobx-react-lite';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { PagesTimeline } from 'polotno/pages-timeline';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, DEFAULT_SECTIONS, SectionTab } from 'polotno/side-panel';
import { Workspace } from 'polotno/canvas/workspace';
import { NumericInput, FormGroup, Divider, Card, Tag } from '@blueprintjs/core';
import MdTransform from '@meronex/icons/md/MdTransform';

// Import Polotno utilities for math operations
import {
  getTotalClientRect,
  getCenter,
  rotateAroundPoint,
} from 'polotno/utils/math';
import { forEveryChild } from 'polotno/model/group-model';

import { createStore } from 'polotno/model/store';

const store = createStore({
  key: 'nFA5H9elEytDyPyvKL7T',
  showCredit: true,
});
const page = store.addPage();

// Add some demo elements
page.addElement({
  type: 'text',
  text: 'Select me and/or the shape and resize us via side panel',
  x: 100,
  y: 100,
  fontSize: 40,
  width: 300,
  id: 'text-1',
});

page.addElement({
  type: 'figure',
  x: 600,
  y: 500,
  width: 150,
  height: 150,
  fill: '#4A90D9',
  id: 'figure-1',
});

// Get all leaf shapes (non-group elements) from selection
function getShapes(elements) {
  const shapes = [];
  elements.forEach((el) => {
    if (el.type === 'group') {
      forEveryChild(el, (child) => {
        if (child.type !== 'group') {
          shapes.push(child);
        }
      });
    } else {
      shapes.push(el);
    }
  });
  return shapes;
}

// The Transform Panel component
const TransformPanel = observer(({ store }) => {
  const elements = store.selectedElements;

  // Local rotation state for groups/multiple selections
  const [localRotation, setLocalRotation] = React.useState(0);
  const prevSelectionRef = React.useRef(null);

  // Get selection key for tracking changes
  const selectionKey = elements.map((e) => e.id).join(',');

  // Get all shapes for calculations
  const shapes = getShapes(elements);

  // Check if this is a multi-element or group scenario
  const isMultiple = elements.length > 1;
  const hasGroup = elements.some((el) => el.type === 'group');
  const isSingleElement = elements.length === 1 && elements[0].type !== 'group';
  const isSingleGroup = elements.length === 1 && elements[0].type === 'group';
  const needsLocalRotation = isMultiple || hasGroup;

  // Get current rotation from shapes
  const getCurrentRotation = React.useCallback(() => {
    if (shapes.length === 0) return 0;
    const rotations = shapes.map((el) => el.rotation || 0);
    const allSame = rotations.every((r) => r === rotations[0]);
    return allSame ? rotations[0] : 0;
  }, [shapes]);

  // Reset local rotation when selection changes or external rotation changes
  React.useEffect(() => {
    if (selectionKey !== prevSelectionRef.current) {
      prevSelectionRef.current = selectionKey;
      if (needsLocalRotation) {
        setLocalRotation(getCurrentRotation());
      }
    }
  }, [selectionKey, needsLocalRotation, getCurrentRotation]);

  // Also sync local rotation when shapes rotation changes externally
  React.useEffect(() => {
    if (needsLocalRotation) {
      const currentRotation = getCurrentRotation();
      // Only sync if not currently interacting (avoid feedback loops)
      // We detect external changes by checking if the value differs significantly
      if (Math.abs(currentRotation - localRotation) > 0.5) {
        setLocalRotation(currentRotation);
      }
    }
  }, [shapes.map((s) => s.rotation).join(',')]);

  if (elements.length === 0) {
    return (
      <div style={{ padding: 16 }}>
        <Card>
          <p style={{ margin: 0, color: '#888' }}>
            Select an element to transform
          </p>
        </Card>
      </div>
    );
  }

  // Get bounding box using Polotno utility
  const bbox = getTotalClientRect(shapes);

  // Get values based on selection type
  let x, y, width, height, rotation;

  if (isSingleElement) {
    const el = elements[0];
    x = el.x;
    y = el.y;
    width = el.width;
    height = el.height;
    rotation = el.rotation || 0;
  } else {
    // For groups or multiple elements, use bounding box
    x = bbox.x;
    y = bbox.y;
    width = bbox.width;
    height = bbox.height;
    rotation = localRotation;
  }

  const handleXChange = (value) => {
    if (isNaN(value)) return;
    if (isSingleElement) {
      elements[0].set({ x: value });
    } else {
      const deltaX = value - bbox.x;
      shapes.forEach((shape) => {
        shape.set({ x: shape.x + deltaX });
      });
    }
  };

  const handleYChange = (value) => {
    if (isNaN(value)) return;
    if (isSingleElement) {
      elements[0].set({ y: value });
    } else {
      const deltaY = value - bbox.y;
      shapes.forEach((shape) => {
        shape.set({ y: shape.y + deltaY });
      });
    }
  };

  const handleWidthChange = (value) => {
    if (isNaN(value) || value <= 0) return;

    if (isSingleElement) {
      // Single element: scale proportionally (locked ratio)
      const el = elements[0];
      if (el.height && el.width) {
        const ratio = el.height / el.width;
        el.set({ width: value, height: value * ratio });
      } else {
        el.set({ width: value });
      }
    } else {
      // Groups/multiple: scale proportionally from top-left corner
      const scale = value / bbox.width;
      const originX = bbox.x;
      const originY = bbox.y;

      shapes.forEach((shape) => {
        const newX = originX + (shape.x - originX) * scale;
        const newY = originY + (shape.y - originY) * scale;
        const newWidth = (shape.width || 0) * scale;
        const newHeight = (shape.height || 0) * scale;

        shape.set({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      });
    }
  };

  const handleHeightChange = (value) => {
    if (isNaN(value) || value <= 0) return;

    if (isSingleElement) {
      // Single element: scale proportionally (locked ratio)
      const el = elements[0];
      if (el.height && el.width) {
        const ratio = el.width / el.height;
        el.set({ height: value, width: value * ratio });
      } else {
        el.set({ height: value });
      }
    } else {
      // Groups/multiple: scale proportionally from top-left corner
      const scale = value / bbox.height;
      const originX = bbox.x;
      const originY = bbox.y;

      shapes.forEach((shape) => {
        const newX = originX + (shape.x - originX) * scale;
        const newY = originY + (shape.y - originY) * scale;
        const newWidth = (shape.width || 0) * scale;
        const newHeight = (shape.height || 0) * scale;

        shape.set({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      });
    }
  };

  const handleRotationChange = (value) => {
    if (isNaN(value)) return;

    // Use bounding box center for all cases - works correctly even for rotated elements
    const center = getCenter(bbox);

    if (isSingleElement) {
      // Single element: rotate around its center
      const el = elements[0];
      const delta = value - (el.rotation || 0);
      const newShape = rotateAroundPoint(
        {
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation || 0,
        },
        delta,
        center
      );
      el.set(newShape);
    } else {
      // Groups/multiple: rotate around center of bounding box
      const delta = value - localRotation;

      shapes.forEach((shape) => {
        const newShape = rotateAroundPoint(
          {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation || 0,
          },
          delta,
          center
        );
        shape.set(newShape);
      });

      setLocalRotation(value);
    }
  };

  const inputStyle = { width: '100%' };

  return (
    <div style={{ padding: 16 }}>
      {/* Selection info */}
      <div
        style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        {isMultiple && (
          <Tag intent="primary" minimal>
            {elements.length} elements
          </Tag>
        )}
        {hasGroup && (
          <Tag intent="warning" minimal>
            Contains group
          </Tag>
        )}
        {isSingleGroup && (
          <Tag intent="warning" minimal>
            Group ({elements[0].children?.length || 0} children)
          </Tag>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Position */}
      <h4 style={{ margin: '0 0 12px 0', fontWeight: 600 }}>Position</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormGroup label="X" style={{ margin: 0 }}>
          <NumericInput
            value={Math.round(x)}
            onValueChange={handleXChange}
            fill
            buttonPosition="none"
            style={inputStyle}
          />
        </FormGroup>
        <FormGroup label="Y" style={{ margin: 0 }}>
          <NumericInput
            value={Math.round(y)}
            onValueChange={handleYChange}
            fill
            buttonPosition="none"
            style={inputStyle}
          />
        </FormGroup>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Size */}
      <h4 style={{ margin: '0 0 12px 0', fontWeight: 600 }}>Size</h4>
      <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#888' }}>
        Aspect ratio is locked
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <FormGroup label="Width" style={{ margin: 0 }}>
          <NumericInput
            value={Math.round(width)}
            onValueChange={handleWidthChange}
            fill
            buttonPosition="none"
            min={1}
            style={inputStyle}
          />
        </FormGroup>
        <FormGroup label="Height" style={{ margin: 0 }}>
          <NumericInput
            value={Math.round(height)}
            onValueChange={handleHeightChange}
            fill
            buttonPosition="none"
            min={1}
            style={inputStyle}
          />
        </FormGroup>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Rotation */}
      <h4 style={{ margin: '0 0 12px 0', fontWeight: 600 }}>Rotation</h4>
      <FormGroup label="Angle (degrees)" style={{ margin: 0 }}>
        <NumericInput
          value={Math.round(rotation)}
          onValueChange={handleRotationChange}
          fill
          buttonPosition="none"
          min={-360}
          max={360}
          style={inputStyle}
        />
      </FormGroup>
    </div>
  );
});

// Define the Transform section
const TransformSection = {
  name: 'transform',
  Tab: (props) => (
    <SectionTab name="Transform" {...props}>
      <MdTransform />
    </SectionTab>
  ),
  Panel: TransformPanel,
};

// Add transform section to default sections
const sections = [TransformSection, ...DEFAULT_SECTIONS];

export const App = ({ store }) => {
  return (
    <PolotnoContainer
      className="bp5-scope"
      style={{ width: '100vw', height: '100vh' }}
    >
      <SidePanelWrap>
        <SidePanel
          store={store}
          sections={sections}
          defaultSection="transform"
        />
      </SidePanelWrap>
      <WorkspaceWrap>
        <Toolbar store={store} downloadButtonEnabled />
        <Workspace store={store} />
        <ZoomButtons store={store} />
        <PagesTimeline store={store} />
      </WorkspaceWrap>
    </PolotnoContainer>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App store={store} />);
