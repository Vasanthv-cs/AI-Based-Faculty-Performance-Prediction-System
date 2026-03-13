import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from '@/components/common/UserAvatar';
import {
  Download,
  FileText,
  Calendar,
  Loader2,
  Mail,
  Building2,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProfileData {
  full_name: string;
  email: string;
  designation: string | null;
  avatar_url: string | null;
  department_name: string | null;
  date_of_birth: string | null;
  years_of_experience: number | null;
}

interface ResearchPaperRow {
  id: string;
  title: string;
  publication_year: number;
}

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [papers, setPapers] = useState<ResearchPaperRow[]>([]);
  const [performanceBreakdown, setPerformanceBreakdown] = useState<Array<{ name: string; value: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchProfileData();
  }, [user?.id]);

  const fetchProfileData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [profileRes, activitiesRes, perfRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email, designation, avatar_url, date_of_birth, years_of_experience, departments(name)')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('research_activities')
          .select('id, title, academic_year')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('performance_scores')
          .select('teaching_score, research_score, contribution_score')
          .eq('user_id', user.id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single(),
      ]);

      if (profileRes.data) {
        const d = profileRes.data as ProfileData & { departments?: { name: string } | null };
        setProfile({
          ...d,
          department_name: d.departments?.name ?? null,
        });
      }

      if (activitiesRes.data) {
        setPapers(
          activitiesRes.data.map((a: any) => ({
            id: a.id,
            title: a.title,
            publication_year: parseInt(a.academic_year?.substring(0, 4) || new Date().getFullYear().toString(), 10),
          }))
        );
      }

      if (perfRes.data) {
        const p = perfRes.data;
        setPerformanceBreakdown([
          { name: 'Teaching', value: Math.round(Number(p.teaching_score || 0)) },
          { name: 'Research', value: Math.round(Number(p.research_score || 0)) },
          { name: 'Contribution', value: Math.round(Number(p.contribution_score || 0)) },
        ].filter(x => x.value > 0));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground">View and download your profile summary</p>
        </div>
        <Button variant="outline" onClick={handleDownload} className="print:hidden">
          <Download className="w-4 h-4 mr-2" />
          Download / Print
        </Button>
      </div>

      <div ref={printRef} className="space-y-6">
        {/* Profile header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <UserAvatar
                userId={user?.id}
                name={profile?.full_name}
                avatarUrl={profile?.avatar_url}
                className="w-20 h-20 text-2xl"
                fallbackClassName="text-2xl"
              />
              <div className="flex-1 space-y-1">
                <h2 className="text-xl font-semibold">{profile?.full_name}</h2>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>{profile?.email}</span>
                </div>
                {profile?.designation && (
                  <p className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {profile.designation}
                  </p>
                )}
                {profile?.department_name && (
                  <p className="text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    {profile.department_name}
                  </p>
                )}
                {profile?.years_of_experience != null && (
                  <p className="text-sm text-muted-foreground">{profile.years_of_experience} years of experience</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Graph visualization - Performance breakdown */}
        {performanceBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Performance breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={performanceBreakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} className="text-muted-foreground" />
                  <YAxis dataKey="name" type="category" width={80} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" name="Score" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Research papers - count and list (Title, Publish date) - same UI as other sections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Research Papers ({papers.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">Title and publish date</p>
          </CardHeader>
          <CardContent>
            {papers.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No research papers recorded</p>
            ) : (
              <div className="space-y-2">
                {papers.map((paper) => (
                  <div
                    key={paper.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{paper.title}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        Publish date: {format(new Date(paper.publication_year, 0, 1), 'yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
