# Direct mail donor postcards

A variable-data direct mail editor built on Polotno SDK: one template, a donor
list, and the rules that turn each record into a print-ready piece.

- Three USPS postcard sizes, 4 × 6, 6 × 9 and 6 × 11, each with its
  address-side zones marked and checked.
- `{{field}}` merge fields, plus computed ones: a greeting with a "Dear
  Friend," fallback, gift amounts from each donor's last gift, and copy and
  photos per donor group.
- Long values shrink to fit within a minimum size; the proof reports every
  adjustment.
- A per-donor QR code to an online gift page.
- One PDF for the whole list, rendered in the browser.

The organization and every donor are invented.
