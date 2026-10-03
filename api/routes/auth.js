const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register - Register new user
router.post('/register', authController.register);

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authController.refreshToken);

// GET /api/auth/me - Get current user info
router.get('/me', authController.getCurrentUser);

// POST /api/auth/logout - Logout (invalidate session)
router.post('/logout', authController.logout);

module.exports = router;
