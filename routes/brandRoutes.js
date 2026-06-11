import express from 'express';
import {getBrand, toggleBrandStatus,getAddBrandPage,postAddBrand, getEditBrandPage,updateBrand} from '../controllers/brandController.js';
import { isAdminAuthenticated } from '../middleware/adminAuth.js';

const router= express.Router();

router.get('/', getBrand);

// brandRoutes.js
router.get('/add', getAddBrandPage);
router.get('/add', isAdminAuthenticated, getAddBrandPage);      
router.post('/add', isAdminAuthenticated, postAddBrand);      

router.get('/edit/:id', isAdminAuthenticated, getEditBrandPage); 
router.post('/edit/:id', isAdminAuthenticated, updateBrand);

router.post('/toggle-status/:id', toggleBrandStatus);

export default router;