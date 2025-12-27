import express from 'express';
import { 
  createDepositIntent, 
  processWithdrawal, 
  getBalance, 
  getTransactionHistory 
} from '../services/walletService.js';

const router = express.Router();

// POST /api/wallet/deposit - Create Stripe payment intent
router.post('/deposit', async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'userId and amount are required'
      }
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      error: {
        code: 'INVALID_AMOUNT',
        message: 'Amount must be greater than zero'
      }
    });
  }

  try {
    const result = await createDepositIntent(userId, amount);
    res.json(result);
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      error: {
        code: 'STRIPE_ERROR',
        message: 'Failed to create payment intent',
        details: error.message
      }
    });
  }
});

// POST /api/wallet/withdraw - Initiate withdrawal
router.post('/withdraw', async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'userId and amount are required'
      }
    });
  }

  try {
    const result = await processWithdrawal(userId, amount);
    res.json(result);
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      error: {
        code: 'STRIPE_ERROR',
        message: 'Failed to process withdrawal',
        details: error.message
      }
    });
  }
});

// GET /api/wallet/balance - Get current balance
router.get('/balance/:userId', (req, res) => {
  const { userId } = req.params;

  try {
    const balance = getBalance(userId);
    res.json({ balance });
  } catch (error) {
    res.status(404).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: error.message
      }
    });
  }
});

// GET /api/wallet/transactions - Get transaction history
router.get('/transactions/:userId', (req, res) => {
  const { userId } = req.params;

  try {
    const transactions = getTransactionHistory(userId);
    res.json({ transactions });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
