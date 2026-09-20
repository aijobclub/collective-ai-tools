// Public, read-only HTML for every visitor, not a bot-specific alternate site.
// Supplies public data/metadata and a lightweight error/test fallback. Production
// successful responses inject the shared React tree and its hydration snapshot.
export const SITE = 'https://collectiveai.tools';
export const PUBLIC_PATHS = [
  '/',
  '/tools',
  '/mcp-catalog',
  '/prompts',
  '/skills',
  '/trending',
  '/leaderboard',
  '/prompt-studio',
];
const escape = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]
  );
const clean = value =>
  String(value ?? '')
    .replace(/\s+`+(?:#?(?:free|freemium|paid|opensource)|mium)?`*\s*$/i, '')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
const array = value => {
  if (!Array.isArray(value)) throw new Error('Invalid public data');
  return value;
};
const names = value =>
  Array.isArray(value)
    ? value
        .map(item => (typeof item === 'string' ? item : item.name))
        .filter(Boolean)
        .join(', ')
    : '';
const safeUrl = value => {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};
const externalLink = (url, label) =>
  safeUrl(url)
    ? `<a href="${escape(safeUrl(url))}" rel="noopener noreferrer">${escape(label)}</a>`
    : '';
const toolLink = tool => `/tools/${encodeURIComponent(tool._id)}`;
const mcpLink = tool =>
  `/mcp-catalog/${encodeURIComponent(tool.id || tool._id)}`;
const heading = (title, body) =>
  `<section><h2>${escape(title)}</h2>${body}</section>`;
const list = (title, items) =>
  Array.isArray(items) && items.length
    ? heading(
        title,
        `<ul>${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`
      )
    : '';
const cards = (items, href) =>
  `<ul class="public-cards">${items.map(item => `<li><h3>${href(item) ? `<a href="${escape(href(item))}">${escape(item.name || item.title)}</a>` : escape(item.name || item.title)}</h3><p>${escape(clean(item.description || item.subtitle || ''))}</p>${item.categories ? `<p>${escape(names(item.categories))}</p>` : ''}${item.pricing ? `<p>${escape(names(item.pricing))}</p>` : ''}</li>`).join('')}</ul>`;
const optionalCards = (title, items, href) =>
  heading(
    title,
    Array.isArray(items)
      ? cards(items.slice(0, 12), href)
      : '<p>This section is temporarily unavailable.</p>'
  );

export function isPublicPath(path) {
  return (
    typeof path === 'string' &&
    (PUBLIC_PATHS.includes(path) ||
      /^\/tools\/[a-fA-F0-9]{24}$/.test(path) ||
      /^\/mcp-catalog\/[a-zA-Z0-9][a-zA-Z0-9._~-]*$/.test(path))
  );
}

function page(path, title, description, content, structuredData) {
  return { status: 200, path, title, description, content, structuredData };
}

function failure(path, status) {
  return {
    status,
    path: isPublicPath(path) ? path : '/',
    title: `${status === 404 ? 'Page not found' : 'Temporarily unavailable'} | Collective AI Tools`,
    description: '',
    content: `<h1>${status === 404 ? 'Page not found' : 'Temporarily unavailable'}</h1><p>${status === 404 ? 'This listing could not be found.' : 'We could not load the public content. Please try again shortly.'}</p><a href="/">Back to discovery</a>`,
  };
}

export async function loadPublicPage(path, getJson) {
  if (!isPublicPath(path)) return failure('/', 404);
  try {
    if (path.startsWith('/tools/')) {
      const result = await getJson(`/api/ai-tools/${path.split('/')[2]}`);
      const tool = result.data;
      if (
        !tool ||
        typeof tool.name !== 'string' ||
        typeof tool.description !== 'string'
      )
        throw new Error('Invalid tool');
      const description = clean(tool.description);
      const pricingSource = safeUrl(tool.pricingUrl);
      const content =
        `<h1>${escape(tool.name)}</h1><p>${escape(description)}</p><p>${escape(names(tool.categories))}</p>${externalLink(tool.website || tool.url, 'Visit website')}` +
        list('Ideal use cases', tool.useCases) +
        list('Limitations', tool.limitations) +
        list('Examples', tool.examples) +
        list('Alternatives', tool.alternatives) +
        heading(
          'Pricing',
          `<p>${escape(names(tool.pricing))}</p><p>${escape(tool.pricingDetails || '')}</p><p>${tool.pricingCheckedAt && pricingSource ? `Pricing checked by contributor on ${escape(tool.pricingCheckedAt)}.` : 'No pricing verification date provided.'} Check the provider for current plans.</p>${externalLink(pricingSource || tool.website || tool.url, 'Check pricing source')}`
        ) +
        (result.related?.length
          ? heading('Related tools', cards(result.related, toolLink))
          : '');
      return page(
        path,
        `${tool.name}: Details & Reviews | Collective AI Tools`,
        description.slice(0, 160),
        content,
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: tool.name,
          description,
          url: SITE + path,
          applicationCategory: names(tool.categories),
        }
      );
    }
    if (path.startsWith('/mcp-catalog/')) {
      const result = await getJson(
        `/api/mcp?id=${encodeURIComponent(path.split('/')[2])}&limit=1`
      );
      const server = array(result.data)[0];
      if (!server) return failure(path, 404);
      return page(
        path,
        `${server.name} | Collective AI Tools`,
        clean(server.description).slice(0, 160),
        `<h1>${escape(server.name)}</h1><p>${escape(clean(server.description))}</p><p>${escape(server.longDescription || '')}</p>${list('Features', server.features)}${list('Requirements', server.requirements)}${externalLink(server.githubUrl, 'GitHub repository')}`
      );
    }
    if (path === '/') {
      const [tools, mcp, prompts, skills, repos] = await Promise.all([
        getJson('/api/ai-tools?limit=12&sort=popular'),
        getJson('/api/mcp?limit=12&sort=popular').catch(() => null),
        getJson('/api/prompts?limit=12&sort=rating').catch(() => null),
        getJson('/api/skills').catch(() => null),
        getJson('/api/trending-repos').catch(() => null),
      ]);
      return page(
        path,
        'Discover AI Tools, MCP Servers, Prompts & Skills | Collective AI Tools',
        'Search and browse curated AI tools, MCP servers, prompts, skills, and trending repositories.',
        '<h1>Discover what’s actually worth using</h1><p>Search across curated tools, MCP servers, prompts, skills, and trending repos, one query, every corner of the ecosystem.</p>' +
          heading(
            'Tools',
            cards(array(tools.data), toolLink) +
              '<a href="/tools">Browse all tools</a>'
          ) +
          optionalCards('MCP servers', mcp?.data, mcpLink) +
          optionalCards('Prompts', prompts?.prompts, () => '/prompts') +
          optionalCards('Skills', skills?.data, item => safeUrl(item.repo)) +
          optionalCards('Trending repositories', repos?.data, item =>
            safeUrl(item.link)
          ),
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Collective AI Tools',
          url: SITE + '/',
        }
      );
    }
    if (path === '/tools' || path === '/mcp-catalog') {
      const isTool = path === '/tools';
      const result = await getJson(
        isTool ? '/api/ai-tools?limit=1000' : '/api/mcp?limit=1000'
      );
      const title = isTool ? 'AI Tools Directory' : 'MCP Catalog';
      const description = isTool
        ? 'Browse community-curated AI tools for productivity, creativity, and development.'
        : 'Discover Model Context Protocol servers for your AI workflows.';
      return page(
        path,
        `${title} | Collective AI Tools`,
        description,
        `<h1>${title}</h1><p>${description}</p>${cards(array(result.data), isTool ? toolLink : mcpLink)}`
      );
    }
    if (path === '/prompts') {
      const result = await getJson('/api/prompts?limit=50&sort=rating');
      return page(
        path,
        'Community AI Prompts | Collective AI Tools',
        'Discover, rate, and share AI prompts for coding, writing, and productivity.',
        `<h1>Prompts Library</h1>${array(result.prompts)
          .map(prompt =>
            heading(
              prompt.title,
              `<p>${escape(prompt.description || '')}</p><pre>${escape(prompt.content)}</pre>`
            )
          )
          .join('')}`
      );
    }
    if (path === '/skills') {
      const result = await getJson('/api/skills');
      return page(
        path,
        'Agent Skills Marketplace | Collective AI Tools',
        'Discover agent skills for AI coding tools and development workflows.',
        `<h1>Agent Skills Marketplace</h1>${cards(array(result.data), item => safeUrl(item.repo))}`
      );
    }
    if (path === '/trending') {
      const result = await getJson('/api/trending-repos');
      return page(
        path,
        'Trending AI Repositories | Collective AI Tools',
        'Explore trending AI repositories on GitHub.',
        `<h1>Trending AI Repositories</h1>${cards(array(result.data), item => safeUrl(item.link))}`
      );
    }
    if (path === '/leaderboard') {
      const result = await getJson('/api/ai-tools/leaderboard');
      if (result.metric !== 'recordedViews')
        throw new Error('Invalid leaderboard');
      const tools = array(result.data);
      return page(
        path,
        'Most Viewed AI Tools | Collective AI Tools',
        'Discover AI tools ranked by recorded tool-page views.',
        '<h1>Most viewed tools</h1><p>Cumulative recorded page views, not unique visitors, weekly trends, or quality ratings. Older seeded counts are excluded. Equal counts share a rank.</p>' +
          (tools.length
            ? `<ol>${tools.map(tool => `<li>Rank ${escape(tool.rank)}: <a href="${escape(toolLink(tool))}">${escape(tool.name)}</a> — ${escape(tool.recordedViews)} views<p>${escape(clean(tool.description))}</p></li>`).join('')}</ol>`
            : '<h2>The leaderboard is warming up</h2><p>Tools will appear as their pages receive views.</p>')
      );
    }
    return page(
      path,
      'Prompt Studio | Collective AI Tools',
      'Explore prompt patterns for your AI workflows.',
      '<h1>Prompt Studio</h1><p>Explore prompt patterns for your AI workflows. Enable JavaScript to use the interactive editor.</p><a href="/prompts">Browse the prompts library</a>'
    );
  } catch (error) {
    return failure(
      path,
      error.status === 404 &&
        (path.startsWith('/tools/') || path.startsWith('/mcp-catalog/'))
        ? 404
        : 503
    );
  }
}

export function renderDocument(template, data) {
  if (
    !template.includes('<div id="root"></div>') ||
    !template.includes('</head>')
  )
    throw new Error('Invalid app shell');
  const url = SITE + data.path;
  const metadata = `<title>${escape(data.title)}</title><meta name="description" content="${escape(data.description)}"><link rel="canonical" href="${escape(url)}"><meta property="og:title" content="${escape(data.title)}"><meta property="og:description" content="${escape(data.description)}"><meta property="og:url" content="${escape(url)}"><meta property="twitter:title" content="${escape(data.title)}"><meta property="twitter:description" content="${escape(data.description)}"><meta property="twitter:url" content="${escape(url)}"><meta name="robots" content="${data.status === 200 ? 'index, follow' : 'noindex, follow'}">`;
  const schema = data.structuredData
    ? `<script type="application/ld+json">${JSON.stringify(data.structuredData).replace(/</g, '\\u003c')}</script>`
    : '';
  const nav =
    '<header><a href="/">Collective AI Tools</a><nav aria-label="Public navigation"><a href="/tools">Tools</a><a href="/mcp-catalog">MCP Catalog</a><a href="/prompts">Prompts</a><a href="/skills">Skills</a><a href="/leaderboard">Leaderboard</a></nav></header>';
  return template
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '')
    .replace(
      /<meta\b[^>]*(?:name|property)=["'](?:description|robots|googlebot|bingbot|og:title|og:description|og:url|twitter:title|twitter:description|twitter:url)["'][^>]*>/gi,
      ''
    )
    .replace('</head>', () => `${metadata}${schema}</head>`)
    .replace(
      '<div id="root"></div>',
      () =>
        data.reactHtml !== undefined
          ? `<div id="root" data-rendered="react">${data.reactHtml}</div><script id="public-page-data" type="application/json">${JSON.stringify(data.snapshot).replace(/</g, '\\u003c')}</script>`
          : `<div id="root"><div class="public-ssr">${nav}<main>${data.content}</main><footer><a href="https://github.com/hanishrao/collective-ai-tools">Open-source frontend on GitHub</a></footer></div></div>`
    );
}
