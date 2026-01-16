

// Upload constraints & settings
export const uploadConfig = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10), // 10MB default
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  allowedFileTypes: (
    process.env.ALLOWED_FILE_TYPES || 
    "image/jpeg,image/png,image/jpg,application/pdf"
  ).split(","),
};

// Helper to check file type
export const isFileTypeAllowed = (mimetype: string) => {
  return uploadConfig.allowedFileTypes.includes(mimetype);
};