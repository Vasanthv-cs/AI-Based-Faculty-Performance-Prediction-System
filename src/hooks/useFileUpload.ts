import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseFileUploadOptions {
  bucket?: string;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UploadResult {
  url: string;
  path: string;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    bucket = 'faculty-files',
    folder = '',
    maxSizeMB = 10,
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File, userId: string): Promise<UploadResult | null> => {
    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error(`File size exceeds ${maxSizeMB}MB limit`);
      return null;
    }

    // Validate file type (Chrome may report image/jpeg as image/jpg; normalize for compatibility)
    const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
    if (allowedTypes.length > 0 && !allowedTypes.includes(normalizedType) && !allowedTypes.includes(file.type)) {
      toast.error('File type not allowed. Please upload PDF or image files.');
      return null;
    }

    setIsUploading(true);
    setProgress(0);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = folder 
        ? `${userId}/${folder}/${timestamp}_${sanitizedName}`
        : `${userId}/${timestamp}_${sanitizedName}`;

      setProgress(30);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      setProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      toast.success('File uploaded successfully');

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      
      toast.success('File deleted');
      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
      return false;
    }
  };

  return {
    upload,
    deleteFile,
    isUploading,
    progress,
  };
}
