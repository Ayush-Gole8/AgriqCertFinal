import { Router } from 'express';
import { User } from '../models/user.model.js';
import { Certificate } from '../models/certificate.model.js';
import { walletService } from '../services/wallet.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/errorHandler.middleware.js';

const router = Router();

/**
 * @route   GET /api/wallet/status
 * @desc    Get wallet linking status for authenticated user
 * @access  Private (Farmer)
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const walletId = (user as unknown as { walletId?: string }).walletId;
    const isLinked = !!walletId;

    res.json({
      success: true,
      data: {
        linked: isLinked,
        walletId: walletId || null,
        linkedAt: (user as unknown as { walletLinkedAt?: Date }).walletLinkedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/wallet/link
 * @desc    Link user's Inji Wallet ID
 * @access  Private (Farmer)
 */
router.post('/link', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { walletId } = req.body;

    if (!walletId || typeof walletId !== 'string') {
      throw new AppError(400, 'Valid walletId is required');
    }

    // Update user with wallet ID
    const user = await User.findByIdAndUpdate(
      userId,
      {
        walletId,
        walletLinkedAt: new Date(),
      },
      { new: true }
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      message: 'Wallet linked successfully',
      data: {
        linked: true,
        walletId,
        linkedAt: (user as unknown as { walletLinkedAt?: Date }).walletLinkedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/wallet/unlink
 * @desc    Unlink user's Inji Wallet
 * @access  Private (Farmer)
 */
router.delete('/unlink', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $unset: { walletId: 1, walletLinkedAt: 1 },
      },
      { new: true }
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      message: 'Wallet unlinked successfully',
      data: {
        linked: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/wallet/credentials
 * @desc    Get all credentials with wallet metadata for user
 * @access  Private (Farmer)
 */
router.get('/credentials', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    // Get all certificates for user's batches
    const certs = await Certificate.find({})
      .populate({
        path: 'batchId',
        match: { farmerId: userId },
        select: 'batchNumber productName farmerId',
      })
      .sort({ issuedAt: -1 });

    // Filter out certs where batchId is null (doesn't match user)
    const userCerts = certs.filter(cert => (cert as unknown as { batchId?: unknown }).batchId !== null);

    const certList = userCerts.map(cert => ({
      id: cert.id,
      batchNumber: (cert as unknown as { batchId?: { batchNumber?: string } }).batchId?.batchNumber,
      productName: (cert as unknown as { batchId?: { productName?: string } }).batchId?.productName,
      issuedAt: cert.issuedAt,
      status: cert.status,
      walletMetadata: {
        pushEnabled: cert.walletMetadata?.pushEnabled ?? true,
        pushStatus: cert.walletMetadata?.pushStatus || 'pending',
        pushAttempts: cert.walletMetadata?.pushAttempts || 0,
        lastPushAttempt: cert.walletMetadata?.lastPushAttempt,
        walletDeeplink: cert.walletMetadata?.walletDeeplink,
        pushError: cert.walletMetadata?.pushError,
        receivedAt: cert.walletMetadata?.receivedAt,
      },
    }));

    res.json({
      success: true,
      data: {
        count: certList.length,
        certificates: certList,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/wallet/push/:certificateId
 * @desc    Manually trigger wallet push for a certificate
 * @access  Private (Farmer)
 */
router.post('/push/:certificateId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { certificateId } = req.params;

    // Verify certificate belongs to user
    const cert = await Certificate.findById(certificateId).populate('batchId');
    if (!cert) {
      throw new AppError(404, 'Certificate not found');
    }

    if ((cert as unknown as { batchId?: { farmerId?: { toString(): string } } }).batchId?.farmerId?.toString() !== userId) {
      throw new AppError(403, 'Access denied');
    }

    // Trigger wallet push
    const result = await walletService.pushToWallet(certificateId, userId);

    res.json({
      success: result.success,
      message: result.success 
        ? 'Certificate pushed to wallet' 
        : result.reason || 'Wallet push failed',
      data: {
        pushStatus: result.success ? 'sent' : 'failed',
        deeplink: result.deeplink,
        error: result.error,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/wallet/deeplink/:certificateId
 * @desc    Get wallet deeplink for a certificate
 * @access  Private (Farmer)
 */
router.get('/deeplink/:certificateId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { certificateId } = req.params;

    // Verify certificate belongs to user
    const cert = await Certificate.findById(certificateId).populate('batchId');
    if (!cert) {
      throw new AppError(404, 'Certificate not found');
    }

    if ((cert as unknown as { batchId?: { farmerId?: { toString(): string } } }).batchId?.farmerId?.toString() !== userId) {
      throw new AppError(403, 'Access denied - not your certificate');
    }

    // Generate deeplink
    const deeplink = await walletService.generateDeeplink(certificateId, cert);

    res.json({
      success: true,
      data: {
        deeplink,
        certificateId,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
