import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Landing from './Landing';

describe('Landing', () => {
  it('renders without crashing', () => {
    render(<Landing />);
    expect(screen.getByRole('link', { name: /FacultyAI/i })).toBeInTheDocument();
  });

  it('shows hero title', () => {
    render(<Landing />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    const heroHeading = headings.find((h) => h.textContent?.includes('Faculty Performance') && h.textContent?.includes('Prediction System'));
    expect(heroHeading).toBeInTheDocument();
  });

  it('has Sign In and Get Started links', () => {
    render(<Landing />);
    const signInLinks = screen.getAllByRole('link', { name: /Sign In/i });
    const getStartedLinks = screen.getAllByRole('link', { name: /Get Started/i });
    expect(signInLinks.some((el) => el.getAttribute('href') === '/login')).toBe(true);
    expect(getStartedLinks.some((el) => el.getAttribute('href') === '/signup')).toBe(true);
  });

  it('shows features section', () => {
    render(<Landing />);
    expect(screen.getByText(/AI-Powered Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Comprehensive Analytics/i)).toBeInTheDocument();
  });
});
