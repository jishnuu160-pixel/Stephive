import express from 'express';
const router = express.Router();

//controller
import * as adminController from '../controller/adminController.js';

// middleware
import * as adminAuth from '../middleware/adminAuth.js';

router.get('/login', adminAuth.isLogin, adminController.loadLogin);
router.post('/login', adminController.login);

router.get('/dashboard', adminAuth.checkSession, adminController.loadDashboard);

router.post('/edit-user', adminAuth.checkSession, adminController.editUser);
router.get('/delete-user/:id', adminAuth.checkSession, adminController.deleteUser);

router.post('/add-user', adminAuth.checkSession, adminController.addUser);

router.get('/logout', adminAuth.checkSession, adminController.logout);

export default router;