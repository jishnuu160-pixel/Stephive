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
    sendUpdatePasswordOTP,getChangePassword,
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

router.get('/forgot-password', isUserLoggedOut, getForgot);
router.post('/forgot-password', postForgot);

router.get('/verify-otp', getVerifyOTP);
router.post('/verify-otp', postVerifyOTP);

router.get('/reset-password', getResetPassword); 
router.post('/reset-password', postResetPassword);

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

router.get('/profile', isUserAuthenticated, getProfile);
router.get('/edit-profile', preventCache, isUserAuthenticated, getEditProfile);


router.post('/update-profile',preventCache,isUserAuthenticated,postUpdateProfile);

router.get('/logout', userLogout);

router.get('/address',isUserAuthenticated, getAddress);

router.get('/delete-address/:id', isUserAuthenticated, removeAddress);
router.get('/add-address', isUserAuthenticated, getAddAddress);
router.post('/add-address', isUserAuthenticated, postAddAddress);
router.get('/edit-address/:id', isUserAuthenticated, getEditAddress);
router.post('/edit-address/:id', isUserAuthenticated, postEditAddress);

router.get('/send-email-change-otp', isUserAuthenticated, sendEmailChangeOTP);

router.get('/change-email', preventCache, isUserAuthenticated, getChangeEmail);
router.post('/change-email', preventCache, isUserAuthenticated, postChangeEmail);

router.get('/verify-email-change-otp', isUserAuthenticated, getVerifyEmailChangeOTP);
router.post('/verify-email-change-otp', isUserAuthenticated, postVerifyEmailChangeOTP);

router.get('/changepass', isUserAuthenticated, getChangePassword);
router.post('/changepass', isUserAuthenticated, postChangePassword);

router.get('/update-password-init', isUserAuthenticated, sendUpdatePasswordOTP);

router.get('/verify-password-otp', isUserAuthenticated, getVerifyPasswordOTP);
router.post('/verify-password-otp', isUserAuthenticated, postVerifyPasswordOTP);

router.post(
    '/update-avatar',
    isUserAuthenticated,
    uploadAvatar.single('profileImage'), 
    updateAvatar
);

router.get('/get-available-coupons', isUserAuthenticated,getAvailableCouponsAjax);
router.post('/apply-coupon', isUserAuthenticated,applyCoupon);
router.post('/remove-coupon',isUserAuthenticated,removeCoupon);
router.post('/checkout/add-address',isUserAuthenticated,postCheckoutAddAddress);

router.get('/checkout/address/:id', isUserAuthenticated, getAddressForEdit);
router.put('/checkout/edit-address/:id', isUserAuthenticated, handleEditAddress);
router.delete('/checkout/address/:id', isUserAuthenticated, deleteCheckoutAddress);

export default router;