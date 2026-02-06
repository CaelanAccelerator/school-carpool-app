"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const router = express_1.default.Router();
// User CRUD routes                   
router.put('/', userController_1.createUser); // PUT /users - Create user (idempotent)
router.get('/', userController_1.getUsers); // GET /users - Get all users with filtering
router.get('/:id', userController_1.getUserById); // GET /users/:id - Get user by ID
router.put('/:id', userController_1.updateUser); // PUT /users/:id - Update user
router.patch('/:id/password', userController_1.changePassword); // PATCH /users/:id/password - Change password
router.delete('/:id', userController_1.deleteUser); // DELETE /users/:id - Soft delete user
router.delete('/:id/permanent', userController_1.permanentDeleteUser); // DELETE /users/:id/permanent - Hard delete
exports.default = router;
//# sourceMappingURL=users.js.map