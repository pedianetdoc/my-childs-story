import { render, screen } from '@testing-library/react';
import { CATEGORY_KEYS } from '@my-childs-story/shared';
import { App } from './App';

describe('client scaffold (placeholder)', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: "My Child's Story" })).toBeInTheDocument();
  });

  it('can import shared category constants', () => {
    expect(CATEGORY_KEYS[0]).toBe('main_concerns');
  });
});
