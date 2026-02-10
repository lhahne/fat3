import { fireEvent, render, screen } from '@testing-library/react';
import CounterCard from './CounterCard';

describe('CounterCard', () => {
  it('renders greeting and increments count', () => {
    render(<CounterCard />);

    expect(screen.getByRole('heading', { name: 'Astro + React on Cloudflare Pages' })).toBeInTheDocument();

    const button = screen.getByRole('button', { name: 'Count: 0' });
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Count: 1' })).toBeInTheDocument();
  });
});
