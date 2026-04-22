import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import FileUpload from '@/components/FileUpload';
import OCRAutoFill from '@/components/OCRAutoFill';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Pencil, Trash2, Loader2, ExternalLink, Eye, Lock, Sparkles } from 'lucide-react';
import AIWritingAssistant from '@/components/dashboard/AIWritingAssistant';

const JournalsConferences: React.FC = () => {
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
        type: 'Journal',
        title: '',
        authors: '',
        venue_name: '',
        publisher: '',
        indexing: 'Scopus',
        volume: '',
        issue: '',
        pages: '',
        year: currentYear.toString(),
        issn: '',
        link: '',
    });

    // Auto-score based on type and indexing
    const calcJournalScore = (type: string, indexing: string): number => {
        if (type === 'Conference') return 10;
        // Journal
        if (indexing === 'SCI') return 25;
        if (indexing === 'Scopus' || indexing === 'WoS') return 20;
        return 10; // UGC / Others
    };
    const autoScore = calcJournalScore(formData.type, formData.indexing);

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
                .in('activity_category', ['Journal', 'Conference'])
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
            type: 'Journal',
            title: '',
            authors: '',
            venue_name: '',
            publisher: '',
            indexing: 'Scopus',
            volume: '',
            issue: '',
            pages: '',
            year: currentYear.toString(),
            issn: '',
            link: '',
        });
        setSelectedFile(null);
        setEditingItem(null);
    };

    const handleOpenDialog = (item?: any) => {
        if (item) {
            setEditingItem(item);
            let meta: any = {};
            let mappedAuthors = item.role || '';
            try { 
                const j = JSON.parse(item.role);
                meta = j.metadata || {}; 
                if (j.authors) mappedAuthors = j.authors;
            } catch(e) {}
            setFormData({
                type: item.activity_category || 'Journal',
                title: item.title || '',
                authors: mappedAuthors,
                venue_name: meta.venue_name || '',
                publisher: meta.publisher || '',
                indexing: meta.indexing || 'Scopus',
                volume: meta.volume || '',
                issue: meta.issue || '',
                pages: meta.pages || '',
                year: item.academic_year || currentYear.toString(),
                issn: meta.issn || '',
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
                activity_category: formData.type,
                activity_level: formData.indexing,
                role: JSON.stringify({
                    authors: formData.authors,
                    metadata: {
                        venue_name: formData.venue_name,
                        publisher: formData.publisher,
                        indexing: formData.indexing,
                        volume: formData.volume,
                        issue: formData.issue,
                        pages: formData.pages,
                        issn: formData.issn,
                        link: formData.link
                    }
                }),
                score_claimed: calcJournalScore(formData.type, formData.indexing),
                proof_url: documentUrl
            };

            if (editingItem) {
                const { error: dbError } = await supabase.from('research_activities').update(itemData).eq('id', editingItem.id);
                if (dbError) throw dbError;
            } else {
                const { error: dbError } = await supabase.from('research_activities').insert(itemData);
                if (dbError) throw dbError;
            }

            toast.success('Record saved successfully');
            fetchRecords();
            setIsDialogOpen(false);
            resetForm();
        } catch (err: any) {
            console.error('Save error:', err);
            toast.error(err.message || 'Failed to save record.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            await supabase.from('research_activities').delete().eq('id', id);
            toast.success('Deleted successfully');
            fetchRecords();
        } catch (error) { toast.error('Failed to delete'); }
    };

    return (
        <DashboardLayout>
            <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-reveal">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/20 animate-float">
                        <BookOpen className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-display text-4xl font-black mb-1 tracking-tight">
                            Journals & <span className="gradient-text">Conferences</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-sm">Document your peer-reviewed publications and conference proceedings.</p>
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
                                    Add Record
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-0">
                                <div className="bg-gradient-to-br from-primary to-accent px-8 py-10 text-primary-foreground relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                        <BookOpen className="w-32 h-32" />
                                    </div>
                                    <DialogHeader>
                                        <DialogTitle className="text-3xl font-black tracking-tight leading-none mb-2">
                                            New <span className="opacity-80">Publication</span>
                                        </DialogTitle>
                                        <p className="text-primary-foreground/70 font-medium italic">Add details about your research paper or conference proceeding.</p>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Type</Label>
                                            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                                <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold text-foreground/80"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Journal" className="font-bold">Journal Publication</SelectItem>
                                                    <SelectItem value="Conference" className="font-bold">Conference Proceeding</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Indexing</Label>
                                            <Select value={formData.indexing} onValueChange={(val) => setFormData({ ...formData, indexing: val })}>
                                                <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold text-foreground/80"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SCI" className="font-bold text-primary">SCI / SCIE Indexed (Tier 1)</SelectItem>
                                                    <SelectItem value="Scopus" className="font-bold text-accent">Scopus / WoS (Tier 2)</SelectItem>
                                                    <SelectItem value="UGC Care" className="font-bold">UGC Care Listed</SelectItem>
                                                    <SelectItem value="Other" className="font-bold">Other International</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Paper Title</Label>
                                            <div className="relative">
                                                <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium pr-24" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Full title of the research paper..." required />
                                                <AIWritingAssistant 
                                                    value={formData.title} 
                                                    onSelect={(val) => setFormData({ ...formData, title: val })}
                                                    type="title"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Authors</Label>
                                            <div className="relative">
                                                <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium pr-24" value={formData.authors} onChange={(e) => setFormData({ ...formData, authors: e.target.value })} placeholder="Highlight First and Corresponding authors..." required />
                                                <AIWritingAssistant 
                                                    value={formData.authors} 
                                                    onSelect={(val) => setFormData({ ...formData, authors: val })}
                                                    type="authors"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Journal/Conference Name</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.venue_name} onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })} placeholder="Official name of the publication venue..." required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Publisher House</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} placeholder="e.g., IEEE, Elsevier, Springer" />
                                        </div>
                                        
                                        {formData.type === 'Journal' && (
                                            <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-muted-foreground/60 ml-1 tracking-tighter">Volume</Label>
                                                    <Input className="h-10 rounded-lg border-border/50 bg-muted/10 font-bold" value={formData.volume} onChange={(e) => setFormData({ ...formData, volume: e.target.value })} placeholder="Vol" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-muted-foreground/60 ml-1 tracking-tighter">Issue</Label>
                                                    <Input className="h-10 rounded-lg border-border/50 bg-muted/10 font-bold" value={formData.issue} onChange={(e) => setFormData({ ...formData, issue: e.target.value })} placeholder="Issue" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[9px] font-black uppercase text-muted-foreground/60 ml-1 tracking-tighter">Page Range</Label>
                                                    <Input className="h-10 rounded-lg border-border/50 bg-muted/10 font-bold" value={formData.pages} onChange={(e) => setFormData({ ...formData, pages: e.target.value })} placeholder="e.g. 12-45" />
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Cycle</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold text-foreground/80" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="2024-2025" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ISSN / Unique ID</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.issn} onChange={(e) => setFormData({ ...formData, issn: e.target.value })} placeholder="Enter ISSN or ISSN-L..." />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">DOI / Resource URI</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://doi.org/ or direct link..." />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">
                                                Auto Score — {formData.type === 'Conference' ? 'Conference: 10 pts' : `Journal (${formData.indexing}): SCI=25 | Scopus/WoS=20 | UGC/Others=10`}
                                            </Label>
                                            <div className="h-12 rounded-xl border-2 border-emerald-200 bg-emerald-50 font-black text-2xl text-emerald-700 flex items-center justify-center">
                                                {autoScore} pts (auto-calculated)
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-4 border-t border-border/50">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Attached Evidence (PDF / Image)</Label>
                                        <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                                        <OCRAutoFill
                                            file={selectedFile}
                                            docType={formData.type === 'Conference' ? 'conference' : 'journal'}
                                            accentColor="blue"
                                            onFieldsExtracted={(fields) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    title: fields.title || prev.title,
                                                    authors: fields.authors || prev.authors,
                                                    venue_name: fields.journal_name || fields.conference_name || prev.venue_name,
                                                    publisher: fields.publisher || prev.publisher,
                                                    volume: fields.volume || prev.volume,
                                                    issue: fields.issue || prev.issue,
                                                    pages: fields.pages || prev.pages,
                                                    issn: fields.issn || prev.issn,
                                                    link: fields.doi ? `https://doi.org/${fields.doi}` : prev.link,
                                                    year: fields.year || prev.year,
                                                }));
                                            }}
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-8 border-t border-border mt-8">
                                        <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit" className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all" disabled={isSubmitting || isUploading}>
                                            {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                                            {editingItem ? 'Update' : 'Add'}
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
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40 italic">Loading Records...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-24 bg-muted/5">
                        <div className="w-20 h-20 bg-muted/20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-black text-foreground mb-2">Portfolio Empty</h3>
                        <p className="text-muted-foreground font-medium max-w-xs mx-auto mb-8 text-sm">You haven't added any journals or conference papers to your research portfolio yet.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()} className="h-10 rounded-xl border-primary/20 text-primary font-bold hover:bg-primary/5 transition-all">
                            Add Record
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 pl-8">Publication Details</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Year & Publisher</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 text-center">Score</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((item, idx) => {
                                let meta: any = {};
                                try { meta = JSON.parse(item.role).metadata || {}; } catch(e) {}
                                return (
                                    <TableRow key={item.id} className="group hover:bg-muted/10 transition-colors border-border/50 animate-reveal" style={{ animationDelay: `${idx * 50}ms` }}>
                                        <TableCell className="pl-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-[18px] bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-inner">
                                                    <BookOpen className="w-6 h-6 text-primary opacity-60" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] uppercase font-black text-primary/60 tracking-wider mb-1">
                                                        {item.activity_category} • {meta.indexing || 'INDEXED'}
                                                    </div>
                                                    <div className="font-bold text-foreground text-sm tracking-tight leading-tight max-w-sm group-hover:text-primary transition-colors">{item.title}</div>
                                                    <div className="text-[10px] font-medium text-muted-foreground/60 italic mt-1">{meta.venue_name || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-[9px] h-5 px-2 rounded-lg font-black uppercase tracking-tighter bg-muted/50 border-none text-muted-foreground">{item.academic_year}</Badge>
                                                    <span className="text-xs font-bold text-muted-foreground/80 truncate max-w-[150px] italic">{meta.publisher || 'Independent'}</span>
                                                </div>
                                                <div className="text-[9px] font-black text-muted-foreground/50 flex items-center gap-3">
                                                    <span className="uppercase tracking-[0.1em]">ISSN: {meta.issn || 'N/A'}</span>
                                                    {meta.link && (
                                                        <a href={meta.link} target="_blank" rel="noreferrer" className="text-secondary hover:text-primary transition-colors flex items-center gap-1 font-black">
                                                            <ExternalLink className="w-3 h-3" /> VIEW LINK
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-5">
                                            <div className="inline-flex flex-col items-center">
                                                <div className="text-xl font-black text-secondary leading-none">{item.score_claimed}</div>
                                                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mt-1">PTS</div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap pr-8 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                {item.proof_url && (
                                                    <a href={item.proof_url} target="_blank" rel="noopener noreferrer" title="View Manuscript">
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
export default JournalsConferences;
