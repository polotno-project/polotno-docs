import React from 'react';
import { Alert, Button, Dialog, InputGroup, Intent } from '@blueprintjs/core';
import styled from 'polotno/utils/styled';
import { t } from 'polotno/utils/l10n';
import { Search } from '@blueprintjs/icons';

// Shared styled components
export const HeaderContainer = styled('div')`
    display: block;
    padding: 10px;
    border-bottom: 1px solid #e1e8ed;
`;

// Shared components
interface BrandKitHeaderProps {
  onAddClick: () => void;
  addButtonText: string;
  addIcon?: string;
  onSearch: (query: string) => void;
}

export const BrandKitHeader: React.FC<BrandKitHeaderProps> = ({
  onAddClick,
  addButtonText,
  addIcon = "plus",
  onSearch
}) => {return (
    <HeaderContainer>
      <InputGroup
        leftIcon={<Search />}
        placeholder={t('sidePanel.searchPlaceholder')}
        onChange={(e) => onSearch(e.target.value)}
        type="search"
        style={{
          marginBottom: '20px',
        }}
      />
      <Button
        icon={addIcon}
        intent={Intent.PRIMARY}
        onClick={onAddClick}
        small
      >
        {addButtonText}
      </Button>
    </HeaderContainer>
  );
};

interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const BrandKitModal: React.FC<BrandKitModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = 'auto'
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      canOutsideClickClose={false}
      style={{ width }}
    >
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </Dialog>
  );
};

interface BrandKitDeleteAlertProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  itemName?: string;
  confirmationMessage: string;
  loading?: boolean;
}

export const BrandKitDeleteAlert: React.FC<BrandKitDeleteAlertProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  itemName,
  confirmationMessage,
  loading = false
}) => {
  return (
    <Alert
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      confirmButtonText={t('brandKit.delete')}
      cancelButtonText={t('brandKit.cancel')}
      intent={Intent.DANGER}
      loading={loading}
    >
      {confirmationMessage} {itemName ? `"${itemName}"` : ''}?
    </Alert>
  );
};

interface BrandKitModalActionsProps {
  onCancel: () => void;
  onSave: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
  saveDisabled?: boolean;
}

export const BrandKitModalActions: React.FC<BrandKitModalActionsProps> = ({
  onCancel,
  onSave,
  isLoading = false,
  isEditing = false,
  saveDisabled = false
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
      <Button onClick={onCancel}>
        {t('brandKit.cancel')}
      </Button>
      <Button
        intent={Intent.PRIMARY}
        onClick={onSave}
        loading={isLoading}
        disabled={saveDisabled}
      >
        {isEditing ? t('brandKit.update') : t('brandKit.create')}
      </Button>
    </div>
  );
};