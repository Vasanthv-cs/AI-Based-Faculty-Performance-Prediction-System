import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AnalyticsPage from './AnalyticsPage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', role: 'admin' }, isLoading: false }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
    }),
  },
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

describe('AnalyticsPage', () => {
  it('renders Analytics Dashboard', async () => {
    render(<AnalyticsPage />);
    expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
  });

  it('shows content when loaded', async () => {
    render(<AnalyticsPage />);
    await screen.findByText(/Analytics Dashboard/i, {}, { timeout: 5000 });
    await screen.findByText(/Research & FDP Activity/i, {}, { timeout: 3000 });
  });
});
