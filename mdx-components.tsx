import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import * as TabsComponents from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import SandpackDemo from './components/sandpack-demo-server';
import CodeFromFile from './components/code-from-file';
import Sandbox from './components/sandbox';

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...TabsComponents,
    SandpackDemo,
    CodeFromFile,
    Sandbox,
    Accordion,
    Accordions,
    ...components,
  };
}
