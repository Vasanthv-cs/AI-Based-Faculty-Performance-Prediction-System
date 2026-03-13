import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

interface FileViewerProps {
  url: string | null;
  fileName?: string;
  trigger?: React.ReactNode;
}

const FileViewer: React.FC<FileViewerProps> = ({ url, fileName = 'Document', trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!url) {
    return <span className="text-muted-foreground">-</span>;
  }

  // Determine file type from URL
  const getFileType = (url: string): 'pdf' | 'image' | 'other' => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('.pdf')) return 'pdf';
    if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png') || lowerUrl.includes('.webp') || lowerUrl.includes('.gif')) return 'image';
    // Check for common patterns in Supabase storage URLs
    const urlParts = lowerUrl.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    if (lastPart.includes('_') && !lastPart.includes('.')) {
      // Could be any file, default to checking content
      return 'other';
    }
    return 'other';
  };

  const fileType = getFileType(url);

  const handleOpenNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const renderContent = () => {
    if (fileType === 'image') {
      return (
        <div className="relative w-full flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={url}
            alt={fileName}
            className="max-w-full max-h-[70vh] object-contain"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        </div>
      );
    }

    if (fileType === 'pdf') {
      return (
        <div className="relative w-full min-h-[70vh] bg-muted/30 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <iframe
            src={`${url}#toolbar=1&navpanes=0`}
            className="w-full h-[70vh] border-0"
            title={fileName}
            onLoad={() => setIsLoading(false)}
          />
        </div>
      );
    }

    // For other file types, show download option
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <FileText className="w-16 h-16 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          This file type cannot be previewed directly.
        </p>
        <div className="flex gap-3">
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download File
          </Button>
          <Button variant="outline" onClick={handleOpenNewTab}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Browser
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          {fileType === 'image' ? (
            <ImageIcon className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          View
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) setIsLoading(true); }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{fileName}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleOpenNewTab}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {renderContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileViewer;
