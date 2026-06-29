import express from 'express';
import multer from 'multer';
import path from 'path';

import { 
    getAdminLogin, 
    postAdminLogin, 
    getDashboard, 
    getCustomers, 
    toggleUserStatus, 
    adminLogout 
} from '../controllers/adminController.js';

import { 
    getProducts,
    getAddProduct,
    getEditProduct,
    postAddProduct,
    postEditProduct,
    toggleProductStatus
} from '../controllers/productController.js';

import {
    getCategories,
    postAddCategory,
    updateCategory,
    getSubcategoriesByParent,
    toggleListing
} from '../controllers/categoryController.js';

import {getEditBrandPage,updateBrand,getAddBrandPage,postAddBrand} from '../controllers/brandController.js';

import brandRoutes from './brandRoutes.js'

import { 
    isAdminAuthenticated, 
    isAdminLoggedOut,
    preventCache
} from '../middleware/adminAuth.js';

const router = express.Router();

router.use(preventCache);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.use((req, res, next) => {
    res.locals.layout = 'admin-layout';
    next();
});

// --- Admin Login Routes ---
router.get('/login', isAdminLoggedOut, getAdminLogin);
router.post('/login', postAdminLogin);

// --- Admin Core Dashboard Routes ---
router.get('/dashboard', isAdminAuthenticated, getDashboard);
router.get('/customers', isAdminAuthenticated, getCustomers);
router.post('/customers/toggle-status/:id', isAdminAuthenticated, toggleUserStatus);

// --- Admin Product Management Routes ---
router.get('/products', isAdminAuthenticated, getProducts);
router.get('/products/add', isAdminAuthenticated, getAddProduct);
router.get(
  '/products/edit/:id',
  isAdminAuthenticated,
  getEditProduct
);

router.post('/products/add', isAdminAuthenticated, upload.any(), postAddProduct);

router.post(
  '/products/edit/:id',
  isAdminAuthenticated,
  upload.any(),
  postEditProduct
);

router.post('/products/toggle-status/:id', isAdminAuthenticated, toggleProductStatus);

router.get('/categories', isAdminAuthenticated, getCategories);
router.post('/categories/toggle-status/:id', isAdminAuthenticated, toggleListing);
router.post('/categories/add', isAdminAuthenticated, postAddCategory);
router.post('/categories/edit/:id', isAdminAuthenticated, updateCategory);
router.get('/categories/:id/subcategories', getSubcategoriesByParent);


router.get('/logout', adminLogout);

router.use(
    '/brands',
    isAdminAuthenticated,
    brandRoutes
);

export default router;