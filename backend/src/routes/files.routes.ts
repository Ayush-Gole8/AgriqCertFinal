import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.js';
import { FileUploadController } from '../controllers/FileUploadController.js';

const router = express.Router();
const fileUploadController = new FileUploadController();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png', 
      'image/heic',
      'image/heif',
      // Documents
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Cast to any to satisfy multer's callback typing in this TS setup
      cb(new Error('Invalid file type') as any, false);
    }
  },
});

// Generate presigned upload URL
router.post('/generate-upload-url', 
  authenticate,
  authorize('qa_inspector', 'admin'),
  fileUploadController.generatePresignedUrl
);

// Upload file using presigned URL  
router.post('/upload/:category/:fileId',
  upload.single('file'),
  fileUploadController.uploadFile
);

// Get file
router.get('/:category/:fileId',
  fileUploadController.getFile
);

// Delete file
router.delete('/:category/:fileId',
  authenticate,
  authorize('qa_inspector', 'admin'),
  fileUploadController.deleteFile
);

export default router;