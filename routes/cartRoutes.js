import express from 'express';

import {
    loadCart,
    addToCart,
    updateQuantity,
    removeFromCart
} from '../controllers/cartController.js';

const router = express.Router();

router.get('/', loadCart);

router.post('/add', addToCart);

router.post('/update-quantity', updateQuantity);

router.delete('/remove', removeFromCart);

export default router;