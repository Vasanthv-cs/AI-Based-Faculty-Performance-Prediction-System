import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import FacultyManagement from './FacultyManagement';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', role: 'admin' }, isLoading: false }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === 'profiles') return Promise.resolve({ data: [{ user_id: 'u1', full_name: 'Dr. Test', email: 'd@x.com', designation: 'Prof', department_id: 'd1', departments: { name: 'CSE' } }], error: null });
        if (table === 'user_roles') return Promise.resolve({ data: [{ user_id: 'u1', role: 'faculty' }], error: null });
        if (table === 'performance_scores') return Promise.resolve({ data: [], error: null });
        if (table === 'departments') return Promise.resolve({ data: [{ id: 'd1', name: 'CSE' }], error: null });
        return Promise.resolve({ data: [], error: null });
      },
    }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/dashboard/FacultyDetailModal', () => ({
  default: () => null,
}));

describe('FacultyManagement', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders Faculty Management title', async () => {
    render(<FacultyManagement />);
    await screen.findByText(/Faculty Management/i, {}, { timeout: 3000 });
    expect(screen.getByText(/Faculty Management/i)).toBeInTheDocument();
  });

  it('has Download CSV button', async () => {
    render(<FacultyManagement />);
    await screen.findByText(/Faculty Management/i, {}, { timeout: 3000 });
    expect(screen.getByRole('button', { name: /Download CSV/i })).toBeInTheDocument();
  });

  it('shows stats cards for Total Staff, Faculty, Admins', async () => {
    render(<FacultyManagement />);
    await screen.findByText(/Total Staff/i, {}, { timeout: 3000 });
    expect(screen.getAllByText(/Faculty/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Admins/i)).toBeInTheDocument();
  });
});
