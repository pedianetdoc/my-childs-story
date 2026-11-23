import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { App } from './App';
import { FOOTER_TEXT, FOOTER_URL } from './components/SiteFooter';
import { fillValidStory, jsonResponse, mockFetch, sampleResult } from './test/helpers';

afterEach(() => vi.unstubAllGlobals());

function expectFooter() {
  const footer = screen.getByRole('contentinfo');
  expect(footer.textContent).toBe(FOOTER_TEXT);
  const link = within(footer).getByRole('link', { name: /Discerning Parenting/ });
  expect(link).toHaveAttribute('href', FOOTER_URL);
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(link).toHaveAccessibleName('Discerning Parenting (opens in a new tab)');
  // The footer comes after the main content.
  const main = screen.getByRole('main');
  expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe('Site footer (spec section 5)', () => {
  it('shows the exact text and a safe link on the start screen', () => {
    render(<App />);
    expect(FOOTER_TEXT).toBe('© 2026 Discerning Parenting. All Rights Reserved.');
    expectFooter();
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
  });

  it('stays on the preview and download screen', async () => {
    mockFetch(jsonResponse(200, sampleResult()));
    render(<App />);
    fillValidStory();
    fireEvent.click(screen.getByRole('button', { name: 'Organize My Story' }));
    await screen.findByRole('heading', { name: 'Your organized story' });
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    expectFooter();
  });
});
