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
import { Plus, Book, Pencil, Trash2, Loader2, Link as LinkIcon, Lock, BookOpen, GraduationCap, ShieldCheck, Award, Library, ExternalLink } from 'lucide-react';
import FileViewer from '@/components/FileViewer';

const BooksChapters: React.FC = () => {
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
        type: 'Book',
        title: '',
        authors: '',
        publisher: '',
        isbn: '',
        link: '',
        year: currentYear.toString(),
    });

    // Auto-score: Book = 20 pts, Book Chapter = 10 pts
    const calcBookScore = (type: string): number => type === 'Book' ? 20 : 10;
    const autoScore = calcBookScore(formData.type);

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
                .in('activity_category', ['Book', 'Book Chapter'])
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
            type: 'Book',
            title: '',
            authors: '',
            publisher: '',
            isbn: '',
            link: '',
            year: currentYear.toString(),
        });
        setSelectedFile(null);
        setEditingItem(null);
    };

    const handleOpenDialog = (item?: any) => {
        if (item) {
            setEditingItem(item);
            let meta: any = {};
            let authors = '';
            try { 
                const j = JSON.parse(item.role);
                meta = j.metadata || {}; 
                authors = j.authors || '';
            } catch(e) {}
            setFormData({
                type: item.activity_category || 'Book',
                title: item.title || '',
                authors: authors,
                publisher: meta.publisher || '',
                isbn: meta.isbn || '',
                link: meta.link || '',
                year: item.academic_year || currentYear.toString(),
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
                activity_category: formData.type,
                activity_level: 'Good',
                role: JSON.stringify({
                    authors: formData.authors,
                    metadata: {
                        publisher: formData.publisher,
                        isbn: formData.isbn,
                        link: formData.link
                    }
                }),
                score_claimed: calcBookScore(formData.type),
                proof_url: documentUrl,
                status: 'pending'
            };

            if (editingItem) {
                const { error } = await supabase.from('research_activities').update(itemData).eq('id', editingItem.id);
                if (error) throw error;
                toast.success('Publication updated successfully');
            } else {
                const { error } = await supabase.from('research_activities').insert(itemData);
                if (error) throw error;
                toast.success('Publication registered successfully');
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
        if (!confirm('Are you sure you want to remove this publication?')) return;
        try {
            await supabase.from('research_activities').delete().eq('id', id);
            toast.success('Publication removed');
            fetchRecords();
        } catch (error) { toast.error('Deletion failed'); }
    };

    return (
        <DashboardLayout>
            <div className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 animate-reveal">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-float relative group">
                        <div className="absolute inset-0 bg-white/20 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity blur-xl shadow-glow" />
                        <BookOpen className="w-10 h-10 text-primary-foreground relative z-10" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                            Literary Contribution
                        </div>
                        <h1 className="font-display text-4xl lg:text-5xl font-black mb-1 tracking-tight leading-tight text-slate-900">
                            Books & <span className="gradient-text">Chapters</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                             Management of textbook authorship and specialized academic volumes.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isCycleLoading && !isOpen ? (
                        <div className="flex flex-col items-end">
                            <Badge variant="outline" className="h-12 px-6 rounded-2xl text-destructive border-destructive/20 bg-destructive/5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-inner">
                                <Lock className="w-4 h-4" /> Editing Locked
                            </Badge>
                            <span className="text-[9px] font-black text-muted-foreground/40 mt-2 uppercase tracking-tighter italic">Cycle currently finalized</span>
                        </div>
                    ) : (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 shadow-2xl shadow-emerald-500/30 font-black text-lg transition-all duration-500 hover:-translate-y-1 group" disabled={isCycleLoading}>
                                    <Plus className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                                    Register Work
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[48px] border-none shadow-2xl p-0 bg-background/95 backdrop-blur-2xl">
                                <div className="bg-gradient-to-br from-emerald-900 to-teal-900 px-10 py-14 text-white relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                                        <Library className="w-64 h-64" />
                                    </div>
                                    <DialogHeader className="relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md text-white">
                                            <Book className="w-6 h-6" />
                                        </div>
                                        <DialogTitle className="text-4xl font-black tracking-tight leading-none mb-3">
                                            Literary <span className="text-emerald-400">Archival</span>
                                        </DialogTitle>
                                        <DialogDescription className="text-emerald-200 font-medium text-lg max-w-sm">Capture your published books and specialized chapters.</DialogDescription>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleSubmit} className="p-10 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Title of the Work</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold text-lg focus:ring-emerald-500/20" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Advanced Quantum Computing Paradigms" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Work Type</Label>
                                            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/20 font-black text-emerald-600"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value="Book" className="font-bold py-3">Full Academic Book</SelectItem>
                                                    <SelectItem value="Book Chapter" className="font-bold py-3">Specialized Chapter</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Authors (CSV)</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.authors} onChange={(e) => setFormData({ ...formData, authors: e.target.value })} placeholder="Author 1, Author 2, Author 3" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Publisher</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} placeholder="e.g., Springer, Elsevier" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">ISBN / DOI</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} placeholder="978-3-16-148410-0" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Reference Link</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Academic Year</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="2024-2025" required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] ml-1 text-emerald-600">Auto Score — Book = 20 pts | Chapter = 10 pts</Label>
                                            <div className="h-14 rounded-2xl border-2 border-emerald-200 bg-emerald-50 font-black text-2xl text-emerald-700 flex items-center justify-center">
                                                {autoScore} pts (auto-calculated)
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 pt-6 border-t border-border/40">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2 mb-4">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                             Proof of Publication (Title Page / Copyright Page)
                                        </h3>
                                        <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-10 border-t border-border mt-10">
                                        <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-muted-foreground hover:bg-muted/30 transition-all uppercase tracking-widest text-xs" onClick={() => setIsDialogOpen(false)}>Discard Draft</Button>
                                        <Button type="submit" className="h-14 px-12 rounded-2xl bg-emerald-600 text-white font-black shadow-2xl shadow-emerald-500/30 hover:scale-105 transition-all duration-300 relative group overflow-hidden" disabled={isSubmitting || isUploading}>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            {isSubmitting ? (
                                                <div className="flex items-center">
                                                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                                    <span className="relative z-10">Saving...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <ShieldCheck className="w-6 h-6 mr-3" />
                                                    <span className="relative z-10">{editingItem ? 'Save Updates' : 'Add Publication'}</span>
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
                            <div className="w-20 h-20 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
                            <BookOpen className="w-8 h-8 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500/40 italic animate-pulse">Consulting Library Archives...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-32 bg-background/50 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent skew-y-12 translate-y-24 group-hover:translate-y-12 transition-transform duration-1000" />
                        <div className="w-28 h-28 bg-emerald-500/10 backdrop-blur-md rounded-[38px] flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Library className="w-12 h-12 text-emerald-500/30" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight relative z-10">Collection Empty</h3>
                        <p className="text-muted-foreground font-medium max-w-sm mx-auto mb-10 text-lg relative z-10">Your published books and chapters portfolio is currently empty. Begin by adding your first volume.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-2xl border-emerald-500/30 text-emerald-600 font-black uppercase tracking-widest text-xs hover:bg-emerald-500/5 transition-all relative z-10 shadow-xl shadow-emerald-500/10">
                            Add First Work
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-900/5 hover:bg-slate-900/5 border-none">
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 pl-10 text-emerald-600/60">Publication Title</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-emerald-600/60 text-center">Score Weight</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-emerald-600/60">Contributors & Year</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-right pr-10 text-emerald-600/60">Controls</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((item, idx) => {
                                    let meta: any = {};
                                    let authors = '';
                                    try { 
                                        const j = JSON.parse(item.role);
                                        meta = j.metadata || {}; 
                                        authors = j.authors || '';
                                    } catch(e) {}

                                    return (
                                        <TableRow key={item.id} className="group hover:bg-emerald-500/[0.02] transition-colors border-border/40 animate-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
                                            <TableCell className="pl-10 py-8">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className={`text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest border-none ${item.activity_category === 'Book' ? 'bg-emerald-600 text-white' : 'bg-teal-500 text-white'} shadow-lg group-hover:scale-110 transition-transform origin-left`}>
                                                            {item.activity_category}
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest bg-muted text-muted-foreground/60 border-none">{item.academic_year}</Badge>
                                                    </div>
                                                    <div className="font-black text-slate-900 text-lg tracking-tight leading-snug group-hover:text-emerald-600 transition-colors max-w-sm">{item.title}</div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground italic">
                                                        <Library className="w-3.5 h-3.5" />
                                                        Publisher: {meta.publisher || 'N/A'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-8">
                                                <div className="relative inline-flex flex-col items-center group/score">
                                                     <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-xl opacity-0 group-hover/score:opacity-100 transition-opacity duration-500" />
                                                    <div className="relative z-10 p-5 rounded-3xl bg-background border-2 border-emerald-500/5 flex flex-col items-center justify-center shadow-xl group-hover/score:border-emerald-500/20 group-hover/score:-translate-y-1 transition-all duration-500">
                                                        <div className="text-2xl font-black text-secondary leading-none">{item.score_claimed}</div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">Weight</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-8">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 py-1 px-3 rounded-xl bg-emerald-50 border border-emerald-100 w-fit">
                                                        <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span className="font-black text-emerald-700 uppercase tracking-widest text-[9px] truncate max-w-[120px]">{authors || 'N/A'}</span>
                                                    </div>
                                                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter flex items-center gap-1.5">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                                                        ISBN: <span className="text-slate-700">{meta.isbn || 'N/A'}</span>
                                                    </div>
                                                    {meta.link && (
                                                        <a href={meta.link} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1 font-black text-[8px] uppercase tracking-widest">
                                                            <ExternalLink className="w-2.5 h-2.5" /> Digital Access
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-10 py-8">
                                                <div className="flex items-center justify-end gap-3">
                                                    {item.proof_url && (
                                                        <FileViewer url={item.proof_url} />
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-muted/50 text-muted-foreground hover:bg-emerald-600 hover:text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-500" onClick={() => handleOpenDialog(item)} disabled={!isOpen}>
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

export default BooksChapters;
