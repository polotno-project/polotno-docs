import React from 'react';
import { observer } from 'mobx-react-lite';

import { Input, TooltipIconButton } from 'polotno/primitives';
import { t } from 'polotno/utils/l10n';

export const PageControls = observer(({ store, page, xPadding, yPadding }) => {
  const hasManyPages = store.pages.length > 1;
  const index = store.pages.indexOf(page);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: yPadding - 35 + 'px',
          left: xPadding + 'px',
        }}
      >
        <Input
          // we can use custom data to store page name into store
          value={page.custom?.name || 'Untitled page'}
          onChange={(e) => {
            page.set({
              custom: {
                ...page.custom,
                name: e.target.value,
              },
            });
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          top: yPadding - 40 + 'px',
          right: xPadding + 'px',
        }}
      >
        {hasManyPages && (
          <TooltipIconButton
            label={t('workspace.moveUp')}
            disabled={index === 0}
            onClick={() => {
              page.setZIndex(index - 1);
            }}
          >
            ↑
          </TooltipIconButton>
        )}
        {hasManyPages && (
          <TooltipIconButton
            label={t('workspace.moveDown')}
            disabled={index === store.pages.length - 1}
            onClick={() => {
              const index = store.pages.indexOf(page);
              page.setZIndex(index + 1);
            }}
          >
            ↓
          </TooltipIconButton>
        )}
        <TooltipIconButton
          label={t('workspace.duplicatePage')}
          onClick={() => {
            page.clone();
          }}
        >
          ⧉
        </TooltipIconButton>
        {hasManyPages && (
          <TooltipIconButton
            label={t('workspace.removePage')}
            onClick={() => {
              store.deletePages([page.id]);
            }}
          >
            🗑
          </TooltipIconButton>
        )}
        <TooltipIconButton
          label={t('workspace.addPage')}
          onClick={() => {
            const newPage = store.addPage({
              bleed: store.activePage?.bleed || 0,
            });
            const index = store.pages.indexOf(page);
            newPage.setZIndex(index + 1);
          }}
        >
          +
        </TooltipIconButton>
      </div>
    </>
  );
});
