import express from 'express';
import { getAdminLogin, postAdminLogin, getDashboard, getCustomers, toggleUserStatus, adminLogout } from '../controllers/adminController.js';
import { isAdminAuthenticated, isLoggedOut, preventCache } from '../middleware/adminAuth.js';

const router = express.Router();

router.use(preventCache);

router.get('/login', isLoggedOut, getAdminLogin);
router.post('/login', postAdminLogin);

router.get('/dashboard', isAdminAuthenticated, getDashboard);
router.get('/customers', isAdminAuthenticated, getCustomers);
router.post('/customers/toggle-status/:id', isAdminAuthenticated, toggleUserStatus);

router.get('/logout',  adminLogout);

export default router;