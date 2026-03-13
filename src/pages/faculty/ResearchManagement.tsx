import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, FileText, Pencil, Trash2, Loader2, Quote, Lock } from 'lucide-react';
import FileViewer from '@/components/FileViewer';
import { useActiveCycle } from '@/hooks/useActiveCycle';
import CycleLockBanner from '@/components/dashboard/CycleLockBanner';
import { Badge } from '@/components/ui/badge';

interface ResearchPaper {
  id: string;
  title: string;
  journal: string;
  publication_year: number;
  doi: string | null;
  citations: number | null;
  authors: string[] | null;
  proof_url: string | null;
  created_at: string;
}

const ResearchManagement: React.FC = () => {
  const { user } = useAuth();
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPaper, setEditingPaper] = useState<ResearchPaper | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { upload, isUploading, progress } = useFileUpload({ folder: 'research' });
  const { isOpen, cycleName, isLoading: isCycleLoading } = useActiveCycle();

  const [formData, setFormData] = useState({
    title: '',
    journal: '',
    publication_year: new Date().getFullYear().toString(),
    doi: '',
    citations: '',
    authors: '',
  });

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const { data, error } = await supabase
        .from('research_activities')
        .select('*')
        .eq('activity_category', 'Journal')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedPapers: ResearchPaper[] = (data || []).map((item: any) => {
        const meta = item.metadata || {};
        return {
          id: item.id,
          title: item.title,
          journal: meta.journal_name || '',
          publication_year: parseInt(item.academic_year) || new Date().getFullYear(),
          doi: meta.doi || null,
          citations: meta.citations || 0,
          authors: item.role ? item.role.split(',').map((a: string) => a.trim()) : [],
          proof_url: item.proof_url,
          created_at: item.created_at
        };
      });
      setPapers(mappedPapers);
    } catch (error: any) {
      toast.error('Failed to load research papers');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      journal: '',
      publication_year: new Date().getFullYear().toString(),
      doi: '',
      citations: '',
      authors: '',
    });
    setSelectedFile(null);
    setEditingPaper(null);
  };

  const handleOpenDialog = (paper?: ResearchPaper) => {
    if (paper) {
      setEditingPaper(paper);
      setFormData({
        title: paper.title,
        journal: paper.journal,
        publication_year: paper.publication_year.toString(),
        doi: paper.doi || '',
        citations: paper.citations?.toString() || '',
        authors: paper.authors?.join(', ') || '',
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
      let proofUrl = editingPaper?.proof_url || null;

      if (selectedFile) {
        const result = await upload(selectedFile, user.id);
        if (result) {
          proofUrl = result.url;
        }
      }

      const authorsArray = formData.authors
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      const paperData: any = {
        title: formData.title,
        academic_year: formData.publication_year,
        activity_category: 'Journal',
        activity_level: 'Good',
        role: formData.authors,
        score_claimed: 10,
        proof_url: proofUrl,
        user_id: user.id,
        metadata: {
            journal_name: formData.journal,
            doi: formData.doi || null,
            citations: formData.citations ? parseInt(formData.citations) : 0,
        }
      };

      if (editingPaper) {
        const { error } = await supabase
          .from('research_activities')
          .update(paperData)
          .eq('id', editingPaper.id);

        if (error) throw error;
        toast.success('Research paper updated');
      } else {
        const { error } = await supabase
          .from('research_activities')
          .insert(paperData);

        if (error) throw error;
        toast.success('Research paper added');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPapers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save research paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      const { error } = await supabase
        .from('research_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Research paper deleted');
      fetchPapers();
    } catch (error: any) {
      toast.error('Failed to delete paper');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-2">Research Papers</h1>
          <p className="text-muted-foreground">
            Manage your published research papers and publications
          </p>
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
              <Button onClick={() => handleOpenDialog()} disabled={isCycleLoading}>
                <Plus className="w-4 h-4 mr-2" />
                Add Paper
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPaper ? 'Edit Research Paper' : 'Add Research Paper'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Paper Title</Label>
                <Textarea
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter the full title of your paper"
                  rows={2}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="journal">Journal / Conference</Label>
                <Input
                  id="journal"
                  value={formData.journal}
                  onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                  placeholder="e.g., IEEE Transactions on..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="publication_year">Year</Label>
                  <Input
                    id="publication_year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={formData.publication_year}
                    onChange={(e) => setFormData({ ...formData, publication_year: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="citations">Citations</Label>
                  <Input
                    id="citations"
                    type="number"
                    min="0"
                    value={formData.citations}
                    onChange={(e) => setFormData({ ...formData, citations: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doi">DOI</Label>
                <Input
                  id="doi"
                  value={formData.doi}
                  onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                  placeholder="e.g., 10.1000/xyz123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authors">Authors (comma-separated)</Label>
                <Input
                  id="authors"
                  value={formData.authors}
                  onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                  placeholder="e.g., John Doe, Jane Smith"
                />
              </div>

              <div className="space-y-2">
                <Label>Proof / Publication</Label>
                <FileUpload
                  onFileSelect={setSelectedFile}
                  onRemove={() => setSelectedFile(null)}
                  isUploading={isUploading}
                  progress={progress}
                  currentFileUrl={editingPaper?.proof_url}
                  currentFileName="Current proof"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPaper ? 'Update' : 'Add'} Paper
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

      <div className="dashboard-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : papers.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-2">No Research Papers Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Start by adding your first publication
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Paper
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead>Journal</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Citations</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {papers.map((paper) => (
                <TableRow key={paper.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium line-clamp-2">{paper.title}</p>
                      {paper.doi && (
                        <a
                          href={`https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          DOI: {paper.doi}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{paper.journal}</TableCell>
                  <TableCell>{paper.publication_year}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Quote className="w-3 h-3" />
                      {paper.citations || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <FileViewer 
                      url={paper.proof_url} 
                      fileName={`${paper.title} - Proof`} 
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(paper)}
                        disabled={!isOpen}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(paper.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={!isOpen}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResearchManagement;
