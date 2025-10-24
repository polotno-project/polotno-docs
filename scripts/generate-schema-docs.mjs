import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCHEMA_FILE = path.join(__dirname, '../schema/design.schema.json');
const OUTPUT_DIR = path.join(__dirname, '../content/docs/schema');
const BASE_URL = 'https://polotno.com/docs'; // Update with your actual domain

// Load and parse the schema
function loadSchema() {
  const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');
  return JSON.parse(schemaContent);
}

// Generate SEO-friendly slug from definition name
function generateSlug(name) {
  return (
    name
      // Handle sequences of uppercase letters followed by lowercase (e.g., "SVGElement" -> "SVG-Element")
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      // Convert camelCase to kebab-case (e.g., "camelCase" -> "camel-Case")
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

// Generate type display string
function getTypeDisplay(property) {
  if (property.const !== undefined)
    return `\`${JSON.stringify(property.const)}\``;
  if (property.enum)
    return property.enum.map((v) => `\`${JSON.stringify(v)}\``).join(' \\| ');
  if (property.$ref) {
    // Handle both local and external refs
    const refName = property.$ref.includes('#/definitions/')
      ? property.$ref.split('#/definitions/')[1]
      : property.$ref.replace('#/definitions/', '');
    const refSlug = generateSlug(refName);
    return `[\`${refName}\`](./${refSlug})`;
  }
  if (property.anyOf) return property.anyOf.map(getTypeDisplay).join(' \\| ');
  if (property.allOf) return property.allOf.map(getTypeDisplay).join(' & ');
  if (Array.isArray(property.type))
    return property.type.map((t) => `\`${t}\``).join(' \\| ');
  if (property.type === 'array' && property.items)
    return `Array\\<${getTypeDisplay(property.items)}\\>`;
  return property.type ? `\`${property.type}\`` : '`unknown`';
}

// Generate properties table markdown
function generatePropertiesTable(properties) {
  if (!properties || Object.keys(properties).length === 0) {
    return '\n*No properties defined.*\n';
  }

  let table = '\n| Property | Type | Description |\n';
  table += '|----------|------|----------|\n';

  for (const [name, property] of Object.entries(properties)) {
    const description = property.description || '*No description provided*';
    const type = getTypeDisplay(property);

    table += `| \`${name}\` | ${type} | ${description} |\n`;
  }

  return table + '\n';
}

// Generate enum values list
function generateEnumValues(enumValues) {
  if (!enumValues || enumValues.length === 0) return '';

  let content = '\n### Allowed Values\n\n';
  enumValues.forEach((value) => {
    content += `- \`${JSON.stringify(value)}\`\n`;
  });
  return content + '\n';
}

// Generate a single definition page
function generateDefinitionPage(name, definition, schema) {
  const slug = generateSlug(name);
  const title = `${name}`;
  const description =
    definition.description ||
    `Documentation for the ${name} schema definition in the Polotno Design JSON Schema.`;
  const keywords = [
    `${name}`,
    'JSON Schema',
    'Polotno',
    'Design',
    'API',
    'Documentation',
  ];

  let content = `---
title: ${title}
description: ${description}
keywords: [${keywords.map((k) => `"${k}"`).join(', ')}]
---

# ${name}

${definition.description ? `\n${definition.description}\n` : ''}

## Type Information

**Base Type:** \`${definition.type || 'object'}\`

${definition.enum ? generateEnumValues(definition.enum) : ''}

## Properties

${generatePropertiesTable(definition.properties, definition.required)}

## JSON Schema

\`\`\`json
${JSON.stringify(definition, null, 2)}
\`\`\`

## Related Definitions

`;

  // Add links to related definitions
  const relatedRefs = findRelatedDefinitions(definition, schema);
  if (relatedRefs.length > 0) {
    relatedRefs.forEach((ref) => {
      const refName = ref.replace('#/definitions/', '');
      const refSlug = generateSlug(refName);
      content += `- [${refName}](./${refSlug})\n`;
    });
  } else {
    content += '*No related definitions found.*\n';
  }

  return content;
}

// Find related definitions (referenced by $ref)
function findRelatedDefinitions(definition, schema) {
  const refs = new Set();

  function extractRefs(obj) {
    if (typeof obj !== 'object' || obj === null) return;

    if (obj.$ref && obj.$ref.startsWith('#/definitions/')) {
      refs.add(obj.$ref);
    }

    Object.values(obj).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach(extractRefs);
      } else if (typeof value === 'object') {
        extractRefs(value);
      }
    });
  }

  extractRefs(definition);
  return Array.from(refs);
}

// Generate the main index page
function generateIndexPage(schema) {
  const definitions = schema.definitions || {};
  const definitionCount = Object.keys(definitions).length;

  let content = `---
title: JSON Schema
description: Complete documentation for the Polotno Design JSON Schema, including all definitions and examples.
keywords: ["JSON Schema", "Polotno", "Design", "API", "Documentation", "Schema Definitions"]
---

This documentation provides comprehensive information about the Polotno Design JSON Schema. The schema defines the structure for design documents used in the Polotno editor.


## Core Concepts

- **Store**: The root container holding pages and metadata
- **Pages**: Individual canvas areas within a design
- **Elements**: Content items (text, images, shapes, groups) placed on pages
- **Properties**: Positioning, styling, and behavioral attributes

## Schema Definitions

`;

  // Generate table of contents
  for (const [name, definition] of Object.entries(definitions)) {
    const slug = generateSlug(name);
    content += `- [${name}](/docs/schema/${slug})\n`;
  }
  return content;
}

// Main generation function
function generateSchemaDocumentation() {
  console.log('🚀 Generating static schema documentation...');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Load schema
  const schema = loadSchema();
  const definitions = schema.definitions || {};

  console.log(
    `📋 Found ${Object.keys(definitions).length} definitions to process`
  );

  // Generate individual definition pages
  for (const [name, definition] of Object.entries(definitions)) {
    const slug = generateSlug(name);
    const content = generateDefinitionPage(name, definition, schema);
    const filePath = path.join(OUTPUT_DIR, `${slug}.mdx`);

    fs.writeFileSync(filePath, content);
    console.log(`✅ Generated: ${slug}.mdx`);
  }

  // Generate index page
  const indexContent = generateIndexPage(schema);
  const indexPath = path.join(OUTPUT_DIR, 'index.mdx');
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Generated: index.mdx');

  console.log('🎉 Schema documentation generation complete!');
  console.log(`📁 Files generated in: ${OUTPUT_DIR}`);
  console.log(`🔗 Visit: ${BASE_URL}/schema to view the documentation`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSchemaDocumentation();
}

export { generateSchemaDocumentation };
