import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';
import FacultyTable from '@/components/dashboard/FacultyTable';
import FacultyDetailModal from '@/components/dashboard/FacultyDetailModal';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  FileText,
  Award,
  TrendingUp,
  Building2,
  ShieldCheck,
  Zap,
  Target,
  Sparkles,
  ChevronRight,
  UserCheck,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FacultyProfile {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface PerformanceData {
  user_id: string;
  overall_score: number;
  category: string | null;
  trend: string | null;
}

const HODDashboard: React.FC = () => {
  const { user } = useAuth();
  const [faculty, setFaculty] = useState<FacultyProfile[]>([]);
  const [performances, setPerformances] = useState<PerformanceData[]>([]);
  const [totalResearch, setTotalResearch] = useState(0);
  const [totalTeaching, setTotalTeaching] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (user?.departmentId) {
      fetchDepartmentData();
    }
  }, [user?.departmentId]);

  const fetchDepartmentData = async () => {
    if (!user?.departmentId) return;
    setIsLoading(true);

    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .eq('department_id', user.departmentId);

      const facultyProfiles = profilesData || [];
      setFaculty(facultyProfiles);

      if (facultyProfiles.length > 0) {
        const userIds = facultyProfiles.map(f => f.user_id);

        const { data: perfData } = await supabase
          .from('performance_scores')
          .select('user_id, overall_score, category')
          .in('user_id', userIds);

        setPerformances(perfData as PerformanceData[] || []);

        const [researchRes, teachingRes] = await Promise.all([
          supabase.from('research_activities').select('id', { count: 'exact', head: true }).in('user_id', userIds),
          supabase.from('teaching_learning_activities').select('id', { count: 'exact', head: true }).in('user_id', userIds),
        ]);

        setTotalResearch(researchRes.count || 0);
        setTotalTeaching(teachingRes.count || 0);
      }
    } catch (error) {
      console.error('Error fetching department data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const avgScore = performances.length > 0
    ? Math.round(performances.reduce((acc, p) => acc + Number(p.overall_score), 0) / performances.length)
    : 0;
  const excellentCount = performances.filter(p => p.category === 'Excellent').length;

  const categoryData = [
    { name: 'Excellent', value: performances.filter(p => p.category === 'Excellent').length },
    { name: 'Good', value: performances.filter(p => p.category === 'Good').length },
    { name: 'Average', value: performances.filter(p => p.category === 'Average').length },
    { name: 'Needs Improvement', value: performances.filter(p => p.category === 'Needs Improvement').length },
  ].filter(d => d.value > 0);

  const facultyScores = faculty.map(f => {
    const perf = performances.find(p => p.user_id === f.user_id);
    return {
      name: f.full_name.split(' ').pop() || f.full_name,
      score: perf ? Number(perf.overall_score) : 0,
    };
  });

  const topPerformer = faculty.find(f => {
    if (performances.length === 0) return false;
    const maxScore = Math.max(...performances.map(p => Number(p.overall_score)));
    const perf = performances.find(p => p.user_id === f.user_id);
    return perf && Number(perf.overall_score) === maxScore;
  });

  const aiInsights = [
    {
      type: 'achievement' as const,
      title: 'Departmental Velocity',
      description: `The ${user?.department || 'current'} staff demonstrates high scholarly density with ${excellentCount} faculty in the peak tier. The aggregate PPT index is ${avgScore}.`,
      confidence: 94,
    },
    {
      type: 'recommendation' as const,
      title: 'Top Tier Performer',
      description: topPerformer
        ? `${topPerformer.full_name} is currently the departmental lead with peak performance metrics across research and pedagogy.`
        : 'Predictive modeling will manifest as faculty portfolios are synchronized.',
      confidence: 96,
    },
    {
      type: 'prediction' as const,
      title: 'Strategic Growth Projection',
      description: 'A targeted initiative to increase Web of Science indexed publications by 15% could elevate the departmental rank significantly in the next quadrant.',
      confidence: 81,
    },
  ];

  const handleFacultyClick = (userId: string) => {
    setSelectedFacultyId(userId);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-48 gap-6 animate-pulse">
            <div className="w-16 h-16 rounded-full border-4 border-slate-900/10 border-t-slate-900 animate-spin" />
            <p className="font-black uppercase tracking-[0.3em] text-slate-400 text-sm italic">Synchronizing Operational Intelligence...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8 animate-reveal">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <Building2 className="w-3.5 h-3.5" /> Departmental Command
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900 uppercase">
                             {user?.department || 'Staff'} <span className="gradient-text">Unit</span>.
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg lg:text-xl flex items-center gap-2 max-w-2xl italic">
                             Staff performance oversight, scholarly output tracking, and divisional AI insights.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4 pr-8 text-indigo-600">
                        <div className="w-12 h-12 rounded-[18px] bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Aggregated Unit PPT</p>
                            <p className="font-black text-xl">{avgScore}</p>
                        </div>
                    </div>
                </div>
            </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-reveal delay-100">
          {[
            { label: 'Unit Strength', value: faculty.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
            { label: 'Scholarly Index', value: avgScore, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Research Assets', value: totalResearch, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-500/10' },
            { label: 'Teaching Nodes', value: totalTeaching, icon: Award, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          ].map((c, idx) => (
            <div key={idx} className="premium-card p-6 border-none shadow-[0_12px_44px_rgba(0,0,0,0.04)] bg-white/50 backdrop-blur-xl group hover:scale-[1.05] transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center group-hover:rotate-12 transition-transform duration-500`}>
                        <c.icon className={`w-6 h-6 ${c.color}`} />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200 bg-slate-50">Local</Badge>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">{c.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">{c.label}</div>
            </div>
          ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-10 mb-10 animate-reveal delay-200">
        <PerformanceChart
          type="pie"
          data={categoryData}
          title="Unit Talent Distribution"
        />
        <PerformanceChart
          type="bar"
          data={facultyScores}
          title="Staff Portfolio Valuation"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-10 mb-16 animate-reveal delay-300">
            <div className="lg:col-span-2 space-y-10">
                <div className="premium-card border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Staff Directory</h2>
                        </div>
                        <Badge variant="outline" className="border-slate-200 font-black text-[10px] uppercase tracking-widest">Active Cycle</Badge>
                    </div>
                    <FacultyTable
                        faculty={faculty.map(f => {
                            const perf = performances.find(p => p.user_id === f.user_id);
                            return {
                                id: f.user_id,
                                name: f.full_name,
                                email: f.email,
                                department: user?.department || 'Unassigned',
                                score: perf ? Number(perf.overall_score) : 0,
                                category: perf?.category || 'N/A',
                                trend: 'stable',
                                avatarUrl: f.avatar_url,
                            };
                        })}
                        onRowClick={handleFacultyClick}
                    />
                </div>
            </div>

            <div className="space-y-8">
                <AIInsightsCard insights={aiInsights} title="Unit Level Intelligence" />
                
                <div className="p-8 rounded-[32px] bg-gradient-to-br from-indigo-900 to-slate-900 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150 group-hover:rotate-45 transition-transform duration-1000">
                        <Zap className="w-64 h-64 text-indigo-400" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-4 tracking-tight leading-tight italic">Unit Analytics <span className="text-indigo-400">Hub</span></h3>
                        <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">Divisional data accumulation in progress. High-fidelity foresight models will activate upon cycle completion.</p>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 italic text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                           <Sparkles className="w-4 h-4 animate-pulse" /> Precision Engine Active
                        </div>
                    </div>
                </div>
            </div>
      </div>

      <FacultyDetailModal
        facultyId={selectedFacultyId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </DashboardLayout>
  );
};

export default HODDashboard;
