import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateSchema } from '../validators/requestValidation.validator.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateProfileSchema,
} from '../validators/schemas.js';

const router = Router();

// Public routes
router.post('/register', validateSchema(registerSchema), AuthController.register);
router.post('/login', validateSchema(loginSchema), AuthController.login);
router.post('/refresh', validateSchema(refreshTokenSchema), AuthController.refreshToken);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, validateSchema(updateProfileSchema), AuthController.updateProfile);
router.put('/change-password', authenticate, validateSchema(changePasswordSchema), AuthController.changePassword);

export default router;
