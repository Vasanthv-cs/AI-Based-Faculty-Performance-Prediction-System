import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ComposedChart,
} from 'recharts';
import { format, subMonths } from 'date-fns';
import {
  TrendingUp, Users, FileText, Award, GraduationCap, BookOpen,
  BarChart3, PieChart as PieIcon, Activity, Layers, Sparkles,
  Search, ShieldCheck, Zap, Target, Microscope
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Colour palette ───────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];
const GRADE_COLORS: Record<string, string> = {
  Excellent:          '#10b981',
  'Very Good':        '#3b82f6',
  Good:               '#f59e0b',
  'Needs Improvement':'#ef4444',
  Average:            '#f97316',
};

const tooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  backdropFilter: 'blur(8px)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  fontSize: '12px',
  color: '#fff',
  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm font-bold text-white">{entry.name}:</span>
              <span className="text-sm font-black text-white ml-auto">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('6');
  const [isLoading, setIsLoading] = useState(true);

  // ── State for all chart datasets ─────────────────────────────────────────
  const [overallAvgScore, setOverallAvgScore]               = useState(0);
  const [trendData, setTrendData]                           = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution]     = useState<any[]>([]);
  const [departmentScores, setDepartmentScores]             = useState<any[]>([]);
  const [facultyScores, setFacultyScores]                   = useState<any[]>([]);
  const [facultyBreakdown, setFacultyBreakdown]             = useState<any[]>([]);
  const [teachingLevelPie, setTeachingLevelPie]             = useState<any[]>([]);
  const [researchCombo, setResearchCombo]                   = useState<any[]>([]);
  const [publicationsCount, setPublicationsCount]           = useState({ research: 0, teaching: 0, networking: 0 });

  useEffect(() => { fetchAnalyticsData(); }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const months = parseInt(timeRange);

      const [
        profilesRes,
        performancesRes,
        userRolesRes,
        teachingRes,
        researchRes,
        networkingRes,
        departmentsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, department_id'),
        supabase.from('performance_scores').select('user_id, overall_score, category, teaching_score, research_score, contribution_score, calculated_at'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('teaching_learning_activities').select('user_id, instruction_material_level, pedagogy_level, subject_pass_percentage, created_at'),
        supabase.from('research_activities').select('activity_category, academic_year, score_claimed, user_id, created_at'),
        supabase.from('networking_contributions').select('contribution_category, score_claimed, academic_year, user_id, created_at'),
        supabase.from('departments').select('id, name'),
      ]);

      const profiles     = profilesRes.data     || [];
      const performances = performancesRes.data  || [];
      const userRoles    = userRolesRes.data     || [];
      const teaching     = teachingRes.data      || [];
      const research     = researchRes.data      || [];
      const networking   = networkingRes.data    || [];
      const deptMap      = new Map((departmentsRes.data || []).map(d => [d.id, d.name]));

      setPublicationsCount({
        research:   research.length,
        teaching:   teaching.length,
        networking: networking.length,
      });

      const perfScores = performances.map(p => Number(p.overall_score));
      const avgScore   = perfScores.length > 0
        ? Math.round(perfScores.reduce((a, b) => a + b, 0) / perfScores.length)
        : 0;
      setOverallAvgScore(avgScore);

      const activityByMonth: Record<string, { research: number; teaching: number; networking: number }> = {};
      const now = new Date();
      for (let i = months - 1; i >= 0; i--) {
        const d    = subMonths(now, i);
        const key  = format(d, 'MMM yy');
        activityByMonth[key] = { research: 0, teaching: 0, networking: 0 };
      }
      research.forEach(r => {
        if (!r.created_at) return;
        const d = new Date(r.created_at);
        if (isNaN(d.getTime())) return;
        const key = format(d, 'MMM yy');
        if (activityByMonth[key]) activityByMonth[key].research++;
      });
      teaching.forEach(t => {
        if (!t.created_at) return;
        const d = new Date(t.created_at);
        if (isNaN(d.getTime())) return;
        const key = format(d, 'MMM yy');
        if (activityByMonth[key]) activityByMonth[key].teaching++;
      });
      networking.forEach(n => {
        if (!n.created_at) return;
        const d = new Date(n.created_at);
        if (isNaN(d.getTime())) return;
        const key = format(d, 'MMM yy');
        if (activityByMonth[key]) activityByMonth[key].networking++;
      });
      setTrendData(
        Object.entries(activityByMonth).map(([month, v]) => ({
          month,
          'Research':    v.research,
          'Teaching':    v.teaching,
          'Networking':  v.networking,
          avgScore,
        }))
      );

      const cats = ['Excellent', 'Very Good', 'Good', 'Average', 'Needs Improvement'];
      setCategoryDistribution(
        cats.map(cat => ({
          name:  cat,
          value: performances.filter(p => p.category === cat).length,
        })).filter(d => d.value > 0)
      );

      const adminIds = new Set(userRoles.filter(r => r.role === 'admin').map(r => r.user_id));
      const facultyProfiles = profiles.filter(p => !adminIds.has(p.user_id));

      const fScores = facultyProfiles.map(fp => {
        const perf = performances.find(p => p.user_id === fp.user_id);
        return {
          name:         fp.full_name?.split(' ')[0] || 'Unknown',
          fullName:     fp.full_name || 'Unknown',
          score:        perf ? Number(perf.overall_score)       : 0,
          teaching:     perf ? Number(perf.teaching_score)      : 0,
          research:     perf ? Number(perf.research_score)      : 0,
          contribution: perf ? Number(perf.contribution_score)  : 0,
          category:     perf?.category || 'N/A',
        };
      }).sort((a, b) => b.score - a.score);

      setFacultyScores(fScores);
      setFacultyBreakdown(fScores.slice(0, 10));

      const deptScores: Record<string, number[]> = {};
      facultyProfiles.forEach(fp => {
        const perf     = performances.find(p => p.user_id === fp.user_id);
        const deptName = fp.department_id ? deptMap.get(fp.department_id) || 'Unassigned' : 'Unassigned';
        if (!deptScores[deptName]) deptScores[deptName] = [];
        if (perf) deptScores[deptName].push(Number(perf.overall_score));
      });
      setDepartmentScores(
        Object.entries(deptScores).map(([name, scores]) => ({
          name,
          score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
          count: scores.length,
        })).sort((a, b) => b.score - a.score)
      );

      const levelCounts: Record<string, number> = { Excellent: 0, 'Very Good': 0, Good: 0, Poor: 0 };
      teaching.forEach(t => {
        const lvl = t.instruction_material_level || 'Good';
        const key = lvl.includes('Excellent') ? 'Excellent' : lvl.includes('Very Good') ? 'Very Good' : lvl.includes('Good') ? 'Good' : 'Poor';
        if (levelCounts[key] !== undefined) levelCounts[key]++;
      });
      setTeachingLevelPie(
        Object.entries(levelCounts)
          .map(([name, value]) => ({ name, value }))
          .filter(d => d.value > 0)
      );

      const yearMap: Record<string, { year: string; journals: number; conferences: number; totalScore: number }> = {};
      research.forEach(r => {
        const yr = r.academic_year || 'Unknown';
        if (!yearMap[yr]) yearMap[yr] = { year: yr, journals: 0, conferences: 0, totalScore: 0 };
        const cat = (r.activity_category || '').toLowerCase();
        if (cat.includes('journal') || cat.includes('paper'))       yearMap[yr].journals++;
        else if (cat.includes('conference'))                         yearMap[yr].conferences++;
        yearMap[yr].totalScore += Number(r.score_claimed || 0);
      });
      setResearchCombo(
        Object.values(yearMap)
          .sort((a, b) => a.year.localeCompare(b.year))
          .slice(-6)
      );

    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const RADIAN = Math.PI / 180;
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const r  = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x  = cx + r * Math.cos(-midAngle * RADIAN);
    const y  = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={900}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-48 gap-6 animate-pulse">
            <div className="w-16 h-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
            <p className="font-black uppercase tracking-[0.3em] text-primary/40 text-sm">Synthesizing Institutional Intelligence...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-reveal">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <Zap className="w-3.5 h-3.5" /> Institutional Intelligence Engine
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900">
                             Performance <span className="gradient-text">Analytics</span>.
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg lg:text-xl flex items-center gap-2 max-w-2xl">
                             Real-time analytical trends, output distributions, and departmental performance benchmarks.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="h-14 w-48 rounded-2xl bg-white border-slate-200 shadow-xl shadow-slate-200/50 font-black text-slate-700">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                            <SelectItem value="3" className="font-bold py-3">Last Quarter</SelectItem>
                            <SelectItem value="6" className="font-bold py-3">Mid-Year Review</SelectItem>
                            <SelectItem value="12" className="font-bold py-3">Annual Audit</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 animate-reveal delay-100">
          {[
            { label: 'Avg. Institutional Score', value: `${overallAvgScore}`, icon: Target, color: 'text-rose-600', bg: 'bg-rose-500/10' },
            { label: 'Research Assets', value: publicationsCount.research, icon: Microscope, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
            { label: 'Instructional Nodes', value: publicationsCount.teaching, icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
            { label: 'Institutional Service', value: publicationsCount.networking, icon: Award, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          ].map((c, idx) => (
            <div key={idx} className="premium-card p-6 border-none shadow-[0_12px_44px_rgba(0,0,0,0.04)] bg-white/50 backdrop-blur-xl group hover:scale-[1.05] transition-all duration-500">
                <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center group-hover:rotate-12 transition-transform duration-500`}>
                        <c.icon className={`w-6 h-6 ${c.color}`} />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200 bg-slate-50">Verified</Badge>
                </div>
                <div className="text-4xl font-black text-slate-900 mb-1">{c.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">{c.label}</div>
            </div>
          ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-10 mb-10 animate-reveal delay-200">
          <Card className="premium-card border-none shadow-[0_32px_84px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Active Engagement Trend</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-1">Cross-sectional monthly activity</CardDescription>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
            <CardContent className="p-8 pt-10">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTeach" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Research" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRes)" />
                  <Area type="monotone" dataKey="Teaching" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorTeach)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="premium-card border-none shadow-[0_32px_84px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Performance Stratification</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-1">Faculty count by score category</CardDescription>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-rose-600" />
              </div>
            </div>
            <CardContent className="p-8 pt-10">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryDistribution} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Faculty Count" radius={[0, 12, 12, 0]} barSize={32}>
                    {categoryDistribution.map((entry, i) => (
                      <Cell key={i} fill={GRADE_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 mb-10 animate-reveal delay-300">
          <Card className="premium-card border-none shadow-[0_32px_84px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Pedagogical Quality Indices</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-1">Distribution of instruction material levels</CardDescription>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <PieIcon className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <CardContent className="p-8 pb-12 flex flex-col md:flex-row items-center gap-12">
               <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={teachingLevelPie}
                    cx="50%" cy="50%"
                    innerRadius={65}
                    outerRadius={105}
                    paddingAngle={8}
                    dataKey="value"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {teachingLevelPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.9} stroke="rgba(255,255,255,0.2)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-4 min-w-[160px]">
                {teachingLevelPie.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-50 bg-white/40 shadow-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 truncate">{d.name}</span>
                    <span className="ml-auto font-black text-sm text-slate-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card border-none shadow-[0_32px_84px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Scholarly Output Matrix</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-1">Journals vs Conferences by total impact</CardDescription>
              </div>
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-fuchsia-600" />
              </div>
            </div>
            <CardContent className="p-8 pt-10">
               <ResponsiveContainer width="100%" height={285}>
                  <ComposedChart data={researchCombo}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                    <Bar    yAxisId="left"  dataKey="journals"    name="Journals"         fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
                    <Bar    yAxisId="left"  dataKey="conferences"  name="Conferences"      fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={24} />
                    <Line  yAxisId="right" dataKey="totalScore"    name="Aggregate Score"  stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#fff', stroke: '#f59e0b', strokeWidth: 3 }} activeDot={{ r: 8 }} type="monotone" />
                  </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 mb-20 animate-reveal delay-400">
          <Card className="premium-card border-none shadow-[0_32px_84px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Departmental Benchmarking</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-1">Average performance score by department</CardDescription>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
            </div>
            <CardContent className="p-8 pt-10">
               <ResponsiveContainer width="100%" height={Math.max(300, departmentScores.length * 60)}>
                <BarChart data={departmentScores} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" horizontal={false} />
                  <XAxis type="number" domain={[0, 250]} hide />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10, fontWeight: 900, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" name="Avg Score" radius={[0, 16, 16, 0]} fill="#6366f1" barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="premium-card border-none shadow-[0_32px_84px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden p-0">
             <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Faculty Leaderboard</CardTitle>
                <CardDescription className="font-bold text-xs uppercase tracking-widest text-slate-400 mt-1">Top-tier individual performance metrics</CardDescription>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <CardContent className="p-8 pt-10">
               <div className="space-y-4">
                  {facultyScores.slice(0, 6).map((faculty, idx) => (
                    <div key={idx} className="flex items-center gap-6 p-4 rounded-3xl bg-white border border-slate-100 hover:border-emerald-200 transition-all group overflow-hidden relative">
                       <div className="absolute top-0 right-0 w-24 h-full bg-slate-50 skew-x-12 translate-x-12 group-hover:bg-emerald-50 transition-colors" />
                       <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg relative z-10">
                          {idx + 1}
                       </div>
                       <div className="flex-1 relative z-10">
                          <h4 className="font-black text-slate-900 leading-none mb-1">{faculty.fullName}</h4>
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest py-0 border-emerald-500/20 text-emerald-600">{faculty.category}</Badge>
                       </div>
                       <div className="text-right relative z-10">
                          <div className="text-2xl font-black text-slate-900 leading-none">{faculty.score}</div>
                          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Points</div>
                       </div>
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
      </div>

      <div className="premium-card p-12 bg-slate-900 text-white relative overflow-hidden mb-20 animate-reveal shadow-2xl">
          <div className="absolute top-0 right-0 p-20 opacity-10 rotate-12 scale-150">
              <Zap className="w-96 h-96" />
          </div>
          <div className="relative z-10 grid md:grid-cols-3 gap-12 items-center">
              <div className="md:col-span-2 space-y-6">
                  <Badge className="bg-blue-500 text-white border-none font-black px-4 py-1.5 rounded-full uppercase tracking-widest text-[10px]">Strategic Advisory</Badge>
                  <h2 className="text-4xl font-black tracking-tight leading-tight">Institutional <span className="text-blue-400">Growth Modeling</span>.</h2>
                  <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl">The analytical engine has identified a 14% delta between current research output and national accreditation benchmarks. Strategic focus on Q1/Q2 journal publications and international patent filings is recommended to optimize institutional standing.</p>
                  <div className="flex flex-wrap gap-4 pt-4">
                      <Button className="h-12 px-8 rounded-xl bg-white text-slate-900 font-black hover:bg-slate-100 transition-all hover:-translate-y-1 shadow-xl shadow-white/5">Generate Detailed Audit</Button>
                      <Button variant="ghost" className="h-12 px-8 rounded-xl text-white font-black border border-white/10 hover:bg-white/5">View Policy Framework</Button>
                  </div>
              </div>
              <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-xl">
                  <div className="space-y-6">
                      <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Accreditation Readiness</span>
                          <span className="text-sm font-black">92%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 w-[92%]" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                              <div className="text-xl font-black mb-1">24.2</div>
                              <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">H-Index Avg</div>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                              <div className="text-xl font-black mb-1">118</div>
                              <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">Citations/Mo</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
