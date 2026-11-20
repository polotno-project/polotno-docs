import React from 'react';
import { Button } from 'polotno/primitives';
import { jsonToPDFBlob } from '@polotno/pdf-export/browser';
import { jsonToHTML } from '@polotno/html-export';

// this is a demo key just for that project
// (!) please don't use it in your projects
// to create your own API key please go here: https://polotno.com/login
const KEY = 'nFA5H9elEytDyPyvKL7T';

const download = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

// jsonToHTML returns the pages as an HTML fragment; wrap it in a document.
const htmlDocument = (body) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Polotno links demo</title>
    <style>
      body { margin: 0; background: #e2e8f0; }
      .page { margin: 24px auto; }
    </style>
  </head>
  <body>${body}</body>
</html>`;

export const ExportButtons = ({ store }) => {
  const [busy, setBusy] = React.useState(false);

  // A vector PDF with a link annotation over each linked element and each
  // linked phrase. A page jump goes to the page.
  const downloadPDF = async () => {
    setBusy(true);
    try {
      const blob = await jsonToPDFBlob(store.toJSON(), { key: KEY });
      download(blob, 'links.pdf');
    } catch (e) {
      console.error(e);
      alert('PDF export failed');
    }
    setBusy(false);
  };

  // Each linked element becomes a link and linked words become anchors.
  // Every page div carries its page ID, so a page jump scrolls to it.
  const openHTML = async () => {
    // Open the tab during the click, so the popup blocker allows it.
    const tab = window.open('', '_blank');
    if (!tab) return alert('Allow pop-ups to open the HTML');
    setBusy(true);
    try {
      const html = await jsonToHTML(store.toJSON(), { key: KEY });
      const blob = new Blob([htmlDocument(html)], { type: 'text/html' });
      tab.location.href = URL.createObjectURL(blob);
    } catch (e) {
      console.error(e);
      tab.close();
      alert('HTML export failed');
    }
    setBusy(false);
  };

  return (
    <>
      <Button variant="ghost" disabled={busy} onClick={downloadPDF}>
        PDF
      </Button>
      <Button variant="ghost" disabled={busy} onClick={openHTML}>
        HTML
      </Button>
    </>
  );
};
