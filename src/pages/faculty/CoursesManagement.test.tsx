import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import CoursesManagement from './CoursesManagement';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'f@f.com', name: 'Faculty', role: 'faculty' },
    isLoading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('CoursesManagement', () => {
  it('renders Courses Handled section', () => {
    render(<CoursesManagement />);
    expect(screen.getByText(/Courses Handled/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Course/i })).toBeInTheDocument();
  });

  it('add course dialog has required fields: Drive link, Image proof, Event image', async () => {
    render(<CoursesManagement />);
    fireEvent.click(screen.getByRole('button', { name: /Add Course/i }));
    expect(screen.getByText(/Drive link/i)).toBeInTheDocument();
    expect(screen.getByText(/Image proof upload/i)).toBeInTheDocument();
    expect(screen.getByText(/Event image upload/i)).toBeInTheDocument();
  });
});
