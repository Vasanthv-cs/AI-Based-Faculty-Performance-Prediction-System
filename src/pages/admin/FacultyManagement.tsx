import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Trash2, Users, Eye, Download, FileDown, ShieldCheck, UserCheck, Briefcase, Zap, Filter, Sparkles, MoreHorizontal, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FacultyDetailModal from '@/components/dashboard/FacultyDetailModal';
import { usePDFReport } from '@/hooks/usePDFReport';

interface StaffMember {
  user_id: string;
  full_name: string;
  email: string;
  designation: string | null;
  department_name: string | null;
  department_id: string | null;
  role: string;
  overall_score: number | null;
  category: string | null;
}

interface Department {
  id: string;
  name: string;
}

const FacultyManagement: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { generateReport } = usePDFReport();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterStaff();
  }, [staff, searchQuery, selectedDepartment, selectedRole]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, designation, department_id, departments(name)');
      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesError) throw rolesError;

      const { data: scoresData, error: scoresError } = await supabase
        .from('performance_scores')
        .select('user_id, overall_score, category');
      if (scoresError) throw scoresError;

      const { data: deptsData, error: deptsError } = await supabase
        .from('departments')
        .select('id, name');
      if (deptsError) throw deptsError;

      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      const scoresMap = new Map(scoresData?.map(s => [s.user_id, { score: s.overall_score, category: s.category }]) || []);

      const staffList: StaffMember[] = (profilesData || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        email: p.email,
        designation: p.designation,
        department_id: p.department_id,
        department_name: (p.departments as any)?.name || null,
        role: rolesMap.get(p.user_id) || 'faculty',
        overall_score: scoresMap.get(p.user_id)?.score || null,
        category: scoresMap.get(p.user_id)?.category || null,
      }));

      setStaff(staffList);
      setDepartments(deptsData || []);
    } catch (error: any) {
      toast.error('Failed to synchronize staff directory');
    } finally {
      setIsLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staff];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.full_name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query));
    }
    if (selectedDepartment !== 'all') filtered = filtered.filter(s => s.department_id === selectedDepartment);
    if (selectedRole !== 'all') filtered = filtered.filter(s => s.role === selectedRole || (selectedRole === 'faculty' && s.role === 'hod'));
    setFilteredStaff(filtered);
  };

  const handleDeleteClick = (member: StaffMember) => {
    setStaffToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    const uid = staffToDelete.user_id;
    const name = staffToDelete.full_name;

    try {
      // Step 1: Delete all related data from every table (cascade-safe order)
      await supabase.from('research_activities').delete().eq('user_id', uid);
      await supabase.from('teaching_learning_activities').delete().eq('user_id', uid);
      await supabase.from('networking_contributions').delete().eq('user_id', uid);
      await supabase.from('performance_scores').delete().eq('user_id', uid);

      // Step 2: Delete profile and role
      await supabase.from('user_roles').delete().eq('user_id', uid);
      const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', uid);
      if (profileError) throw profileError;

      // Step 3: Optimistically remove from UI immediately
      setStaff(prev => prev.filter(s => s.user_id !== uid));
      toast.success(`${name} has been removed from directory`);

      // Step 4: Try Edge Function to also remove from auth.users (best effort)
      try {
        await supabase.functions.invoke('delete-user-completely', { body: { user_id: uid } });
      } catch {
        // Auth user removal failed (Edge Function not deployed or network error)
        // The profile/data is already deleted so they can't login or be found anymore
        console.warn('Auth user removal skipped (Edge Function unavailable)');
      }
    } catch (error: any) {
      console.error('Delete faculty error:', error);
      toast.error(error.message || 'Delete operation failed. Please try again.');
      fetchData(); // Re-sync from DB on failure
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    }
  };

  const handleViewDetails = (userId: string) => {
    setSelectedFacultyId(userId);
    setIsModalOpen(true);
  };

  const getCategoryBadgeClass = (category: string | null) => {
    switch (category) {
      case 'Excellent': return 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20';
      case 'Good': return 'bg-amber-500 text-white shadow-lg shadow-amber-500/20';
      case 'Average': return 'bg-orange-500 text-white shadow-lg shadow-orange-500/20';
      case 'Needs Improvement': return 'bg-rose-500 text-white shadow-lg shadow-rose-500/20';
      default: return 'bg-slate-100 text-slate-400';
    }
  };

  const handleDownload = () => {
    const headers = ['Name', 'Email', 'Department', 'Role', 'Score', 'Category'];
    const rows = filteredStaff.map(s => [s.full_name, s.email, s.department_name || 'Unassigned', s.role, s.overall_score ?? '', s.category ?? '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faculty-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV Audit Report exported');
  };

  return (
    <DashboardLayout>
      <div className="mb-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8 animate-reveal">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-900/5 border border-slate-900/10 text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <Users className="w-3.5 h-3.5" /> Human Capital Index
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900">
                             Faculty <span className="gradient-text">Management</span>.
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg lg:text-xl flex items-center gap-2 max-w-2xl">
                             Comprehensive staff directory, role orchestration, and cross-departmental oversight.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={handleDownload} className="h-14 px-8 rounded-2xl border-slate-200 bg-white shadow-xl shadow-slate-200/40 font-black text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-3 group">
                        <FileDown className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                        Audit Export
                    </Button>
                </div>
            </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 animate-reveal delay-100">
          {[
            { label: 'Aggregate Directory', value: staff.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10', sub: 'Total registered entities' },
            { label: 'Scholarly Faculty', value: staff.filter(s => s.role === 'faculty' || s.role === 'hod').length, icon: UserCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10', sub: 'Active participants' },
            { label: 'Systems Admin', value: staff.filter(s => s.role === 'admin').length, icon: ShieldCheck, color: 'text-rose-600', bg: 'bg-rose-500/10', sub: 'Privileged controllers' },
          ].map((c, idx) => (
            <div key={idx} className="premium-card p-8 border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] bg-white/50 backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center group-hover:-translate-y-1 transition-transform duration-500`}>
                        <c.icon className={`w-7 h-7 ${c.color}`} />
                    </div>
                    <div className="text-4xl font-black text-slate-900 tracking-tighter">{c.value}</div>
                </div>
                <div className="text-sm font-black text-slate-900 mb-1">{c.label}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50 italic">{c.sub}</div>
            </div>
          ))}
      </div>

      <div className="premium-card border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl overflow-hidden animate-reveal delay-200">
          <div className="p-8 border-b border-slate-100/50 bg-slate-50/30 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                 <Input
                  placeholder="Query staff by identifier or alias..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 pl-12 rounded-2xl border-slate-200 bg-white font-bold text-lg focus:ring-slate-900/10 transition-all placeholder:text-slate-300 placeholder:font-medium"
                />
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="h-14 w-full md:w-48 rounded-2xl bg-white border-slate-200 font-bold shadow-sm">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="all" className="font-bold py-3 uppercase tracking-widest text-[10px]">All Facilities</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id} className="font-bold py-3">{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="h-14 w-full md:w-40 rounded-2xl bg-white border-slate-200 font-bold shadow-sm">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-none shadow-2xl">
                    <SelectItem value="all" className="font-bold py-3 uppercase tracking-widest text-[10px]">All Tiers</SelectItem>
                    <SelectItem value="admin" className="font-bold py-3">Administrator</SelectItem>
                    <SelectItem value="faculty" className="font-bold py-3">Faculty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
          </div>

          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-900/[0.02] hover:bg-slate-900/[0.02] border-none">
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 pl-10 text-slate-400">Identity Descriptor</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-slate-400 hidden lg:table-cell">Structural Unit</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-slate-400 text-center">Designation</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-slate-400 text-center">Score Index</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-right pr-10 text-slate-400">Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20">
                         <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-200" />
                            <span className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-300 italic animate-pulse">Accessing Directory Master...</span>
                         </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center">
                         <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-slate-200" />
                         </div>
                         <p className="font-black text-slate-400 uppercase tracking-widest text-xs italic">No matching entities found in current filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((member, idx) => (
                      <TableRow key={member.user_id} className="group hover:bg-slate-50 transition-colors border-slate-100" style={{ animationDelay: `${idx * 50}ms` }}>
                        <TableCell className="pl-10 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                              {member.full_name ? member.full_name.charAt(0) : '?'}
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-lg tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">{member.full_name}</p>
                              <p className="text-xs font-bold text-slate-400 tracking-tight">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell py-6 font-bold text-slate-500">
                          {member.department_name || <span className="opacity-30 italic font-medium">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-center py-6">
                          <Badge className={`px-4 py-1.5 rounded-full border-none font-black text-[9px] uppercase tracking-widest ${member.role === 'admin' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}>
                            {member.role === 'hod' ? 'FACULTY' : member.role.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-6">
                          {member.overall_score !== null ? (
                            <div className="flex flex-col items-center gap-1.5">
                               <div className="bg-white border border-slate-100 rounded-xl px-4 py-1 shadow-sm">
                                  <span className="font-black text-lg text-slate-900">{member.overall_score}</span>
                               </div>
                               {member.category && (
                                <Badge className={`text-[8px] font-black uppercase tracking-widest border-none h-5 ${getCategoryBadgeClass(member.category)}`}>
                                  {member.category}
                                </Badge>
                               )}
                            </div>
                          ) : (
                               <div className="w-8 h-1 rounded-full bg-slate-100 mx-auto" />
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-10 py-6">
                           <div className="flex items-center justify-end gap-2">
                             <Button
                               variant="ghost" size="icon"
                               className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-300"
                               onClick={() => handleViewDetails(member.user_id)}
                             >
                               <Eye className="w-5 h-5" />
                             </Button>
                             <Button
                               variant="ghost" size="icon"
                               className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all duration-300"
                               onClick={() => generateReport(member.user_id, member.full_name)}
                             >
                               <FileDown className="w-5 h-5" />
                             </Button>
                             <Button
                               variant="ghost" size="icon"
                               className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-all duration-300"
                               onClick={() => handleDeleteClick(member)}
                             >
                               <Trash2 className="w-5 h-5" />
                             </Button>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
          </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
           <div className="bg-rose-600 px-8 py-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                    <Trash2 className="w-32 h-32" />
                </div>
                <AlertDialogHeader className="relative z-10">
                    <AlertDialogTitle className="text-3xl font-black tracking-tight leading-none mb-2">Authorize Directory Purge</AlertDialogTitle>
                    <AlertDialogDescription className="text-rose-100 font-medium text-lg">
                        This operation will permanently remove <strong>{staffToDelete?.full_name}</strong> and all associated historical data. This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
           </div>
          <AlertDialogFooter className="p-8 bg-white">
            <AlertDialogCancel disabled={isDeleting} className="h-12 px-8 rounded-xl font-black border-slate-200">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="h-12 px-10 rounded-xl bg-rose-600 text-white font-black hover:bg-rose-700 shadow-xl shadow-rose-500/20"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Purge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FacultyDetailModal
        facultyId={selectedFacultyId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </DashboardLayout>
  );
};

export default FacultyManagement;
