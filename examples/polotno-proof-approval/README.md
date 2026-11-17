# Proof and approval

A proof flow on top of Polotno, with two roles in one window.

- **Designer**: edits the card with the full editor and sends it as a proof.
  Each proof is a version: the design JSON, a thumbnail and its status.
- **Customer**: reviews the proof with every element locked (element locking;
  no side panel, toolbar or hotkeys), selects an element to comment on it, and approves or asks for
  changes. Comments show as numbered pins that never print.
- The designer sees the comments as pins on the working copy, edits, and sends
  the next version.

State lives in memory, so a reload starts over. A real product stores versions
and comments on its server and sends the customer a link.
