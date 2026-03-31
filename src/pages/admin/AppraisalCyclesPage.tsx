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
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    CalendarClock, Plus, Lock, Unlock, Trash2, Loader2,
    ShieldCheck, Sparkles, Zap, Flag, History, Users, Eye,
    FileText, Award, GraduationCap, AlertTriangle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge as UiBadge } from '@/components/ui/badge';

interface AppraisalCycle {
    id: string;
    academic_year: string;
    semester: string;
    is_open: boolean;
    created_at: string;
}

interface CycleFacultyData {
    user_id: string;
    full_name: string;
    email: string;
    designation: string | null;
    department_name: string | null;
    teaching_count: number;
    research_count: number;
    networking_count: number;
    total_score: number;
}

const CURRENT_YEAR = new Date().getFullYear();

const AppraisalCyclesPage: React.FC = () => {
    const [cycles, setCycles] = useState<AppraisalCycle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        academic_year: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
        semester: 'Odd',
        is_open: true,
    });

    // History modal state
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [selectedCycle, setSelectedCycle] = useState<AppraisalCycle | null>(null);
    const [cycleData, setCycleData] = useState<CycleFacultyData[]>([]);
    const [isCycleDataLoading, setIsCycleDataLoading] = useState(false);

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [cycleToDelete, setCycleToDelete] = useState<AppraisalCycle | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { fetchCycles(); }, []);

    const fetchCycles = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase.from('appraisal_cycles').insert({
                academic_year: formData.academic_year,
                semester: formData.semester,
                is_open: formData.is_open,
            });
            if (error) throw error;
            toast.success(`New cycle "${formData.academic_year} — ${formData.semester}" launched! Faculty data starts fresh for this cycle.`);
            setIsDialogOpen(false);
            fetchCycles();
        } catch (err: any) {
            toast.error(err.message || 'Initialization failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = async (cycle: AppraisalCycle) => {
        try {
            const { error } = await supabase
                .from('appraisal_cycles')
                .update({ is_open: !cycle.is_open })
                .eq('id', cycle.id);
            if (error) throw error;
            toast.success(`Cycle ${!cycle.is_open ? 'opened' : 'closed'}`);
            fetchCycles();
        } catch (err: any) {
            toast.error(err.message || 'Status toggle failed');
        }
    };

    const handleDeleteClick = (cycle: AppraisalCycle) => {
        setCycleToDelete(cycle);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!cycleToDelete) return;
        setIsDeleting(true);
        try {
            // Use RPC to delete all linked data + the cycle itself
            const { error } = await (supabase as any).rpc('delete_cycle_data', {
                _cycle_id: cycleToDelete.id,
            });
            if (error) throw error;
            toast.success(`Cycle "${cycleToDelete.academic_year} — ${cycleToDelete.semester}" and all its data permanently deleted.`);
            fetchCycles();
        } catch (err: any) {
            // Fallback: just delete the cycle row (data stays, FK cascade handles it)
            try {
                const { error: e2 } = await supabase.from('appraisal_cycles').delete().eq('id', cycleToDelete.id);
                if (e2) throw e2;
                toast.success('Cycle deleted (data may remain if migration not applied).');
                fetchCycles();
            } catch (e3: any) {
                toast.error(e3.message || 'Deletion failed');
            }
        } finally {
            setIsDeleting(false);
            setDeleteConfirmOpen(false);
            setCycleToDelete(null);
        }
    };

    const handleViewHistory = async (cycle: AppraisalCycle) => {
        setSelectedCycle(cycle);
        setHistoryModalOpen(true);
        setIsCycleDataLoading(true);
        try {
            // Get all profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, full_name, email, designation, departments(name)');

            // Get activity counts per faculty for this cycle
            const [teachRes, resRes, netRes] = await Promise.all([
                (supabase as any).from('teaching_learning_activities').select('user_id').eq('appraisal_cycle_id', cycle.id),
                (supabase as any).from('research_activities').select('user_id, score_claimed').eq('appraisal_cycle_id', cycle.id),
                (supabase as any).from('networking_contributions').select('user_id, score_claimed').eq('appraisal_cycle_id', cycle.id),
            ]);

            const teachCounts: Record<string, number> = {};
            (teachRes.data || []).forEach((r: any) => {
                teachCounts[r.user_id] = (teachCounts[r.user_id] || 0) + 1;
            });
            const resCounts: Record<string, number> = {};
            const resScores: Record<string, number> = {};
            (resRes.data || []).forEach((r: any) => {
                resCounts[r.user_id] = (resCounts[r.user_id] || 0) + 1;
                resScores[r.user_id] = (resScores[r.user_id] || 0) + Number(r.score_claimed || 0);
            });
            const netCounts: Record<string, number> = {};
            const netScores: Record<string, number> = {};
            (netRes.data || []).forEach((r: any) => {
                netCounts[r.user_id] = (netCounts[r.user_id] || 0) + 1;
                netScores[r.user_id] = (netScores[r.user_id] || 0) + Number(r.score_claimed || 0);
            });

            const facultyData: CycleFacultyData[] = (profiles || [])
                .filter((p: any) => {
                    const uid = p.user_id;
                    return (teachCounts[uid] || 0) > 0 || (resCounts[uid] || 0) > 0 || (netCounts[uid] || 0) > 0;
                })
                .map((p: any) => ({
                    user_id: p.user_id,
                    full_name: p.full_name,
                    email: p.email,
                    designation: p.designation,
                    department_name: (p.departments as any)?.name || null,
                    teaching_count: teachCounts[p.user_id] || 0,
                    research_count: resCounts[p.user_id] || 0,
                    networking_count: netCounts[p.user_id] || 0,
                    total_score: (resScores[p.user_id] || 0) + (netScores[p.user_id] || 0),
                }));

            setCycleData(facultyData);
        } catch (err: any) {
            toast.error('Failed to load cycle history');
            setCycleData([]);
        } finally {
            setIsCycleDataLoading(false);
        }
    };

    return (
        <DashboardLayout>
            {/* Header */}
            <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-reveal">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <CalendarClock className="w-3.5 h-3.5" /> Temporal Policy Engine
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900">
                             Appraisal <span className="gradient-text">Cycles</span>.
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg lg:text-xl flex items-center gap-2 max-w-2xl">
                             Manage semester cycles. Each cycle tracks faculty data independently. Closed cycles are viewable as historical archives.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-14 px-10 rounded-3xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl shadow-slate-900/20 font-black text-lg transition-all duration-500 hover:-translate-y-1 group">
                                <Plus className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                                Launch New Phase
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-2xl">
                            <div className="bg-gradient-to-br from-slate-900 to-indigo-900 px-10 py-12 text-white relative">
                                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
                                    <Zap className="w-48 h-48" />
                                </div>
                                <DialogHeader className="relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md">
                                        <History className="w-6 h-6 text-white" />
                                    </div>
                                    <DialogTitle className="text-4xl font-black tracking-tight leading-none mb-2">Cycle Initiation</DialogTitle>
                                    <p className="text-slate-400 font-medium text-lg">
                                        Launching a new cycle starts a fresh data window. Previous cycle data is preserved and archived.
                                    </p>
                                </DialogHeader>
                            </div>
                            <form onSubmit={handleCreate} className="p-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Year</Label>
                                        <Input className="h-14 rounded-2xl border-border bg-background font-bold text-lg focus:ring-slate-900/20" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} placeholder="2024-2025" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Focus Semester</Label>
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
                                            <p className="font-black text-slate-900 leading-none mb-1">Immediate Activation</p>
                                            <p className="text-xs font-medium text-slate-500">Allow faculty to begin submissions immediately upon launch.</p>
                                        </div>
                                        <Switch checked={formData.is_open} onCheckedChange={(v) => setFormData({ ...formData, is_open: v })} />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-muted-foreground uppercase tracking-widest text-xs" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button type="submit" className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-slate-900/20 hover:scale-105 transition-all duration-300" disabled={isSaving}>
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Launch'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Cycle Cards */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-6 animate-pulse">
                     <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-slate-900 animate-spin" />
                     <p className="font-black uppercase tracking-[0.3em] text-slate-400 text-sm italic">Synchronizing Temporal Records...</p>
                </div>
            ) : cycles.length === 0 ? (
                <div className="premium-card p-32 text-center bg-white/50 backdrop-blur-xl border-none shadow-2xl">
                    <div className="w-24 h-24 rounded-[32px] bg-slate-900/5 flex items-center justify-center mx-auto mb-8">
                        <Flag className="w-10 h-10 text-slate-300" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4">No Cycles Active</h2>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 text-lg">Launch your first appraisal cycle to begin data ingestion for the current academic term.</p>
                    <Button onClick={() => setIsDialogOpen(true)} className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black">Get Started</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-reveal delay-200">
                    {cycles.map((cycle) => (
                        <Card key={cycle.id} className="premium-card border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500 p-0 overflow-hidden">
                            <div className={`h-2 transition-colors duration-500 ${cycle.is_open ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            <CardContent className="p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                         <div className={`p-3 rounded-2xl ${cycle.is_open ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <CalendarClock className="w-6 h-6" />
                                         </div>
                                         <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic">Academic Epoch</p>
                                            <h3 className="text-xl font-black text-slate-900">{cycle.academic_year}</h3>
                                         </div>
                                    </div>
                                    <Badge className={`px-4 py-1.5 rounded-full border-none font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${cycle.is_open ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}>
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
                                        <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">Initialized</span>
                                        <span className="text-xs font-black text-slate-600">{new Date(cycle.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                                    {/* Open/Close toggle */}
                                    <Button
                                        onClick={() => handleToggle(cycle)}
                                        className={`flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${cycle.is_open ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'}`}
                                    >
                                        {cycle.is_open ? 'Close Cycle' : 'Re-Open'}
                                    </Button>
                                    {/* View History — always visible */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleViewHistory(cycle)}
                                        className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all duration-300"
                                        title="View faculty data for this cycle"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </Button>
                                    {/* Delete */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteClick(cycle)}
                                        className="h-11 w-11 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300"
                                        title="Delete cycle and all its data"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ─── History Modal ─── */}
            <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                            <History className="w-6 h-6 text-indigo-500" />
                            {selectedCycle?.academic_year} — {selectedCycle?.semester} Semester
                            <Badge className={`ml-2 ${selectedCycle?.is_open ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {selectedCycle?.is_open ? 'OPEN' : 'CLOSED'}
                            </Badge>
                        </DialogTitle>
                    </DialogHeader>

                    {isCycleDataLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : cycleData.length === 0 ? (
                        <div className="text-center py-16">
                            <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No faculty activity recorded for this cycle yet.</p>
                            <p className="text-xs text-slate-400 mt-2">Activities submitted after the SQL migration will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-4">
                            <p className="text-sm text-muted-foreground font-medium mb-4">
                                {cycleData.length} faculty member(s) submitted data in this cycle.
                            </p>
                            {cycleData.map((f) => (
                                <div key={f.user_id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-black text-lg">
                                            {f.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900">{f.full_name}</p>
                                            <p className="text-xs text-slate-400">{f.email}</p>
                                            {f.department_name && <p className="text-xs text-indigo-600 font-bold">{f.department_name}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-right">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <GraduationCap className="w-3.5 h-3.5" /> {f.teaching_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5" /> {f.research_count}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Award className="w-3.5 h-3.5" /> {f.networking_count}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-slate-900 text-lg">{f.total_score}</p>
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest">pts</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── Delete Confirmation Dialog ─── */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="max-w-md rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-red-600 px-8 py-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 scale-150">
                            <Trash2 className="w-32 h-32" />
                        </div>
                        <div className="relative z-10">
                            <AlertTriangle className="w-8 h-8 mb-4" />
                            <h2 className="text-2xl font-black mb-2">Delete Cycle & All Data</h2>
                            <p className="text-red-100 text-sm font-medium">
                                This will permanently delete the cycle <strong>"{cycleToDelete?.academic_year} — {cycleToDelete?.semester}"</strong> and ALL research, teaching, and networking records submitted during it.
                                <br /><br />
                                This action <strong>cannot be undone</strong>.
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

            {/* Info Panel */}
            <div className="mt-20 p-12 rounded-[48px] bg-slate-50 border border-slate-100 relative overflow-hidden animate-reveal delay-500">
                <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12">
                    <History className="w-64 h-64" />
                </div>
                <div className="relative z-10 grid md:grid-cols-3 gap-12 items-center">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Governance <span className="text-slate-400">Framework</span></h3>
                        <p className="text-slate-500 font-medium leading-relaxed">Each cycle independently tracks faculty activity. Closing a cycle preserves its data as a read-only archive. Click the 👁️ eye icon on any cycle to view its faculty performance history.</p>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">How Cycles Work</span>
                            </div>
                            <p className="font-bold text-slate-900 text-sm">New cycle → fresh start</p>
                            <p className="text-xs text-slate-400 mt-1">When faculty submit data in a new cycle, it is tagged to that cycle only. Old cycle data stays separate.</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Important Note</span>
                            </div>
                            <p className="font-bold text-slate-900 text-sm">Run DB Migration First</p>
                            <p className="text-xs text-slate-400 mt-1">Apply <code>20260401000000_cycle_based_data.sql</code> in Supabase SQL Editor to enable full cycle isolation.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AppraisalCyclesPage;
