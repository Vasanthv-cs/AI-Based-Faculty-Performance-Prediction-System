import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import Signup from './Signup';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signup: vi.fn().mockResolvedValue({ success: true }),
    user: null,
    isLoading: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe('Signup', () => {
  it('renders signup form', () => {
    render(<Signup />);
    expect(screen.getByRole('heading', { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create account|Sign up/i })).toBeInTheDocument();
  });
});
