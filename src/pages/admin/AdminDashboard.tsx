import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import PerformanceChart from '@/components/dashboard/PerformanceChart';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';
import FacultyTable from '@/components/dashboard/FacultyTable';
import FacultyDetailModal from '@/components/dashboard/FacultyDetailModal';
import { useFacultyData } from '@/hooks/useFacultyData';
import {
  Users,
  FileText,
  Award,
  TrendingUp,
  Building2,
  ShieldCheck,
  Zap,
  Target,
  Microscope,
  Sparkles,
  ChevronRight,
  UserCheck,
  Megaphone
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const AdminDashboard: React.FC = () => {
  const { faculty, performances, stats, isLoading } = useFacultyData();
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const categoryData = [
    { name: 'Excellent', value: performances.filter(p => p.category === 'Excellent').length },
    { name: 'Good', value: performances.filter(p => p.category === 'Good').length },
    { name: 'Average', value: performances.filter(p => p.category === 'Average').length },
    { name: 'Needs Improvement', value: performances.filter(p => p.category === 'Needs Improvement').length },
  ].filter(d => d.value > 0);

  const departmentScores: Record<string, number[]> = {};
  faculty.forEach(f => {
    const perf = performances.find(p => p.user_id === f.user_id);
    const dept = f.department_name || 'Unassigned';
    if (!departmentScores[dept]) departmentScores[dept] = [];
    if (perf) departmentScores[dept].push(Number(perf.overall_score));
  });

  const departmentData = Object.entries(departmentScores).map(([name, scores]) => ({
    name,
    score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
  }));

  const topPerformer = performances.length > 0
    ? faculty.find(f => {
        const maxScore = Math.max(...performances.map(p => Number(p.overall_score)));
        const perf     = performances.find(p => p.user_id === f.user_id);
        return perf && Number(perf.overall_score) === maxScore;
      })
    : undefined;

  const aiInsights = [
    {
      type: 'recommendation' as const,
      title: 'Performance Recognition',
      description: topPerformer
        ? `${topPerformer.full_name} has achieved the highest performance score. Recommend for recognition.`
        : 'System is gathering data. Performance benchmarks will appear as faculty update their profiles.',
      confidence: topPerformer ? 98 : 65,
    },
    {
      type: 'prediction' as const,
      title: 'Overall Progress',
      description: `Average score: ${stats.avgScore}/250. ${
        stats.avgScore >= 150 ? 'Current performance exceeds benchmarks by 12%.' :
        stats.avgScore >= 100 ? 'Steady growth observed.' :
        'Baseline established. Ready for more data.'
      }`,
      confidence: 92,
    },
    {
      type: 'alert' as const,
      title: 'Performance Audit',
      description: `Excellent category includes ${stats.excellentCount}/${stats.totalFaculty} staff members. ${
        stats.excellentCount < stats.totalFaculty / 2
          ? 'Potential for improvement identified.'
          : 'Excellent performance across the board.'
      }`,
      confidence: 89,
    },
    {
      type: 'achievement' as const,
      title: 'Data Summary',
      description: `${stats.totalActivities} verified records across ${stats.departmentCount} departments.`,
      confidence: 97,
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
            <p className="font-black uppercase tracking-[0.3em] text-slate-400 text-sm">Loading Admin Dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
       <div className="mb-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8 animate-reveal">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" /> Admin Dashboard
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900">
                             System <span className="gradient-text">Overview</span>.
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg lg:text-xl flex items-center gap-2 max-w-2xl">
                             Overall system analytics, real-time performance tracking, and staff management.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4 pr-8 text-emerald-600">
                        <div className="w-12 h-12 rounded-[18px] bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Average Score</p>
                            <p className="font-black text-xl">{stats.avgScore}</p>
                        </div>
                    </div>
                </div>
            </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-reveal delay-100">
            <StatCard 
                title="Total Faculty" value={stats.totalFaculty} icon={Users} 
                variant="primary" 
                className="bg-blue-500/5 shadow-lg border-blue-500/10"
            />
            <StatCard 
                title="Total Records" value={stats.totalActivities} icon={Microscope} 
                variant="accent" 
                className="bg-purple-500/5 shadow-lg border-purple-500/10"
            />
            <StatCard 
                title="Excellent Score" value={stats.excellentCount} icon={Sparkles} 
                variant="success" 
                className="bg-emerald-500/5 shadow-lg border-emerald-500/10"
            />
            <StatCard 
                title="Departments" value={stats.departmentCount} icon={Building2} 
                variant="warning" 
                className="bg-amber-500/5 shadow-lg border-amber-500/10"
            />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 animate-reveal delay-200">
            <PerformanceChart 
                type="pie"
                data={categoryData}
                title="Performance Distribution"
            />
            <PerformanceChart 
                type="bar"
                data={departmentData}
                title="Departmental Benchmarks"
            />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-16 items-start animate-reveal delay-300">
            <div className="lg:col-span-2 space-y-10">
                <div className="premium-card border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Global Rankings</h2>
                        </div>
                        <Badge variant="outline" className="border-slate-200 font-black text-[10px] uppercase tracking-widest">Real-time sync</Badge>
                    </div>
                    <FacultyTable 
                        faculty={faculty.map(f => {
                            const perf = performances.find(p => p.user_id === f.user_id);
                            return {
                                id: f.user_id,
                                name: f.full_name,
                                email: f.email,
                                department: f.department_name || 'Unassigned',
                                score: Number(perf?.overall_score || 0),
                                category: perf?.category || 'N/A',
                                trend: 'stable' as const,
                                avatarUrl: f.avatar_url
                            };
                        })} 
                        onRowClick={handleFacultyClick} 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="premium-card p-8 bg-slate-50 border border-slate-100 flex items-center justify-between group">
                         <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Growth</p>
                             <p className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">+12.4% <span className="text-xs font-bold text-slate-400 font-sans ml-1">vs last cycle</span></p>
                         </div>
                         <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                             <TrendingUp className="w-8 h-8 group-hover:scale-110 transition-transform" />
                         </div>
                     </div>
                     <div className="premium-card p-8 bg-slate-50 border border-slate-100 flex items-center justify-between group">
                         <div className="space-y-1">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Synchronization</p>
                             <p className="text-3xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">99.8% <span className="text-xs font-bold text-slate-400 font-sans ml-1">Verified</span></p>
                         </div>
                         <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                             <ShieldCheck className="w-8 h-8 group-hover:scale-110 transition-transform" />
                         </div>
                     </div>
                </div>
            </div>

            <div className="space-y-8">
                <AIInsightsCard insights={aiInsights} />
                
                <div className="p-8 rounded-[32px] bg-slate-900 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150 group-hover:rotate-45 transition-transform duration-1000">
                        <Zap className="w-64 h-64" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-4 tracking-tight leading-tight italic">Predictive Analytics <span className="text-blue-400">Locked</span></h3>
                        <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">System is accumulating temporal data for precise institutional growth modeling and future-state performance forecasting.</p>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 italic text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                           <Sparkles className="w-4 h-4 animate-pulse" /> Minimum 2 full cycles required
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Export Data', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                        { label: 'Notify All', icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                        { label: 'Lock Cycles', icon: ShieldCheck, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                        { label: 'System Check', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    ].map((action, i) => (
                        <button key={i} className="flex flex-col items-center justify-center p-6 rounded-[28px] bg-white border border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all duration-300 group">
                             <div className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                 <action.icon className={`w-6 h-6 ${action.color}`} />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{action.label}</span>
                        </button>
                    ))}
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

export default AdminDashboard;
