import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import NotFoundPage from './NotFoundPage';

afterEach(() => {
  window.location.hash = '#/';
});

describe('NotFoundPage', () => {
  it('explains the missing page and links home', () => {
    window.location.hash = '#/nowhere-at-all';
    render(<NotFoundPage />);
    expect(document.title).toBe('Page not found · NET CBT Simulator');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByText('#/nowhere-at-all')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the dashboard' })).toHaveAttribute('href', '#/');
    expect(screen.getByRole('navigation', { name: 'Other pages' })).toBeInTheDocument();
  });

  it('suggests the page a mistyped link probably meant', () => {
    window.location.hash = '#/histroy';
    render(<NotFoundPage />);
    const suggestion = screen.getByText(/Did you mean/);
    expect(suggestion.querySelector('a')).toHaveAttribute('href', '#/history');
  });

  it('offers to open a paper code found in the path', () => {
    window.location.hash = '#/ENG-K7Q2-9XM4';
    render(<NotFoundPage />);
    expect(screen.getByRole('link', { name: /Open paper ENG-K7Q2-9XM4/ })).toHaveAttribute(
      'href',
      '#/new?type=engineering&seed=K7Q29XM4',
    );
  });
});
