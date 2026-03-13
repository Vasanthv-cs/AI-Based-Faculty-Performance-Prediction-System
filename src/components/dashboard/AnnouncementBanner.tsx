import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

const AnnouncementBanner: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [dismissed, setDismissed]         = useState<Set<string>>(new Set());
    const [expanded, setExpanded]           = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchAnnouncements();
        // check session-dismissed list
        const saved = sessionStorage.getItem('dismissed_announcements');
        if (saved) {
            try { setDismissed(new Set(JSON.parse(saved))); } catch {}
        }
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const { data } = await (supabase as any)
                .from('announcements')
                .select('id, title, message, created_at')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(5);
            setAnnouncements((data || []) as Announcement[]);
        } catch {
            // Table may not exist yet — silently skip
            setAnnouncements([]);
        }
    };

    const dismiss = (id: string) => {
        setDismissed(prev => {
            const next = new Set(prev);
            next.add(id);
            sessionStorage.setItem('dismissed_announcements', JSON.stringify([...next]));
            return next;
        });
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const visible = announcements.filter(a => !dismissed.has(a.id));
    if (visible.length === 0) return null;

    return (
        <div className="space-y-2 mb-6">
            {visible.map((ann, i) => (
                <div
                    key={ann.id}
                    className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 animate-fade-in"
                >
                    <Megaphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                            <span className="font-semibold text-sm text-primary">{ann.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                                {format(new Date(ann.created_at), 'dd MMM yyyy')}
                            </span>
                        </div>
                        <p className={`text-sm text-muted-foreground mt-1 leading-relaxed ${!expanded.has(ann.id) ? 'line-clamp-2' : ''}`}>
                            {ann.message}
                        </p>
                        {ann.message.length > 120 && (
                            <button
                                onClick={() => toggleExpand(ann.id)}
                                className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                            >
                                {expanded.has(ann.id)
                                    ? <><ChevronUp className="w-3 h-3" /> Show less</>
                                    : <><ChevronDown className="w-3 h-3" /> Read more</>
                                }
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => dismiss(ann.id)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default AnnouncementBanner;
