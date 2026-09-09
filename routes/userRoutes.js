import express from 'express';
import { 
    getSignup, postSignup, 
    getLogin, postLogin, 
    getProfile, userLogout,
    getForgot, postForgot,
    getVerifyOTP, postVerifyOTP,
    getResetPassword, postResetPassword,
    getAddress,postAddAddress,
    removeAddress,getEditAddress,
    postEditAddress,
    postUpdateProfile,getAddAddress,getEditProfile,
    getChangeEmail, postChangeEmail,
    getChangePassword,
    getVerifyPasswordOTP,getResendOTP,
    postChangePassword,postVerifyPasswordOTP,
    sendEmailChangeOTP,googleAuthSuccess
    ,updateAvatar,resendSignupOTP,
    getAbout, deleteCheckoutAddress,
    getPrivacy,handleEditAddress,
    getTerms,getAddressForEdit,
    getContact,postCheckoutAddAddress,
    getVerifyEmailChangeOTP,postVerifyEmailChangeOTP
} from '../controllers/userController.js';
import { getAvailableCouponsAjax,applyCoupon, removeCoupon} from '../controllers/couponController.js';
import { isUserAuthenticated, isUserLoggedOut,  preventCache } from '../middleware/authMiddleware.js';
import {uploadAvatar} from '../middleware/upload.middleware.js';
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage() });


import passport from 'passport';

const router = express.Router();


router.get('/', isUserAuthenticated, (req, res) => {
    res.redirect('/user/profile');
});


router.get('/signup', isUserLoggedOut, getSignup);
router.post('/signup', isUserLoggedOut, postSignup); 

router.get('/login', isUserLoggedOut, getLogin);
router.post('/login', isUserLoggedOut, postLogin); 

router.get('/forgot-password',preventCache, isUserLoggedOut, getForgot);
router.post('/forgot-password',preventCache, postForgot);

router.get('/verify-otp',preventCache, getVerifyOTP);
router.post('/verify-otp',preventCache, postVerifyOTP);

router.get('/reset-password',preventCache, getResetPassword); 
router.post('/reset-password',preventCache, postResetPassword);

router.get('/resend-otp', getResendOTP);
router.get('/resend-signup-otp', resendSignupOTP);

router.get('/auth/google', isUserLoggedOut, passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

const preserveAdmin=(req,res,next)=>{
    if(req.session.admin){
        req._tempAdmin=req.session.admin;
    }
    next();
};

router.get('/auth/google/callback',
    preserveAdmin, 
    passport.authenticate('google', { 
        failureRedirect: '/user/login',
        failureFlash: true 
    }),

    (req,res,next)=>{
        if(req._tempAdmin){
            req.session.admin= req._tempAdmin;
        }
        next();
    },
    googleAuthSuccess
);


router.get('/about',getAbout);
router.get('/terms',getTerms);
router.get('/privacy',getPrivacy);
router.get('/contact',getContact);

router.use(isUserAuthenticated);
router.use(preventCache);

router.get('/profile', getProfile);
router.get('/edit-profile', getEditProfile);


router.post('/update-profile', postUpdateProfile);

router.get('/logout', userLogout);

router.get('/address', getAddress);

router.get('/delete-address/:id', removeAddress);
router.get('/add-address', getAddAddress);
router.post('/add-address', postAddAddress);
router.get('/edit-address/:id', getEditAddress);
router.post('/edit-address/:id', postEditAddress);

router.get('/send-email-change-otp', sendEmailChangeOTP);

router.get('/change-email', getChangeEmail);
router.post('/change-email', postChangeEmail);

router.get('/verify-email-change-otp', getVerifyEmailChangeOTP);
router.post('/verify-email-change-otp', postVerifyEmailChangeOTP);

router.get('/changepass', getChangePassword);
router.post('/changepass', postChangePassword);

router.get('/verify-password-otp', getVerifyPasswordOTP);
router.post('/verify-password-otp', postVerifyPasswordOTP);

router.post(
    '/update-avatar',
    isUserAuthenticated,
    uploadAvatar.single('profileImage'), 
    updateAvatar
);

router.get('/get-available-coupons', getAvailableCouponsAjax);
router.post('/apply-coupon', applyCoupon);
router.post('/remove-coupon', removeCoupon);
router.post('/checkout/add-address', postCheckoutAddAddress);

router.get('/checkout/address/:id', getAddressForEdit);
router.put('/checkout/edit-address/:id', handleEditAddress);
router.delete('/checkout/address/:id', deleteCheckoutAddress);

export default router;