/**
 * @license
 * MIT
 * Collective AI Tools (https://collectiveai.tools)
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  structuredData?: object;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  aiFriendly?: boolean;
  noindex?: boolean;
}

const AI_FRIENDLY_METAS: Array<{ name: string; content: string }> = [
  { name: 'ai-training', content: 'allow' },
  {
    name: 'ai-content',
    content:
      'AI tools directory with curated resources for developers and researchers',
  },
  { name: 'content-type', content: 'directory, tools, resources' },
  {
    name: 'ai-purpose',
    content: 'educational, research, development, productivity',
  },
  {
    name: 'ai-category',
    content: 'technology, artificial intelligence, tools, automation',
  },
  { name: 'ai-license', content: 'MIT' },
  { name: 'ai-format', content: 'structured data, JSON, API' },
  { name: 'ai-update-frequency', content: 'daily' },
  { name: 'ai-data-quality', content: 'curated, verified, community-driven' },
];

const DOCUMENT_DEFAULT_METAS: Array<{ name: string; content: string }> = [
  { name: 'language', content: 'en-US' },
  { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
  { name: 'theme-color', content: '#3B82F6' },
  { name: 'google-adsense-account', content: 'ca-pub-6332717099679917' },
];

function setExistingContent(selector: string, content: string): void {
  const element = document.querySelector(selector);
  if (element) {
    element.setAttribute('content', content);
  }
}

function createMeta(attributes: Record<string, string>): HTMLMetaElement {
  const meta = document.createElement('meta');
  Object.entries(attributes).forEach(([key, value]) => {
    meta.setAttribute(key, value);
  });
  document.head.appendChild(meta);
  return meta;
}

function ensureMeta(
  selector: string,
  attributes: Record<string, string>
): void {
  if (document.querySelector(selector)) {
    return;
  }
  createMeta(attributes);
}

function upsertMeta(
  selector: string,
  attributes: Record<string, string>
): void {
  const existing = document.querySelector(selector);
  if (existing) {
    Object.entries(attributes).forEach(([key, value]) => {
      existing.setAttribute(key, value);
    });
    return;
  }
  createMeta(attributes);
}

function updateStructuredData(structuredData: object): void {
  const existingScript = document.querySelector(
    'script[type="application/ld+json"]'
  );
  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
}

function updateCanonicalUrl(url: string): void {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
}

function ensureAiFriendlyTags(): void {
  AI_FRIENDLY_METAS.forEach(({ name, content }) => {
    ensureMeta(`meta[name="${name}"]`, { name, content });
  });

  if (document.querySelector('link[rel="ai-data"]')) {
    return;
  }

  const link = document.createElement('link');
  link.setAttribute('rel', 'ai-data');
  link.setAttribute('href', 'https://collectiveai.tools/ai-data.json');
  link.setAttribute('type', 'application/json');
  document.head.appendChild(link);
}

function updateCoreMetaTags({
  title,
  description,
  keywords,
  image,
  url,
  type,
}: {
  title: string;
  description: string;
  keywords: string;
  image: string;
  url: string;
  type: string;
}): void {
  document.title = title;

  setExistingContent('meta[name="description"]', description);
  setExistingContent('meta[name="keywords"]', keywords);

  setExistingContent('meta[property="og:title"]', title);
  setExistingContent('meta[property="og:description"]', description);
  setExistingContent('meta[property="og:image"]', image);
  setExistingContent('meta[property="og:url"]', url);
  setExistingContent('meta[property="og:type"]', type);

  setExistingContent('meta[property="twitter:title"]', title);
  setExistingContent('meta[property="twitter:description"]', description);
  setExistingContent('meta[property="twitter:image"]', image);
  setExistingContent('meta[property="twitter:url"]', url);
}

function updateArticleMetaTags({
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = [],
}: {
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
}): void {
  const optionalMetas: Array<{ selector: string; attributes: Record<string, string> }> = [
    {
      selector: 'meta[property="article:published_time"]',
      attributes: {
        property: 'article:published_time',
        content: publishedTime ?? '',
      },
    },
    {
      selector: 'meta[property="article:modified_time"]',
      attributes: {
        property: 'article:modified_time',
        content: modifiedTime ?? '',
      },
    },
    {
      selector: 'meta[name="author"]',
      attributes: { name: 'author', content: author ?? '' },
    },
    {
      selector: 'meta[property="article:section"]',
      attributes: { property: 'article:section', content: section ?? '' },
    },
  ];

  optionalMetas
    .filter(item => item.attributes.content)
    .forEach(item => upsertMeta(item.selector, item.attributes));

  tags.forEach(tag => {
    createMeta({ property: 'article:tag', content: tag });
  });
}

function ensureDefaultDocumentMeta(): void {
  DOCUMENT_DEFAULT_METAS.forEach(({ name, content }) => {
    ensureMeta(`meta[name="${name}"]`, { name, content });
  });
}

const SEO_DEFAULTS = {
  title: 'Collective AI Tools - Curated Directory of AI Tools',
  description:
    'Discover the best AI tools and resources. A comprehensive, searchable directory of AI applications for productivity, creativity, and development.',
  keywords:
    'AI tools, artificial intelligence, productivity, automation, machine learning, AI directory',
  image: 'https://collectiveai.tools/og-image.png',
  url: 'https://collectiveai.tools',
  type: 'website',
  author: 'Collective AI Tools Team',
  section: 'Technology',
  tags: ['AI', 'Tools', 'Productivity', 'Automation'],
  aiFriendly: true,
};

type ResolvedSeo = typeof SEO_DEFAULTS & {
  structuredData?: object;
  publishedTime?: string;
  modifiedTime?: string;
};

function omitUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

function resolveSeoProps(props: SEOProps): ResolvedSeo {
  return { ...SEO_DEFAULTS, ...omitUndefined(props) };
}

function applySeoToDocument(seo: ResolvedSeo): void {
  updateCoreMetaTags(seo);

  if (seo.structuredData) {
    updateStructuredData(seo.structuredData);
  }

  updateCanonicalUrl(seo.url);

  if (seo.aiFriendly) {
    ensureAiFriendlyTags();
  }

  updateArticleMetaTags(seo);
  ensureDefaultDocumentMeta();
}

const SEO: React.FC<SEOProps> = props => {
  const { pathname } = useLocation();
  useEffect(() => {
    upsertMeta('meta[name="robots"]', { name: 'robots', content: props.noindex ? 'noindex, follow' : 'index, follow' });
    return () => {
      upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' });
      document.querySelector('script[type="application/ld+json"]')?.remove();
    };
  }, [props.noindex]);
  const {
    title,
    description,
    keywords,
    image,
    url,
    type,
    structuredData,
    author,
    publishedTime,
    modifiedTime,
    section,
    tags,
    aiFriendly,
  } = resolveSeoProps({ ...props, url: props.url ?? `https://collectiveai.tools${pathname}` });

  useEffect(() => {
    applySeoToDocument({
      title,
      description,
      keywords,
      image,
      url,
      type,
      structuredData,
      author,
      publishedTime,
      modifiedTime,
      section,
      tags,
      aiFriendly,
    });
  }, [
    title,
    description,
    keywords,
    image,
    url,
    type,
    structuredData,
    author,
    publishedTime,
    modifiedTime,
    section,
    tags,
    aiFriendly,
  ]);

  return null;
};

export default SEO;
