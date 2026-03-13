import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, BookText, Pencil, Trash2, Loader2, ExternalLink, Lock } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { Badge } from '@/components/ui/badge';

const Books: React.FC = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { upload, isUploading, progress } = useFileUpload({ folder: 'books' });
    const { isOpen, cycleName, isLoading: isCycleLoading } = useActiveCycle();

    const currentYear = new Date().getFullYear();
    const [formData, setFormData] = useState({
        title: '',
        authors: '',
        publisher: '',
        isbn: '',
        year: currentYear.toString(),
        link: '',
        score_claimed: '5'
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
                .eq('activity_category', 'Book')
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
            title: '',
            authors: '',
            publisher: '',
            isbn: '',
            year: currentYear.toString(),
            link: '',
            score_claimed: '5'
        });
        setSelectedFile(null);
        setEditingItem(null);
    };

    const handleOpenDialog = (item?: any) => {
        if (item) {
            setEditingItem(item);
            const meta = item.metadata || {};
            setFormData({
                title: item.title || '',
                authors: item.role || '',
                publisher: meta.publisher || '',
                isbn: meta.isbn || '',
                year: item.academic_year || currentYear.toString(),
                link: meta.link || '',
                score_claimed: item.score_claimed?.toString() || '5'
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
                } catch (err) { }
            }

            const itemData: any = {
                user_id: user.id,
                title: formData.title,
                academic_year: formData.year,
                activity_category: 'Book',
                activity_level: 'Good',
                role: formData.authors,
                score_claimed: Number(formData.score_claimed || 5),
                proof_url: documentUrl,
                metadata: {
                    publisher: formData.publisher,
                    isbn: formData.isbn,
                    link: formData.link
                }
            };

            if (editingItem) {
                await supabase.from('research_activities').update(itemData).eq('id', editingItem.id);
                toast.success('Book updated successfully');
            } else {
                await supabase.from('research_activities').insert(itemData);
                toast.success('Book added successfully');
            }

            fetchRecords();
            setIsDialogOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error('Failed to save record. Ensure backend metadata column exists!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this book?')) return;
        try {
            await supabase.from('research_activities').delete().eq('id', id);
            toast.success('Book deleted successfully');
            fetchRecords();
        } catch (error) { toast.error('Failed to delete'); }
    };

    return (
        <DashboardLayout>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold mb-2 flex items-center gap-2">
                        <BookText className="w-8 h-8 text-primary" />
                        Books Published
                    </h1>
                    <p className="text-muted-foreground">Manage books authored/published</p>
                </div>
                {!isCycleLoading && !isOpen ? (
                    <div className="hidden sm:block">
                        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
                            <Lock className="w-3 h-3 mr-1" /> Cycle Closed
                        </Badge>
                    </div>
                ) : (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenDialog()} className="shadow-lg" disabled={isCycleLoading}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Book
                            </Button>
                        </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingItem ? 'Edit Book' : 'Add Book'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Title of the Book</Label>
                                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Introduction to React" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Author(s) Name</Label>
                                <Input value={formData.authors} onChange={(e) => setFormData({ ...formData, authors: e.target.value })} placeholder="e.g., John Doe" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Publisher Name</Label>
                                <Input value={formData.publisher} onChange={(e) => setFormData({ ...formData, publisher: e.target.value })} placeholder="e.g., O'Reilly, Packt" required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Year of Publication</Label>
                                    <Input value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} placeholder="e.g., 2026" required />
                                </div>
                                <div className="space-y-2">
                                    <Label>ISBN Number</Label>
                                    <Input value={formData.isbn} onChange={(e) => setFormData({ ...formData, isbn: e.target.value })} placeholder="e.g., 978-3-16-148410-0" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Book External Link</Label>
                                <Input value={formData.link} onChange={(e) => setFormData({ ...formData, link: e.target.value })} placeholder="https://amazon.com/..." />
                            </div>

                            <div className="space-y-2">
                                <Label>Appraisal Score</Label>
                                <Input type="number" value={formData.score_claimed} onChange={(e) => setFormData({ ...formData, score_claimed: e.target.value })} placeholder="5" required />
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label>Upload Book Cover / PDF</Label>
                                <FileUpload onFileSelect={setSelectedFile} onRemove={() => setSelectedFile(null)} isUploading={isUploading} progress={progress} currentFileUrl={editingItem?.proof_url} />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting || isUploading}>
                                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save Book
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>

        {!isCycleLoading && !isOpen && (
            <CycleLockBanner cycleName={cycleName} />
        )}

            <div className="dashboard-card overflow-hidden border-border/50 shadow-sm">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : records.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">No books found. Click 'Add Book' to get started.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Book Title & Authors</TableHead>
                                <TableHead>Publishing Info</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map(item => {
                                const meta = item.metadata || {};
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-semibold text-primary">{item.title}</div>
                                            <div className="text-sm text-muted-foreground mt-0.5">{item.role}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                Year: {item.academic_year} | Publisher: {meta.publisher || 'NA'}
                                                <br /> ISBN: {meta.isbn || 'NA'}
                                            </div>
                                            {meta.link && (
                                                <a href={meta.link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                    <ExternalLink className="w-3 h-3" /> View Book
                                                </a>
                                            )}
                                        </TableCell>
                                        <TableCell>{item.score_claimed}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)} disabled={!isOpen}><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} disabled={!isOpen}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
export default Books;
