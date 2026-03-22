import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { getFinalAppraisal, FinalAppraisal } from '@/integrations/supabase/appraisal';
import {
  BookOpen,
  Building2,
  GraduationCap,
  FileText,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  User,
  Calendar,
  Mail,
  ShieldCheck,
  DollarSign,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import UserAvatar from '@/components/common/UserAvatar';

interface FacultyDetailModalProps {
  facultyId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface Profile {
  full_name: string;
  email: string;
  designation: string | null;
  avatar_url: string | null;
  departments: { name: string } | null;
}

interface PerformanceScore {
  overall_score: number;
  category: string | null;
  teaching_score: number | null;
  research_score: number | null;
  contribution_score: number | null;
  trend: string | null;
}

interface AIInsight {
  id: string;
  title: string;
  description: string;
  insight_type: string;
  confidence: number | null;
}

const FacultyDetailModal: React.FC<FacultyDetailModalProps> = ({
  facultyId,
  isOpen,
  onClose,
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [performance, setPerformance] = useState<PerformanceScore | null>(null);
  const [teachingList, setTeaching] = useState<any[]>([]);
  const [researchList, setResearch] = useState<any[]>([]);
  const [networkingList, setNetworking] = useState<any[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [appraisal, setAppraisal] = useState<FinalAppraisal | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (facultyId && isOpen) {
      fetchFacultyData();
    }
  }, [facultyId, isOpen]);

  const fetchFacultyData = async () => {
    if (!facultyId) return;
    setIsLoading(true);

    try {
      // Fetch all data in parallel
      const [
        profileRes,
        performanceRes,
        appraisalRes,
        teachRes,
        resRes,
        netRes,
        insightsRes,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email, designation, avatar_url, departments(name)')
          .eq('user_id', facultyId)
          .single(),
        supabase
          .from('performance_scores')
          .select('*')
          .eq('user_id', facultyId)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single(),
        getFinalAppraisal(facultyId),
        supabase
          .from('teaching_learning_activities')
          .select('*')
          .eq('user_id', facultyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('research_activities')
          .select('*')
          .eq('user_id', facultyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('networking_contributions')
          .select('*')
          .eq('user_id', facultyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('ai_insights')
          .select('*')
          .eq('user_id', facultyId)
          .order('generated_at', { ascending: false })
          .limit(5),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (performanceRes.data) setPerformance(performanceRes.data as any);
      setAppraisal(appraisalRes);
      if (teachRes.data) setTeaching(teachRes.data);
      if (resRes.data) setResearch(resRes.data);
      if (netRes.data) setNetworking(netRes.data);
      if (insightsRes.data) setInsights(insightsRes.data);
    } catch (error) {
      console.error('Error fetching faculty data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'Excellent':
        return 'bg-success text-success-foreground';
      case 'Very Good':
      case 'Good':
        return 'bg-primary text-primary-foreground';
      case 'Needs Improvement':
      case 'Average':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-destructive text-destructive-foreground';
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'achievement':
        return <Award className="w-4 h-4 text-success" />;
      case 'recommendation':
        return <Brain className="w-4 h-4 text-primary" />;
      case 'alert':
        return <TrendingDown className="w-4 h-4 text-warning" />;
      default:
        return <TrendingUp className="w-4 h-4 text-accent" />;
    }
  };

  if (!facultyId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Faculty Performance Deep Dive
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Header */}
            {profile && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <UserAvatar
                      userId={facultyId || undefined}
                      name={profile.full_name}
                      avatarUrl={profile.avatar_url}
                      className="w-16 h-16 text-2xl"
                      fallbackClassName="text-2xl"
                    />
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold">{profile.full_name}</h2>
                      <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <Mail className="w-4 h-4" />
                        <span>{profile.email}</span>
                      </div>
                      {profile.designation && (
                        <p className="text-sm text-muted-foreground mt-1">{profile.designation}</p>
                      )}
                      {profile.departments && (
                        <Badge variant="secondary" className="mt-2">
                          {profile.departments.name}
                        </Badge>
                      )}
                    </div>
                    {performance && (
                      <div className="text-right">
                        <div className="text-3xl font-bold">
                          {Number(appraisal?.total_score ?? performance.overall_score).toFixed(0)} <span className="text-sm text-muted-foreground font-normal">/ 250</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end mt-1">
                          <Badge className={getCategoryColor(appraisal?.final_grade || performance.category)}>
                            {appraisal?.final_grade || performance.category}
                          </Badge>
                          {getTrendIcon(performance.trend)}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Breakdown — scores computed live from item lists with cap applied */}
            {performance && (() => {
              // Compute capped Research score from fetched items
              let rTotal = 0;
              for (const r of researchList) rTotal += Number(r.score_claimed || 0);
              const liveResearch = Math.min(rTotal, 100);

              // Compute capped Networking score from fetched items
              let nTotal = 0;
              for (const n of networkingList) nTotal += Number(n.score_claimed || 0);
              const liveNetwork = Math.min(nTotal, 100);

              const items = [
                { label: 'Teaching & Learning (Max 50)', score: Number(performance.teaching_score || 0), max: 50, icon: GraduationCap },
                { label: 'Research (Max 100)',            score: liveResearch,                             max: 100, icon: FileText },
                { label: 'Networking & Contributions (Max 100)', score: liveNetwork,                      max: 100, icon: Award },
              ];

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Point Distribution (250 Scale)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <item.icon className="w-4 h-4 text-muted-foreground" />
                            <span>{item.label}</span>
                          </div>
                          <span className="font-medium">{item.score.toFixed(0)} / {item.max}</span>
                        </div>
                        <Progress value={(item.score / item.max) * 100} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })()}

            {/* AI Insights */}
            {insights.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      {getInsightIcon(insight.insight_type)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                      {insight.confidence && (
                        <Badge variant="outline">{insight.confidence}%</Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Activity Tabs */}
            <Tabs defaultValue="teaching" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="teaching">Teaching ({teachingList.length})</TabsTrigger>
                <TabsTrigger value="research">Research ({researchList.length})</TabsTrigger>
                <TabsTrigger value="networking">Contributions ({networkingList.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="teaching" className="mt-4">
                <div className="space-y-2">
                  {teachingList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No teaching records found</p>
                  ) : (
                    teachingList.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">Term: {t.academic_year} ({t.semester})</p>
                          <p className="text-sm text-muted-foreground">
                            Pass %: {t.subject_pass_percentage}% | Feedback: {t.student_feedback_percentage}%
                          </p>
                        </div>
                        <div className="text-right">
                            <Badge variant="secondary">
                                Score: {(t.subject_pass_score + t.student_feedback_score + t.instruction_material_score + t.pedagogy_score + t.learners_action_score + t.visits_lectures_score)}/50
                            </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="research" className="mt-4">
                <div className="space-y-2">
                  {researchList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No research records found</p>
                  ) : (() => {
                    const RESEARCH_MAX = 100;
                    let rRunning = 0;
                    return researchList.map((r) => {
                      const pts = Number(r.score_claimed || 0);
                      const prev = rRunning;
                      rRunning += pts;
                      const counted = Math.max(0, Math.min(pts, RESEARCH_MAX - prev));
                      const isFullyExtra = counted === 0;
                      const isPartialExtra = counted < pts && counted > 0;
                      return (
                        <div key={r.id} className={`flex items-center justify-between p-3 rounded-lg ${
                          isFullyExtra ? 'bg-slate-50 opacity-70' : isPartialExtra ? 'bg-amber-50/60' : 'bg-muted/50'
                        }`}>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold uppercase ${
                                isFullyExtra ? 'text-slate-400' : 'text-primary'
                              }`}>{r.activity_category}</span>
                              <span className={`font-medium truncate ${
                                isFullyExtra ? 'text-slate-400 line-through decoration-slate-300' : ''
                              }`}>{r.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Level: {r.activity_level} | Year: {r.academic_year}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isFullyExtra ? (
                              <>
                                <Badge variant="outline" className="text-slate-400 border-slate-200 line-through">{r.score_claimed} Pts</Badge>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-black uppercase tracking-wide">⚠ Extra</span>
                              </>
                            ) : isPartialExtra ? (
                              <>
                                <Badge variant="outline" className="text-emerald-700 border-emerald-200">+{counted} Pts counted</Badge>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-black uppercase tracking-wide">⚠ {pts - counted} excess</span>
                              </>
                            ) : (
                              <Badge variant="outline">+{r.score_claimed} Pts</Badge>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </TabsContent>

              <TabsContent value="networking" className="mt-4">
                <div className="space-y-2">
                  {networkingList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No contribution records found</p>
                  ) : (() => {
                    const NET_MAX = 100;
                    const CAPS: Record<string, number> = {
                        'Professional Society': 20,
                        'FDP Attended': 25,
                        'Organized Event': 25,
                        'Consultancy': 15,
                        'Funded Project': 25,
                        'Institution Contribution': 30
                    };
                    
                    const catTrack: Record<string, number> = {};
                    let totalCapped = 0;

                    return networkingList.map((c) => {
                      const cat = c.contribution_category || 'Other';
                      const pts = Number(c.score_claimed || 0);
                      const cap = CAPS[cat] || 999;
                      
                      const prevCatTotal = catTrack[cat] || 0;
                      const allowedInCat = Math.max(0, Math.min(pts, cap - prevCatTotal));
                      const counted = Math.max(0, Math.min(allowedInCat, NET_MAX - totalCapped));
                      
                      catTrack[cat] = prevCatTotal + pts;
                      totalCapped += counted;

                      const isFullyExtra = counted === 0;
                      const isSubCapExtra = allowedInCat < pts;
                      const isPartialExtra = !isFullyExtra && (isSubCapExtra || (counted < allowedInCat));

                      return (
                        <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg ${
                          isFullyExtra ? 'bg-slate-50 opacity-70' : isPartialExtra ? 'bg-amber-50/60' : 'bg-muted/50'
                        }`}>
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold uppercase ${
                                isFullyExtra ? 'text-slate-400' : 'text-primary'
                              }`}>{c.contribution_category}</span>
                              <span className={`font-medium truncate ${
                                isFullyExtra ? 'text-slate-400 line-through decoration-slate-300' : ''
                              }`}>{c.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Level: {c.contribution_level} | Year: {c.academic_year}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isFullyExtra ? (
                              <>
                                <Badge variant="outline" className="text-slate-400 border-slate-200 line-through">{c.score_claimed} Pts</Badge>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-black uppercase tracking-wide">⚠ Extra</span>
                              </>
                            ) : isPartialExtra ? (
                              <>
                                <Badge variant="outline" className="text-emerald-700 border-emerald-200">+{counted} Pts counted</Badge>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-black uppercase tracking-wide">
                                  {isSubCapExtra ? '⚠ Type Cap' : '⚠ Maxed'}
                                </span>
                              </>
                            ) : (
                              <Badge variant="outline">+{c.score_claimed} Pts</Badge>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FacultyDetailModal;
