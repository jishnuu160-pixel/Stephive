import express from 'express';
import multer from 'multer';
import path from 'path';

import { 
    getAdminLogin, 
    postAdminLogin, 
    getDashboard, 
    getCustomers,
    getOrders, 
    toggleUserStatus, 
    updateOrderStatus,
    adminLogout, 
    getOrderDetails,
     updateReturnStatus,
     getChartData,
     getTopProductsApi,
     getTopCategories
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

import {getEditBrandPage,updateBrand,getAddBrandPage,postAddBrand,getTopSellingBrands} from '../controllers/brandController.js';
import {getReturnDetails,getAllReturns} from '../controllers/returnController.js';
import brandRoutes from './brandRoutes.js'

import {deleteCategoryOffer, deleteProductOffer, loadOffersPage, processCategoryOffer, processProductOffer} from '../controllers/offerController.js';
import {downloadCSV, downloadPDF, viewSalesReport}from '../controllers/salesReportController.js';

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
router.get('/api/sales-chart', isAdminAuthenticated, getChartData);
router.get('/api/top-products', isAdminAuthenticated, getTopProductsApi);
router.get('/top-categories',isAdminAuthenticated, getTopCategories);
router.get('/top-brands',isAdminAuthenticated, getTopSellingBrands);
router.get('/customers', isAdminAuthenticated, getCustomers);
router.post('/customers/toggle-status/:id', isAdminAuthenticated, toggleUserStatus);

// --- Admin Order Routes ---
router.get('/orders',isAdminAuthenticated,getOrders);
router.get('/orders/:id',isAdminAuthenticated,getOrderDetails);
router.post('/orders/update/:id',isAdminAuthenticated,updateOrderStatus);


// --- Admin Product Management Routes ---
router.get('/products', isAdminAuthenticated, getProducts);
router.get('/products/add', isAdminAuthenticated, getAddProduct);
router.get('/products/edit/:id',isAdminAuthenticated, getEditProduct);
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


router.get('/offer',isAdminAuthenticated,loadOffersPage);
router.post('/offers/apply-category',isAdminAuthenticated,processCategoryOffer);
router.post('/offers/apply-product',isAdminAuthenticated,processProductOffer);
router.post('/offers/remove-product/:id',isAdminAuthenticated,deleteProductOffer);
router.post('/offers/remove-category/:id',isAdminAuthenticated,deleteCategoryOffer);

router.get('/returns', isAdminAuthenticated, getAllReturns);
router.get('/returns/:id', isAdminAuthenticated, getReturnDetails);
router.post('/returns/update/:id', isAdminAuthenticated, updateReturnStatus);

router.get('/salesReport',isAdminAuthenticated,viewSalesReport);
router.get('/salesReport/download-csv',isAdminAuthenticated,downloadCSV);
router.get('/salesReport/download-pdf',isAdminAuthenticated,downloadPDF);

router.get('/logout', adminLogout);

router.use(
    '/brands',
    isAdminAuthenticated,
    brandRoutes
);

export default router;