import express from 'express';
import { login, logout, me, refresh } from '../controllers/authController';
import { authenticate } from '../middleware';

const router = express.Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authenticate, me);
router.post('/logout', logout);

export default router;
