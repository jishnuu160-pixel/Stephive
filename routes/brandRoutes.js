import express from 'express';
import {getBrand, toggleBrandStatus} from '../controllers/brandController.js';

const router= express.Router();

router.get('/', getBrand);


router.post('/toggle-status/:id', toggleBrandStatus);

export default router;