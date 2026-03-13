import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/dashboard/StatCard';
import PerformanceScoreCard from '@/components/dashboard/PerformanceScoreCard';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';
import ActivityCard from '@/components/dashboard/ActivityCard';
import { useMyPerformance } from '@/hooks/useFacultyData';
import WhatIfSimulator from '@/components/dashboard/WhatIfSimulator';
import PerformanceForecast from '@/components/dashboard/PerformanceForecast';
import AnnouncementBanner from '@/components/dashboard/AnnouncementBanner';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import {
  BookOpen,
  Building2,
  GraduationCap,
  FileText,
  Award,
  Briefcase,
  Library,
  Presentation,
  Lightbulb,
  Users,
  BookMarked,
  BookText,
  DollarSign,
  ShieldCheck,
  Compass,
  Landmark,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Activity,
  History,
  Target,
  Lock,
  Microscope,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { usePDFReport } from '@/hooks/usePDFReport';
import { FileDown } from 'lucide-react';

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    performance,
    teachingCount,
    researchCount,
    contributionCount,
    insights,
    teachingList,
    researchList,
    contributionList,
    isLoading,
  } = useMyPerformance();
  const { isOpen, cycleName, isLoading: isCycleLoading } = useActiveCycle();
  const { generateReport } = usePDFReport();

  const aiInsights = insights.length > 0
    ? insights.map((insight) => ({
      type: insight.insight_type as 'achievement' | 'recommendation' | 'prediction' | 'alert',
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence || 85,
    }))
    : [
      {
        type: 'prediction' as const,
        title: 'Getting Started',
        description: 'Update your academic portfolio to trigger personalized AI-driven growth trajectory predictions.',
        confidence: 100,
      },
    ];

  const breakdown = [
    { label: 'Teaching Score', score: Number(performance?.teaching_score || 0), color: 'bg-violet-500' },
    { label: 'Research Score', score: Number(performance?.research_score || 0), color: 'bg-indigo-500' },
    { label: 'Contributions', score: Number(performance?.contribution_score || 0), color: 'bg-orange-500' },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-48 gap-6 animate-pulse">
            <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
            <p className="font-black uppercase tracking-[0.3em] text-primary/40 text-sm">Loading Your Data...</p>
        </div>
      </DashboardLayout>
    );
  }

    return (
        <DashboardLayout>
            <div className="animate-reveal relative z-10 mb-8">
                <AnnouncementBanner />
            </div>

            <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-reveal delay-100">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" /> AI Suite active
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900">
                             Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>.
                        </h1>
                             Review your academic performance for the <span className="text-secondary font-black underline decoration-secondary/30 decoration-4 underline-offset-4">current cycle</span>.
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        onClick={() => user?.id && generateReport(user.id, user.name)}
                        className="h-14 px-8 rounded-2xl border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 shadow-xl shadow-primary/10 font-black flex items-center gap-3 transition-all hover:-translate-y-1"
                    >
                        <FileDown className="w-5 h-5" />
                        Download Report
                    </Button>

                     <div className="p-4 rounded-3xl bg-secondary/5 border border-secondary/10 flex items-center gap-4 pr-10 hover:bg-secondary/10 transition-colors shadow-sm text-secondary">
                        <div className="w-12 h-12 rounded-[18px] bg-secondary flex items-center justify-center shadow-lg shadow-secondary/20">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Current Phase</p>
                            <p className="font-black text-lg">{cycleName || 'General Cycle'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 mb-16 h-auto items-start">
                <div className="lg:col-span-1 space-y-8 animate-reveal delay-200">
                    <PerformanceScoreCard 
                        score={Number(performance?.overall_score || 0)} 
                        category={performance?.category || 'N/A'}
                        trend="stable"
                        breakdown={breakdown}
                    />
                    
                    <div className="premium-card p-1 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 shadow-xl shadow-indigo-500/20 group hover:scale-[1.02] transition-all duration-300 pointer-events-none">
                         <div className="bg-white rounded-[20px] p-6 h-full flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <TrendingUp className="w-8 h-8 text-indigo-600" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peer Ranking</p>
                                    <p className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">Top 15%</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-black px-4 py-1">Silver Tier</Badge>
                         </div>
                    </div>

                    <div className="premium-card p-8 border-none shadow-xl bg-slate-900 text-white relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-amber-400" />
                                </div>
                                <h3 className="text-lg font-black tracking-tight">Achievement Progress</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Grade: Excellent</span>
                                    <span className="text-sm font-black text-amber-400">84%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 w-[84%]" />
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 leading-relaxed italic">Achieve 3 more Scopus publications to reach the designated institutional benchmark for the "Excellent" tier.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shadow-sm">
                                <Target className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Quick Links</h2>
                        </div>
                        
                        <div className="space-y-3">
                             {[
                                { label: 'Journal & Conference', icon: FileText, path: '/faculty/journals-conferences', color: 'text-blue-600', bg: 'bg-blue-600/10' },
                                { label: 'Teaching Activity', icon: GraduationCap, path: '/faculty/teaching', color: 'text-violet-600', bg: 'bg-violet-600/10' },
                                { label: 'Event & Contribution', icon: Compass, path: '/faculty/events-contributions', color: 'text-amber-600', bg: 'bg-amber-600/10' },
                                { label: 'Books & Chapters', icon: Library, path: '/faculty/books-chapters', color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
                                { label: 'Patent & Guidance', icon: Lightbulb, path: '/faculty/patents-guidance', color: 'text-fuchsia-600', bg: 'bg-fuchsia-600/10' }
                             ].map((item, idx) => (
                                 <Link key={idx} to={item.path} className="group flex items-center justify-between p-4 rounded-[22px] bg-white border border-slate-200/60 hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                            <item.icon className={`w-5 h-5 ${item.color}`} />
                                        </div>
                                        <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{item.label}</span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                 </Link>
                             ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-10 h-full">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-reveal delay-300">
                        <StatCard 
                            title="Teaching Activities" 
                            value={teachingCount} 
                            icon={GraduationCap} 
                            variant="primary" 
                            className="bg-blue-500/5 h-32"
                        />
                        <StatCard 
                            title="Research Papers" 
                            value={researchCount} 
                            icon={Microscope} 
                            variant="success" 
                            className="bg-emerald-500/5 h-32"
                        />
                        <StatCard 
                            title="Other Contributions" 
                            value={contributionCount} 
                            icon={Compass} 
                            variant="warning" 
                            className="bg-amber-500/5 h-32"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-reveal delay-400">
                         <AIInsightsCard insights={aiInsights} />
                         <div className="flex flex-col gap-6">
                            <PerformanceForecast 
                                currentScore={Number(performance?.overall_score || 0)}
                                teachingScore={Number(performance?.teaching_score || 0)}
                                researchScore={Number(performance?.research_score || 0)}
                                contributionScore={Number(performance?.contribution_score || 0)}
                            />
                            <WhatIfSimulator 
                                currentTeaching={Number(performance?.teaching_score || 0)}
                                currentResearch={Number(performance?.research_score || 0)}
                                currentContribution={Number(performance?.contribution_score || 0)}
                                currentTotal={Number(performance?.overall_score || 0)}
                            />
                         </div>
                    </div>

                    <div className="space-y-10 pt-4 animate-reveal delay-500">
                         <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                                    <History className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Recent Activity</h2>
                            </div>
                            <Link to="/faculty/teaching" className="text-sm font-black text-primary hover:underline underline-offset-4 flex items-center gap-1 group">
                                 Full Archive <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <ActivityCard 
                                title="Recent Research" 
                                icon={FileText}
                                activities={researchList.slice(0, 3).map(r => ({
                                    id: r.id,
                                    title: r.title,
                                    date: format(new Date(r.created_at), 'MMM dd, yyyy'),
                                    subtitle: r.activity_category,
                                    hasProof: !!r.proof_url
                                }))} 
                             />
                             <ActivityCard 
                                title="Institutional Contributions" 
                                icon={Compass}
                                activities={contributionList.slice(0, 3).map(c => ({
                                    id: c.id,
                                    title: c.title,
                                    date: format(new Date(c.created_at), 'MMM dd, yyyy'),
                                    subtitle: c.contribution_category,
                                    hasProof: !!c.proof_url
                                }))} 
                             />
                        </div>

                        <div className="p-8 rounded-[32px] bg-slate-900 text-white relative overflow-hidden group shadow-2xl">
                             <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150 group-hover:rotate-45 transition-transform duration-1000">
                                 <ShieldCheck className="w-64 h-64" />
                             </div>
                             <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-4 tracking-tight leading-tight">Verification Check</h3>
                                <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed italic">Ensure all entries are correct and proof is attached before the cycle ends.</p>
                                {!isCycleLoading && !isOpen ? (
                                    <Badge className="py-2 px-6 rounded-full bg-red-500/20 text-red-400 border border-red-500/20 font-black flex items-center gap-2 w-fit">
                                        <Lock className="w-4 h-4" /> Cycle Finalized
                                    </Badge>
                                ) : (
                                    <Link to="/faculty/teaching">
                                        <Button className="w-full h-14 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-lg transition-transform hover:-translate-y-1">
                                            Review Submissions
                                        </Button>
                                    </Link>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default FacultyDashboard;
