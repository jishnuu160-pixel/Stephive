// routes/adminRoutes.js
import express from 'express';
import { getAdminLogin, postAdminLogin, getDashboard,  getCustomers, toggleUserStatus } from '../controllers/adminController.js';
import {  isAdminAuthenticated, isLoggedOut, preventCache} from '../middleware/adminAuth.js';

const router = express.Router();

router.get('/login', getAdminLogin);
router.post('/login', postAdminLogin);
router.get('/dashboard', getDashboard);

router.get('/customers', getCustomers);
router.post('/customers/toggle-status/:id', toggleUserStatus);

router.get('/login', (req, res, next) => {
    if (req.session.admin) {
        return res.redirect('/admin/dashboard');
    }
    next(); 
}, getAdminLogin);


router.get('/login', preventCache, isLoggedOut, getAdminLogin);
router.get('/dashboard', preventCache, isAdminAuthenticated, getDashboard);
router.get('/customers', preventCache, isAdminAuthenticated, getCustomers);



router.get('/login', isLoggedOut, getAdminLogin);

export default router;