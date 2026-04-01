import React from 'react';
import Konva from 'konva';
import { observer } from 'mobx-react-lite';
import { Button, FormGroup, InputGroup, Intent } from '@blueprintjs/core';
import { Color, useBrandKit } from './context';
import { useInfiniteAPI } from 'polotno/utils/use-api';
import { StoreType } from 'polotno/model/store';
import { ColorPicker } from 'polotno/toolbar/color-picker';
import styled from 'polotno/utils/styled';
import { t } from 'polotno/utils/l10n';
import { Grid, GridItem, ItemActions, ItemInfo, ItemPreview } from './grid';
import { BrandKitDeleteAlert, BrandKitHeader, BrandKitModal, BrandKitModalActions } from './shared-components';

function colorToHex(color: string) {
  const { r, g, b } = Konva.Util.colorToRGBA(color);
  return Konva.Util._rgbToHex(r, g, b);
}

const ColorPreview = styled(ItemPreview)<{ color: string }>`
    background-color: ${props => props.color};
`;

interface ColorsPanelProps {
  store: StoreType;
  columns?: number;
}

interface ColorFormState {
  name: string;
  hex: string;
}

const defaultColorFormState: ColorFormState = {
  name: '',
  hex: ''
};

export const ColorsPanel = observer(({ store, columns = 3 }: ColorsPanelProps) => {
  const { colors } = useBrandKit();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingColor, setEditingColor] = React.useState<Color | null>(null);
  const [formState, setFormState] = React.useState<ColorFormState>(defaultColorFormState);
  const [isDeleting, setIsDeleting] = React.useState<Color | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const PAGE_SIZE = 20;
  const { loadMore, isReachingEnd, items, isLoading: isLoadingItems, error, reset, setQuery } =
    useInfiniteAPI({
      defaultQuery: '',
      getAPI: ({ page, query }) => JSON.stringify({ type: 'colors', page, query, pageSize: PAGE_SIZE }),
      fetchFunc: async (key: string) => {
        const { page, query, pageSize } = JSON.parse(key);
        return colors.listColors({ page, query, pageSize });
      }
      // rely on default getSize which uses total_pages
    });
  
  const handleColorSelect = (color: Color) => {
    // if no elements selected set background color for the active page
    if (!store.selectedElements.length) {
      store.activePage.set({
        background: `#${color.hex}`
      });
    }
    // Apply color to all selected elements
    store.selectedElements.forEach((element) => {
      element.set({ fill: `#${color.hex}` });
    });
  };
  
  const handleCreateColor = () => {
    setEditingColor(null);
    let color: string;
    if (store.selectedElements.length) {
      color = colorToHex(store.selectedElements[0].fill);
    } else if (!store.activePage.background.startsWith('http')) {
      color = colorToHex(store.activePage.background);
    }
    setFormState({
      name: '',
      hex: color || '#000000'
    });
    setIsModalOpen(true);
  };
  
  const handleEditColor = (color: Color) => {
    setEditingColor(color);
    setFormState({
      name: color.name,
      hex: color.hex
    });
    setIsModalOpen(true);
  };
  
  const handleCancel = () => {
    setEditingColor(null);
    setFormState(defaultColorFormState);
    setIsModalOpen(false);
  };
  
  const handleDeleteColor = (color: Color) => {
    setIsDeleting(color);
  };
  
  const handleSaveColor = async () => {
    if (!formState.name || !formState.hex) return;
    
    setIsLoading(true);
    try {
      if (editingColor) {
        // For updates, include the id
        const colorData = {
          id: editingColor.id,
          name: formState.name,
          hex: formState.hex.replace('#', '')
        };
        await colors.updateColor(colorData);
      } else {
        const colorData = {
          name: formState.name,
          hex: formState.hex.replace('#', '')
        };
        await colors.createColor(colorData);
      }
      
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to save color:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!isDeleting) return;
    
    setIsLoading(true);
    try {
      await colors.deleteColor(isDeleting.id);
      setIsDeleting(null);
      reset();
    } catch (error) {
      console.error('Failed to delete color:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isValidHex = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    return /^[0-9A-Fa-f]{6}$/.test(cleanHex);
  };
  
  const renderColorItem = (color: Color) => (
    <GridItem key={color.id}>
      <ColorPreview
        color={`#${color.hex}`}
        onClick={() => handleColorSelect(color)}
      />
      <ItemInfo>{color.name}</ItemInfo>
      <ItemActions>
        <Button
          icon="edit"
          minimal
          small
          onClick={(e) => {
            e.stopPropagation();
            handleEditColor(color);
          }}
        />
        <Button
          icon="trash"
          minimal
          small
          intent={Intent.DANGER}
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteColor(color);
          }}
        />
      </ItemActions>
    </GridItem>
  );
  
  return (
    <>
      <BrandKitHeader
        onAddClick={handleCreateColor}
        addButtonText={t('brandKit.addColor')}
        onSearch={setQuery}
      />
      
      <Grid
        items={items.map(item => item.items).flat()}
        columns={columns}
        isLoadingItems={isLoadingItems}
        isReachingEnd={isReachingEnd}
        loadMore={loadMore}
        renderItem={renderColorItem}
        endMessage={t('brandKit.noMoreColorsToLoad')}
      />
      
      {/* Create/Edit Modal */}
      <BrandKitModal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingColor ? t('brandKit.editColor') : t('brandKit.createColor')}
      >
        <FormGroup label={t('brandKit.colorName')} labelFor="color-name">
          <InputGroup
            id="color-name"
            value={formState.name}
            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            placeholder={t('brandKit.enterColorName')}
          />
        </FormGroup>
        
        <FormGroup label={t('brandKit.color')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ColorPicker
              value={formState.hex ? (formState.hex.startsWith('#') ? formState.hex : `#${formState.hex}`) : '#000000'}
              onChange={(color) => {
                setFormState({ ...formState, hex: colorToHex(color).replace('#', '') });
              }}
              store={store}
              size={40}
            />
            <span style={{ fontSize: '14px', color: '#666' }}>
              {t('brandKit.clickToOpenColorPicker')}
            </span>
          </div>
        </FormGroup>
        
        <BrandKitModalActions
          onCancel={handleCancel}
          onSave={handleSaveColor}
          isLoading={isLoading}
          isEditing={!!editingColor}
          saveDisabled={!formState.name || !formState.hex || !isValidHex(formState.hex)}
        />
      </BrandKitModal>
      
      {/* Delete Confirmation */}
      <BrandKitDeleteAlert
        isOpen={!!isDeleting}
        onCancel={() => setIsDeleting(null)}
        onConfirm={handleConfirmDelete}
        itemName={isDeleting?.name}
        confirmationMessage={t('brandKit.deleteConfirmation')}
        loading={isLoading}
      />
    </>
  );
});