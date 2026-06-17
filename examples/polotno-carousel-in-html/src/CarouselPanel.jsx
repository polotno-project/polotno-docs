import React from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { Button, Input, NumericInput, Separator } from 'polotno/primitives';

// Carousel Settings Panel Component
const CarouselPanel = observer(({ store }) => {
  const selectedElement = store.selectedElements[0];
  const isImage = selectedElement && selectedElement.type === 'image';

  if (!isImage) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        <div style={{ fontSize: 40, marginBottom: '10px' }}>🖼</div>
        <p>Select an image element to configure carousel settings</p>
      </div>
    );
  }

  const images = selectedElement.custom?.images || [];
  const timeout =
    selectedElement.custom?.carouselTimeout !== undefined
      ? selectedElement.custom.carouselTimeout
      : 3000;

  const addImage = () => {
    const newImages = [...images, ''];
    selectedElement.set({
      custom: {
        ...selectedElement.custom,
        images: newImages,
      },
    });
  };

  const updateImage = (index, value) => {
    const newImages = [...images];
    newImages[index] = value;
    selectedElement.set({
      custom: {
        ...selectedElement.custom,
        images: newImages,
      },
    });
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    selectedElement.set({
      custom: {
        ...selectedElement.custom,
        images: newImages,
      },
    });
  };

  const updateTimeout = (value) => {
    selectedElement.set({
      custom: {
        ...selectedElement.custom,
        carouselTimeout: value,
      },
    });
  };

  return (
    <div style={{ padding: '20px', height: '100%', overflow: 'auto' }}>
      <h5 style={{ margin: '0 0 8px' }}>Carousel Settings</h5>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
        Configure carousel images and animation timeout for the selected image.
      </p>

      <Separator style={{ margin: '15px 0' }} />

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          Carousel Timeout (ms)
        </label>
        <NumericInput
          value={timeout}
          onValueChange={updateTimeout}
          min={500}
          max={30000}
        />
        <p style={{ fontSize: '11px', color: '#999', marginTop: '5px' }}>
          Time between slide transitions (default: 3000ms)
        </p>
      </div>

      <Separator style={{ margin: '15px 0' }} />

      <div style={{ marginBottom: '10px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          Carousel Images ({images.length})
        </label>
        <p style={{ fontSize: '11px', color: '#999', marginBottom: '10px' }}>
          Add additional images to create a carousel animation
        </p>
      </div>

      {images.map((image, index) => (
        <div
          key={index}
          style={{
            marginBottom: '10px',
            padding: '10px',
            border: '1px solid var(--pn-border, #e5e5e5)',
            borderRadius: '8px',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              Image {index + 1}
            </label>
            <div style={{ display: 'flex', gap: 4 }}>
              <Input
                value={image}
                onChange={(e) => updateImage(index, e.target.value)}
                placeholder="Enter image URL"
                style={{ flex: 1 }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => removeImage(index)}
                onMouseDown={(e) => e.preventDefault()}
              >
                ✕
              </Button>
            </div>
          </div>
          {image && (
            <div
              style={{
                marginTop: '8px',
                border: '1px solid #ddd',
                borderRadius: '3px',
                overflow: 'hidden',
                maxHeight: '100px',
              }}
            >
              <img
                src={image}
                alt={`Preview ${index + 1}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      ))}

      <Button
        onClick={addImage}
        style={{ marginTop: '10px', width: '100%' }}
        onMouseDown={(e) => e.preventDefault()}
      >
        Add Carousel Image
      </Button>
    </div>
  );
});

// Define custom Carousel section
export const CarouselSection = {
  name: 'carousel',
  Tab: (props) => (
    <SectionTab name="Carousel" {...props}>
      🖼
    </SectionTab>
  ),
  Panel: CarouselPanel,
};
