import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import FacultyDashboard from './FacultyDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: 'Test User', email: 't@t.com', role: 'faculty' },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useFacultyData', () => ({
  useMyPerformance: () => ({
    performance: { overall_score: 75, category: 'Good', fdp_score: 20, visit_score: 15, course_score: 15, research_score: 15, certification_score: 10 },
    fdpCount: 2,
    visitCount: 1,
    courseCount: 3,
    paperCount: 1,
    certCount: 2,
    insights: [],
    isLoading: false,
  }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

describe('FacultyDashboard', () => {
  it('renders welcome and stats', () => {
    render(<FacultyDashboard />);
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/)).toBeInTheDocument();
    expect(screen.getAllByText(/FDP Programs/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Research Papers/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Certifications/i).length).toBeGreaterThan(0);
  });
});
