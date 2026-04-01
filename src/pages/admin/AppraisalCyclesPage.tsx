import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    CalendarClock, Plus, Lock, Unlock, Trash2, Loader2,
    ShieldCheck, Sparkles, Zap, Flag, History, Users, Eye,
    AlertTriangle, Search, UserCheck, GraduationCap, BookOpen, Network,
} from 'lucide-react';

interface AppraisalCycle {
    id: string;
    academic_year: string;
    semester: string;
    is_open: boolean;
    created_at: string;
}

interface CycleStaffMember {
    user_id: string;
    full_name: string;
    email: string;
    designation: string | null;
    department_name: string | null;
    overall_score: number;
    category: string;
    teaching_score: number;
    research_score: number;
    contribution_score: number;
}

const CURRENT_YEAR = new Date().getFullYear();

const getCategoryClass = (cat: string) => {
    switch (cat) {
        case 'Excellent': return 'bg-emerald-500 text-white';
        case 'Very Good': return 'bg-sky-500 text-white';
        case 'Good': return 'bg-amber-500 text-white';
        default: return 'bg-rose-500 text-white';
    }
};

const AppraisalCyclesPage: React.FC = () => {
    const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        academic_year: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
        semester: 'Odd',
        is_open: true,
    });

    // History modal
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<AppraisalCycle | null>(null);
    const [cycleStaff, setCycleStaff] = useState<CycleStaffMember[]>([]);
    const [isCycleStaffLoading, setIsCycleStaffLoading] = useState(false);
    const [staffSearch, setStaffSearch] = useState('');

    // Delete confirmation
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [cycleToDelete, setCycleToDelete] = useState<AppraisalCycle | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { fetchCycles(); }, []);

    const fetchCycles = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('appraisal_cycles')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setCycles((data || []) as any[]);
        } catch (err: any) {
            console.warn('Fetch cycles error:', err.message);
            setCycles([]);
        } finally {
            setIsLoading(false);
        }
    };

    // ── Create new cycle (archives current data, starts fresh) ───────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { data, error } = await (supabase as any).rpc('archive_and_create_cycle', {
                _academic_year: formData.academic_year,
                _semester: formData.semester,
                _is_open: formData.is_open,
            });
            if (error) throw error;
            toast.success(
                `New cycle "${formData.academic_year} — ${formData.semester}" started! All faculty data has been reset to 0.`,
                { duration: 5000 }
            );
            setIsCreateDialogOpen(false);
            fetchCycles();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create cycle');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Toggle open/close ────────────────────────────────────────────────────
    // Rule: only ONE cycle can be open at a time.
    // If re-opening a closed cycle → first close every other open cycle.
    const handleToggle = async (cycle: AppraisalCycle) => {
        try {
            if (!cycle.is_open) {
                // We are OPENING this cycle → close all others first
                const openCycles = cycles.filter(c => c.is_open && c.id !== cycle.id);
                for (const openCycle of openCycles) {
                    const { error } = await (supabase as any)
                        .from('appraisal_cycles')
                        .update({ is_open: false })
                        .eq('id', openCycle.id);
                    if (error) throw error;
                }
                // Now open this cycle
                const { error } = await (supabase as any)
                    .from('appraisal_cycles')
                    .update({ is_open: true })
                    .eq('id', cycle.id);
                if (error) throw error;
                toast.success(`Cycle reopened. Any previously open cycle has been closed.`);
            } else {
                // We are CLOSING this cycle
                const { error } = await (supabase as any)
                    .from('appraisal_cycles')
                    .update({ is_open: false })
                    .eq('id', cycle.id);
                if (error) throw error;
                toast.success('Cycle closed. You can now launch a new phase.');
            }
            fetchCycles();
        } catch (err: any) {
            toast.error(err.message || 'Status toggle failed');
        }
    };

    // ── View history modal ───────────────────────────────────────────────────
    const handleViewHistory = async (cycle: AppraisalCycle) => {
        setSelectedCycle(cycle);
        setStaffSearch('');
        setCycleStaff([]);
        setHistoryModalOpen(true);
        setIsCycleStaffLoading(true);
        try {
            // Fetch performance scores for this specific cycle
            const { data: scores, error: scoresError } = await (supabase as any)
                .from('performance_scores')
                .select('user_id, overall_score, category, teaching_score, research_score, contribution_score')
                .eq('appraisal_cycle_id', cycle.id);
            if (scoresError) throw scoresError;

            if (!scores || scores.length === 0) {
                setCycleStaff([]);
                return;
            }

            // Get profiles for those users
            const userIds = scores.map((s: any) => s.user_id);
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, full_name, email, designation, departments(name)')
                .in('user_id', userIds);
            if (profilesError) throw profilesError;

            const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

            const staffList: CycleStaffMember[] = scores.map((s: any) => {
                const p = profileMap.get(s.user_id) || {};
                return {
                    user_id: s.user_id,
                    full_name: (p as any).full_name || '(Unknown)',
                    email: (p as any).email || '',
                    designation: (p as any).designation || null,
                    department_name: ((p as any).departments as any)?.name || null,
                    overall_score: s.overall_score || 0,
                    category: s.category || 'Needs Improvement',
                    teaching_score: s.teaching_score || 0,
                    research_score: s.research_score || 0,
                    contribution_score: s.contribution_score || 0,
                };
            });

            // Sort by score descending
            staffList.sort((a, b) => b.overall_score - a.overall_score);
            setCycleStaff(staffList);
        } catch (err: any) {
            toast.error('Failed to load cycle data');
            setCycleStaff([]);
        } finally {
            setIsCycleStaffLoading(false);
        }
    };

    // ── Delete cycle + all its data ──────────────────────────────────────────
    const handleDeleteClick = (cycle: AppraisalCycle) => {
        // Prevent deleting the last cycle
        if (cycles.length <= 1) {
            toast.error('Cannot delete the only remaining cycle. Create another one first.');
            return;
        }
        setCycleToDelete(cycle);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!cycleToDelete) return;
        setIsDeleting(true);
        try {
            const { error } = await (supabase as any).rpc('delete_cycle_data', {
                _cycle_id: cycleToDelete.id,
            });
            if (error) throw error;
            toast.success(
                `Cycle "${cycleToDelete.academic_year} — ${cycleToDelete.semester}" and all its data permanently deleted.`
            );
            fetchCycles();
        } catch (err: any) {
            toast.error(err.message || 'Deletion failed');
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setCycleToDelete(null);
        }
    };

    const filteredCycleStaff = cycleStaff.filter(s =>
        s.full_name.toLowerCase().includes(staffSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(staffSearch.toLowerCase())
    );

    return (
        <DashboardLayout>
            {/* ── Header ── */}
            <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-reveal">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <CalendarClock className="w-3.5 h-3.5" /> Temporal Policy Engine
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900">
                            Appraisal <span className="gradient-text">Cycles</span>.
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg lg:text-xl max-w-2xl">
                            Each cycle is a fresh start. Creating a new cycle archives the current semester's data and resets all faculty scores to zero.
                        </p>
                    </div>
                </div>

{/* Launch New Phase — only allowed when NO cycle is currently open */}
                {(() => {
                    const hasOpenCycle = cycles.some(c => c.is_open);
                    return (
                        <div className="flex flex-col items-end gap-2">
                            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        disabled={hasOpenCycle}
                                        className={`h-14 px-10 rounded-3xl font-black text-lg transition-all duration-500 group ${
                                            hasOpenCycle
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xl shadow-slate-900/20 hover:-translate-y-1'
                                        }`}
                                    >
                                        <Plus className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                                        Launch New Phase
                                    </Button>
                                </DialogTrigger>
                                {hasOpenCycle && (
                                    <p className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <Lock className="w-3.5 h-3.5" />
                                        Close the active cycle first to create a new one
                                    </p>
                                )}
                            </Dialog>
                        </div>
                    );
                })()}

                {/* Hidden dialog content — rendered separately to avoid nesting issue */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent className="sm:max-w-2xl rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-2xl">
                        <div className="bg-gradient-to-br from-slate-900 to-indigo-900 px-10 py-12 text-white relative">
                            <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
                                <Zap className="w-48 h-48" />
                            </div>
                            <DialogHeader className="relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10">
                                    <History className="w-6 h-6 text-white" />
                                </div>
                                <DialogTitle className="text-4xl font-black tracking-tight leading-none mb-2">New Cycle</DialogTitle>
                                <p className="text-slate-400 font-medium">
                                    ⚠️ This will archive all current semester data and reset every faculty member's score to <strong className="text-white">0</strong>. The old data will still be viewable via the 👁️ icon on the old cycle card.
                                </p>
                            </DialogHeader>
                        </div>
                        <form onSubmit={handleCreate} className="p-10 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Year</Label>
                                    <Input
                                        className="h-14 rounded-2xl border-border bg-background font-bold text-lg"
                                        value={formData.academic_year}
                                        onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                                        placeholder="2025-2026"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Semester</Label>
                                    <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                                        <SelectTrigger className="h-14 rounded-2xl border-border bg-background font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                                            <SelectItem value="Odd" className="font-bold py-3 text-lg">Odd Semester</SelectItem>
                                            <SelectItem value="Even" className="font-bold py-3 text-lg">Even Semester</SelectItem>
                                            <SelectItem value="Full Year" className="font-bold py-3 text-lg">Full Academic Year</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100 md:col-span-2">
                                    <div>
                                        <p className="font-black text-slate-900 leading-none mb-1">Open Immediately</p>
                                        <p className="text-xs font-medium text-slate-500">Allow faculty submissions as soon as the cycle is created.</p>
                                    </div>
                                    <Switch checked={formData.is_open} onCheckedChange={(v) => setFormData({ ...formData, is_open: v })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:scale-105 transition-all" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Archive & Start Fresh'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── Cycle Cards ── */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-6">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin" />
                    <p className="font-black uppercase tracking-[0.3em] text-slate-400 text-sm italic">Loading Cycles...</p>
                </div>
            ) : cycles.length === 0 ? (
                <div className="premium-card p-32 text-center bg-white/50 backdrop-blur-xl border-none shadow-2xl">
                    <div className="w-24 h-24 rounded-[32px] bg-slate-900/5 flex items-center justify-center mx-auto mb-8">
                        <Flag className="w-10 h-10 text-slate-300" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4">No Cycles Yet</h2>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 text-lg">Launch your first appraisal cycle to start tracking faculty performance.</p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black">Get Started</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-reveal delay-200">
                    {cycles.map((cycle) => {
                        const isOnlyOne = cycles.length <= 1;
                        return (
                            <Card key={cycle.id} className="premium-card border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500 p-0 overflow-hidden">
                                <div className={`h-2 transition-colors duration-500 ${cycle.is_open ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                <CardContent className="p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-2xl ${cycle.is_open ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <CalendarClock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Academic Year</p>
                                                <h3 className="text-xl font-black text-slate-900">{cycle.academic_year}</h3>
                                            </div>
                                        </div>
                                        <Badge className={`px-4 py-1.5 rounded-full border-none font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${cycle.is_open ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-500'}`}>
                                            {cycle.is_open ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                            {cycle.is_open ? 'Open' : 'Closed'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-3 mb-8">
                                        <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                                            <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">Semester</span>
                                            <span className="text-lg font-black text-slate-900">{cycle.semester}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-2.5">
                                            <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">Created</span>
                                            <span className="text-xs font-black text-slate-600">{new Date(cycle.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                        {/* Open / Close toggle */}
                                        <Button
                                            onClick={() => handleToggle(cycle)}
                                            className={`flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${cycle.is_open ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg'}`}
                                        >
                                            {cycle.is_open ? 'Close Cycle' : 'Re-Open'}
                                        </Button>
                                        {/* View history (all cycles) */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleViewHistory(cycle)}
                                            className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all duration-300"
                                            title="View faculty performance for this cycle"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </Button>
                                        {/* Delete — disabled if only one cycle */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteClick(cycle)}
                                            disabled={isOnlyOne}
                                            className={`h-11 w-11 rounded-xl transition-all duration-300 ${isOnlyOne
                                                ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                                : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'
                                            }`}
                                            title={isOnlyOne ? 'Cannot delete the only remaining cycle' : 'Delete cycle & all its data'}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                    {isOnlyOne && (
                                        <p className="text-[10px] text-center text-slate-400 font-bold mt-3 uppercase tracking-widest">
                                            ℹ️ Create another cycle to enable delete
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── Cycle History Modal (mirrors Faculty Management) ── */}
            <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[32px] border-none shadow-2xl">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-900 px-10 py-8 text-white shrink-0">
                        <div className="flex items-center gap-3 mb-2">
                            <History className="w-6 h-6 text-indigo-400" />
                            <DialogTitle className="text-2xl font-black text-white">
                                {selectedCycle?.academic_year} — {selectedCycle?.semester} Semester
                            </DialogTitle>
                            <Badge className={`ml-2 ${selectedCycle?.is_open ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-200'}`}>
                                {selectedCycle?.is_open ? 'OPEN' : 'ARCHIVED'}
                            </Badge>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">
                            Faculty performance recorded during this cycle. Read-only view.
                        </p>
                    </div>

                    {/* Search */}
                    <div className="px-8 py-4 border-b border-slate-100 shrink-0 bg-slate-50/50">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search faculty..."
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                className="h-11 pl-11 rounded-xl border-slate-200 bg-white font-medium"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-y-auto flex-1">
                        {isCycleStaffLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        ) : filteredCycleStaff.length === 0 ? (
                            <div className="text-center py-20">
                                <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No faculty data recorded for this cycle.</p>
                                <p className="text-xs text-slate-400 mt-2">
                                    {staffSearch ? 'Try adjusting your search.' : 'Apply the SQL migration and submit data in this cycle to see results here.'}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-none">
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 pl-8 text-slate-400">Faculty</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-slate-400 hidden lg:table-cell">Department</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-center text-slate-400">Teaching</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-center text-slate-400">Research</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-center text-slate-400">Networking</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-center text-slate-400">Total</TableHead>
                                        <TableHead className="font-black text-[10px] uppercase tracking-widest h-14 text-center pr-8 text-slate-400">Grade</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCycleStaff.map((member, idx) => (
                                        <TableRow key={member.user_id} className="group hover:bg-slate-50 transition-colors border-slate-100">
                                            <TableCell className="pl-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-black text-lg shadow-md">
                                                        {member.full_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 leading-tight">{member.full_name}</p>
                                                        <p className="text-xs text-slate-400">{member.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell py-5 font-bold text-slate-500 text-sm">
                                                {member.department_name || <span className="opacity-30 italic">Unassigned</span>}
                                            </TableCell>
                                            <TableCell className="text-center py-5">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-slate-900">{member.teaching_score}</span>
                                                    <span className="text-[9px] text-slate-400 uppercase">/ 50</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-5">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-slate-900">{member.research_score}</span>
                                                    <span className="text-[9px] text-slate-400 uppercase">/ 100</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-5">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-slate-900">{member.contribution_score}</span>
                                                    <span className="text-[9px] text-slate-400 uppercase">/ 100</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-5">
                                                <div className="bg-white border border-slate-100 rounded-xl px-3 py-1 shadow-sm inline-block">
                                                    <span className="font-black text-lg text-slate-900">{member.overall_score}</span>
                                                    <span className="text-[9px] text-slate-400 ml-1">/ 250</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center pr-8 py-5">
                                                <Badge className={`text-[9px] font-black px-3 py-1 rounded-full border-none ${getCategoryClass(member.category)}`}>
                                                    {member.category}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Footer */}
                    {!isCycleStaffLoading && filteredCycleStaff.length > 0 && (
                        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                            <p className="text-xs text-slate-400 font-bold">{filteredCycleStaff.length} faculty member(s) in this cycle</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Delete Confirmation ── */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-red-600 px-8 py-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                            <Trash2 className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <AlertTriangle className="w-8 h-8 mb-4" />
                            <DialogTitle className="text-2xl font-black mb-3 text-white">Delete Cycle & All Data</DialogTitle>
                            <p className="text-red-100 text-sm font-medium leading-relaxed">
                                This will permanently delete <strong>"{cycleToDelete?.academic_year} — {cycleToDelete?.semester}"</strong> and ALL teaching, research, and networking records submitted during it.
                                <br /><br />
                                <strong>This cannot be undone.</strong>
                            </p>
                        </div>
                    </div>
                    <div className="p-8 bg-white flex gap-3">
                        <Button variant="outline" className="flex-1 h-12 rounded-xl font-black border-slate-200" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 h-12 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 shadow-lg"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete Everything'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Info Panel ── */}
            <div className="mt-20 p-12 rounded-[48px] bg-slate-50 border border-slate-100 relative overflow-hidden animate-reveal delay-500">
                <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12">
                    <History className="w-64 h-64" />
                </div>
                <div className="relative z-10 grid md:grid-cols-3 gap-12 items-center">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Cycle <span className="text-slate-400">Rules</span></h3>
                        <p className="text-slate-500 font-medium leading-relaxed">
                            Each cycle tracks data independently. Closed cycles are preserved as archives. Click 👁️ on any cycle to view the full staff performance table for that semester.
                        </p>
                    </div>
                    <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
                            <Zap className="w-4 h-4 text-amber-500 mb-3" />
                            <p className="font-black text-slate-900 text-sm">New Cycle = Fresh Start</p>
                            <p className="text-xs text-slate-400 mt-1">All faculty scores reset to 0. Old data is archived under the closed cycle and remains fully viewable.</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm">
                            <Sparkles className="w-4 h-4 text-indigo-500 mb-3" />
                            <p className="font-black text-slate-900 text-sm">Cannot Delete Last Cycle</p>
                            <p className="text-xs text-slate-400 mt-1">The delete button is disabled when only one cycle remains. Create a new cycle first, then delete the old one.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AppraisalCyclesPage;
