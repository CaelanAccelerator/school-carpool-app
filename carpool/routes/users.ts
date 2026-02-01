import express from 'express';
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  permanentDeleteUser
} from '../controllers/userController';

const router = express.Router();

// User CRUD routes                   
router.put('/', createUser);                     // PUT /users - Create user (idempotent)
router.get('/', getUsers);                       // GET /users - Get all users with filtering
router.get('/:id', getUserById);                 // GET /users/:id - Get user by ID
router.put('/:id', updateUser);                  // PUT /users/:id - Update user
router.patch('/:id/password', changePassword);   // PATCH /users/:id/password - Change password
router.delete('/:id', deleteUser);               // DELETE /users/:id - Soft delete user
router.delete('/:id/permanent', permanentDeleteUser); // DELETE /users/:id/permanent - Hard delete

export default router;