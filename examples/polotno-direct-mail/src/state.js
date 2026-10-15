// App state shared by the React screens and the Polotno side panels. A mobx
// observable rather than React state, because the side panels are rendered by
// Polotno's SidePanel and need to read and write it too.

import { configure, makeAutoObservable } from 'mobx';
import { DEFAULT_CAMPAIGN } from './campaign.js';
import { SAMPLE_DONORS } from './donors.js';

configure({ enforceActions: 'never' });

export const app = makeAutoObservable({
  step: 'format',
  formatId: null,
  donors: SAMPLE_DONORS,
  listName: 'Sample list',
  campaign: structuredClone(DEFAULT_CAMPAIGN),
  donorIndex: 0,
  versionGroup: 'active',
  showZones: true,

  get donor() {
    return this.donors[this.donorIndex] || this.donors[0];
  },
  // Columns an uploaded list brought that the templates don't know about.
  // They work as fields like any other.
  get extraColumns() {
    const known = new Set(['donor_id', 'first_name', 'last_name', 'address_1', 'address_2', 'city', 'state', 'zip', 'last_gift', 'segment']);
    return [...new Set(this.donors.flatMap((d) => Object.keys(d)))].filter((k) => !known.has(k));
  },
});
