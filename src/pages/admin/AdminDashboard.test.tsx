import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AdminDashboard from './AdminDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: '1', role: 'admin' }, isLoading: false }),
}));

vi.mock('@/hooks/useFacultyData', () => ({
  useFacultyData: () => ({
    faculty: [
      { user_id: '1', full_name: 'Dr. A', email: 'a@x.com', department_name: 'CSE', avatar_url: null, designation: null, department_id: 'd1' },
    ],
    performances: [{ user_id: '1', overall_score: 80, category: 'Excellent' }],
    stats: { totalFaculty: 1, avgScore: 80, excellentCount: 1, totalPapers: 5, totalCertifications: 3, departmentCount: 1 },
    isLoading: false,
  }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

describe('AdminDashboard', () => {
  it('renders admin dashboard title and stats', () => {
    render(<AdminDashboard />);
    expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Faculty/i)).toBeInTheDocument();
    expect(screen.getByText(/Avg. Score/i)).toBeInTheDocument();
    expect(screen.getByText(/Faculty Performance Overview/i)).toBeInTheDocument();
  });
});
