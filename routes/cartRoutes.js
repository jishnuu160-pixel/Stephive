import express from 'express';
import { 
    addToCart, 
    getCartPage, 
    updateQuantityInline, 
    removeProduct 
} from '../controllers/cartController.js';

const router = express.Router();

router.get('/cart', getCartPage);


router.post('/update-quantity', updateQuantityInline);

router.delete('/remove', removeProduct);

export default router;