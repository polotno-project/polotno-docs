import React from 'react';
import {observer} from 'mobx-react-lite';
import {
  Button,
  Checkbox,
  FormGroup,
  InputGroup,
  Intent,
  Menu,
  MenuDivider,
  MenuItem,
  NumericInput,
  Popover
} from '@blueprintjs/core';
import {CaretDown, Search} from "@blueprintjs/icons";
import {Typography, useBrandKit} from './context';
import {useInfiniteAPI} from 'polotno/utils/use-api';
import {StoreType} from 'polotno/model/store';
import styled from 'polotno/utils/styled';
import {t} from 'polotno/utils/l10n';
import {Grid, GridItem, ItemActions, ItemInfo, ItemPreview} from './grid';
import {BrandKitDeleteAlert, BrandKitHeader, BrandKitModal, BrandKitModalActions} from './shared-components';
import {fetcher} from 'polotno/toolbar/text-toolbar';
import useSWR from 'swr';
import {getGoogleFontImage, getGoogleFontsListAPI} from 'polotno/utils/api';
import {getFontsList, globalFonts, isGoogleFontChanged} from 'polotno/utils/fonts';
import {TextElementType} from 'polotno/model/text-model';
import {FixedSizeList} from 'react-window';

const Image = styled('img')`
    height: 20px;

    .bp5-dark & {
        filter: invert(1);
    }
`;

const FontItem = ({fontFamily, handleClick, modifiers, store, isCustom}) => {
  const [useImagePreview, setUseImagePreview] = React.useState(!isCustom);
  
  React.useEffect(() => {
    if (!useImagePreview) {
      store.loadFont(fontFamily);
    }
  }, [fontFamily, useImagePreview]);
  
  const handleError = () => {
    setUseImagePreview(false);
  };
  
  if (fontFamily === '_divider') {
    return (
        <div style={{paddingTop: '10px'}}>
          <MenuDivider/>
        </div>
    );
  }
  
  const inner = useImagePreview ? (
      <Image
          src={getGoogleFontImage(fontFamily)}
          alt={fontFamily}
          onError={handleError}
      />
  ) : (
      fontFamily
  );
  return (
      <MenuItem
          text={inner}
          active={modifiers.active}
          disabled={modifiers.disabled}
          onClick={handleClick}
          style={{
            fontFamily: '"' + fontFamily + '"',
          }}
      ></MenuItem>
  );
};

const SearchInput = ({onChange, defaultValue}) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, []);
  return (
      <InputGroup
          leftIcon={<Search/>}
          inputRef={ref}
          defaultValue={defaultValue}
          onChange={(e) => onChange(e.target.value)}
      />
  );
};

const FontMenu = ({
                    store,
                    fonts,
                    activeFont,
                    activeFontLabel,
                    onFontSelect,
                  }) => {
  const [query, setQuery] = React.useState('');
  
  const filteredFonts = fonts.filter((font) => {
    return font.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  });
  
  return (
      <Popover
          content={
            <div>
              <SearchInput onChange={(val) => setQuery(val)} defaultValue={query}/>
              <div style={{paddingTop: '5px'}}>
                <FixedSizeList
                    innerElementType={React.forwardRef((props, ref) => (
                        <Menu ref={ref} {...props} />
                    ))}
                    height={Math.min(400, filteredFonts.length * 30) + 10}
                    width={210}
                    itemCount={filteredFonts.length}
                    itemSize={30}
                    children={({index, style}) => {
                      const item = filteredFonts[index];
                      return (
                          <div style={style}>
                            <FontItem
                                key={item}
                                fontFamily={item}
                                modifiers={{active: activeFont === item}}
                                handleClick={() => onFontSelect(item)}
                                store={store}
                                isCustom={
                                    store.fonts.find((f) => f.fontFamily === item) ||
                                    globalFonts.find((f) => f.fontFamily === item)
                                }
                            />
                          </div>
                      );
                    }}
                />
              </div>
            </div>
          }
      >
        <Button
            // show just first word of the name, otherwise it may look ugly
            text={activeFontLabel}
            rightIcon={<CaretDown/>}
            minimal
            style={{
              marginRight: '5px',
              fontFamily: '"' + activeFont + '"',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxHeight: '30px',
            }}
        />
      </Popover>
  );
};

const FontPreview = styled(ItemPreview)<{
  fontFamily: string;
  fontSize: number;
  bold?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  italic?: boolean;
}>`
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f8fa;
    font-family: ${props => props.fontFamily};
    font-size: ${props => Math.min(props.fontSize, 24)}px;
    font-weight: ${props => props.bold ? 'bold' : 'normal'};
    font-style: ${props => props.italic ? 'italic' : 'normal'};
    color: #2c3e50;
    text-align: center;
    padding: 8px;
    line-height: 1.2;
    text-decoration: ${props => `${props.underline ? 'underline' : ''} ${props.strikethrough ? 'line-through' : ''}`.trim()};
`;

const FontFormGroup = styled(FormGroup)`
    margin-bottom: 15px;
`;

interface FontPanelProps {
  store: StoreType;
  columns?: number;
}

interface FontFormState {
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

const defaultFontFormState: FontFormState = {
  name: '',
  fontFamily: 'Arial',
  fontSize: 16,
  lineHeight: 1.2,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false
};

const googleFonts = getFontsList();

const SelectFontFamily = observer(({value, store, onFontSelect}: {
  store: StoreType; value: string; onFontSelect: (fontFamily: string) => void;
}) => {
  const {data, mutate} = useSWR(getGoogleFontsListAPI(), fetcher, {
    isPaused: () => isGoogleFontChanged(),
    fallbackData: []
  });
  
  // a developer may change fonts list, so let's pause the fetch in that case
  React.useEffect(() => {
    mutate();
  }, [isGoogleFontChanged()]);
  
  const allFonts = store.fonts
      .concat(globalFonts)
      .map((f) => f.fontFamily)
      .concat(data?.length && !isGoogleFontChanged() ? data : googleFonts);
  
  // I was not able to setup blueprint styles correctly
  // to set max width of the button with ellipsis on overflow
  // so lets just ugly cut long name with js
  let fontFamily = value;
  if (fontFamily.length > 15) {
    fontFamily = fontFamily.slice(0, 15) + '...';
  }
  
  const usedFonts: Array<string> = [];
  store.find((el) => {
    if (el.type === 'text') {
      usedFonts.push(el.fontFamily);
    }
    return false;
  });
  const displayFonts = [
    ...new Set(usedFonts.concat('_divider').concat(allFonts))
  ];
  return (
      <FontMenu
          fonts={displayFonts}
          activeFont={value}
          activeFontLabel={fontFamily}
          store={store}
          onFontSelect={onFontSelect}
      />
  );
});

export const FontPanel = observer(({store, columns = 3}: FontPanelProps) => {
  const {typography} = useBrandKit();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingFont, setEditingFont] = React.useState<Typography | null>(null);
  const [formState, setFormState] = React.useState<FontFormState>(defaultFontFormState);
  const [isDeleting, setIsDeleting] = React.useState<Typography | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const PAGE_SIZE = 20;
  const {loadMore, isReachingEnd, items, isLoading: isLoadingItems, error, reset, setQuery} =
      useInfiniteAPI({
        defaultQuery: '',
        getAPI: ({page, query}) => JSON.stringify({type: 'typography', page, query, pageSize: PAGE_SIZE}),
        fetchFunc: async (key: string) => {
          const {page, query, pageSize} = JSON.parse(key);
          return typography.listTypography({page, query, pageSize});
        }
      });
  
  const handleFontSelect = (font: Typography) => {
    // Apply typography to selected elements
    store.selectedElements.forEach((element) => {
      if (element.type === 'text') {
        (element as TextElementType).set({
          fontFamily: font.fontFamily,
          fontSize: font.fontSize,
          lineHeight: font.lineHeight,
          fontWeight: font.bold ? 'bold' : 'normal',
          fontStyle: font.italic ? 'italic' : 'normal',
          textDecoration: `${font.underline ? 'underline' : ''} ${font.strikethrough ? 'line-through' : ''}`.trim(),
        });
      }
    });
  };
  
  const handleCreateFont = () => {
    if (store.selectedElements.length && store.selectedElements[0].type === 'text') {
      const element = store.selectedElements[0] as TextElementType;
      setFormState({
        name: '',
        fontFamily: element.fontFamily,
        fontSize: Math.floor(element.fontSize),
        strikethrough: element.textDecoration.includes('line-through'),
        italic: element.fontStyle === 'italic',
        lineHeight: element.lineHeight ? +element.lineHeight : 1.2,
        underline: element.textDecoration.includes('underline'),
        bold: element.fontWeight === 'bold'
      })
    } else {
      setFormState(defaultFontFormState);
    }
    setEditingFont(null);
    setIsModalOpen(true);
  };
  
  const handleEditFont = (font: Typography) => {
    setEditingFont(font);
    setFormState({
      name: font.name,
      fontFamily: font.fontFamily,
      fontSize: font.fontSize,
      lineHeight: font.lineHeight,
      bold: font.bold,
      italic: font.italic,
      underline: font.underline,
      strikethrough: font.strikethrough
    });
    setIsModalOpen(true);
  };
  
  const handleCancel = () => {
    setEditingFont(null);
    setFormState(defaultFontFormState);
    setIsModalOpen(false);
  };
  
  const handleDeleteFont = (font: Typography) => {
    setIsDeleting(font);
  };
  
  const handleSaveFont = async () => {
    if (!formState.name || !formState.fontFamily) return;
    
    setIsLoading(true);
    try {
      if (editingFont) {
        const fontData = {
          id: editingFont.id,
          name: formState.name,
          fontFamily: formState.fontFamily,
          fontSize: formState.fontSize,
          lineHeight: formState.lineHeight,
          bold: formState.bold,
          italic: formState.italic,
          underline: formState.underline,
          strikethrough: formState.strikethrough
        };
        await typography.updateTypography(fontData);
      } else {
        const fontData = {
          name: formState.name,
          fontFamily: formState.fontFamily,
          fontSize: formState.fontSize,
          lineHeight: formState.lineHeight,
          bold: formState.bold,
          italic: formState.italic,
          underline: formState.underline,
          strikethrough: formState.strikethrough
        };
        await typography.createTypography(fontData);
      }
      
      setIsModalOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to save font:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConfirmDelete = async () => {
    if (!isDeleting) return;
    
    setIsLoading(true);
    try {
      await typography.deleteTypography(isDeleting.id);
      setIsDeleting(null);
      reset();
    } catch (error) {
      console.error('Failed to delete font:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderFontItem = (font: Typography) => (
      <GridItem key={font.id}>
        <FontPreview
            fontFamily={font.fontFamily}
            fontSize={font.fontSize}
            bold={font.bold}
            italic={font.italic}
            strikethrough={font.strikethrough}
            underline={font.underline}
            onClick={() => handleFontSelect(font)}
        >
          {t('brandKit.sampleText')}
        </FontPreview>
        <ItemInfo>
          <div style={{fontWeight: 'bold'}}>{font.name}</div>
          <div style={{fontSize: '10px', color: '#666'}}>
            {font.fontFamily} {font.fontSize}px
          </div>
        </ItemInfo>
        <ItemActions>
          <Button
              icon="edit"
              minimal
              small
              onClick={(e) => {
                e.stopPropagation();
                handleEditFont(font);
              }}
          />
          <Button
              icon="trash"
              minimal
              small
              intent={Intent.DANGER}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFont(font);
              }}
          />
        </ItemActions>
      </GridItem>
  );
  
  return (
      <>
        <BrandKitHeader
            onAddClick={handleCreateFont}
            addButtonText={t('brandKit.addFont')}
            onSearch={setQuery}
        />
        
        <Grid
            items={items.map(item => item.items).flat()}
            columns={columns}
            isLoadingItems={isLoadingItems}
            isReachingEnd={isReachingEnd}
            loadMore={loadMore}
            renderItem={renderFontItem}
            endMessage={t('brandKit.noMoreFontsToLoad')}
        />
        
        {/* Create/Edit Modal */}
        <BrandKitModal
            isOpen={isModalOpen}
            onClose={handleCancel}
            title={editingFont ? t('brandKit.editFont') : t('brandKit.createFont')}
            width="500px"
        >
          <FontFormGroup label={t('brandKit.fontName')} labelFor="font-name">
            <InputGroup
                id="font-name"
                value={formState.name}
                onChange={(e) => setFormState({...formState, name: e.target.value})}
                placeholder={t('brandKit.enterFontName')}
            />
          </FontFormGroup>
          
          <FontFormGroup label={t('brandKit.fontFamily')} labelFor="font-family">
            <SelectFontFamily
                store={store}
                value={formState.fontFamily}
                onFontSelect={(fontFamily) => setFormState({...formState, fontFamily})}
            />
          </FontFormGroup>
          
          <div style={{display: 'flex', gap: '15px'}}>
            <FontFormGroup label={t('brandKit.fontSize')} labelFor="font-size" style={{flex: 1}}>
              <NumericInput
                  id="font-size"
                  value={formState.fontSize}
                  onValueChange={(value) => setFormState({...formState, fontSize: value || 16})}
                  min={8}
                  max={200}
                  stepSize={1}
                  fill
              />
            </FontFormGroup>
          </div>
          
          <FontFormGroup label={t('brandKit.lineHeight')} labelFor="line-height">
            <NumericInput
                id="line-height"
                value={formState.lineHeight}
                onValueChange={(value) => setFormState({...formState, lineHeight: value || 1.2})}
                min={0.5}
                max={3}
                stepSize={0.1}
                fill
            />
          </FontFormGroup>
          
          <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
            <Checkbox
                checked={formState.bold}
                onChange={(e) => setFormState({...formState, bold: e.currentTarget.checked})}
                label={t('brandKit.bold')}
            />
            <Checkbox
                checked={formState.italic}
                onChange={(e) => setFormState({...formState, italic: e.currentTarget.checked})}
                label={t('brandKit.italic')}
            />
            <Checkbox
                checked={formState.underline}
                onChange={(e) => setFormState({...formState, underline: e.currentTarget.checked})}
                label={t('brandKit.underline')}
            />
            <Checkbox
                checked={formState.strikethrough}
                onChange={(e) => setFormState({...formState, strikethrough: e.currentTarget.checked})}
                label={t('brandKit.strikethrough')}
            />
          </div>
          
          {/* Font Preview */}
          <div style={{marginTop: '20px', marginBottom: '20px'}}>
            <div style={{marginBottom: '8px', fontWeight: 'bold'}}>{t('brandKit.preview')}:</div>
            <div
                style={{
                  fontFamily: formState.fontFamily,
                  fontSize: `${Math.min(formState.fontSize, 24)}px`,
                  fontWeight: formState.bold ? 'bold' : 'normal',
                  fontStyle: formState.italic ? 'italic' : 'normal',
                  lineHeight: formState.lineHeight,
                  textDecoration: `${formState.underline ? 'underline' : ''} ${formState.strikethrough ? 'line-through' : ''}`.trim(),
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: '#f9f9f9',
                  color: '#333',
                  width: '100%'
                }}
            >
              {t('brandKit.fontPreviewText')}
            </div>
          </div>
          
          <BrandKitModalActions
              onCancel={handleCancel}
              onSave={handleSaveFont}
              isLoading={isLoading}
              isEditing={!!editingFont}
              saveDisabled={!formState.name || !formState.fontFamily}
          />
        </BrandKitModal>
        
        {/* Delete Confirmation */}
        <BrandKitDeleteAlert
            isOpen={!!isDeleting}
            onCancel={() => setIsDeleting(null)}
            onConfirm={handleConfirmDelete}
            itemName={isDeleting?.name}
            confirmationMessage={t('brandKit.deleteFontConfirmation')}
            loading={isLoading}
        />
      </>
  );
});