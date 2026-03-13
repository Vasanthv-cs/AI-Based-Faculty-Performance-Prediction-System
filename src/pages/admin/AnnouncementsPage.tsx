import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Megaphone, Plus, Trash2, Loader2, Pin, RefreshCcw, Sparkles, Send, Bell, Zap, Calendar, User, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export interface Announcement {
    id: string;
    title: string;
    message: string;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
}

const AnnouncementsPage: React.FC = () => {
    const { user } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading]         = useState(true);
    const [isDialogOpen, setIsDialogOpen]   = useState(false);
    const [isSaving, setIsSaving]           = useState(false);
    const [formData, setFormData]           = useState({ title: '', message: '', is_active: true });

    useEffect(() => { fetchAnnouncements(); }, []);

    const fetchAnnouncements = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setAnnouncements((data || []) as Announcement[]);
        } catch (err: any) {
            console.warn('Announcements fetch error:', err.message);
            setAnnouncements([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.message.trim()) {
            toast.error('Title and message are required');
            return;
        }
        setIsSaving(true);
        try {
            const { error } = await (supabase as any).from('announcements').insert({
                title:      formData.title.trim(),
                message:    formData.message.trim(),
                is_active:  formData.is_active,
                created_by: user?.id || null,
            });
            if (error) throw error;
            toast.success('Announcement broadcasted!');
            setIsDialogOpen(false);
            setFormData({ title: '', message: '', is_active: true });
            fetchAnnouncements();
        } catch (err: any) {
            toast.error(err.message || 'Failed to post announcement');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = async (ann: Announcement) => {
        try {
            const { error } = await (supabase as any)
                .from('announcements')
                .update({ is_active: !ann.is_active })
                .eq('id', ann.id);
            if (error) throw error;
            toast.success(`Announcement ${!ann.is_active ? 'activated' : 'deactivated'}`);
            fetchAnnouncements();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this announcement?')) return;
        try {
            const { error } = await (supabase as any).from('announcements').delete().eq('id', id);
            if (error) throw error;
            toast.success('Announcement purged');
            fetchAnnouncements();
        } catch (err: any) {
            toast.error(err.message || 'Deletion failed');
        }
    };

    return (
        <DashboardLayout>
            <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-reveal">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[10px] font-black uppercase tracking-widest shadow-sm">
                        <Megaphone className="w-3.5 h-3.5" /> Institutional Broadcast Node
                    </div>
                    <div>
                        <h1 className="font-display text-5xl lg:text-6xl font-black mb-3 tracking-tight leading-tight text-slate-900">
                             Digital <span className="gradient-text">Bulletins</span>.
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg lg:text-xl flex items-center gap-2 max-w-2xl italic">
                             Orchestrate global announcements and urgent faculty notifications across the platform.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-14 px-10 rounded-3xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xl shadow-slate-900/20 font-black text-lg transition-all duration-500 hover:-translate-y-1 group">
                                <Plus className="w-6 h-6 mr-3 group-hover:rotate-180 transition-transform duration-500" />
                                Initiate Broadcast
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl rounded-[40px] border-none shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-2xl">
                            <div className="bg-gradient-to-br from-rose-600 to-rose-900 px-10 py-12 text-white relative">
                                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 scale-150">
                                    <Send className="w-48 h-48" />
                                </div>
                                <DialogHeader className="relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/10 backdrop-blur-md">
                                        <Bell className="w-6 h-6 text-white" />
                                    </div>
                                    <DialogTitle className="text-4xl font-black tracking-tight leading-none mb-2">New Bulletin</DialogTitle>
                                    <p className="text-rose-100 font-medium text-lg italic">Compose a message for the global faculty community.</p>
                                </DialogHeader>
                            </div>
                            <form onSubmit={handleCreate} className="p-10 space-y-8">
                                <div className="space-y-8">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject Heading</Label>
                                        <Input className="h-14 rounded-2xl border-border bg-background font-bold text-lg focus:ring-rose-500/20 shadow-inner" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Urgent: Appraisal Window Closure" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Narrative Content</Label>
                                        <Textarea className="min-h-[160px] rounded-3xl border-border bg-background font-medium text-lg focus:ring-rose-500/20 p-6 shadow-inner resize-none" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Detailed announcement message goes here..." required />
                                    </div>
                                    <div className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div>
                                            <p className="font-black text-slate-900 leading-none mb-1">Immediate Visibility</p>
                                            <p className="text-xs font-medium text-slate-500 italic">Toggle whether this announcement should be active immediately.</p>
                                        </div>
                                        <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} className="data-[state=checked]:bg-rose-600" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <Button type="button" variant="ghost" className="h-14 px-8 rounded-2xl font-black text-muted-foreground uppercase tracking-widest text-xs" onClick={() => setIsDialogOpen(false)}>Discard</Button>
                                    <Button type="submit" className="h-14 px-12 rounded-2xl bg-rose-600 text-white font-black shadow-xl shadow-rose-900/20 hover:scale-105 transition-all duration-300 relative group overflow-hidden" disabled={isSaving}>
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="flex items-center gap-2"><Sparkles className="w-5 h-5" /> Broadcast Now</div>}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-48 gap-6 animate-pulse">
                     <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-rose-600 animate-spin" />
                     <p className="font-black uppercase tracking-[0.3em] text-slate-400 text-sm italic">Accessing Broadcast Archive...</p>
                </div>
            ) : announcements.length === 0 ? (
                <div className="premium-card p-32 text-center bg-white/50 backdrop-blur-xl border-none shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent skew-y-12 translate-y-32 group-hover:translate-y-16 transition-transform duration-1000" />
                    <div className="w-24 h-24 rounded-[32px] bg-rose-900/5 flex items-center justify-center mx-auto mb-8 relative z-10 transition-transform group-hover:scale-110">
                        <Megaphone className="w-10 h-10 text-rose-200" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight relative z-10">Broadcast Archive Empty</h2>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 text-lg relative z-10 italic underline underline-offset-8 decoration-rose-100 decoration-4">Initiate your first institutional bulletin to populate the ledger.</p>
                    <Button onClick={() => setIsDialogOpen(true)} className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 relative z-10">Launch Initial Post</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-reveal delay-200">
                    {announcements.map((ann, idx) => (
                        <Card key={ann.id} className="premium-card border-none shadow-[0_32px_80px_rgba(0,0,0,0.06)] bg-white/50 backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500 p-0 overflow-hidden relative" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-slate-900/[0.03] to-transparent rounded-bl-[100px] pointer-events-none`} />
                            <CardContent className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                         <div className={`p-4 rounded-2xl ${ann.is_active ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30' : 'bg-slate-100 text-slate-400'}`}>
                                            <Bell className="w-6 h-6" />
                                         </div>
                                         <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 italic mb-0.5">Announcement ID</p>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">#{ann.id.slice(0, 8)}</h3>
                                         </div>
                                    </div>
                                    <Badge className={`px-4 py-1.5 rounded-full border-none font-black text-[10px] uppercase tracking-widest ${ann.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-500 uppercase'}`}>
                                        {ann.is_active ? 'Synchronized' : 'Offline'}
                                    </Badge>
                                </div>

                                <div className="space-y-4 mb-10 min-h-[140px]">
                                    <h4 className="text-xl font-black text-slate-900 leading-tight underline underline-offset-4 decoration-rose-500/20">{ann.title}</h4>
                                    <p className="text-slate-500 font-medium text-lg leading-relaxed line-clamp-3">{ann.message}</p>
                                </div>

                                <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                                     <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-300" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{format(new Date(ann.created_at), 'MMMM d, yyyy')}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-rose-300" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Admin Principal</span>
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-2">
                                        <Button onClick={() => handleToggle(ann)} variant="ghost" className={`h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${ann.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                                            {ann.is_active ? 'Retract' : 'Authorize'}
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ann.id)} className="h-10 w-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white shadow-sm transition-all duration-300">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                     </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
};

export default AnnouncementsPage;
