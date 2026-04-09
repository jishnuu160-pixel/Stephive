import express from 'express';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// 🔹 User Routes

// Signup
router.get('/signup', userController.getSignup);
router.post('/signup', userController.postSignup);

// Login
router.get('/login', userController.getLogin);
router.post('/login', userController.postLogin);

// // Logout (optional)
// router.get('/logout', userController.logout);

export default router;