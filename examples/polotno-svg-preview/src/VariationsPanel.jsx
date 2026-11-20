import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { SectionTab } from 'polotno/side-panel';
import { jsonToSVG } from '@polotno/svg-export';
import { svgToURL } from 'polotno/utils/svg';
import FaShapes from '@meronex/icons/fa/FaShapes';
import { Button } from 'polotno/primitives';
import { ImagesGrid } from 'polotno/side-panel/images-grid';
import { resolveVariables } from '@polotno/schema/variables';

// Fill the design's `{{number}}` template variable with a new value. It
// returns a filled copy and leaves the design in the editor as it is.
const createVariation = (json) =>
  resolveVariables(json, { number: Math.random() }).design;

export const VariationsSection = {
  name: 'variations',
  Tab: (props) => (
    <SectionTab name="Variations" {...props}>
      <FaShapes />
    </SectionTab>
  ),
  Panel: observer(({ store }) => {
    const [svgs, setSvgs] = useState([]);
    const [loading, setLoading] = useState(false);

    const generateVariations = async () => {
      setLoading(true);
      const json = store.toJSON();
      const urls = [];
      for (let i = 0; i < 10; i++) {
        const variation = createVariation(json);
        // one page per SVG document
        const svgString = await jsonToSVG({ ...variation, pages: [variation.pages[0]] });
        const url = svgToURL(svgString);
        urls.push({ name: `Variation ${i + 1}`, url });
      }
      setSvgs(urls);
      setLoading(false);
    };

    return (
      <div style={{ padding: 16, height: '100%' }}>
        <Button
          disabled={loading}
          onClick={generateVariations}
          style={{ marginBottom: 16, width: '100%' }}
        >
          Generate Variations
        </Button>
        <ImagesGrid
          images={svgs}
          isLoading={loading}
          getPreview={(item) => item.url}
          onSelect={() => {}}
          rowsNumber={2}
          itemHeight={120}
        />
      </div>
    );
  }),
};
