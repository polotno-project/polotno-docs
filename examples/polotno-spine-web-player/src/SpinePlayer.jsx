import React from 'react';
import { observer } from 'mobx-react-lite';
import { Html } from 'react-konva-utils';
import { Group, Rect, Text } from 'react-konva';
import { Navbar, Alignment } from '@blueprintjs/core';
import {
  unstable_registerShapeComponent,
  unstable_registerToolbarComponent,
  unstable_registerShapeModel,
  unstable_registerTransformerAttrs,
} from 'polotno/config';

// Define our model with default values
unstable_registerShapeModel({
  type: 'spinePlayer',
  skeleton:
    'https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy-pro.json',
  atlas:
    'https://esotericsoftware.com/files/examples/4.2/spineboy/export/spineboy-pma.atlas',
  width: 400,
  height: 400,
});

// Inner component that handles Spine Player initialization
const SpinePlayerInner = ({
  spineZIndex,
  skeleton,
  atlas,
  containerId,
  ...props
}) => {
  const containerRef = React.useRef();
  const playerRef = React.useRef(null);

  React.useLayoutEffect(() => {
    const child = containerRef.current?.parentElement;
    if (!child) return;

    const parent = child.parentElement;
    if (!parent) return;

    parent.removeChild(child);
    // Get the reference element (the element before which the new element will be inserted)
    const referenceElement = parent.children[spineZIndex];
    // Insert the new element before the reference element
    parent.insertBefore(child, referenceElement);
  }, [spineZIndex]);

  React.useEffect(() => {
    // Load Spine Player library dynamically
    const loadSpinePlayer = () => {
      // Check if already loaded
      if (window.spine && window.spine.SpinePlayer) {
        initializePlayer();
        return;
      }

      // Load CSS
      if (!document.querySelector('link[href*="spine-player.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
          'https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/spine-player.css';
        document.head.appendChild(link);
      }

      // Load JS
      if (!document.querySelector('script[src*="spine-player.js"]')) {
        const script = document.createElement('script');
        script.src =
          'https://unpkg.com/@esotericsoftware/spine-player@4.2.*/dist/iife/spine-player.js';
        script.onload = () => {
          initializePlayer();
        };
        document.head.appendChild(script);
      } else {
        // Script already exists, wait a bit and try to initialize
        setTimeout(() => {
          if (window.spine && window.spine.SpinePlayer) {
            initializePlayer();
          }
        }, 100);
      }
    };

    const initializePlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      try {
        if (window.spine && window.spine.SpinePlayer) {
          playerRef.current = new window.spine.SpinePlayer(containerId, {
            skeleton: skeleton,
            atlas: atlas,
          });
        }
      } catch (error) {
        console.error('Error initializing Spine Player:', error);
      }
    };

    loadSpinePlayer();

    // Cleanup
    return () => {
      if (playerRef.current && playerRef.current.dispose) {
        try {
          playerRef.current.dispose();
        } catch (e) {
          // Ignore cleanup errors
        }
        playerRef.current = null;
      }
    };
  }, [skeleton, atlas, containerId]);

  return (
    <div
      ref={containerRef}
      id={containerId}
      {...props}
      style={{
        width: '100%',
        height: '100%',
        ...props.style,
      }}
    />
  );
};

// Canvas component that renders the Spine Player element
export const SpinePlayerElement = observer(({ element, store }) => {
  const ref = React.useRef(null);

  const handleChange = (e) => {
    const node = e.currentTarget;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Konva.Transformer is changing scale by default
    // we don't need that, so we reset it back to 1.
    node.scaleX(1);
    node.scaleY(1);

    // and then save all changes back to the model
    element.set({
      x: node.x(),
      y: node.y(),
      rotation: e.target.rotation(),
      width: element.width * scaleX,
      height: element.height * scaleY,
    });
  };

  const PADDING = 10;
  const otherSpineElements = element.page.children.filter(
    (el) => el.type === 'spinePlayer'
  );
  const spineZIndex = otherSpineElements.indexOf(element);
  const containerId = `spine-player-${element.id}`;

  return (
    <Group
      ref={ref}
      name="element"
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      draggable={!element.locked}
      onDragMove={handleChange}
      onTransform={handleChange}
      width={element.width}
      height={element.height}
    >
      <Rect
        width={element.width}
        height={element.height}
        fill="rgba(99,102,241,1)"
        cornerRadius={8}
        shadowBlur={10}
      />
      <Rect
        x={PADDING}
        y={PADDING}
        width={element.width - PADDING * 2}
        height={element.height - PADDING * 2}
        fill="red"
        globalCompositeOperation="destination-out"
        preventDefault={false}
        cornerRadius={5}
        listening={false}
        visible={!element.page._exporting}
      />
      <Text
        text="Spine Player"
        x={PADDING}
        y={PADDING}
        visible={element.page._exporting}
      />
      <Html
        divProps={{
          style: {
            zIndex: 0,
            height: element.height,
            width: element.width,
            backgroundColor: 'white',
          },
        }}
      >
        <SpinePlayerInner
          style={{
            height: element.height,
            width: element.width,
            padding: PADDING + 'px',
          }}
          spineZIndex={spineZIndex}
          skeleton={element.skeleton}
          atlas={element.atlas}
          containerId={containerId}
        />
      </Html>
    </Group>
  );
});

// Register canvas component
unstable_registerShapeComponent('spinePlayer', SpinePlayerElement);

// Register transformer attrs
unstable_registerTransformerAttrs('spinePlayer', {
  enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
});

// Define custom toolbar (minimal for now)
const SpinePlayerToolbar = observer(({ store }) => {
  const element = store.selectedElements[0];
  return <Navbar.Group align={Alignment.LEFT}></Navbar.Group>;
});

unstable_registerToolbarComponent('spinePlayer', SpinePlayerToolbar);
