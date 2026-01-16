import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class FileUploadController {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Generate presigned upload URL for files
   */
  generatePresignedUrl = async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename, mimeType, category } = req.body;

      if (!filename || !mimeType || !category) {
        res.status(400).json({
          success: false,
          error: 'filename, mimeType, and category are required',
        });
        return;
      }

      // Validate category
      const allowedCategories = ['photos', 'lab-reports', 'documents'];
      if (!allowedCategories.includes(category)) {
        res.status(400).json({
          success: false,
          error: `Category must be one of: ${allowedCategories.join(', ')}`,
        });
        return;
      }

      // Validate file type
      const allowedPhotoTypes = [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/heic',
        'image/heif'
      ];
      const allowedDocumentTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (category === 'photos' && !allowedPhotoTypes.includes(mimeType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid photo file type. Allowed: JPEG, PNG, HEIC, HEIF',
        });
        return;
      }

      if ((category === 'lab-reports' || category === 'documents') && 
          !allowedDocumentTypes.includes(mimeType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid document file type. Allowed: PDF, DOC, DOCX, CSV, XLS, XLSX',
        });
        return;
      }

      // Generate unique file ID and path
      const fileId = uuidv4();
      const fileExtension = path.extname(filename);
      const storedFilename = `${fileId}${fileExtension}`;
      const categoryDir = path.join(this.uploadDir, category);
      
      // Ensure category directory exists
      await fs.mkdir(categoryDir, { recursive: true });
      
      const filePath = path.join(categoryDir, storedFilename);
      const uploadUrl = `/api/files/upload/${category}/${fileId}`;
      const accessUrl = `/api/files/${category}/${fileId}`;

      res.status(200).json({
        success: true,
        data: {
          fileId,
          uploadUrl,
          accessUrl,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
          metadata: {
            id: fileId,
            filename,
            mimeType,
            category,
            storedPath: filePath,
          },
        },
      });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate upload URL',
      });
    }
  };

  /**
   * Handle file upload using presigned URL
   */
  uploadFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, fileId } = req.params;
      
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const categoryDir = path.join(this.uploadDir, category);
      const fileExtension = path.extname(req.file.originalname);
      const storedFilename = `${fileId}${fileExtension}`;
      const filePath = path.join(categoryDir, storedFilename);

      // Move uploaded file to final location
      await fs.rename(req.file.path, filePath);

      res.status(200).json({
        success: true,
        data: {
          fileId,
          filename: req.file.originalname,
          url: `/api/files/${category}/${fileId}`,
          size: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload file',
      });
    }
  };

  /**
   * Serve uploaded files
   */
  getFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, fileId } = req.params;
      
      const categoryDir = path.join(this.uploadDir, category);
      const files = await fs.readdir(categoryDir);
      const matchingFile = files.find(file => file.startsWith(fileId));

      if (!matchingFile) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      const filePath = path.join(categoryDir, matchingFile);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      // Set appropriate headers and send file
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to serve file',
      });
    }
  };

  /**
   * Delete uploaded file
   */
  deleteFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, fileId } = req.params;
      
      const categoryDir = path.join(this.uploadDir, category);
      const files = await fs.readdir(categoryDir);
      const matchingFile = files.find(file => file.startsWith(fileId));

      if (!matchingFile) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      const filePath = path.join(categoryDir, matchingFile);
      await fs.unlink(filePath);

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete file',
      });
    }
  };
}