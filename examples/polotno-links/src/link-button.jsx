import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from 'polotno/primitives';

// The editor has no link button: your app sets links from code. This popover
// reads and writes `href` on the selected element or group.
export const LinkButton = observer(({ store }) => {
  const element =
    store.selectedElements.length === 1 ? store.selectedElements[0] : null;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" disabled={!element}>
            Link
          </Button>
        }
      />
      <PopoverContent
        align="end"
        style={{ width: 320, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {element && (
          <>
            <div style={{ fontWeight: 600 }}>Link of the selected {element.type}</div>
            <Input
              value={element.href ?? ''}
              placeholder="https://, mailto: or tel:"
              // an empty field removes the link
              onChange={(e) => element.set({ href: e.target.value || undefined })}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {store.pages.map((page, i) => (
                <Button
                  key={page.id}
                  size="sm"
                  variant="outline"
                  // a page jump: '#' and the ID of the page
                  onClick={() => element.set({ href: '#' + page.id })}
                >
                  Page {i + 1}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={!element.href}
                onClick={() => element.set({ href: undefined })}
              >
                Remove link
              </Button>
            </div>
            <div style={{ color: '#64748b', fontSize: 12 }}>
              A link does nothing on the canvas. Export to click it. Exports
              drop any target other than a web page, an email, a phone number
              or a page.
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});
