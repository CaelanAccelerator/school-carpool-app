import express from 'express';
import {
  changePassword,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  permanentDeleteUser,
  updateUser
} from '../controllers/userController';
import { authenticate } from '../middleware';

const router = express.Router();

// Public: registration and read-only browsing
router.put('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);

// Protected: mutations
router.put('/:id', authenticate, updateUser);
router.patch('/:id/password', authenticate, changePassword);
router.delete('/:id', authenticate, deleteUser);
router.delete('/:id/permanent', authenticate, permanentDeleteUser);

export default router;
