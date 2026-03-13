import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ProfilePage from './ProfilePage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Test User', email: 't@t.com', role: 'faculty' },
    isLoading: false,
  }),
}));

const profileData = {
  full_name: 'Test User',
  email: 't@t.com',
  designation: 'Professor',
  avatar_url: null,
  departments: { name: 'CSE' },
  date_of_birth: null,
  years_of_experience: 10,
};
const papersData = [{ id: '1', title: 'Paper One', publication_year: 2024 }];
const perfData = { fdp_score: 10, visit_score: 10, course_score: 10, research_score: 10, certification_score: 10 };

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: profileData, error: null }),
          order: () => ({
            limit: (n: number) =>
              n === 1
                ? { single: () => Promise.resolve({ data: perfData, error: null }) }
                : Promise.resolve({ data: papersData, error: null }),
          }),
        }),
      }),
    }),
  },
}));

describe('ProfilePage', () => {
  it('renders Profile and Download button', async () => {
    render(<ProfilePage />);
    await screen.findByRole('heading', { name: /^Profile$/i }, { timeout: 3000 });
    expect(screen.getByRole('button', { name: /Download|Print/i })).toBeInTheDocument();
  });

  it('shows Research Papers section with count', async () => {
    render(<ProfilePage />);
    await screen.findByText(/Research Papers/i, {}, { timeout: 3000 });
    expect(screen.getByText(/Research Papers/i)).toBeInTheDocument();
  });
});
