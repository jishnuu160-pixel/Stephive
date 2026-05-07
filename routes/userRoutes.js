import express from 'express';
import { 
    getSignup, postSignup, 
    getLogin, postLogin, 
    getProfile, userLogout,
    getForgot, postForgot,
    getVerifyOTP, postVerifyOTP,
    getResetPassword, postResetPassword,
    getAddress,postAddAddress,
    removeAddress,postEditAddress,
    postUpdateProfile,getEditProfile,
    getChangeEmail, postChangeEmail,
    sendUpdatePasswordOTP,getChangePassword,
    getVerifyPasswordOTP,getResendOTP,
    postChangePassword,postVerifyPasswordOTP,
    updateAvatar,uploadAvatar,
    sendEmailChangeOTP,googleAuthSuccess
} from '../controllers/userController.js';
import { isUserAuthenticated, isUserLoggedOut,  preventCache } from '../middleware/authMiddleware.js';

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

router.get('/auth/google', isUserLoggedOut, passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/user/login',
        failureFlash: true 
    }),
    googleAuthSuccess
);

router.use(isUserAuthenticated);

router.get('/profile', isUserAuthenticated, getProfile);
router.get('/edit-profile', preventCache, isUserAuthenticated, getEditProfile);


router.post('/update-profile', preventCache, isUserAuthenticated, postUpdateProfile);

router.get('/logout', userLogout);

router.get('/address',isUserAuthenticated, getAddress);

router.get('/delete-address/:id', isUserAuthenticated, removeAddress);

router.post('/add-address', isUserAuthenticated, postAddAddress);
router.post('/edit-address/:id', isUserAuthenticated, postEditAddress);

router.get('/send-email-change-otp', isUserAuthenticated, sendEmailChangeOTP);

router.get('/change-email', preventCache, isUserAuthenticated, getChangeEmail);
router.post('/change-email', preventCache, isUserAuthenticated, postChangeEmail);

router.get('/changepass', isUserAuthenticated, getChangePassword);
router.post('/changepass', isUserAuthenticated, postChangePassword);

router.get('/update-password-init', isUserAuthenticated, sendUpdatePasswordOTP);

router.get('/verify-password-otp', isUserAuthenticated, getVerifyPasswordOTP);
router.post('/verify-password-otp', isUserAuthenticated, postVerifyPasswordOTP);



router.post('/update-avatar', isUserAuthenticated, uploadAvatar.single('profileImage'),updateAvatar);


export default router;