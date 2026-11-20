import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from 'polotno/primitives';

// The editor has no link button: your app sets links from code. This popover
// reads and writes `href` on the selected element or group, such as a button.
export const LinkButton = observer(({ store }) => {
  const element = store.selectedElements.length === 1 ? store.selectedElements[0] : null;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" disabled={!element}>
            Link
          </Button>
        }
      />
      <PopoverContent align="end" style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {element && (
          <>
            <div style={{ fontWeight: 600 }}>Link of the selected {element.type}</div>
            <Input
              value={element.href ?? ''}
              placeholder="https:// or mailto:"
              // an empty field removes the link
              onChange={(e) => element.set({ href: e.target.value || undefined })}
            />
            <div style={{ color: '#64748b', fontSize: 12 }}>
              The email links the element's whole area. A group's link covers each element in it.
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});
