const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// All routes need authentication
router.use(authMiddleware);

// GET /api/users - List users (admin only)
router.get('/', userController.listUsers);

// GET /api/users/:id - Get user details
router.get('/:id', userController.getUser);

// PUT /api/users/:id - Update user profile
router.put('/:id', userController.updateUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', userController.deleteUser);

module.exports = router;
