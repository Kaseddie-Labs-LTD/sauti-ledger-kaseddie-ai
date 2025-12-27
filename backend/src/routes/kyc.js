import express from 'express';
import kycService from '../services/kycService.js';

const router = express.Router();

// Submit KYC verification
router.post('/submit', async (req, res) => {
  try {
    const { userId, idDocument, selfie } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await kycService.submitKYC(userId, {
      idDocument,
      selfie
    });

    res.json(result);
  } catch (err) {
    console.error('KYC submission error:', err);
    res.status(500).json({ error: err.message || 'KYC verification failed' });
  }
});

// Get KYC status
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const status = await kycService.getKYCStatus(userId);
    res.json(status);
  } catch (err) {
    console.error('KYC status error:', err);
    res.status(500).json({ error: err.message || 'Failed to get KYC status' });
  }
});

export default router;
