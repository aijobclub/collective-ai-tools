import { it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SEO from './SEO';

it('uses the current page rather than the homepage when no URL prop is supplied', () => {
  render(
    <MemoryRouter initialEntries={['/prompts?search=test']}>
      <SEO title='Prompts' />
    </MemoryRouter>
  );
  expect(
    document.querySelector('link[rel="canonical"]')?.getAttribute('href')
  ).toBe('https://collectiveai.tools/prompts');
});
