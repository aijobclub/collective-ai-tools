/**
 * @license
 * MIT
 * Collective AI Tools (https://collectiveai.tools)
 *
 * Fixture data for local development without backend access (see mocks/handlers.ts).
 * Shapes mirror the real API responses in src/lib/api.ts and src/components/discover/sources.ts.
 * Keep these in sync if a real response shape changes.
 */

const category = (name: string, slug: string) => ({ _id: slug, name, slug });
const pricing = (name: string, slug: string) => ({ _id: slug, name, slug });
const language = (name: string, slug: string) => ({ _id: slug, name, slug });

export const mockCategories = [
  category('Developer Tools', 'developer-tools'),
  category('Writing', 'writing'),
  category('Design', 'design'),
];

export const mockPricingTiers = [
  pricing('Free', 'free'),
  pricing('Freemium', 'freemium'),
  pricing('Paid', 'paid'),
];

export const mockLanguages = [
  language('Python', 'python'),
  language('TypeScript', 'typescript'),
];

export const mockAITools = [
  {
    _id: 'tool-1',
    name: 'Mock Copilot',
    description: 'A fixture AI coding assistant for local development.',
    url: 'https://example.com/mock-copilot',
    categories: [mockCategories[0]],
    pricing: [mockPricingTiers[1]],
    tags: ['coding', 'assistant'],
    addedDate: '2026-01-15T00:00:00.000Z',
    useCases: ['Review a pull request', 'Draft unit tests for a function'],
    limitations: ['Fixture data for local development only'],
    examples: ['Provide a function and ask for edge-case tests.'],
    alternatives: ['Mock Writer'],
    pricingDetails: 'Example pricing notes for the local fixture.',
    pricingUrl: 'https://example.com/pricing',
    pricingCheckedAt: '2026-01-15',
  },
  {
    _id: 'tool-2',
    name: 'Mock Writer',
    description: 'A fixture AI writing tool for local development.',
    url: 'https://example.com/mock-writer',
    categories: [mockCategories[1]],
    pricing: [mockPricingTiers[0]],
    tags: ['writing', 'content'],
    addedDate: '2026-02-01T00:00:00.000Z',
  },
];

export const mockMCPServers = [
  {
    _id: 'mcp-1',
    id: 'mock-mcp-server',
    name: 'Mock MCP Server',
    description: 'A fixture MCP server for local development.',
    author: 'Fixture Author',
    githubUrl: 'https://github.com/example/mock-mcp-server',
    type: 'MCP Server' as const,
    category: mockCategories[0],
    tags: ['mock', 'mcp'],
    stars: 42,
    isOfficial: true,
    addedDate: '2026-01-10T00:00:00.000Z',
  },
];

export const mockPrompts = [
  {
    _id: 'prompt-1',
    title: 'Mock Summarizer Prompt',
    description: 'A fixture prompt for local development.',
    content: 'Summarize the following text in three bullet points: {{text}}',
    tags: ['summarization'],
    source: 'community',
    rating: 4.5,
  },
];

export const mockSkills = [
  {
    id: 'skill-1',
    name: 'Mock Code Reviewer Skill',
    description: 'A fixture agent skill for local development.',
    repo: 'https://github.com/example/mock-code-reviewer-skill',
    tags: ['code-review'],
    category: 'developer-tools',
    stars: 12,
    isOfficial: false,
  },
];

export const mockTrendingRepos = [
  {
    title: 'example/mock-trending-repo',
    link: 'https://github.com/example/mock-trending-repo',
    description: 'A fixture trending repository for local development.',
    language: 'Python',
    stars: '128',
  },
];

export const mockUser = {
  id: 'user-1',
  name: 'Mock User',
  email: 'mock@example.com',
  role: 'user' as const,
  avatar: 'https://ui-avatars.com/api/?name=Mock+User',
};
