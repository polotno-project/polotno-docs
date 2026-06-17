import React from 'react';
import {
  Button,
  SearchInput,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from 'polotno/primitives';
import styled from 'polotno/utils/styled';
import { t } from 'polotno/utils/l10n';

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
      <SearchInput
        placeholder={t('sidePanel.searchPlaceholder')}
        onChange={(e) => onSearch(e.target.value)}
        style={{
          marginBottom: '20px',
        }}
      />
      <Button size="sm" onClick={onAddClick}>
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
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent style={{ width }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div style={{ padding: '20px' }}>{children}</div>
      </DialogContent>
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('brandKit.delete')}</DialogTitle>
        </DialogHeader>
        <p>
          {confirmationMessage} {itemName ? `"${itemName}"` : ''}?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t('brandKit.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {t('brandKit.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      <Button variant="outline" onClick={onCancel}>
        {t('brandKit.cancel')}
      </Button>
      <Button
        onClick={onSave}
        disabled={isLoading || saveDisabled}
      >
        {isEditing ? t('brandKit.update') : t('brandKit.create')}
      </Button>
    </div>
  );
};