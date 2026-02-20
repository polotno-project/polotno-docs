import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  Navbar,
  Alignment,
  Button,
  Position,
  Menu,
  HTMLSelect,
  Popover,
} from '@blueprintjs/core';
import { ChevronDown } from '@blueprintjs/icons';

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
    <Popover
      content={
        <Menu style={{ minWidth: '200px' }}>
          <p>File type</p>
          <HTMLSelect
            fill
            onChange={(e) => setType(e.target.value)}
            value={type}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="pdf">PDF</option>
          </HTMLSelect>
          <Button
            fill
            intent="primary"
            loading={saving}
            onClick={handleExport}
            style={{ marginTop: '10px' }}
          >
            Download {type.toUpperCase()}
          </Button>
        </Menu>
      }
      position={Position.BOTTOM_RIGHT}
    >
      <Button
        endIcon={<ChevronDown color="white" />}
        text="Download"
        intent="primary"
        loading={saving}
      />
    </Popover>
  );
});

const Topbar = observer(({ store }) => {
  return (
    <Navbar className="bp5-dark topbar" style={{ color: 'white' }}>
      <div>
        <Navbar.Group align={Alignment.LEFT}>
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
        <Navbar.Group align={Alignment.RIGHT}>
          <DownloadButton store={store} />
        </Navbar.Group>
      </div>
    </Navbar>
  );
});

export default Topbar;
