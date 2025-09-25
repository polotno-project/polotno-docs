import React, {useMemo} from 'react';
import {observer} from 'mobx-react-lite';
import {Button, FormGroup, InputGroup, Intent} from '@blueprintjs/core';
import {Asset, useBrandKit} from './context';
import {useInfiniteAPI} from 'polotno/utils/use-api';
import {StoreType} from 'polotno/model/store';
import {t} from 'polotno/utils/l10n';
import {Grid, GridItem, ItemActions, ItemInfo, ItemPreview} from './grid';
import {BrandKitDeleteAlert, BrandKitHeader, BrandKitModal, BrandKitModalActions} from './shared-components';
import {selectImage} from 'polotno/side-panel/select-image';
import {selectSvg} from 'polotno/side-panel/select-svg';
import {localFileToURL} from 'polotno/utils/file';
import {registerNextDomDrop} from 'polotno/canvas/page';


interface AssetsPanelProps {
  store: StoreType;
  columns?: number;
}

interface AssetFormState {
  name: string;
  file: File | null;
  url: string;
}

const defaultAssetFormState: AssetFormState = {
  name: '',
  file: null,
  url: ''
};

let uploadFunc = async (file: File): Promise<string> => {
  return localFileToURL(file);
};

export function setAssetUploadFunc(func: typeof uploadFunc) {
  uploadFunc = func;
}

const getFileType = (file: File): 'image' | 'svg' => {
  const {type} = file;
  if (type.indexOf('svg') >= 0) {
    return 'svg';
  }
  return 'image';
};

const isImageFile = (file: File): boolean => {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  return validTypes.includes(file.type);
};

interface HandleAssetSelectParams {
  asset: Asset;
  droppedPos?: { x: number; y: number };
  targetElement?: any;
}

export const AssetsPanel = observer(({store, columns = 2}: AssetsPanelProps) => {
  const {assets} = useBrandKit();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
  const [formState, setFormState] = React.useState<AssetFormState>(defaultAssetFormState);
  const [isDeleting, setIsDeleting] = React.useState<Asset | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const imagePreview = useMemo(() => {
    if (formState.file) {
      return URL.createObjectURL(formState.file);
    } else if (editingAsset) {
      return editingAsset.url;
    } else {
      return null;
    }
  }, [formState.file, editingAsset]);
  
  const PAGE_SIZE = 20;
  const {loadMore, isReachingEnd, items, isLoading: isLoadingItems, error, reset, setQuery} =
      useInfiniteAPI({
        defaultQuery: '',
        getAPI: ({page, query}) => JSON.stringify({type: 'assets', page, query, pageSize: PAGE_SIZE}),
        fetchFunc: async (key: string) => {
          const {page, query, pageSize} = JSON.parse(key);
          return assets.listAssets({page, query, pageSize});
        }
      });
  
  const handleAssetSelect = async ({asset, droppedPos, targetElement}: HandleAssetSelectParams) => {
    const fileType = asset.url.toLowerCase().includes('.svg') ? 'svg' : 'image';
    
    if (fileType === 'svg') {
      await selectSvg({
        src: asset.url,
        store,
        droppedPos,
        targetElement
      });
    } else {
      await selectImage({
        src: asset.url,
        store,
        droppedPos,
        targetElement
      });
    }
  };
  
  const handleCreateAsset = () => {
    setEditingAsset(null);
    setFormState(defaultAssetFormState);
    setIsModalOpen(true);
  };
  
  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setFormState({
      name: asset.name,
      file: null,
      url: asset.url
    });
    setIsModalOpen(true);
  };
  
  const handleCancel = () => {
    setEditingAsset(null);
    setFormState(defaultAssetFormState);
    setIsModalOpen(false);
  };
  
  const handleDeleteAsset = (asset: Asset) => {
    setIsDeleting(asset);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isImageFile(file)) {
      setFormState({
        ...formState,
        file,
        name: formState.name || file.name.split('.')[0]
      });
    } else if (file) {
      alert(t('brandKit.selectFileError'));
    }
    // Reset input value to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };
  
  const handleSaveAsset = async () => {
    if (!formState.name || (!formState.file && !editingAsset)) return;
    
    setIsLoading(true);
    try {
      let url = formState.url;
      
      // Upload file if it's a new asset or file was changed
      if (formState.file) {
        url = await uploadFunc(formState.file);
      }
      
      if (editingAsset) {
        const assetData = {
          id: editingAsset.id,
          name: formState.name,
          url
        };
        await assets.updateAsset(assetData);
      } else {
        const assetData = {
          name: formState.name,
          url
        };
        await assets.createAsset(assetData);
      }
      
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to save asset:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!isDeleting) return;
    
    setIsLoading(true);
    try {
      await assets.deleteAsset(isDeleting.id);
      setIsDeleting(null);
      reset();
    } catch (error) {
      console.error('Failed to delete asset:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderAssetItem = (asset: Asset) => (
      <GridItem key={asset.id}>
        <ItemPreview
            onClick={() => handleAssetSelect({asset: asset})}
            onDragStart={() => {
              registerNextDomDrop((droppedPos, targetElement) => {
                handleAssetSelect({asset, targetElement, droppedPos});
              });
            }}
            onDragEnd={() => {
              registerNextDomDrop(null);
            }}
        >
          <img alt={asset.name} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8}}
               src={asset.url}/>
        </ItemPreview>
        <ItemInfo>{asset.name}</ItemInfo>
        <ItemActions>
          <Button
              icon="edit"
              minimal
              small
              onClick={(e) => {
                e.stopPropagation();
                handleEditAsset(asset);
              }}
          />
          <Button
              icon="trash"
              minimal
              small
              intent={Intent.DANGER}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAsset(asset);
              }}
          />
        </ItemActions>
      </GridItem>
  );
  
  return (
      <>
        <BrandKitHeader
            onAddClick={handleCreateAsset}
            addButtonText={t('brandKit.addAsset')}
            onSearch={setQuery}
        />
        
        <Grid
            items={items.map(item => item.items).flat()}
            columns={columns}
            isLoadingItems={isLoadingItems}
            isReachingEnd={isReachingEnd}
            loadMore={loadMore}
            renderItem={renderAssetItem}
            endMessage={t('brandKit.noMoreAssetsToLoad')}
        />
        
        {/* Create/Edit Modal */}
        <BrandKitModal
            isOpen={isModalOpen}
            onClose={handleCancel}
            title={editingAsset ? t('brandKit.editAsset') : t('brandKit.createAsset')}
            width="400px"
        >
          <FormGroup label={t('brandKit.assetName')} labelFor="asset-name">
            <InputGroup
                id="asset-name"
                value={formState.name}
                onChange={(e) => setFormState({...formState, name: e.target.value})}
                placeholder={t('brandKit.enterAssetName')}
            />
          </FormGroup>
          
          <FormGroup label={t('brandKit.uploadAsset')} labelFor="asset-file">
            <Button
                icon="upload"
                style={{width: '100%'}}
                onClick={() => fileInputRef.current?.click()}
            >
              {formState.file ? formState.file.name : t('brandKit.selectAsset')}
            </Button>
            <input
                style={{display: 'none'}}
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={handleFileChange}
            />
          </FormGroup>
          
          {/* Preview */}
          {(formState.file || formState.url) && (
              <FormGroup label={t('brandKit.preview')}>
                <div
                    style={{
                      width: '100px',
                      height: '100px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      backgroundImage: `url(${imagePreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#f5f8fa'
                    }}
                />
              </FormGroup>
          )}
          
          <BrandKitModalActions
              onCancel={handleCancel}
              onSave={handleSaveAsset}
              isLoading={isLoading}
              isEditing={!!editingAsset}
              saveDisabled={!formState.name || (!formState.file && !editingAsset)}
          />
        </BrandKitModal>
        
        {/* Delete Confirmation */}
        <BrandKitDeleteAlert
            isOpen={!!isDeleting}
            onCancel={() => setIsDeleting(null)}
            onConfirm={handleConfirmDelete}
            itemName={isDeleting?.name}
            confirmationMessage={t('brandKit.deleteAssetConfirmation')}
            loading={isLoading}
        />
      </>
  );
});