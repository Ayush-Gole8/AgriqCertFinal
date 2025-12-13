import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Image, Check, AlertCircle } from 'lucide-react';

interface FileMetadata {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  description?: string;
}

interface FileUploaderProps {
  category: 'photos' | 'lab-reports' | 'documents';
  onFileUpload: (file: FileMetadata) => void;
  onFileRemove: (fileId: string) => void;
  uploadedFiles?: FileMetadata[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  required?: boolean;
  description?: string;
}

interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  category,
  onFileUpload,
  onFileRemove,
  uploadedFiles = [],
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes,
  required = false,
  description,
}) => {
  const [uploading, setUploading] = useState<UploadProgress[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default accepted types based on category
  const defaultAcceptedTypes = {
    photos: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
    'lab-reports': ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv'],
    documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv']
  };

  const allowedTypes = acceptedTypes || defaultAcceptedTypes[category];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported for ${category}`;
    }
    
    if (file.size > maxFileSize) {
      return `File size ${formatFileSize(file.size)} exceeds maximum of ${formatFileSize(maxFileSize)}`;
    }

    if (uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const generatePresignedUrl = async (filename: string, mimeType: string) => {
    const response = await fetch('/api/files/generate-upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        filename,
        mimeType,
        category,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate upload URL');
    }

    return response.json();
  };

  const uploadFileToPresignedUrl = async (file: File, uploadUrl: string): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload file');
    }

    return response.json();
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        alert(validationError);
        continue;
      }

      const fileId = Math.random().toString(36);
      
      // Add to uploading state
      const uploadProgress: UploadProgress = {
        fileId,
        filename: file.name,
        progress: 0,
        status: 'uploading',
      };
      
      setUploading(prev => [...prev, uploadProgress]);

      try {
        // Generate presigned URL
        const { data } = await generatePresignedUrl(file.name, file.type);
        
        // Upload file
        await uploadFileToPresignedUrl(file, data.uploadUrl);
        
        // Update progress to completed
        setUploading(prev => prev.map(up => 
          up.fileId === fileId 
            ? { ...up, progress: 100, status: 'completed' as const }
            : up
        ));

        // Create file metadata
        const fileMetadata: FileMetadata = {
          id: data.fileId,
          filename: file.name,
          url: data.accessUrl,
          size: file.size,
          mimeType: file.type,
          uploadedAt: new Date(),
        };

        onFileUpload(fileMetadata);

        // Remove from uploading state after a delay
        setTimeout(() => {
          setUploading(prev => prev.filter(up => up.fileId !== fileId));
        }, 2000);

      } catch (error) {
        console.error('Upload error:', error);
        setUploading(prev => prev.map(up => 
          up.fileId === fileId 
            ? { 
                ...up, 
                status: 'error' as const, 
                error: error instanceof Error ? error.message : 'Upload failed'
              }
            : up
        ));
      }
    }
  }, [onFileUpload, validateFile, generatePresignedUrl, uploadFileToPresignedUrl]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
      // Reset input
      e.target.value = '';
    }
  }, [handleFileUpload]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
    return <FileText className="h-5 w-5" />;
  };

  const getCategoryLabel = () => {
    switch (category) {
      case 'photos': return 'Photos';
      case 'lab-reports': return 'Lab Reports';
      case 'documents': return 'Documents';
      default: return 'Files';
    }
  };

  const canUploadMore = uploadedFiles.length < maxFiles;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{getCategoryLabel()}</h3>
              {required && <span className="text-red-500">*</span>}
            </div>
            <span className="text-sm text-gray-500">
              {uploadedFiles.length}/{maxFiles} files
            </span>
          </div>

          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}

          {/* Upload Area */}
          {canUploadMore && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-600 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Accepts: {allowedTypes.join(', ')}
                <br />
                Max size: {formatFileSize(maxFileSize)}
              </p>
              
              <Button onClick={() => fileInputRef.current?.click()}>
                Select Files
              </Button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={allowedTypes.join(',')}
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* Upload Progress */}
          {uploading.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Uploading...</h4>
              {uploading.map((upload) => (
                <div key={upload.fileId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{upload.filename}</span>
                    <div className="flex items-center gap-2">
                      {upload.status === 'completed' && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {upload.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                  
                  {upload.status === 'uploading' && (
                    <Progress value={upload.progress} className="w-full" />
                  )}
                  
                  {upload.status === 'error' && (
                    <p className="text-sm text-red-600">{upload.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Uploaded Files</h4>
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.mimeType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.filename}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onFileRemove(file.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File limit reached */}
          {!canUploadMore && (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800">
                Maximum number of files ({maxFiles}) reached. Remove some files to add more.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
