import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  Navbar,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from 'polotno/primitives';

const DownloadButton = observer(({ store }) => {
  const [saving, setSaving] = React.useState(false);
  const [type, setType] = React.useState('png');

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

  const handleExport = async () => {
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
    <Popover>
      <PopoverTrigger render={<Button disabled={saving}>Download ▾</Button>} />
      <PopoverContent align="end" style={{ minWidth: '200px' }}>
        <p>File type</p>
        <Select value={type} onValueChange={(v) => setType(v)}>
          <SelectTrigger style={{ width: '100%' }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="jpeg">JPEG</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
          </SelectContent>
        </Select>
        <Button
          disabled={saving}
          onClick={handleExport}
          style={{ marginTop: '10px', width: '100%' }}
        >
          Download {type.toUpperCase()}
        </Button>
      </PopoverContent>
    </Popover>
  );
});

const Topbar = observer(({ store }) => {
  return (
    <Navbar className="dark topbar" style={{ color: 'white' }}>
      <div>
        <Navbar.Group align="left">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0 16px',
            }}
          >
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
                fontSize: '21px',
                lineHeight: '100%',
                letterSpacing: '0.25px',
                color: 'white',
              }}
            >
              Polotno
            </span>
          </div>
          <Navbar.Divider />
          <span
            style={{
              paddingLeft: '10px',
              opacity: 0.7,
              fontSize: '14px',
              color: 'white',
            }}
          >
            [Demo] Real estate use cases
          </span>
        </Navbar.Group>
        <Navbar.Group align="right">
          <DownloadButton store={store} />
        </Navbar.Group>
      </div>
    </Navbar>
  );
});

export default Topbar;
