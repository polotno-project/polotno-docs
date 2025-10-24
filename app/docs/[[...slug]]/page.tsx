import { source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/mdx-components';

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  if (!params.slug || params.slug.length === 0) {
    redirect('/docs/overview');
  }
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDXContent = page.data.body;
  const url = `https://polotno.com/docs/${params.slug.join('/')}`;

  // Generate breadcrumb list items
  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Docs',
      item: 'https://polotno.com/docs',
    },
  ];

  // Add intermediate breadcrumb items from slug
  if (params.slug) {
    params.slug.forEach((segment, index) => {
      const path = params.slug!.slice(0, index + 1).join('/');
      const isLast = index === params.slug!.length - 1;
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: index + 2,
        name: isLast ? page.data.title : segment.replace(/-/g, ' '),
        item: `https://polotno.com/docs/${path}`,
      });
    });
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      },
      {
        '@type': 'TechArticle',
        headline: page.data.title,
        description: page.data.description,
        url,
        author: {
          '@type': 'Organization',
          name: 'Polotno',
          url: 'https://polotno.com',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Polotno',
          url: 'https://polotno.com',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DocsPage toc={page.data.toc} full={page.data.full}>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <DocsBody>
          <MDXContent
            components={getMDXComponents({
              // this allows you to link to other pages with relative file paths
              a: createRelativeLink(source, page),
            })}
          />
        </DocsBody>
      </DocsPage>
    </>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>
): Promise<Metadata> {
  const params = await props.params;
  if (!params.slug || params.slug.length === 0) {
    redirect('/docs/overview');
  }
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const url = `https://polotno.com/docs/${params.slug.join('/')}`;
  const description =
    page.data.description || 'Polotno SDK documentation and guides';
  // Full title for OpenGraph/Twitter (they don't use the template)
  const fullTitle = `${page.data.title} | Polotno SDK Documentation`;

  return {
    title: page.data.title, // Let layout template add the suffix
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: 'Polotno SDK Documentation',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: fullTitle,
      description,
    },
  };
}
