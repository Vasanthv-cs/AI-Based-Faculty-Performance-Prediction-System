import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import FileUpload from '@/components/FileUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Award, Pencil, Trash2, Loader2, Link as LinkIcon, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import FileViewer from '@/components/FileViewer';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { Badge } from '@/components/ui/badge';

const CAT3_MAX = 100; // Category III max points

const NetworkingContributions: React.FC = () => {
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
        academic_year: `${currentYear}-${currentYear + 1}`,
        title: '',
        contribution_category: 'FDP Attended',
        contribution_level: 'State',
        role: 'Participant',
        score_claimed: '0',
    });

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
                .not('contribution_category', 'in', '("Consultancy","Funded Project")')
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
            contribution_category: 'FDP Attended',
            contribution_level: 'State',
            role: 'Participant',
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
                contribution_category: item.contribution_category || 'FDP Attended',
                contribution_level: item.contribution_level || 'State',
                role: item.role || 'Participant',
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
                try {
                    const result = await upload(selectedFile, user.id);
                    if (result) documentUrl = result.url;
                } catch (uploadError) {
                    console.warn("Upload failed", uploadError);
                }
            }

            const itemData: any = {
                user_id: user.id,
                academic_year: formData.academic_year,
                title: formData.title,
                contribution_category: formData.contribution_category,
                contribution_level: formData.contribution_level,
                role: formData.role,
                score_claimed: Number(formData.score_claimed),
                proof_url: documentUrl,
            };

            if (editingItem) {
                await supabase
                    .from('networking_contributions')
                    .update(itemData)
                    .eq('id', editingItem.id);
                toast.success('Record updated successfully');
            } else {
                await supabase
                    .from('networking_contributions')
                    .insert(itemData);
                toast.success('Record added successfully');
            }

            fetchRecords();
            setIsDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error('Failed to save record.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this record?')) return;

        try {
            await supabase
                .from('networking_contributions')
                .delete()
                .eq('id', id);
            toast.success('Record deleted successfully');
            fetchRecords();
        } catch (error: any) {
            toast.error('Failed to delete record');
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 animate-reveal">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/20 animate-float">
                        <Award className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                        <h1 className="font-display text-4xl font-black mb-1 tracking-tight">
                            Networking & <span className="gradient-text">Contributions</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-sm">Quantify your professional presence and institutional impact.</p>
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
                                    Register Contribution
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                                <div className="bg-gradient-to-br from-primary to-accent px-8 py-10 text-primary-foreground relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                                        <LinkIcon className="w-32 h-32" />
                                    </div>
                                    <DialogHeader>
                                        <DialogTitle className="text-3xl font-black tracking-tight leading-none mb-2">
                                            Professional <span className="opacity-80">Linkages</span>
                                        </DialogTitle>
                                        <p className="text-primary-foreground/70 font-medium italic">Document your diverse professional and institutional contributions.</p>
                                    </DialogHeader>
                                </div>
                                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Academic Cycle</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold" value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })} placeholder="2024-2025" required />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contribution Descriptor</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20 font-medium" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Guest Editor for Neural Computing Journal" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Taxonomy</Label>
                                            <Select value={formData.contribution_category} onValueChange={(val) => setFormData(prev => ({ ...prev, contribution_category: val }))}>
                                                <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Professional Society" className="font-bold">Professional Society</SelectItem>
                                                    <SelectItem value="FDP Attended" className="font-bold">FDP Attended</SelectItem>
                                                    <SelectItem value="Organized Event" className="font-bold">Organized Event</SelectItem>
                                                    <SelectItem value="Institution Contribution" className="font-bold">Institution Contribution</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Geographical Range</Label>
                                            <Select value={formData.contribution_level} onValueChange={(val) => setFormData(prev => ({ ...prev, contribution_level: val }))}>
                                                <SelectTrigger className="h-12 rounded-xl border-border/50 bg-muted/20 font-bold"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="International" className="font-bold text-indigo-500">Global Horizon (International)</SelectItem>
                                                    <SelectItem value="National" className="font-bold text-emerald-500">National Impact</SelectItem>
                                                    <SelectItem value="State" className="font-bold text-amber-500">Zonal / State Level</SelectItem>
                                                    <SelectItem value="Local" className="font-bold text-muted-foreground">Regional / Institutional</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Designated Role</Label>
                                            <Input className="h-12 rounded-xl border-border/50 bg-muted/20" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g., Principal Investigator" required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Appraisal Weightage</Label>
                                            <div className="relative">
                                                <Input className="h-12 rounded-xl border-border/30 bg-secondary/5 font-black text-secondary pl-10" type="number" min="0" value={formData.score_claimed} onChange={(e) => setFormData({ ...formData, score_claimed: e.target.value })} required />
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/40 font-black text-xs">PTS</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2 md:col-span-2 pt-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Verification Evidence</Label>
                                            <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-8 border-t border-border mt-8">
                                        <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl font-bold" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                                        <Button type="submit" className="h-12 px-10 rounded-xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all" disabled={isSubmitting || isUploading}>
                                            {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Plus className="w-5 h-5 mr-2" />}
                                            {editingItem ? 'Publish Updates' : 'Commit Entry'}
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

            {/* Score Cap Summary Banner */}
            {!isLoading && (() => {
                const rawTotal = records.reduce((sum: number, r: any) => sum + Number(r.score_claimed || 0), 0);
                const cappedTotal = Math.min(rawTotal, CAT3_MAX);
                const pct = Math.min(100, Math.round((cappedTotal / CAT3_MAX) * 100));
                const isOverLimit = rawTotal > CAT3_MAX;
                return (
                    <div className={`mb-6 rounded-2xl border-2 p-5 flex items-center justify-between gap-4 animate-reveal ${
                        isOverLimit
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-emerald-50 border-emerald-200'
                    }`}>
                        <div className="flex items-center gap-3">
                            {isOverLimit
                                ? <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                            <div>
                                <div className={`text-xs font-black uppercase tracking-widest mb-0.5 ${
                                    isOverLimit ? 'text-orange-700' : 'text-emerald-700'
                                }`}>Networking & Contributions — Category III (Max {CAT3_MAX} pts)</div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-2xl font-black ${
                                        isOverLimit ? 'text-orange-600' : 'text-emerald-600'
                                    }`}>{cappedTotal}/{CAT3_MAX}</span>
                                    {isOverLimit && (
                                        <span className="text-xs font-bold text-orange-500">
                                            ({rawTotal} pts claimed — {rawTotal - CAT3_MAX} excess pts will not be counted)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 max-w-48">
                            <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white/80">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                        isOverLimit ? 'bg-orange-400' : 'bg-emerald-400'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <div className={`text-[9px] font-black uppercase tracking-widest mt-1 text-right ${
                                isOverLimit ? 'text-orange-400' : 'text-emerald-400'
                            }`}>{pct}% of max</div>
                        </div>
                    </div>
                );
            })()}

            <div className="premium-card overflow-hidden animate-reveal delay-200">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-24 gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40 italic">Assembling Contribution Graph...</p>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-24 bg-muted/5">
                        <div className="w-20 h-20 bg-muted/20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                            <LinkIcon className="w-10 h-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-black text-foreground mb-2">No Links Established</h3>
                        <p className="text-muted-foreground font-medium max-w-xs mx-auto mb-8 text-sm">Register your memberships, consultancy, and institutional service to enhance your profile.</p>
                        <Button variant="outline" onClick={() => handleOpenDialog()} className="h-10 rounded-xl border-primary/20 text-primary font-bold hover:bg-primary/5 transition-all">
                            Initiate First Connection
                        </Button>
                    </div>
                ) : (() => {
                    // Category Hard Caps
                    const CAPS: Record<string, number> = {
                        'Professional Society': 20,
                        'FDP Attended': 25,
                        'Organized Event': 25,
                        'Institution Contribution': 30
                    };

                    // Compute which rows are within sub-caps
                    const categoryTracking: Record<string, number> = {};
                    let totalCappedScore = 0;

                    const rowMeta = records.map((item: any) => {
                        const cat = item.contribution_category || 'Other';
                        const pts = Number(item.score_claimed || 0);
                        const cap = CAPS[cat] || 999;
                        
                        const currentCatTotal = categoryTracking[cat] || 0;
                        const countedTowardsCat = Math.max(0, Math.min(pts, cap - currentCatTotal));
                        
                        // Also respect the overall 100-pt cap for Category III
                        const countedFinal = Math.max(0, Math.min(countedTowardsCat, 100 - totalCappedScore));
                        
                        categoryTracking[cat] = currentCatTotal + pts;
                        totalCappedScore += countedFinal;

                        const isSubCapExtra = countedTowardsCat < pts;
                        const isTotalCapExtra = countedTowardsCat > 0 && countedFinal < countedTowardsCat;
                        const isFullyExtra = countedFinal === 0;

                        return { 
                            counted: countedFinal, 
                            isExtra: isSubCapExtra || isTotalCapExtra, 
                            isFullyExtra,
                            isSubCapHit: isSubCapExtra
                        };
                    });

                    return (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30 border-none">
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 pl-8 w-[120px]">Timeline</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Contribution & Category</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Engagement Stats</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 text-right pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map((item: any, idx: number) => {
                                const { counted, isExtra, isFullyExtra, isSubCapHit } = rowMeta[idx];
                                const catCap = CAPS[item.contribution_category] || 'N/A';
                                
                                return (
                                <TableRow
                                    key={item.id}
                                    className={`group transition-colors border-border/50 animate-reveal ${
                                        isFullyExtra
                                            ? 'bg-slate-50/70 hover:bg-slate-100/60 opacity-70'
                                            : isExtra
                                            ? 'bg-amber-50/40 hover:bg-amber-50/60'
                                            : 'hover:bg-muted/10'
                                    }`}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <TableCell className="pl-8 py-5">
                                        <Badge variant="outline" className={`h-7 px-3 rounded-lg font-black text-[10px] tracking-tight whitespace-nowrap ${
                                            isFullyExtra
                                                ? 'border-slate-300/40 bg-slate-100 text-slate-400'
                                                : 'border-primary/20 bg-primary/5 text-primary'
                                        }`}>
                                            {item.academic_year}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className={`font-bold text-sm tracking-tight leading-snug max-w-[400px] ${
                                                isFullyExtra
                                                    ? 'text-slate-400 line-through decoration-slate-300'
                                                    : 'text-foreground group-hover:text-primary transition-colors'
                                            }`}>{item.title}</div>
                                            <div className={`text-[10px] font-black uppercase tracking-widest ${
                                                isFullyExtra ? 'text-slate-400/50' : 'text-muted-foreground/60'
                                            }`}>{item.contribution_category} (Max {catCap})</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="flex flex-col gap-1.5 text-xs">
                                            <div className={`font-bold flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${
                                                isFullyExtra ? 'text-slate-400/60' : 'text-muted-foreground/80'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    isFullyExtra ? 'bg-slate-300' : 'bg-secondary/60'
                                                }`} />
                                                {item.role} <span className="opacity-40">|</span> {item.contribution_level}
                                            </div>
                                            {isFullyExtra ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-slate-400 line-through">{item.score_claimed} PTS</span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-black uppercase tracking-wider">⚠ Extra • Not Counted</span>
                                                </div>
                                            ) : isExtra ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-tight text-secondary">Counted: {counted} PTS</span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-700 text-[9px] font-black uppercase tracking-wider">
                                                           {isSubCapHit ? '⚠ Type Cap Exceeded' : '⚠ Category Maxed'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 font-medium">(Claimed {item.score_claimed} pts — {item.score_claimed - counted} excess not counted)</span>
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-black uppercase tracking-tight text-secondary">
                                                    Performance: {item.score_claimed} PTS
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-8 py-5">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-background border border-transparent hover:border-border transition-all" onClick={() => handleOpenDialog(item)} disabled={!isOpen}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/5 border border-transparent hover:border-destructive/10 transition-all" onClick={() => handleDelete(item.id)} disabled={!isOpen}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})}
                        </TableBody>
                    </Table>
                    );
                })()}
            </div>
        </DashboardLayout>
    );
};
export default NetworkingContributions;
