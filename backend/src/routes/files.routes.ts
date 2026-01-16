import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { FileUploadController } from '../controllers/fileUpload.controller.js';
import { singleFileUpload } from '../middleware/fileUpload.middleware.js';

const router = express.Router();
const fileUploadController = new FileUploadController();

// Generate presigned upload URL
router.post('/generate-upload-url',
  authenticate,
  authorize('qa_inspector', 'admin'),
  fileUploadController.generatePresignedUrl
);

// Upload file using presigned URL  
router.post('/upload/:category/:fileId',
  singleFileUpload,
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
