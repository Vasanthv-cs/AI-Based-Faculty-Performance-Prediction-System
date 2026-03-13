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
import { Award, Plus, Loader2, Pencil, Trash2, Lock, Calendar, ShieldCheck, Compass, Sparkles, Flag, MapPin, ExternalLink } from 'lucide-react';
import FileViewer from '@/components/FileViewer';

const EventsContributions: React.FC = () => {
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
        type: 'Organized Event',
        title: '',
        level: 'Institution Level',
        date: '',
        venue: '',
        year: currentYear.toString(),
        link: '',
    });

    // Auto-score: Organized Event/Workshop = 25 pts, Institution Contribution = 30 pts
    const calcEventScore = (type: string): number => type === 'Institution Contribution' ? 30 : 25;
    const autoScore = calcEventScore(formData.type);

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
                .in('contribution_category', ['Organized Event', 'Institution Contribution'])
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
            type: 'Organized Event',
            title: '',
            level: 'Institution Level',
            date: '',
            venue: '',
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
            try { meta = JSON.parse(item.role).metadata || {}; } catch(e) {}
            setFormData({
                type: item.contribution_category || 'Organized Event',
                title: item.title || '',
                level: item.contribution_level || 'Institution Level',
                date: meta.date || '',
                venue: meta.venue || '',
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
            let documentUrl = editingItem?.proof_url || null;
            if (selectedFile) {
                const result = await upload(selectedFile, user.id);
                if (result) documentUrl = result.url;
            }

            const itemData: any = {
                user_id: user.id,
                title: formData.title,
                academic_year: formData.year,
                contribution_category: formData.type,
                contribution_level: formData.level,
                role: JSON.stringify({ metadata: { date: formData.date, venue: formData.venue, link: formData.link } }),
                score_claimed: calcEventScore(formData.type),
                proof_url: documentUrl,
                status: 'pending'
            };

            if (editingItem) {
                const { error } = await supabase.from('networking_contributions').update(itemData).eq('id', editingItem.id);
                if (error) throw error;
                toast.success('Record updated successfully');
            } else {
                const { error } = await supabase.from('networking_contributions').insert(itemData);
                if (error) throw error;
                toast.success('Record added successfully');
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
        if (!confirm('Permanently remove this event record?')) return;
        try {
            await supabase.from('networking_contributions').delete().eq('id', id);
            toast.success('Record removed');
            fetchRecords();
        } catch (error: any) { toast.error('Deletion failed'); }
    };

    return (
        <DashboardLayout>
            <div className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 animate-reveal">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/30 animate-float relative group">
                        <div className="absolute inset-0 bg-white/20 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity blur-xl shadow-glow" />
                        <Compass className="w-10 h-10 text-primary-foreground relative z-10" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                            Networking & Stewardship
                        </div>
                        <h1 className="font-display text-4xl lg:text-5xl font-black mb-1 tracking-tight leading-tight text-slate-900">
                            Events & <span className="gradient-text">Contributions</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2 italic">
                            Showcase your institutional leadership and event orchestration.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isCycleLoading && !isOpen ? (
                        <div className="flex flex-col items-end">
                            <Badge variant="outline" className="h-12 px-6 rounded-2xl text-destructive border-destructive/20 bg-destructive/5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-inner">
                                <Lock className="w-4 h-4" /> Locked
                            </Badge>
                             <span className="text-[9px] font-black text-muted-foreground/40 mt-2 uppercase tracking-tighter italic">Submission period ended</span>
                        </div>
                    ) : (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 shadow-2xl shadow-orange-500/30 font-black text-lg transition-all duration-500 hover:-translate-y-1 group" disabled={isCycleLoading}>
                                    <Plus className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                                    Add Activity
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[48px] border-none shadow-2xl p-0 bg-background/95 backdrop-blur-2xl">
                                <div className="bg-gradient-to-br from-amber-900 to-orange-900 px-10 py-14 text-white relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                                        <Sparkles className="w-64 h-64" />
                                    </div>
                                    <DialogHeader className="relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md text-white">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <DialogTitle className="text-4xl font-black tracking-tight leading-none mb-3">
                                            Activity <span className="text-amber-400">Details</span>
                                        </DialogTitle>
                                        <DialogDescription className="text-amber-200 font-medium text-lg max-w-sm italic">Add details about your events and institutional activities.</DialogDescription>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleSubmit} className="p-10 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Event or Active Title</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold text-lg focus:ring-orange-500/20" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Coordinator of TechFest 2024" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Type</Label>
                                            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/20 font-black text-orange-600"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value="Organized Event" className="font-bold py-3">Event Organization</SelectItem>
                                                    <SelectItem value="Institution Contribution" className="font-bold py-3">Institutional Service</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Level</Label>
                                            <Select value={formData.level} onValueChange={(val) => setFormData({ ...formData, level: val })}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-background font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="National/International" className="font-bold">National / International</SelectItem>
                                                    <SelectItem value="State/University Level" className="font-bold">State / University</SelectItem>
                                                    <SelectItem value="Institution Level" className="font-bold">Institution Level</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Event Date</Label>
                                            <Input type="date" className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Academic Year</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="2024-2025" required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Venue / Organizer</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} placeholder="e.g. College Auditorium, Department of CSE" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-emerald-600">Auto Score — Organized Event/Workshop = 25 pts | Institution Contribution = 30 pts</Label>
                                            <div className="h-14 rounded-2xl border-2 border-emerald-200 bg-emerald-50 font-black text-2xl text-emerald-700 flex items-center justify-center">
                                                {autoScore} pts (auto-calculated)
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Reference Link <span className="text-muted-foreground/50">(optional)</span></Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-medium" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://... (event page, report, notice)" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 pt-6 border-t border-border/40">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                             Evidence (Certificates / Order copies)
                                        </h3>
                                        <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-10 border-t border-border mt-10">
                                        <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-muted-foreground hover:bg-muted/30 transition-all uppercase tracking-widest text-xs" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit" className="h-14 px-12 rounded-2xl bg-orange-600 text-white font-black shadow-2xl shadow-orange-500/30 hover:scale-105 transition-all duration-300 relative group overflow-hidden" disabled={isSubmitting || isUploading}>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            {isSubmitting ? (
                                                <div className="flex items-center">
                                                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                                    <span className="relative z-10">Saving...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <ShieldCheck className="w-6 h-6 mr-3" />
                                                    <span className="relative z-10">{editingItem ? 'Update' : 'Add Record'}</span>
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
                            <div className="w-20 h-20 rounded-full border-4 border-orange-500/10 border-t-orange-500 animate-spin" />
                            <Calendar className="w-8 h-8 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-500/40 italic animate-pulse">Loading Records...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-32 bg-background/50 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent skew-y-12 translate-y-24 group-hover:translate-y-12 transition-transform duration-1000" />
                        <div className="w-28 h-28 bg-orange-500/10 backdrop-blur-md rounded-[38px] flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Flag className="w-12 h-12 text-orange-500/30" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight relative z-10">No Records Found</h3>
                        <p className="text-muted-foreground font-medium max-w-sm mx-auto mb-10 text-lg relative z-10">No institutional contributions recorded yet. Begin mapping your leadership journey.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-2xl border-orange-500/30 text-orange-600 font-black uppercase tracking-widest text-xs hover:bg-orange-500/5 transition-all relative z-10 shadow-xl shadow-orange-500/10">
                            Add Activity
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-900/5 hover:bg-slate-900/5 border-none">
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 pl-10 text-orange-600/60">Event Name</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-orange-600/60 text-center">Score</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-orange-600/60">Level & Date</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-right pr-10 text-orange-600/60">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((item, idx) => {
                                    let meta: any = {};
                                    try { meta = JSON.parse(item.role).metadata || {}; } catch(e) {}

                                    return (
                                        <TableRow key={item.id} className="group hover:bg-orange-500/[0.02] transition-colors border-border/40 animate-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
                                            <TableCell className="pl-10 py-8">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest border-none ${item.contribution_category === 'Organized Event' ? 'bg-orange-600 text-white' : 'bg-amber-500 text-white'} shadow-lg group-hover:scale-110 transition-transform origin-left`}>
                                                            {item.contribution_category}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest bg-muted text-muted-foreground/60 border-none">{item.academic_year}</Badge>
                                                    </div>
                                                    <div className="font-black text-slate-900 text-lg tracking-tight leading-snug group-hover:text-orange-600 transition-colors max-w-sm">{item.title}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-8">
                                                <div className="relative inline-flex flex-col items-center group/score">
                                                     <div className="absolute inset-0 bg-orange-500/10 rounded-3xl blur-xl opacity-0 group-hover/score:opacity-100 transition-opacity duration-500" />
                                                    <div className="relative z-10 p-5 rounded-3xl bg-background border-2 border-orange-500/5 flex flex-col items-center justify-center shadow-xl group-hover/score:border-orange-500/20 group-hover/score:-translate-y-1 transition-all duration-500 min-w-[80px]">
                                                        <div className="text-2xl font-black text-secondary leading-none">{item.score_claimed}</div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">Score</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-8">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 py-1 px-3 rounded-xl bg-orange-50 border border-orange-100 w-fit">
                                                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                                                        <span className="font-black text-orange-700 uppercase tracking-widest text-[9px] truncate max-w-[120px]">{item.contribution_level}</span>
                                                    </div>
                                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter flex items-center gap-1.5 px-1 mt-1">
                                                        <Calendar className="w-3.5 h-3.5 text-orange-300" />
                                                        Timestamp: <span className="text-slate-700">{meta.date || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-10 py-8">
                                                <div className="flex items-center justify-end gap-3">
                                                    {item.proof_url && (
                                                        <FileViewer url={item.proof_url} />
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-muted/50 text-muted-foreground hover:bg-orange-600 hover:text-white hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-500" onClick={() => handleOpenDialog(item)} disabled={!isOpen}>
                                                        <Pencil className="w-5 h-5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white hover:shadow-lg hover:shadow-destructive/20 transition-all duration-500" onClick={() => handleDelete(item.id)} disabled={!isOpen}>
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default EventsContributions;
