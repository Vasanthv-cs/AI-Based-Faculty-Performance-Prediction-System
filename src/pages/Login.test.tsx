import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Login from './Login';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({ success: true }),
    user: null,
    isLoading: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders login form', () => {
    render(<Login />);
    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('has link to signup and home', () => {
    render(<Login />);
    expect(screen.getByRole('link', { name: /FacultyAI/i })).toHaveAttribute('href', '/');
  });
});
