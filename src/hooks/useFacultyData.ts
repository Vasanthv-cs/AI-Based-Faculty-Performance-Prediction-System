import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FacultyProfile {
  user_id: string;
  full_name: string;
  email: string;
  designation: string | null;
  department_name: string | null;
  department_id: string | null;
  avatar_url: string | null;
}

export interface PerformanceData {
  user_id: string;
  overall_score: number;
  category: string | null;
  teaching_score: number | null;
  research_score: number | null;
  contribution_score: number | null;
  calculated_at: string;
}

export interface DashboardStats {
  totalFaculty: number;
  avgScore: number;
  excellentCount: number;
  totalActivities: number;
  departmentCount: number;
}

export function useFacultyData() {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<FacultyProfile[]>([]);
  const [performances, setPerformances] = useState<PerformanceData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalFaculty: 0,
    avgScore: 0,
    excellentCount: 0,
    totalActivities: 0,
    departmentCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);

    try {
      // Fetch faculty profiles with department names
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, designation, department_id, avatar_url, departments(name)');

      if (profilesError) throw profilesError;

      // Fetch user roles to filter faculty
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'faculty');

      if (rolesError) throw rolesError;

      const facultyUserIds = new Set(rolesData?.map((r: any) => r.user_id) || []);

      const facultyProfiles: FacultyProfile[] = (profilesData || [])
        .filter((p: any) => facultyUserIds.has(p.user_id))
        .map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          designation: p.designation,
          department_id: p.department_id,
          department_name: p.departments?.name || null,
          avatar_url: p.avatar_url,
        }));

      setFaculty(facultyProfiles);

      // Fetch performance scores
      const { data: performanceData, error: performanceError } = await supabase
        .from('performance_scores')
        .select('*')
        .in('user_id', facultyProfiles.map(f => f.user_id));

      if (performanceError) throw performanceError;

      setPerformances(performanceData as unknown as PerformanceData[] || []);

      // Fetch counts for stats
      const [researchCount, teachingCount, contribCount, deptsCount] = await Promise.all([
        supabase.from('research_activities').select('id', { count: 'exact', head: true }),
        supabase.from('teaching_learning_activities').select('id', { count: 'exact', head: true }),
        supabase.from('networking_contributions').select('id', { count: 'exact', head: true }),
        supabase.from('departments').select('id', { count: 'exact', head: true }),
      ]);

      // Calculate stats
      const perfScores = performanceData || [];
      const avgScore = perfScores.length > 0
        ? Math.round(perfScores.reduce((acc: number, p: any) => acc + Number(p.overall_score), 0) / perfScores.length)
        : 0;
      const excellentCount = perfScores.filter((p: any) => p.category === 'Excellent').length;

      setStats({
        totalFaculty: facultyProfiles.length,
        avgScore,
        excellentCount,
        totalActivities: (researchCount.count || 0) + (teachingCount.count || 0) + (contribCount.count || 0),
        departmentCount: deptsCount.count || 0,
      });
    } catch (error) {
      console.error('Error fetching faculty data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFacultyByDepartment = (departmentId: string) => {
    return faculty.filter(f => f.department_id === departmentId);
  };

  return {
    faculty,
    performances,
    stats,
    isLoading,
    refetch: fetchData,
    getFacultyByDepartment,
  };
}

export function useMyPerformance() {
  const { user } = useAuth();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [insights, setInsights] = useState<Array<any>>([]);

  const [teachingCount, setTeachingCount] = useState(0);
  const [researchCount, setResearchCount] = useState(0);
  const [contributionCount, setContributionCount] = useState(0);

  const [teachingList, setTeachingList] = useState<any[]>([]);
  const [researchList, setResearchList] = useState<any[]>([]);
  const [contributionList, setContributionList] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMyData();
    }
  }, [user?.id]);

  const fetchMyData = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      const results = await Promise.all([
        supabase
          .from('performance_scores')
          .select('*')
          .eq('user_id', user.id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single(),
        supabase.from('teaching_learning_activities').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('research_activities').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('networking_contributions').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
        supabase
          .from('ai_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('generated_at', { ascending: false })
          .limit(5),
      ]);

      const [
        perfRes, teachingRes, researchRes, contribRes, insightsRes
      ] = results as any[];

      if (perfRes.data) setPerformance(perfRes.data as unknown as PerformanceData);

      setTeachingCount(teachingRes.count || 0);
      setTeachingList(teachingRes.data || []);

      setResearchCount(researchRes.count || 0);
      setResearchList(researchRes.data || []);

      setContributionCount(contribRes.count || 0);
      setContributionList(contribRes.data || []);

      if (insightsRes.data) setInsights(insightsRes.data);
    } catch (error) {
      console.error('Error fetching my performance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    performance,
    teachingCount,
    researchCount,
    contributionCount,
    teachingList,
    researchList,
    contributionList,
    insights,
    isLoading,
    refetch: fetchMyData,
  };
}
