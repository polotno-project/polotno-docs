import {Icon, Tab, TabId, Tabs} from '@blueprintjs/core';
import {Style,} from '@blueprintjs/icons';
import React from 'react';
import {BrandKitContext} from './context';
import {createIndexedDbBrandKitContext} from './indexeddb-storage';
import {ColorsPanel} from './colors-panel';
import {StoreType} from 'polotno/model/store';
import {SectionTab} from 'polotno/side-panel/tab-button';
import {FontPanel} from './font-panel';
import {AssetsPanel} from './assets-panel';
import {t} from 'polotno/utils/l10n';
import { setTranslations } from 'polotno/config';

setTranslations({
  brandKit: {
    colors: 'Colors',
    fonts: 'Fonts',
    assets: 'Assets',
    addColor: 'Add Color',
    editColor: 'Edit Color',
    createColor: 'Create Color',
    colorName: 'Color Name',
    enterColorName: 'Enter color name...',
    color: 'Color',
    clickToOpenColorPicker: 'Click to open color picker',
    cancel: 'Cancel',
    update: 'Update',
    create: 'Create',
    delete: 'Delete',
    deleteConfirmation: 'Are you sure you want to delete the color',
    noMoreColorsToLoad: 'No more colors to load',
    addFont: 'Add Font',
    editFont: 'Edit Font',
    createFont: 'Create Font',
    fontName: 'Font Name',
    enterFontName: 'Enter font name...',
    fontFamily: 'Font Family',
    fontSize: 'Font Size',
    fontWeight: 'Font Weight',
    lineHeight: 'Line Height',
    italic: 'Italic',
    underline: 'Underline',
    strikethrough: 'Strikethrough',
    preview: 'Preview',
    sampleText: 'Sample Text',
    fontPreviewText: 'The quick brown fox jumps over the lazy dog',
    deleteFontConfirmation: 'Are you sure you want to delete the font',
    noMoreFontsToLoad: 'No more fonts to load',
    addAsset: 'Add Asset',
    editAsset: 'Edit Asset',
    createAsset: 'Create Asset',
    assetName: 'Asset Name',
    enterAssetName: 'Enter asset name...',
    uploadAsset: 'Upload Asset',
    selectAsset: 'Select PNG, JPEG or SVG file',
    deleteAssetConfirmation: 'Are you sure you want to delete the asset',
    noMoreAssetsToLoad: 'No more assets to load',
    selectFileError: 'Please select a PNG, JPEG, or SVG file.',
  },
}, {
  validate: true, // you can set it to false, if you don't need to check if all labels are translated
});

interface BrandKitPanelProps {
  store: StoreType;
}

const BrandKitPanel = ({store}: BrandKitPanelProps) => {
  const [selectedTabId, setSelectedTabId] = React.useState<TabId>('colors');
  
  return (
      <BrandKitContext.Provider value={createIndexedDbBrandKitContext()}>
        <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
          <Tabs onChange={(id) => setSelectedTabId(id)} id="brand-kit" renderActiveTabPanelOnly={true}>
            <Tab id="colors" title={t('brandKit.colors')}/>
            <Tab id="fonts" title={t('brandKit.fonts')}/>
            <Tab id="assets" title={t('brandKit.assets')}/>
          </Tabs>
          {selectedTabId === 'colors' && <ColorsPanel store={store}/>}
          {selectedTabId === 'fonts' && <FontPanel store={store}/>}
          {selectedTabId === 'assets' && <AssetsPanel store={store}/>}
        </div>
      </BrandKitContext.Provider>
  );
};

export const BrandKitSection = {
  name: 'brand-kit',
  Tab: (props) => (
      <SectionTab name={t('sidePanel.brandKit')} {...props}>
        <Icon icon={<Style/>}/>
      </SectionTab>
  ),
  Panel: BrandKitPanel
};