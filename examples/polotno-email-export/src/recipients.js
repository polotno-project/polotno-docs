// The email's template variables and a few sample recipients. In your app the
// records come from your contact list: one filled email per contact.
//
// The canvas draws each variable's `value`. A recipient's record replaces it,
// and a missing field falls back to the `default`.
export const VARIABLES = [
  { name: 'first_name', label: 'First name', default: 'there', value: 'Ada' },
  { name: 'company', label: 'Company', default: 'your team', value: 'Acme' },
];

export const RECIPIENTS = [
  { id: 'ada', label: 'Ada', record: { first_name: 'Ada', company: 'Acme' } },
  { id: 'grace', label: 'Grace', record: { first_name: 'Grace', company: 'Hopper Labs' } },
  // A misspelled column: `firstname` is reported, and the default fills in.
  { id: 'typo', label: 'Typo in data', record: { firstname: 'Linus', company: 'Initech' } },
  // No record: the tokens stay in the HTML for your email service to fill.
  { id: 'tags', label: 'Merge tags' },
];
