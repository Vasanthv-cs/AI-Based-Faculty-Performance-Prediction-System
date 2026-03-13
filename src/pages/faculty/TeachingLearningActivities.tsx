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
import { Plus, GraduationCap, Pencil, Trash2, Loader2, Link as LinkIcon, ExternalLink, X, Lock, Award, Lightbulb, ShieldCheck, Microscope, Layers, BookOpen, Presentation, Users, UserCheck } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { Badge } from '@/components/ui/badge';
import FileViewer from '@/components/FileViewer';
import FeedbackAnalyzer from '@/components/dashboard/FeedbackAnalyzer';
import AIWritingAssistant from '@/components/dashboard/AIWritingAssistant';

interface ResourceLink {
    title: string;
    url: string;
}

// ── Scoring helpers ──────────────────────────────────────────────────────────
const calcPercentageScore = (pct: number): number => {
    if (pct >= 96) return 5;
    if (pct >= 91) return 4;
    if (pct >= 81) return 3;
    if (pct >= 70) return 2;
    return 0;
};
const calcLevelScore = (level: string, max: number): number => {
    if (max === 10) {
        if (level === 'Excellent') return 10;
        if (level === 'Very Good') return 8;
        return 6; // Good
    }
    if (max === 25) {
        if (level === 'Excellent') return 25;
        if (level === 'Very Good') return 15;
        return 10; // Good
    }
    return 0;
};
// ─────────────────────────────────────────────────────────────────────────────

const TeachingLearningActivities: React.FC = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>([]);
    const { isOpen, cycleName, isLoading: isCycleLoading } = useActiveCycle();

    const { upload, isUploading, progress } = useFileUpload({ folder: 'teaching_learning' });

    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({
        academic_year: `${currentYear}-${currentYear + 1}`,
        semester: 'Odd',
        subject_pass_percentage: '0',
        student_feedback_percentage: '0',
        instruction_material_level: 'Good',
        pedagogy_level: 'Good',
        learners_action_level: 'Good',
        visits_lectures_level: 'Good',
    });

    // Derived auto-scores (computed, not stored separately in state)
    const autoScores = {
        subject_pass_score: calcPercentageScore(Number(formData.subject_pass_percentage)),
        student_feedback_score: calcPercentageScore(Number(formData.student_feedback_percentage)),
        instruction_material_score: calcLevelScore(formData.instruction_material_level, 10),
        pedagogy_score: calcLevelScore(formData.pedagogy_level, 10),
        learners_action_score: calcLevelScore(formData.learners_action_level, 10),
        visits_lectures_score: calcLevelScore(formData.visits_lectures_level, 10),
    };
    const totalAutoScore = Object.values(autoScores).reduce((a, b) => a + b, 0);

    useEffect(() => {
        fetchRecords();
    }, [user]);

    const fetchRecords = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('teaching_learning_activities')
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
            semester: 'Odd',
            subject_pass_percentage: '0',
            student_feedback_percentage: '0',
            instruction_material_level: 'Good',
            pedagogy_level: 'Good',
            learners_action_level: 'Good',
            visits_lectures_level: 'Good',
        });
        setSelectedFile(null);
        setEditingItem(null);
        setResourceLinks([]);
    };

    const handleOpenDialog = (item?: any) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                academic_year: item.academic_year,
                semester: item.semester,
                subject_pass_percentage: item.subject_pass_percentage?.toString() || '0',
                student_feedback_percentage: item.student_feedback_percentage?.toString() || '0',
                instruction_material_level: item.instruction_material_level || 'Good',
                pedagogy_level: item.pedagogy_level || 'Good',
                learners_action_level: item.learners_action_level || 'Good',
                visits_lectures_level: item.visits_lectures_level || 'Good',
            });
            try {
                const meta = JSON.parse(item.role || '{}');
                setResourceLinks(meta.links || []);
            } catch (e) {
                setResourceLinks([]);
            }
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const addResourceLink = () => setResourceLinks([...resourceLinks, { title: '', url: '' }]);
    const removeResourceLink = (index: number) => setResourceLinks(resourceLinks.filter((_, i) => i !== index));
    const updateResourceLink = (index: number, field: 'title' | 'url', value: string) => {
        const newLinks = [...resourceLinks];
        newLinks[index][field] = value;
        setResourceLinks(newLinks);
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

            const validLinks = resourceLinks.filter(l => l.title.trim() && l.url.trim());

            // Auto-calculate scores from rubric
            const s = {
                subject_pass_score: calcPercentageScore(Number(formData.subject_pass_percentage)),
                student_feedback_score: calcPercentageScore(Number(formData.student_feedback_percentage)),
                instruction_material_score: calcLevelScore(formData.instruction_material_level, 10),
                pedagogy_score: calcLevelScore(formData.pedagogy_level, 10),
                learners_action_score: calcLevelScore(formData.learners_action_level, 10),
                visits_lectures_score: calcLevelScore(formData.visits_lectures_level, 10),
            };

            const itemData: any = {
                user_id: user.id,
                academic_year: formData.academic_year,
                semester: formData.semester,
                subject_pass_percentage: Number(formData.subject_pass_percentage),
                subject_pass_score: s.subject_pass_score,
                student_feedback_percentage: Number(formData.student_feedback_percentage),
                student_feedback_score: s.student_feedback_score,
                instruction_material_level: formData.instruction_material_level,
                instruction_material_score: s.instruction_material_score,
                pedagogy_level: formData.pedagogy_level,
                pedagogy_score: s.pedagogy_score,
                learners_action_level: formData.learners_action_level,
                learners_action_score: s.learners_action_score,
                visits_lectures_level: formData.visits_lectures_level,
                visits_lectures_score: s.visits_lectures_score,
                proof_url: documentUrl,
                role: JSON.stringify({ links: validLinks }),
            };

            if (editingItem) {
                const { error: dbError } = await supabase.from('teaching_learning_activities').update(itemData).eq('id', editingItem.id);
                if (dbError) throw dbError;
                toast.success('Record updated successfully');
            } else {
                const { error: dbError } = await supabase.from('teaching_learning_activities').insert(itemData);
                if (dbError) throw dbError;
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
        if (!confirm('Are you sure you want to delete this record?')) return;
        try {
            await supabase.from('teaching_learning_activities').delete().eq('id', id);
            toast.success('Record deleted');
            fetchRecords();
        } catch (error: any) { toast.error('Failed to delete'); }
    };

    return (
        <DashboardLayout>
            <div className="mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8 animate-reveal">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-purple-500/30 animate-float relative group">
                        <div className="absolute inset-0 bg-white/20 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity blur-xl shadow-glow" />
                        <GraduationCap className="w-10 h-10 text-primary-foreground relative z-10" />
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                            Teaching Details
                        </div>
                        <h1 className="font-display text-4xl lg:text-5xl font-black mb-1 tracking-tight leading-tight text-slate-900">
                            Teaching & <span className="gradient-text">Learning</span>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2 italic">
                            Track your teaching performance and activities.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!isCycleLoading && !isOpen ? (
                        <div className="flex flex-col items-end">
                            <Badge variant="outline" className="h-12 px-6 rounded-2xl text-destructive border-destructive/20 bg-destructive/5 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-inner">
                                <Lock className="w-4 h-4" /> Finalized
                            </Badge>
                             <span className="text-[9px] font-black text-muted-foreground/40 mt-2 uppercase tracking-tighter italic">Cycle data protected</span>
                        </div>
                    ) : (
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-3xl bg-gradient-to-r from-violet-600 to-purple-600 hover:brightness-110 shadow-2xl shadow-purple-500/30 font-black text-lg transition-all duration-500 hover:-translate-y-1 group" disabled={isCycleLoading}>
                                    <Plus className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                                    Add Record
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto rounded-[48px] border-none shadow-2xl p-0 bg-background/95 backdrop-blur-2xl">
                                <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-purple-950 px-10 py-14 text-white relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                                        <Presentation className="w-64 h-64" />
                                    </div>
                                    <DialogHeader className="relative z-10">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md text-white">
                                            <Lightbulb className="w-6 h-6" />
                                        </div>
                                        <DialogTitle className="text-4xl font-black tracking-tight leading-none mb-3">
                                            New <span className="text-purple-400">Activity</span>
                                        </DialogTitle>
                                        <DialogDescription className="text-purple-200 font-medium text-lg max-w-sm italic">Add details about your teaching activity for the semester.</DialogDescription>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleSubmit} className="p-10 space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                        <div className="space-y-2 lg:col-span-1">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Academic Cycle</Label>
                                            <Input className="h-14 rounded-2xl border-border bg-background font-bold" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} placeholder="2024-2025" required />
                                        </div>
                                        <div className="space-y-2 lg:col-span-1">
                                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Semester</Label>
                                            <Select value={formData.semester} onValueChange={(val) => setFormData({ ...formData, semester: val })}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-muted/20 font-black text-purple-600"><SelectValue /></SelectTrigger>
                                                <SelectContent className="rounded-2xl border-none shadow-2xl">
                                                    <SelectItem value="Odd" className="font-bold py-3">Odd Semester</SelectItem>
                                                    <SelectItem value="Even" className="font-bold py-3">Even Semester</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pass %</Label>
                                            <Input type="number" step="0.01" min="0" max="100" className="h-14 rounded-2xl border-border bg-background font-black text-xl" value={formData.subject_pass_percentage} onChange={(e) => setFormData({ ...formData, subject_pass_percentage: e.target.value })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">Auto Score (Max 5)</Label>
                                            <div className="h-14 rounded-2xl border-2 border-emerald-200 bg-emerald-50 font-black text-2xl text-emerald-700 flex items-center justify-center">
                                                {autoScores.subject_pass_score} / 5
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Feedback %</Label>
                                            <Input type="number" step="0.01" min="0" max="100" className="h-14 rounded-2xl border-border bg-background font-black text-xl" value={formData.student_feedback_percentage} onChange={(e) => setFormData({ ...formData, student_feedback_percentage: e.target.value })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 ml-1">Auto Score (Max 5)</Label>
                                            <div className="h-14 rounded-2xl border-2 border-emerald-200 bg-emerald-50 font-black text-2xl text-emerald-700 flex items-center justify-center">
                                                {autoScores.student_feedback_score} / 5
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6 pt-8 border-t border-border/40">
                                        <div className="mb-2 p-4 rounded-2xl bg-violet-50 border border-violet-200 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">Category I Running Total</span>
                                            <span className="text-3xl font-black text-violet-700">{totalAutoScore} <span className="text-base font-bold text-violet-400">/ 50</span></span>
                                        </div>
                                        {[
                                            { label: 'Instructional Material', key: 'instruction_material_level', autoScore: autoScores.instruction_material_score, max: 10 },
                                            { label: 'Innovative Pedagogy', key: 'pedagogy_level', autoScore: autoScores.pedagogy_score, max: 10 },
                                            { label: 'Learning Support (Slow/Advanced)', key: 'learners_action_level', autoScore: autoScores.learners_action_score, max: 10 },
                                            { label: 'External Engagement (Visits/Lectures)', key: 'visits_lectures_level', autoScore: autoScores.visits_lectures_score, max: 10 },
                                        ].map((field) => (
                                            <div key={field.key} className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-violet-500 rounded-full" />
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{field.label}</Label>
                                                    </div>
                                                    <Select value={formData[field.key as keyof typeof formData] as string} onValueChange={(val) => setFormData({ ...formData, [field.key]: val })}>
                                                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white font-bold"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                                            <SelectItem value="Excellent" className="font-bold py-3 text-emerald-600">Excellent — 10 pts</SelectItem>
                                                            <SelectItem value="Very Good" className="font-bold py-3 text-blue-600">Very Good — 8 pts</SelectItem>
                                                            <SelectItem value="Good" className="font-bold py-3 text-amber-600">Good — 6 pts</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Auto Score (Max {field.max})</Label>
                                                    </div>
                                                    <div className="h-12 rounded-xl border-2 border-emerald-200 bg-emerald-50 font-black text-2xl text-emerald-700 flex items-center justify-center">
                                                        {field.autoScore} / {field.max}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="space-y-6 pt-8 border-t border-border/40">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                                                <LinkIcon className="w-4 h-4 text-purple-500" />
                                                Links & Materials
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <AIWritingAssistant 
                                                    value={resourceLinks[resourceLinks.length-1]?.title || ''} 
                                                    type="title"
                                                    onSelect={(val) => {
                                                        if (resourceLinks.length > 0) {
                                                            updateResourceLink(resourceLinks.length - 1, 'title', val);
                                                        }
                                                    }}
                                                />
                                                <Button type="button" variant="outline" size="sm" onClick={addResourceLink} className="rounded-xl font-bold text-xs border-purple-200 text-purple-600 hover:bg-purple-50 transition-all">
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add URL
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {resourceLinks.map((link, idx) => (
                                                <div key={idx} className="flex gap-3 items-start p-4 rounded-2xl bg-muted/20 border border-border/40 animate-reveal">
                                                    <div className="flex-1 space-y-3">
                                                        <Input placeholder="Resource Title (e.g. Course Website)" className="h-10 rounded-xl bg-background font-bold text-xs" value={link.title} onChange={(e) => updateResourceLink(idx, 'title', e.target.value)} />
                                                        <Input placeholder="URL (https://...)" className="h-10 rounded-xl bg-background font-medium text-xs font-mono" value={link.url} onChange={(e) => updateResourceLink(idx, 'url', e.target.value)} />
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeResourceLink(idx)} className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"><X className="w-4 h-4" /></Button>
                                                </div>
                                            ))}
                                            {resourceLinks.length === 0 && (
                                                <div className="md:col-span-2 text-center py-8 rounded-2xl border-2 border-dashed border-border/40 text-muted-foreground italic text-sm">No digital links attached.</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-8 border-t border-border/40">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-purple-500" />
                                            Evidence (PDF)
                                        </h3>
                                        <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-12 border-t border-border mt-10">
                                        <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-muted-foreground hover:bg-muted/30 transition-all uppercase tracking-widest text-xs" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                        <Button type="submit" className="h-14 px-12 rounded-2xl bg-violet-600 text-white font-black shadow-2xl shadow-violet-500/30 hover:scale-105 transition-all duration-300 relative group overflow-hidden" disabled={isSubmitting || isUploading}>
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            {isSubmitting ? (
                                                <div className="flex items-center">
                                                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                                    <span className="relative z-10">Saving...</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <ShieldCheck className="w-6 h-6 mr-3" />
                                                    <span className="relative z-10">{editingItem ? 'Save Updates' : 'Add Activity'}</span>
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
                            <div className="w-20 h-20 rounded-full border-4 border-violet-500/10 border-t-violet-500 animate-spin" />
                            <Presentation className="w-8 h-8 text-violet-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-violet-500/40 italic animate-pulse">Loading Records...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-32 bg-background/50 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent skew-y-12 translate-y-24 group-hover:translate-y-12 transition-transform duration-1000" />
                        <div className="w-28 h-28 bg-violet-500/10 backdrop-blur-md rounded-[38px] flex items-center justify-center mx-auto mb-10 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Presentation className="w-12 h-12 text-violet-500/30" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight relative z-10">No Records Found</h3>
                        <p className="text-muted-foreground font-medium max-sm mx-auto mb-10 text-lg relative z-10">No teaching activities recorded yet. Add your teaching data for the semester.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()} className="h-14 px-10 rounded-2xl border-violet-500/30 text-violet-600 font-black uppercase tracking-widest text-xs hover:bg-violet-500/5 transition-all relative z-10 shadow-xl shadow-violet-500/10">
                            Add First Entry
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-900/5 hover:bg-slate-900/5 border-none">
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 pl-10 text-violet-600/60">Semester Info</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-violet-600/60 text-center">Score</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-violet-600/60">Details</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-[0.25em] h-16 text-right pr-10 text-violet-600/60">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {records.map((item, idx) => {
                                    let links: ResourceLink[] = [];
                                    try { links = JSON.parse(item.role || '{}').links || []; } catch(e) {}
                                    const totalScore = (item.subject_pass_score || 0) + (item.student_feedback_score || 0) + (item.instruction_material_score || 0) + (item.pedagogy_score || 0) + (item.learners_action_score || 0) + (item.visits_lectures_score || 0);

                                    return (
                                        <TableRow key={item.id} className="group hover:bg-violet-500/[0.02] transition-colors border-border/40 animate-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
                                            <TableCell className="pl-10 py-8">
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest border-none bg-violet-600 text-white shadow-lg group-hover:scale-110 transition-transform origin-left">
                                                            {item.semester} Semester
                                                        </Badge>
                                                        <Badge variant="secondary" className="text-[9px] h-6 px-3 rounded-full font-black uppercase tracking-widest bg-muted text-muted-foreground/60 border-none">{item.academic_year}</Badge>
                                                    </div>
                                                    <div className="font-black text-slate-900 text-lg tracking-tight leading-snug group-hover:text-violet-600 transition-colors">
                                                        Teaching Record {idx + 1}
                                                    </div>
                                                    {links.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {links.map((link, lidx) => (
                                                                <a key={lidx} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-violet-50 border border-violet-100 text-violet-600 font-bold text-[8px] uppercase tracking-widest hover:bg-violet-100 transition-colors">
                                                                    <LinkIcon className="w-2.5 h-2.5" /> {link.title}
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-8">
                                                <div className="relative inline-flex flex-col items-center group/score">
                                                     <div className="absolute inset-0 bg-violet-500/10 rounded-3xl blur-xl opacity-0 group-hover/score:opacity-100 transition-opacity duration-500" />
                                                    <div className="relative z-10 p-5 rounded-3xl bg-background border-2 border-violet-500/5 flex flex-col items-center justify-center shadow-xl group-hover/score:border-violet-500/20 group-hover/score:-translate-y-1 transition-all duration-500 min-w-[100px]">
                                                        <div className="text-3xl font-black text-secondary leading-none">{totalScore}</div>
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">Total Score</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-8">
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Teaching Quality</span>
                                                        <span className="font-bold text-xs text-slate-700">{item.instruction_material_level} ({item.instruction_material_score} pts)</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Subject Result</span>
                                                        <span className="font-bold text-xs text-slate-700">{item.subject_pass_percentage}% ({item.subject_pass_score} pts)</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Student Feedback</span>
                                                        <span className="font-bold text-xs text-slate-700">{item.student_feedback_percentage}% ({item.student_feedback_score} pts)</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Innovations</span>
                                                        <span className="font-bold text-xs text-slate-700">{item.pedagogy_level} ({item.pedagogy_score} pts)</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-10 py-8">
                                                <div className="flex items-center justify-end gap-3">
                                                    {item.proof_url && (
                                                        <FileViewer url={item.proof_url} />
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl bg-muted/50 text-muted-foreground hover:bg-violet-600 hover:text-white hover:shadow-lg hover:shadow-violet-500/20 transition-all duration-500" onClick={() => handleOpenDialog(item)} disabled={!isOpen}>
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
            
            <div className="mt-16 animate-reveal delay-500">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-200">
                        <Microscope className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Student <span className="text-orange-600">Feedback Analysis</span></h2>
                </div>
                <FeedbackAnalyzer />
            </div>
        </DashboardLayout>
    );
};

export default TeachingLearningActivities;
