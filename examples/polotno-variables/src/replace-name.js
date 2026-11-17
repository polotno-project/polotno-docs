export function replaceName(design, name) {
  const result = structuredClone(design);
  // Text elements can contain rich-text markup; names must stay literal.
  const text = name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const visit = (node) => {
    if (node.type === 'text') {
      node.text = node.text.replaceAll('{name}', () => text);
    }
    node.children?.forEach(visit);
  };
  result.pages.forEach(visit);
  return result;
}
