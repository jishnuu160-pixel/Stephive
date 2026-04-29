import express from 'express';
import { 
    getSignup, postSignup, 
    getLogin, postLogin, 
    getProfile, logout,
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
import { isAuthenticated, isLoggedOut,  preventCache } from '../middleware/authMiddleware.js';

import passport from 'passport';

const router = express.Router();


router.get('/', isAuthenticated, (req, res) => {
    res.redirect('/user/profile');
});


router.get('/signup', isLoggedOut, getSignup);
router.post('/signup', isLoggedOut, postSignup); 

router.get('/login', isLoggedOut, getLogin);
router.post('/login', isLoggedOut, postLogin); 


router.get('/forgot-password', isLoggedOut, getForgot);
router.post('/forgot-password', postForgot);

router.get('/verify-otp', getVerifyOTP);
router.post('/verify-otp', postVerifyOTP);

router.get('/reset-password', getResetPassword); 
router.post('/reset-password', postResetPassword);

router.get('/resend-otp', getResendOTP);

router.get('/auth/google', isLoggedOut, passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/user/login?error=Your%20account%20has%20been%20blocked', 
        successRedirect: '/user/profile' 
    }),
    googleAuthSuccess 
);


router.use(isAuthenticated);

router.get('/profile', isAuthenticated, getProfile);
router.get('/edit-profile', preventCache, isAuthenticated, getEditProfile);


router.post('/update-profile', preventCache, isAuthenticated, postUpdateProfile);


router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.clearCookie('connect.sid'); 
        res.redirect('/'); 
    });
});
router.get('/address',isAuthenticated, getAddress);

router.get('/delete-address/:id', isAuthenticated, removeAddress);

router.post('/add-address', isAuthenticated, postAddAddress);
router.post('/edit-address/:id', isAuthenticated, postEditAddress);

router.get('/send-email-change-otp', isAuthenticated, sendEmailChangeOTP);

router.get('/change-email', preventCache, isAuthenticated, getChangeEmail);
router.post('/change-email', preventCache, isAuthenticated, postChangeEmail);

// Add these two lines
router.get('/changepass', isAuthenticated, getChangePassword);
router.post('/changepass', isAuthenticated, postChangePassword);

router.get('/update-password-init', isAuthenticated, sendUpdatePasswordOTP);

router.get('/verify-password-otp', isAuthenticated, getVerifyPasswordOTP);
router.post('/verify-password-otp', isAuthenticated, postVerifyPasswordOTP);



router.post('/update-avatar', isAuthenticated, uploadAvatar.single('profileImage'),updateAvatar);


export default router;