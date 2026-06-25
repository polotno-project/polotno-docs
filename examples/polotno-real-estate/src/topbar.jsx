import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from 'polotno/primitives';

const DownloadButton = observer(({ store }) => {
  const [saving, setSaving] = React.useState(false);

  const getName = () => {
    const texts = [];
    store.pages.forEach((p) => {
      p.children.forEach((c) => {
        if (c.type === 'text') {
          texts.push(c.text);
        }
      });
    });
    const allWords = texts.join(' ').split(' ');
    const words = allWords.slice(0, 6);
    return words.join(' ').replace(/\s/g, '-').toLowerCase() || 'polotno';
  };

  const handleExport = async (type) => {
    setSaving(true);
    try {
      if (type === 'pdf') {
        await store.saveAsPDF({
          fileName: getName() + '.pdf',
        });
      } else {
        store.pages.forEach((page, index) => {
          const indexString = store.pages.length > 1 ? '-' + (index + 1) : '';
          store.saveAsImage({
            pageId: page.id,
            pixelRatio: 2,
            mimeType: 'image/' + type,
            fileName: getName() + indexString + '.' + type,
          });
        });
      }
    } catch (e) {
      alert('Something went wrong. Please try again.');
    }
    setSaving(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button disabled={saving}>Download ▾</Button>}
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('png')}>
          PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('jpeg')}>
          JPEG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const Topbar = observer(({ store }) => {
  return (
    <div
      className="dark topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '0 16px',
        color: 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="20" height="20" fill="white" />
          </svg>
          <span
            style={{
              fontWeight: 500,
              fontSize: '18px',
              lineHeight: '100%',
              letterSpacing: '0.25px',
              color: 'white',
            }}
          >
            Polotno
          </span>
        </div>
        <div style={{ width: '1px', height: '24px', background: '#393939' }} />
        <span
          style={{
            opacity: 0.7,
            fontSize: '14px',
            color: 'white',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          [Demo] Real estate use cases
        </span>
      </div>
      <DownloadButton store={store} />
    </div>
  );
});

export default Topbar;
