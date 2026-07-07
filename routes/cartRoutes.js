import express from 'express';

import {
    loadCart,
    addToCart,
    updateQuantity,
    removeFromCart
} from '../controllers/cartController.js';

import { isUserAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', loadCart);

router.post('/add', isUserAuthenticated, addToCart);

router.post('/update-quantity', updateQuantity);

router.delete('/remove', removeFromCart);

export default router;