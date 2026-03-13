import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onRemove?: () => void;
  isUploading?: boolean;
  progress?: number;
  accept?: string;
  maxSizeMB?: number;
  currentFileUrl?: string | null;
  currentFileName?: string;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onRemove,
  isUploading = false,
  progress = 0,
  accept = 'application/pdf,.pdf,image/jpeg,image/jpg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
  maxSizeMB = 10,
  currentFileUrl,
  currentFileName,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onRemove?.();
  };

  const getFileIcon = (file: File | null, url: string | null) => {
    if (file?.type.startsWith('image/') || url?.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return <Image className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  const displayFile = selectedFile || (currentFileUrl ? { name: currentFileName || 'Uploaded file' } : null);

  return (
    <div className={className}>
      {!displayFile ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            disabled={isUploading}
          />
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drop your file here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, JPG, PNG up to {maxSizeMB}MB
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                getFileIcon(selectedFile, currentFileUrl || null)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {selectedFile?.name || currentFileName}
              </p>
              {isUploading ? (
                <div className="mt-1">
                  <Progress value={progress} className="h-1" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploading... {progress}%
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Uploaded'}
                </p>
              )}
            </div>
            {!isUploading && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {currentFileUrl && !selectedFile && (
            <a
              href={currentFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              View uploaded file
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
