import express from 'express';
const router= express.Router();

import{getShop, getProductId} from '../controllers/productController.js';

router.get('/shop', getShop);
router.get('/details/:id', getProductId);

export default router;