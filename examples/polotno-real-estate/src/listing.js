import { resolveVariables } from '@polotno/schema/variables';
import { getQR } from './qr-section';

// Fills a template with one listing. The templates print {{price}},
// {{agent.name}} and the rest, and bind their photos and QR code to `photo1`,
// `photo2`, `photo3` and `qr`. The sample agents and their brokerage, Pelicora
// Realty, are invented for this demo; your app reads listings from its MLS or
// CRM feed.

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

// The record the templates read. Formatting is app code: a template prints
// each value as given.
async function toRecord(listing) {
  const { agent, images } = listing;
  const photo = (i) =>
    images[i] && new URL(`./listings/${images[i]}`, window.location.href).href;
  return {
    listingType: listing.listingType,
    price: usd.format(listing.price),
    propertyType: listing.propertyType,
    address: listing.address,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft.toLocaleString('en-US'),
    agent: {
      ...agent,
      // the agent's links in rich text: <a href="{{agent.tel}}">
      tel: 'tel:+1' + agent.phone.replace(/\D/g, ''),
      mailto: 'mailto:' + agent.email,
    },
    photo1: photo(0),
    photo2: photo(1),
    photo3: photo(2),
    qr: await getQR(listing.url),
  };
}

// A plain design for one listing: values in place and no template left, so
// the user edits real text. With `strict`, a listing that lacks a required
// field (price, address) throws instead of printing its {{token}}.
export async function fillTemplate(template, listing) {
  const record = await toRecord(listing);
  const { design } = resolveVariables(template, record, { strict: true });
  // An element's own link is not a template field: point the QR code's at
  // this listing.
  for (const page of design.pages) {
    for (const element of page.children) {
      if (element.id === 'qr') element.href = listing.url;
    }
  }
  return design;
}
