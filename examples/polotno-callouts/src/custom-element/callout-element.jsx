/**
 * Way 2: a new element type for Polotno, `callout`.
 *
 * Three steps, all of them from `polotno/config`:
 *   1. `unstable_registerShapeModel`     - the attributes and their defaults
 *   2. `unstable_registerShapeComponent` - how the canvas draws it
 *   3. `unstable_registerTransformerAttrs` - which resize handles it gets
 *
 * The element draws the balloon only. The text stays a normal Polotno `text`
 * element, so it keeps the fonts, the colors and the editing of the editor.
 * `add-callout.js` puts the two into one group.
 *
 * Value of this way: the blue handle on the canvas. It is a Konva shape
 * inside the element, so it can move the tail with the mouse, like PowerPoint
 * does. Cost: the type is new, so the Cloud Render API and the vector
 * exporters do not know it (see the README).
 */

import React from 'react';
import { observer } from 'mobx-react-lite';
import { Group, Rect, Path, Circle } from 'react-konva';
import { EDITOR_ACCENT_COLOR } from 'polotno/canvas/workspace-style';
import {
  unstable_registerShapeModel,
  unstable_registerShapeComponent,
  unstable_registerTransformerAttrs,
} from 'polotno/config';

import { buildCallout, CALLOUT_DEFAULTS } from '../shared/callout-geometry';
import { CALLOUT_STYLE, renderOptions } from '../shared/callout-svg';

export const CALLOUT_TYPE = 'callout';

const clamp = (value) => Math.max(0, Math.min(1, value));

// 1. the model. `x`, `y`, `rotation`, `opacity`, `draggable`, `custom`... are
// already there, we only define what is new for this element.
unstable_registerShapeModel({
  type: CALLOUT_TYPE,
  width: 320,
  height: 220,
  ...CALLOUT_STYLE,
  ...CALLOUT_DEFAULTS,
});

// 2. the component
const CalloutElement = observer(({ element }) => {
  // `element.a` holds the animated values of the standard attributes. Read
  // them, not `element.x`, or animations do not move the callout.
  const a = element.a;

  const { outline, leader, arrow, tip } = buildCallout({
    width: a.width,
    height: a.height,
    shape: element.shape,
    tail: element.tail,
    tipX: element.tipX,
    tipY: element.tipY,
    tailWidth: element.tailWidth,
    inset: element.inset,
    cornerRadius: element.cornerRadius,
    ...renderOptions(element.strokeWidth),
  });

  const strokeProps = {
    stroke: element.stroke,
    strokeWidth: element.strokeWidth,
    hitStrokeWidth: Math.max(10, element.strokeWidth),
  };

  const savePosition = (event) => {
    // the handle stops its own drag events (see `cancelBubble` below), so
    // everything that arrives here is a drag of the callout itself
    element.set({ x: event.target.x(), y: event.target.y() });
  };

  return (
    <Group
      id={element.id}
      // Polotno finds the node of an element by this name
      name="element"
      x={a.x}
      y={a.y}
      rotation={a.rotation}
      opacity={a.opacity}
      listening={element.selectable}
      draggable={element.draggable}
      hideInExport={!element.showInExport}
      onDragMove={savePosition}
      onDragEnd={savePosition}
      onTransform={(event) => {
        const node = event.target;
        const scale = node.scale();
        // the transformer works with scale, the model works with size
        node.scaleX(1);
        node.scaleY(1);
        element.set({
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          width: Math.max(20, element.width * scale.x),
          height: Math.max(20, element.height * scale.y),
        });
      }}
    >
      {/* a transparent hit area, so a click inside the balloon selects it */}
      <Rect width={a.width} height={a.height} fill="transparent" />
      <Path
        data={outline}
        fill={element.fill}
        lineJoin="round"
        {...strokeProps}
      />
      {leader && <Path data={leader} lineCap="round" {...strokeProps} />}
      {arrow && <Path data={arrow} fill={element.stroke} />}
      {/* `isSelected` is also true when the parent group is selected */}
      {element.isSelected && element.draggable && (
        <Circle
          x={tip[0]}
          y={tip[1]}
          radius={7}
          fill={EDITOR_ACCENT_COLOR}
          stroke="#ffffff"
          strokeWidth={2}
          draggable
          hideInExport
          // the editor moves the whole selection on a drag that reaches the
          // stage: stop the event here, the handle moves the tail only
          onDragStart={(event) => {
            event.cancelBubble = true;
          }}
          onDragEnd={(event) => {
            event.cancelBubble = true;
          }}
          onDragMove={(event) => {
            event.cancelBubble = true;
            const node = event.target;
            // the tip is kept in the box, as a fraction of it
            const tipX = clamp(node.x() / a.width);
            const tipY = clamp(node.y() / a.height);
            element.set({ tipX, tipY });
            node.position({ x: tipX * a.width, y: tipY * a.height });
          }}
        />
      )}
    </Group>
  );
});

unstable_registerShapeComponent(CALLOUT_TYPE, CalloutElement);

// 3. all eight resize handles, the balloon does not need a fixed ratio
unstable_registerTransformerAttrs(CALLOUT_TYPE, {
  keepRatio: false,
  enabledAnchors: [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ],
});
