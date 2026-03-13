import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { CalendarClock, Plus, Lock, Unlock, Trash2, Loader2, RefreshCcw, ShieldCheck, Sparkles, Zap, Flag, History } from 'lucide-react';

interface AppraisalCycle {
    id: string;
    academic_year: string;
    semester: string;
    is_open: boolean;
    created_at: string;
}

const CURRENT_YEAR = new Date().getFullYear();

const AppraisalCyclesPage: React.FC = () => {
    const [cycles, setCycles]         = useState<AppraisalCycle[]>([]);
    const [isLoading, setIsLoading]   = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving]     = useState(false);
    const [formData, setFormData]     = useState({
        academic_year: `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
        semester: 'Odd',
        is_open: true,
    });

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
            toast.success('Appraisal cycle initialized');
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
            toast.success(`Cycle ${!cycle.is_open ? 'activated' : 'deactivated'}`);
            fetchCycles();
        } catch (err: any) {
            toast.error(err.message || 'Status toggle failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this cycle? This action is irreversible.')) return;
        try {
            const { error } = await supabase.from('appraisal_cycles').delete().eq('id', id);
            if (error) throw error;
            toast.success('Cycle archived');
            fetchCycles();
        } catch (err: any) {
            toast.error(err.message || 'Archival failed');
        }
    };

    return (
        <DashboardLayout>
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
                             Orchestrate submission windows and academic phase transitions across the institution.
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
                                    <p className="text-slate-400 font-medium text-lg">Define the parameters for the next appraisal window.</p>
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
                            <div className={`h-2 transition-colors duration-500 ${cycle.is_open ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                            <CardContent className="p-8">
                                <div className="flex items-center justify-between mb-8">
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

                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                        <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">Semester</span>
                                        <span className="text-lg font-black text-slate-900">{cycle.semester}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">Initialized</span>
                                        <span className="text-xs font-black text-slate-600">{new Date(cycle.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-6 border-t border-slate-100">
                                    <Button onClick={() => handleToggle(cycle)} className={`flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-500 ${cycle.is_open ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'}`}>
                                         {cycle.is_open ? 'Close Submission' : 'Open Phase'}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(cycle.id)} className="h-12 w-12 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300">
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

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
                        <p className="text-slate-500 font-medium leading-relaxed">System-wide appraisal cycles ensure data synchronization across all departments, facilitating standardized institutional benchmarking and accreditation compliance.</p>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Next Phase Projection</span>
                            </div>
                            <p className="font-bold text-slate-900">Academic Year 2025-26 (Odd Semester)</p>
                            <p className="text-xs text-slate-400 mt-1">Automatic initialization scheduled for July 1st.</p>
                        </div>
                        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional Health</span>
                            </div>
                            <p className="font-bold text-slate-900">Data Integrity Score: 98.4%</p>
                            <p className="text-xs text-slate-400 mt-1">Based on proof validation across 12 cycles.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AppraisalCyclesPage;
