import express from 'express';
const router = express.Router();

// controllers
import * as userController from '../controller/userController.js';

// middleware
import * as auth from '../middleware/auth.js';

// user routes
router.get('/login', auth.isLogin, userController.loadLogin);
router.post('/login', userController.login);

router.get('/signup', auth.isLogin, userController.loadRegister);
router.post('/signup', userController.registerUser);

router.get('/home', auth.checkSession, auth.preventCache, userController.loadHome);
router.get('/logout', auth.checkSession, userController.logout);

export default router;
console.log('userController:', userController);
console.log('auth:', auth);