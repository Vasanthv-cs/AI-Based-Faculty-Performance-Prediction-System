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
import FileUpload from '@/components/FileUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Pencil, Trash2, Loader2, Eye, Lock, Briefcase, Landmark, Calendar, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import FileViewer from '@/components/FileViewer';

const ProjectsConsultancy: React.FC = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { upload, isUploading, progress } = useFileUpload({ folder: 'networking' });
    const { isOpen, cycleName, isLoading: isCycleLoading } = useActiveCycle();

    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({
        type: 'Funded Project',
        title: '',
        agency: '',
        amount: '',
        duration: '',
        role: 'Principal Investigator',
        year: currentYear.toString(),
        link: '',
    });

    // Auto-score: Funded Project = 25 pts, Consultancy/Testing = 10 pts
    const calcProjectScore = (type: string): number => type === 'Funded Project' ? 25 : 10;
    const autoScore = calcProjectScore(formData.type);

    useEffect(() => {
        fetchRecords();
    }, [user]);

    const fetchRecords = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('networking_contributions')
                .select('*')
                .eq('user_id', user.id)
                .in('contribution_category', ['Funded Project', 'Consultancy'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (error: any) {
            console.warn('DB error.', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            type: 'Funded Project',
            title: '',
            agency: '',
            amount: '',
            duration: '',
            role: 'Principal Investigator',
            year: currentYear.toString(),
            link: '',
        });
        setSelectedFile(null);
        setEditingItem(null);
    };

    const handleOpenDialog = (item?: any) => {
        if (item) {
            setEditingItem(item);
            let meta: any = {};
            let mappedRole = item.role || 'Principal Investigator';
            try { 
                const j = JSON.parse(item.role);
                meta = j.metadata || {}; 
                if (j.role) mappedRole = j.role;
            } catch(e) {}
            setFormData({
                type: item.contribution_category || 'Funded Project',
                title: item.title || '',
                agency: meta.agency || '',
                amount: meta.amount?.toString() || '',
                duration: meta.duration || '',
                role: mappedRole,
                year: item.academic_year || currentYear.toString(),
                link: meta.link || '',
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
            let fileUrl = editingItem?.proof_url || null;
            if (selectedFile) {
                const result = await upload(selectedFile, user.id);
                if (result) fileUrl = result.url;
            }

            const payload = {
                user_id: user.id,
                title: formData.title,
                contribution_category: formData.type,
                academic_year: formData.year,
                role: JSON.stringify({
                    role: formData.role,
                    metadata: {
                        agency: formData.agency,
                        amount: parseFloat(formData.amount) || 0,
                        duration: formData.duration,
                        link: formData.link
                    }
                }),
                score_claimed: calcProjectScore(formData.type),
                proof_url: fileUrl
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('networking_contributions')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
                toast.success('Record updated successfully');
            } else {
                const { error } = await supabase
                    .from('networking_contributions')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Project/Consultancy added successfully');
            }

            setIsDialogOpen(false);
            fetchRecords();
            resetForm();
        } catch (error: any) {
            toast.error(error.message || 'Operation failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this record?')) return;
        try {
            const { error } = await supabase
                .from('networking_contributions')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast.success('Record removed');
            fetchRecords();
        } catch (error: any) {
            toast.error('Deletion failed');
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 animate-reveal">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-float relative group">
                        <div className="absolute inset-0 bg-white/20 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity blur-xl shadow-glow" />
                        <Briefcase className="w-10 h-10 text-primary-foreground relative z-10" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                            Funding & Industry
                        </div>
                        <h1 className="font-display text-4xl lg:text-5xl font-black mb-1 tracking-tight leading-tight text-slate-900">
                            Projects & <span className="gradient-text">Consultancy</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-sm">Monetize your expertise through funded research and industrial consultancy.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isCycleLoading && !isOpen ? (
                        <Badge variant="outline" className="h-12 px-6 rounded-2xl text-destructive border-destructive/20 bg-destructive/5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Cycle Locked
                        </Badge>
                    ) : (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog()} className="h-12 px-8 rounded-2xl bg-gradient-to-r from-primary to-accent hover:brightness-110 shadow-xl shadow-primary/20 font-bold text-base transition-all duration-300 group" disabled={isCycleLoading}>
                                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                                    Add Project
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-0">
                                <div className="bg-gradient-to-br from-primary to-accent px-8 py-10 text-primary-foreground relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                        <DollarSign className="w-32 h-32" />
                                    </div>
                                    <DialogHeader>
                                        <DialogTitle className="text-3xl font-black tracking-tight leading-none mb-2">
                                            Project <span className="opacity-80">Details</span>
                                        </DialogTitle>
                                        <p className="text-primary-foreground/70 font-medium italic">Add your funded projects and specialized industrial consultancy.</p>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type</Label>
                                            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                                <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Funded Project" className="font-bold text-primary">Major / Funded Project (Max 25)</SelectItem>
                                                    <SelectItem value="Consultancy" className="font-bold text-accent">Industrial Consultancy & Testing (Max 10)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Project Title</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter full project or consultancy name..." required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Funding Agency / Client</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.agency} onChange={(e) => setFormData({ ...formData, agency: e.target.value })} placeholder="e.g., DST, AICTE, TechCorp Inc." required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Amount (₹)</Label>
                                            <div className="relative">
                                                <Input className="h-12 rounded-xl border-border/30 bg-secondary/5 font-black text-secondary pl-10" type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/40 font-black text-xs">INR</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Timeframe / Duration</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="e.g., 24 Months" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Role</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g., Principal Investigator" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Cycle</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold text-foreground/80" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-emerald-600">Auto Score — Funded Project = 25 pts | Consultancy/Testing = 10 pts</Label>
                                            <div className="h-12 rounded-xl border-2 border-emerald-200 bg-emerald-50 font-black text-2xl text-emerald-700 flex items-center justify-center">
                                                {autoScore} pts (auto-calculated)
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reference Link <span className="text-muted-foreground/50">(optional)</span></Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://... (sanction letter, MoU, project page)" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-4 border-t border-border/50">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verification Evidence (PDF)</Label>
                                        <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-8 border-t border-border mt-8">
                                        <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                                        <Button type="submit" className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all" disabled={isSubmitting || isUploading}>
                                            {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                                            {editingItem ? 'Update' : 'Add Project'}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {!isCycleLoading && !isOpen && (
                <div className="animate-reveal delay-100">
                    <CycleLockBanner cycleName={cycleName} />
                </div>
            )}

            <div className="premium-card overflow-hidden animate-reveal delay-200">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-24 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary/40 italic animate-pulse">Loading Records...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-24 bg-muted/5">
                        <div className="w-20 h-20 bg-muted/20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                            <DollarSign className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-black text-foreground mb-2">No Records Found</h3>
                        <p className="text-muted-foreground font-medium max-w-xs mx-auto mb-8 text-sm">Register your industrial consultancy and funded projects to visualize your impact.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()} className="h-10 rounded-xl border-primary/20 text-primary font-bold hover:bg-primary/5 transition-all">
                            Add Project
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 pl-8">Project Details</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Agency & Amount</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 text-center">Score</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((item, idx) => {
                                let meta: any = {};
                                let mappedRole = item.role;
                                try { 
                                    const j = JSON.parse(item.role);
                                    meta = j.metadata || {};
                                    if (j.role) mappedRole = j.role;
                                } catch(e) {}
                                return (
                                    <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors border-border/50 animate-reveal" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <TableCell className="pl-8 py-5">
                                            <div className="flex flex-col gap-1.5">
                                                <Badge variant="outline" className={`w-fit text-[9px] h-4.5 rounded-md font-black uppercase tracking-tighter border-none px-1.5 ${item.contribution_category === 'Funded Project' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                                                    {item.contribution_category}
                                                </Badge>
                                                <div className="font-bold text-foreground text-sm tracking-tight leading-snug group-hover:text-primary transition-colors max-w-[400px]">{item.title}</div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Role: {mappedRole}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="flex flex-col gap-1 text-xs">
                                                <span className="font-bold text-muted-foreground/80 truncate max-w-[250px] italic">{meta.agency || 'Private Sponsor'}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="h-5 px-2 rounded-lg bg-secondary/10 text-secondary border-none font-black text-[9px]">₹{meta.amount || 0}</Badge>
                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/40">{item.academic_year}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-5">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="text-xl font-black text-secondary leading-none">{item.score_claimable || item.score_claimed}</div>
                                                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-1">Score</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8 py-5">
                                            <div className="flex items-center justify-end gap-2 text-nowrap">
                                                {item.proof_url && (
                                                    <a href={item.proof_url} target="_blank" rel="noopener noreferrer" title="View Agreement">
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-indigo-500 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </a>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background border border-transparent hover:border-border transition-all" onClick={() => handleOpenDialog(item)} disabled={!isOpen}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/5 border border-transparent hover:border-destructive/10 transition-all" onClick={() => handleDelete(item.id)} disabled={!isOpen}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>
        </DashboardLayout>
    );

};
export default ProjectsConsultancy;
