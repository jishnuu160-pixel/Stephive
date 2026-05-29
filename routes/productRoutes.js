import express from 'express';
const router= express.Router();

import{getShop,getMenShopPage, getWomenShopPage, getProductId} from '../controllers/productController.js';


router.get('/shop', getShop);
router.get('/shop/men', getMenShopPage);
router.get('/shop/women', getWomenShopPage);


router.get('/details/:id', getProductId);

export default router;