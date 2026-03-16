import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, FileText, Pencil, Trash2, Loader2, Link as LinkIcon, Lock, ShieldCheck, Award, GraduationCap, Microscope, Rocket, Globe, Zap } from 'lucide-react';
import FileViewer from '@/components/FileViewer';
import FileUpload from '@/components/FileUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { Badge } from '@/components/ui/badge';

const ResearchActivities: React.FC = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const { upload, isUploading, progress } = useFileUpload({ folder: 'research' });
    const { isOpen, cycleName, isLoading: isCycleLoading } = useActiveCycle();

    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({
        academic_year: `${currentYear}-${currentYear + 1}`,
        title: '',
        activity_category: 'Journal',
        activity_level: 'Good',
        role: 'First Author',
        score_claimed: '0',
    });

    useEffect(() => {
        fetchRecords();
    }, [user]);

    const fetchRecords = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('research_activities')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (error: any) {
            console.warn('Network or DB error.', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            academic_year: `${currentYear}-${currentYear + 1}`,
            title: '',
            activity_category: 'Journal',
            activity_level: 'Good',
            role: 'First Author',
            score_claimed: '0',
        });
        setSelectedFile(null);
        setEditingItem(null);
    };

    const handleOpenDialog = (item?: any) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                academic_year: item.academic_year || `${currentYear}-${currentYear + 1}`,
                title: item.title || '',
                activity_category: item.activity_category || 'Journal',
                activity_level: item.activity_level || 'Good',
                role: item.role || 'First Author',
                score_claimed: item.score_claimed?.toString() || '0',
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        try {
            let documentUrl = editingItem?.proof_url || null;

            if (selectedFile) {
                const result = await upload(selectedFile, user.id);
                if (result) documentUrl = result.url;
            }

            const itemData: any = {
                user_id: user.id,
                academic_year: formData.academic_year,
                title: formData.title,
                activity_category: formData.activity_category,
                activity_level: formData.activity_level,
                role: formData.role,
                score_claimed: Number(formData.score_claimed),
                proof_url: documentUrl
            };

            if (editingItem) {
                const { error } = await supabase.from('research_activities').update(itemData).eq('id', editingItem.id);
                if (error) throw error;
                toast.success('Record updated successfully');
            } else {
                const { error } = await supabase.from('research_activities').insert(itemData);
                if (error) throw error;
                toast.success('Record added successfully');
            }

            fetchRecords();
            setIsDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save record.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this research record?')) return;
        try {
            await supabase.from('research_activities').delete().eq('id', id);
            toast.success('Record deleted successfully');
            fetchRecords();
        } catch (error: any) { toast.error('Failed to delete'); }
    };

    return (
        <DashboardLayout>
            <div className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 animate-reveal">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-float relative group">
                        <div className="absolute inset-0 bg-white/20 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity blur-xl shadow-glow" />
                        <Microscope className="w-10 h-10 text-primary-foreground relative z-10" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                            Scholarly Output
                        </div>
                        <h1 className="font-display text-4xl lg:text-5xl font-black mb-1 tracking-tight leading-tight text-slate-900">
                            Research <span className="gradient-text">Activities</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2 italic">
                             Comprehensive journal of your academic milestones and technical contributions.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isCycleLoading && !isOpen ? (
                        <div className="flex flex-col items-end">
                            <Badge variant="outline" className="h-12 px-6 rounded-2xl text-destructive border-destructive/20 bg-destructive/5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-inner">
                                <Lock className="w-4 h-4" /> Locked
                            </Badge>
                            <span className="text-[9px] font-black text-muted-foreground/40 mt-2 uppercase tracking-tighter">Appraisal period restricted</span>
                        </div>
                    ) : (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 shadow-2xl shadow-indigo-500/30 font-black text-lg transition-all duration-500 hover:-translate-y-1 group" disabled={isCycleLoading}>
                                    <Plus className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                                    New Record
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-[48px] border-none shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-2xl">
                                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 px-10 py-14 text-white relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                                        <Rocket className="w-64 h-64" />
                                    </div>
                                    <DialogHeader className="relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md">
                                            <Globe className="w-6 h-6 text-indigo-400" />
                                        </div>
                                        <DialogTitle className="text-4xl font-black tracking-tight leading-none mb-3 drop-shadow-sm">
                                            Activity <span className="text-indigo-400">Details</span>
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-400 font-medium text-lg max-w-sm italic">Catalogue your technical milestones and peer-reviewed outputs.</DialogDescription>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleSubmit} className="p-10 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Title of Contribution</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold text-lg focus:ring-indigo-500/20" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Architectural Patterns in Edge Computing" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type of Output</Label>
                                            <Select value={formData.activity_category} onValueChange={(val) => setFormData({ ...formData, activity_category: val })}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/20 font-black text-indigo-600"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl font-bold">
                                                    <SelectItem value="Journal" className="py-3">Peer-Reviewed Journal</SelectItem>
                                                    <SelectItem value="Conference" className="py-3">Academic Conference</SelectItem>
                                                    <SelectItem value="Book" className="py-3">Book Publication</SelectItem>
                                                    <SelectItem value="Patent" className="py-3">Intellectual Property / Patent</SelectItem>
                                                    <SelectItem value="Other" className="py-3">Specialized Workshop/Activity</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Impact Designation</Label>
                                            <Select value={formData.activity_level} onValueChange={(val) => setFormData({ ...formData, activity_level: val })}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-background font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl font-bold">
                                                    <SelectItem value="Excellent" className="py-3">Tier-1 / High Impact</SelectItem>
                                                    <SelectItem value="Very Good" className="py-3">Tier-2 / Validated</SelectItem>
                                                    <SelectItem value="Good" className="py-3">Tier-3 / Accredited</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Primary Role</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. First Author, Lead Investigator" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Cycle</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} placeholder="2024-2025" required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Claimed Assessment Points</Label>
                                            <Input type="number" className="h-14 rounded-2xl border-border bg-indigo-50 font-black text-2xl text-indigo-700" value={formData.score_claimed} onChange={(e) => setFormData({ ...formData, score_claimed: e.target.value })} required />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 pt-6 border-t border-border/40">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                             Supporting Documentation
                                        </h3>
                                        <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-10 border-t border-border mt-10">
                                        <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-muted-foreground hover:bg-muted/30 transition-all uppercase tracking-widest text-xs" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                                        <Button type="submit" className="h-14 px-12 rounded-2xl bg-indigo-600 text-white font-black shadow-2xl shadow-indigo-500/30 hover:scale-105 transition-all duration-300 relative group overflow-hidden" disabled={isSubmitting || isUploading}>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            {isSubmitting ? (
                                                <div className="flex items-center">
                                                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                                    <span className="relative z-10">Syncing...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <Rocket className="w-6 h-6 mr-3" />
                                                    <span className="relative z-10">{editingItem ? 'Save Updates' : 'Save Publication'}</span>
                                                </div>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {!isCycleLoading && !isOpen && (
                <div className="animate-reveal delay-100 mb-8">
                    <CycleLockBanner cycleName={cycleName} />
                </div>
            )}

            <div className="premium-card overflow-hidden animate-reveal delay-200 border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-background/50 backdrop-blur-xl">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-32 gap-6 bg-background/50 backdrop-blur-xl">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                            <Award className="w-8 h-8 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-indigo-500/40 italic animate-pulse">Analyzing Research Assets...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-32 bg-background/50 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent skew-y-12 translate-y-24 group-hover:translate-y-12 transition-transform duration-1000" />
                        <div className="w-28 h-28 bg-indigo-500/10 backdrop-blur-md rounded-[38px] flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Zap className="w-12 h-12 text-indigo-500/30" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight relative z-10">Collection Vacant</h3>
                        <p className="text-muted-foreground font-medium max-w-sm mx-auto mb-10 text-lg relative z-10">No research activities mapped to your profile yet. Start by logging your latest scholarly work.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-2xl border-indigo-500/30 text-indigo-600 font-black uppercase tracking-widest text-xs hover:bg-indigo-500/5 transition-all relative z-10 shadow-xl shadow-indigo-500/10">
                            Initialize Portfolio
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-900/5 hover:bg-slate-900/5 border-none">
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 pl-10 text-indigo-600/60">Research Descriptor</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-indigo-600/60 text-center">Score Weight</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-indigo-600/60">Engagement & Scope</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-right pr-10 text-indigo-600/60">Controls</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((item, idx) => (
                                    <TableRow key={item.id} className="group hover:bg-indigo-500/[0.02] transition-colors border-border/40 animate-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
                                        <TableCell className="pl-10 py-8">
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest border-none bg-indigo-600 text-white shadow-lg group-hover:scale-110 transition-transform origin-left">
                                                        {item.activity_category}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest bg-muted text-muted-foreground/60 border-none">{item.academic_year}</Badge>
                                                </div>
                                                <div className="font-black text-slate-900 text-lg tracking-tight leading-snug group-hover:text-indigo-600 transition-colors max-w-sm">{item.title}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-8">
                                            <div className="relative inline-flex flex-col items-center group/score">
                                                 <div className="absolute inset-0 bg-indigo-500/10 rounded-3xl blur-xl opacity-0 group-hover/score:opacity-100 transition-opacity duration-500" />
                                                <div className="relative z-10 p-5 rounded-3xl bg-background border-2 border-indigo-500/5 flex flex-col items-center justify-center shadow-xl group-hover/score:border-indigo-500/20 group-hover/score:-translate-y-1 transition-all duration-500 min-w-[80px]">
                                                    <div className="text-2xl font-black text-secondary leading-none">{item.score_claimed}</div>
                                                    <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">Impact</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-8">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 py-1 px-3 rounded-xl bg-indigo-50 border border-indigo-100 w-fit">
                                                    <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span className="font-black text-indigo-700 uppercase tracking-widest text-[9px] truncate max-w-[120px]">{item.role}</span>
                                                </div>
                                                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter flex items-center gap-1.5 px-1 mt-1">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                                                    Quality Tier: <span className="text-slate-700">{item.activity_level}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-10 py-8">
                                            <div className="flex items-center justify-end gap-3">
                                                {item.proof_url && (
                                                    <FileViewer url={item.proof_url} />
                                                )}
                                                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-muted/50 text-muted-foreground hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-500" onClick={() => handleOpenDialog(item)} disabled={!isOpen}>
                                                    <Pencil className="w-5 h-5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white hover:shadow-lg hover:shadow-destructive/20 transition-all duration-500" onClick={() => handleDelete(item.id)} disabled={!isOpen}>
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default ResearchActivities;
