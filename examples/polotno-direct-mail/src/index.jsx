import React from 'react';
import ReactDOM from 'react-dom/client';
import { reaction, toJS } from 'mobx';
import { observer } from 'mobx-react-lite';
import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno';
import { Workspace } from 'polotno/canvas/workspace';
import { Toolbar } from 'polotno/toolbar/toolbar';
import { ZoomButtons } from 'polotno/toolbar/zoom-buttons';
import { SidePanel, TextSection, PhotosSection, ElementsSection, UploadSection, LayersSection } from 'polotno/side-panel';
import { createStore } from 'polotno/model/store';
import { setGoogleFonts } from 'polotno/utils/fonts';
import { setTextOverflow, setTextVerticalResizeEnabled } from 'polotno/config';
import { jsonToPDFBlob } from '@polotno/pdf-export/browser';
import 'polotno/ui.css';
import '../../shared/studio-theme.css';

import { app } from './state.js';
import { FORMATS } from './spec.js';
import { FONTS, COLORS } from './campaign.js';
import { buildTemplate } from './templates.js';
import { mergeDonor, combine } from './merge.js';
import { zoneConflicts, listReport } from './preflight.js';
import { FieldsSection } from './panels.jsx';
import { VersionsStep } from './versions.jsx';
import { PageStrip } from './pages.jsx';
import { FormatPicker, DonorTable, DonorNav, ProofPanel } from './screens.jsx';
import { Stepper, Issue, bar, downloadBlob } from './ui.jsx';

const KEY = 'HyhTCjrrUThWw9E7dO_y';

// Two main stores. `store` holds the template the marketer edits, with {{fields}}
// in it. `proofStore` shows one donor's merged piece and is never edited: it
// is reloaded from the template every time the donor, the list or the
// campaign changes.
const store = createStore({ key: KEY, showCredit: false });
const proofStore = createStore({ key: KEY, showCredit: false });
// The Versions step's card: the template with one group's copy in it.
const versionStore = createStore({ key: KEY, showCredit: false });
window.store = store;
window.proofStore = proofStore;
window.versionStore = versionStore;

// A text box is an area you draw and can resize in both directions; text that
// runs long shrinks to fit it rather than growing it. Polotno's PDF export does the
// same by default, so the editor, the proof and the file agree.
setTextVerticalResizeEnabled(true);
setTextOverflow('change-font-size');

// The brand's typefaces are the only ones on offer in the text panel.
setGoogleFonts(Object.values(FONTS));

const SECTIONS = [FieldsSection, TextSection, PhotosSection, ElementsSection, UploadSection, LayersSection];

const format = () => FORMATS[app.formatId];
const addressPage = () => store.pages[format()?.addressPage];

// Zone guides turn red while something sits in them. The recolour is kept out
// of the undo history: it reflects the design, it isn't part of it.
reaction(
  () => (app.formatId ? zoneConflicts(addressPage(), format()).map((c) => c.zone).join(',') : ''),
  (ids) => {
    const hit = new Set(ids.split(',').filter(Boolean));
    const page = addressPage();
    if (!page) return;
    const apply = () =>
      page.children.forEach((el) => {
        const z = el.custom?.zone ?? el.custom?.zoneLabel;
        if (!z) return;
        const bad = hit.has(z);
        if (el.custom.zone) el.set({ stroke: bad ? '#da1e28' : COLORS.orange, fill: bad ? 'rgba(218,30,40,0.14)' : 'rgba(217,105,43,0.07)' });
        else el.set({ fill: bad ? '#da1e28' : COLORS.orange });
      });
    store.history.ignore ? store.history.ignore(apply) : apply();
  }
);

// --- design step ---------------------------------------------------------

// Silent while the zones are clear; a red line only when something sits in one.
const ZoneStatus = observer(() => {
  const conflicts = zoneConflicts(addressPage(), format());
  if (!conflicts.length) return null;
  return (
    <div style={{ ...bar, height: 40, fontSize: 13, background: '#fff1f1' }}>
      <Issue level="error">
        {conflicts.map((c) => `${c.element} overlaps ${c.zoneNoun}`).join('; ')}. Move it before you export.
      </Issue>
    </div>
  );
});

const DesignStep = () => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <ZoneStatus />
    <div style={{ flex: '1 1 auto', minHeight: 0 }}>
      <PolotnoContainer style={{ width: '100%', height: '100%' }}>
        <SidePanelWrap>
          <SidePanel store={store} sections={SECTIONS} defaultSection="fields" />
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar store={store} downloadButtonEnabled={false} />
          <Workspace store={store} renderOnlyActivePage backgroundColor="#f4f4f4" components={{ PageControls: () => null }} />
          <ZoomButtons store={store} />
          <PageStrip store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  </div>
);

// --- proof step ----------------------------------------------------------

const ProofStep = observer(() => {
  const [template] = React.useState(() => store.toJSON());
  const [merged, setMerged] = React.useState(null);
  const [current, setCurrent] = React.useState(null);
  const [exporting, setExporting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  // Merge the whole list whenever the list or the campaign changes. Twenty
  // donors take a few milliseconds; the report needs all of them.
  const campaignKey = JSON.stringify(toJS(app.campaign));
  React.useEffect(() => {
    let live = true;
    const campaign = toJS(app.campaign);
    Promise.all(app.donors.map((d) => mergeDonor(template, d, campaign))).then((all) => live && setMerged(all));
    return () => {
      live = false;
    };
  }, [template, app.donors, campaignKey]);

  // Show the current donor.
  React.useEffect(() => {
    if (!merged) return;
    const m = merged[app.donorIndex] || merged[0];
    // Screen-size photos on the proof; the export keeps the print masters.
    const json = JSON.parse(JSON.stringify(m.json).replaceAll('w=2400', 'w=1200'));
    if (!app.showZones) json.pages.forEach((p) => (p.children = p.children.filter((el) => !el.custom?.overlay)));
    // Stay on the side being looked at while stepping through donors.
    const side = Math.max(0, proofStore.pages.findIndex((p) => p.id === proofStore.activePage?.id));
    proofStore.loadJSON(json);
    if (proofStore.pages[side]) proofStore.selectPage(proofStore.pages[side].id);
    proofStore.toggleBleed(format().bleedIn > 0);
    proofStore.selectElements([]);
    setCurrent(m);
  }, [merged, app.donorIndex, app.showZones]);

  const report = React.useMemo(() => {
    if (!merged) return null;
    const page = template.pages[format().addressPage];
    return listReport(app.donors, merged, zoneConflicts(page, format()));
  }, [merged]);

  // Every mailable donor's piece, without the guides, as one PDF.
  const buildPdf = async (onProgress) => {
    const campaign = toJS(app.campaign);
    const mailable = app.donors.filter((d, i) => report.rows[i].mailable);
    const pieces = await Promise.all(mailable.map((d) => mergeDonor(template, d, campaign, { overlays: false })));
    return jsonToPDFBlob(combine(pieces), { includeBleed: format().bleedIn > 0, onProgress });
  };
  if (import.meta.env.DEV) window.__buildPdf = buildPdf;

  const onExport = async () => {
    setExporting(true);
    setProgress(0);
    try {
      const blob = await buildPdf(setProgress);
      downloadBlob(blob, `larkspur-year-end-${app.formatId}.pdf`);
    } catch (e) {
      console.error('PDF export failed', e);
      alert('The PDF export failed. The browser console has the details.');
    }
    setExporting(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...bar, height: 52 }}>
          <DonorNav current={current} />
        </div>
        <div style={{ flex: '1 1 auto', minHeight: 0, position: 'relative' }}>
          <PolotnoContainer style={{ width: '100%', height: '100%' }}>
            <WorkspaceWrap>
              <Workspace store={proofStore} renderOnlyActivePage backgroundColor="#f4f4f4" components={{ PageControls: () => null }} />
              <ZoomButtons store={proofStore} />
              <PageStrip store={proofStore} />
            </WorkspaceWrap>
          </PolotnoContainer>
        </div>
      </div>
      <ProofPanel current={current} report={report} exporting={exporting} progress={progress} onExport={onExport} />
    </div>
  );
});

// --- app -----------------------------------------------------------------

const App = observer(() => {
  const chooseFormat = (id) => {
    app.formatId = id;
    store.loadJSON(buildTemplate(id));
    store.toggleBleed(FORMATS[id].bleedIn > 0);
    store.selectPage(store.pages[0].id);
    app.step = 'donors';
  };

  const goStep = (s) => {
    store.selectElements([]);
    app.step = s;
  };

  // `?format=postcard69&step=proof` opens straight onto a format and step,
  // so a page can link to one piece.
  React.useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (FORMATS[q.get('format')]) {
      chooseFormat(q.get('format'));
      if (['donors', 'design', 'versions', 'proof'].includes(q.get('step'))) goStep(q.get('step'));
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: 'var(--background)' }}>
      <div style={{ ...bar, height: 56, justifyContent: 'center' }}>
        <Stepper current={app.step} onStep={goStep} ready={!!app.formatId} />
      </div>
      <div style={{ flex: '1 1 auto', minHeight: 0 }}>
        {app.step === 'format' && <FormatPicker onChoose={chooseFormat} />}
        {app.step === 'design' && <DesignStep />}
        {app.step === 'donors' && (
          <DonorTable
            onOpen={(i) => {
              app.donorIndex = i;
              goStep('proof');
            }}
            onNext={() => goStep('design')}
          />
        )}
        {app.step === 'versions' && <VersionsStep store={store} viewStore={versionStore} />}
        {app.step === 'proof' && <ProofStep />}
      </div>
    </div>
  );
});

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
