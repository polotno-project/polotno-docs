import React from 'react';
import {
  ClipboardCheck,
  Columns2,
  Eye,
  Heading,
  Image,
  LayoutGrid,
  Minus,
  Monitor,
  MousePointerClick,
  MoveVertical,
  Newspaper,
  PanelBottom,
  PanelTop,
  Paintbrush,
  Pilcrow,
  RectangleHorizontal,
  Rows3,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react';

// lucide, the icon set shadcn/ui and Polotno's own UI use. Same stroke as
// Polotno's icons (lucide's default 2) and the same sizes: 24 px in the side
// tabs, 16 px in the toolbar and on buttons. `Icons.x({ size })` returns an element.
const make = (Icon) => ({ size = 24 } = {}) => <Icon size={size} />;

export const Icons = {
  content: make(LayoutGrid),
  blocks: make(Rows3),
  body: make(Paintbrush),
  audit: make(ClipboardCheck),
  heading: make(Heading),
  paragraph: make(Pilcrow),
  button: make(RectangleHorizontal),
  image: make(Image),
  divider: make(Minus),
  spacer: make(MoveVertical),
  desktop: make(Monitor),
  mobile: make(Smartphone),
  eye: make(Eye),
  send: make(Send),
  fix: make(Sparkles),
  // Blocks
  header: make(PanelTop),
  hero: make(Image),
  article: make(Newspaper),
  columns: make(Columns2),
  cta: make(MousePointerClick),
  footer: make(PanelBottom),
};
