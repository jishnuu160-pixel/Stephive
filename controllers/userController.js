import * as userService from '../services/userServices.js';
import { error, profile } from 'console';
import { title } from 'process';
import { generateOTP } from '../utils/otpUtils.js';
import { sendOtpEmail } from '../utils/sendOtpEmail.js';
import { HTTP_STATUS } from '../constants/httpStatusCode.js';

export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "No file uploaded" });
        }

        const cloudinaryUrl = await userService.updateAvatar(req.session.user.id, req.file.buffer);
        req.session.user.profileImage = cloudinaryUrl;

        return res.status(HTTP_STATUS.OK).json({
            success: true,
            message: "Profile image updated successfully"
        });

    } catch (err) {
        console.error("Avatar Update Error:", err);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
};

export const getLogin = (req, res) => {
    res.render('user/login', {
        layout: 'main', 
        isLogin: true
    });
};

export const getSignup = (req, res) => {
    const formData = req.session.signupData || {};
    const error = req.query.error || null;

    res.render('user/signup', {
        formData,
        error
    });
};

export const postSignup = async (req, res, next) => {
    try {
        const { email, phoneNumber } = req.body;

        req.session.signupData = req.body;

        const otp = await userService.sendSignupOTP(email);

        req.session.otp = otp;
        req.session.otpExpiryTime = Date.now() + 60 * 1000; 

        req.session.save((err) => {
        if (err) {
        console.error("Session Save Error:", err);
        return res.redirect(
            '/user/signup?error=' +
            encodeURIComponent("Session error, please try again.")
        );
    }
    res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=signup`);
});
} catch (err) {
        console.error("Signup Error:", err.message);
        res.redirect('/user/signup?error=' + encodeURIComponent(err.message));
    }
};


export const postVerifyOTP = async (req, res, next) => {
    console.log("\n========== OTP VERIFICATION DEBUG START ==========");
    console.log("1. req.body received:", req.body);
    console.log("2. Session signupData exists?", !!req.session.signupData);
    console.log("3. Session OTP stored:", req.session.otp);
    console.log("==================================================\n");

    try {
        const email = req.query.email || req.body.email;
        const target = req.query.target || req.body.target || (req.session.signupData ? 'signup' : '');
        
        let otp = req.body.otp;
        if (Array.isArray(otp)) {
            otp = otp.join('');
        }
        if (!otp && typeof req.body === 'object') {
            otp = Object.values(req.body)
                .filter(val => typeof val === 'string' && val.trim().length === 1)
                .join('');
        }

        if (req.session.signupData) {
            if (!req.session.otp) {
                return res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=signup&error=` + encodeURIComponent("Session expired. Please sign up again."));
            }
            if (Date.now() > req.session.otpExpiryTime) {
                return res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=signup&error=` + encodeURIComponent("OTP has expired."));
            }

            if (String(req.session.otp).trim() !== String(otp).trim()) {
                return res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=signup&error=` + encodeURIComponent("Invalid OTP code."));
            }

            const newUser = await userService.signup(req.session.signupData);

            const generatedId = (newUser._id || newUser.id).toString();

            req.session.user = {
                id: generatedId,
                _id: generatedId,
                name: newUser.fullName,
                fullName: newUser.fullName,
                email: newUser.email,
                phoneNumber: newUser.phoneNumber
            };
            
            delete req.session.otp;
            delete req.session.otpExpiryTime;
            delete req.session.signupData;

            return res.redirect('/shop?success=' + encodeURIComponent("Account created successfully!"));
        } 
        
        else {
            await userService.verifyOTP(email, otp);

            if (target === 'email') {
                return res.redirect(`/user/change-email?verified=true`);
            } else if (target === 'updatepassword') {
                return res.redirect(`/user/changepass?email=${encodeURIComponent(email)}&verified=true`);
            } else {
                return res.redirect(`/user/reset-password?email=${encodeURIComponent(email)}`);
            }
        }

    } catch (err) {
        console.error("Verification Error:", err.message);
        const email = req.query.email || req.body.email;
        const target = req.query.target || req.body.target || (req.session.signupData ? 'signup' : '');
        return res.redirect(`/user/verify-otp?error=${encodeURIComponent(err.message)}&email=${encodeURIComponent(email || '')}&target=${encodeURIComponent(target)}`);
    }
};

export const postLogin = async (req, res) => {
    try {
        const user = await userService.login(req.body);

        if (user.isBlocked) {  
            req.flash('error', "Your account has been blocked by admin.");
            return res.redirect('/user/login');
        }
        
        req.session.user = {
            id: user._id,
            name: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            gender: user.gender
        };

        req.session.save((err) => {
            if (err) return next(err);
            res.redirect('/shop'); 
        });
    } catch (err) {
        req.flash('error', err.message);
        res.redirect('/user/login');      
    }
};

export const postForgot = async (req, res) => {
    try {
        const { email } = req.body;
 
        if (!email || email.trim() === "") {
            return res.redirect('/user/forgot-password?error=' + encodeURIComponent("Please enter your email address."));
        }
        await userService.sendOTP(email);
  
        req.session.otpExpiryTime=Date.now() + 60000;

       res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=forgot`);
    } catch (err) {
        console.log("ERROR:", err.message);
        res.redirect('/user/forgot-password?error=' + encodeURIComponent(err.message));
    }
};


export const postResetPassword = async (req, res) => {
    const { email, password, confirmPassword,target } = req.body;

    try {
        if (password !== confirmPassword) {
            return res.render('user/reset-password', { 
                error: "Passwords do not match", 
                email 
            });
        }
        await userService.resetPassword(email, password);

        res.redirect('/user/login?success=Password updated successfully');   
    } catch (err) {
        console.error("Forgot Password Reset Error:", err.message);
        res.render('user/reset-password', { 
            error: "Reset failed: " + err.message, 
            email 
        });
    }
};

export const getVerifyOTP = (req, res) => {
    res.render('user/verify-otp', {
        email: req.query.email,
        error: req.query.error,
        target: req.query.target,
        isPasswordUpdate: req.query.isPasswordUpdate === 'true',
        otpExpiryTime:req.session.otpExpiryTime
    });
};

export const getResendOTP = async (req, res) => {
    try {
        const { isPasswordUpdate } = req.query;
        const target = req.query.target || (req.session.signupData ? 'signup' : '');
        const email = req.query.email || req.session.signupData?.email;

        if (!email && target !== 'signup') {
            return res.redirect('/user/login?error=' + encodeURIComponent('Email missing, please try again.'));
        }

        if (target === 'signup') {
            if (!req.session.signupData || !req.session.signupData.email) {
                return res.redirect('/user/signup?error=' + encodeURIComponent('Session expired. Please sign up again.'));
            }
            const signupEmail = req.session.signupData.email;
            const newOtp = await userService.sendSignupOTP(signupEmail);
            req.session.otp = newOtp;
            req.session.otpExpiryTime = Date.now() + 60 * 1000;
        } else {
            await userService.sendOTP(email);
            req.session.otpExpiryTime = Date.now() + 60000;
        }

        const redirectPath = (isPasswordUpdate === 'true') 
            ? '/user/verify-password-otp' 
            : '/user/verify-otp';

        const activeEmail = target === 'signup' ? req.session.signupData.email : email;

        req.session.save((err) => {
            if (err) console.error("Session Save Error on Resend:", err);
            
            res.redirect(`${redirectPath}?email=${encodeURIComponent(activeEmail)}&target=${encodeURIComponent(target)}&success=` + encodeURIComponent('A new OTP code has been sent!'));
        });

    } catch (err) {
        console.error("Resend Error:", err);
        const target = req.query.target || (req.session.signupData ? 'signup' : '');
        const email = req.query.email || req.session.signupData?.email || '';
        
        return res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=${encodeURIComponent(target)}&error=` + encodeURIComponent(err.message || 'Failed to resend OTP'));
    }
};

export const getForgot = (req, res) => {
    res.render('user/forgot-password', {
        error: req.query.error,
        success: req.query.success
    });
};

export const getResetPassword = (req, res) => { 
    const { email } = req.query;

    if (!email) {
        return res.redirect('/user/forgot-password?error=' + encodeURIComponent("Invalid reset link. Please try again."));
    }

    res.render('user/reset-password', {
        email: email,
        error: req.query.error
    });
};

export const userLogout = (req, res) => {
    delete req.session.user;

    if (req.session.passport) {
        delete req.session.passport.user;
    }

    req.user = null;

    req.flash("success","Logout successfully");

    req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate');
        res.redirect('/user/login');
    });
};


export const getProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await userService.getUserById(userId);

        if (!user) {
            console.log("User not found in database");
            return res.redirect('/user/login');
        }

      res.render('user/profile', {
    user,
    timestamp: Date.now(),
    activePage:'profile'
});
    } catch (error) {
       
        console.error("Profile Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send(error.message);
    }
};


export const getAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await userService.getUserById(userId);

        if (user && user.addresses) {
            console.log("Addresses found in DB:", user.addresses.length);
        } else {
            console.log("No addresses or user found in DB");
        }

        res.render('user/address', { user, activePage: 'address' });
    } catch (error) {
        res.redirect('/');
    }
};

export const getAddAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await userService.getUserById(userId);

        res.render('user/add-address', {
            user,
            timestamp: Date.now(),
            activePage: 'address'
        });
    } catch (error) {
        res.redirect('/user/address');
    }
};

export const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;

        await userService.addAddress(userId, {
            ...req.body,
            isDefault: req.body.isDefault === 'on'
        });
        req.flash('success', 'Address added successfully');
        
        res.redirect('/user/address');

    } catch (error) {

        const user = await userService.getUserById(
            req.session.user.id
        );

        if (error.validationErrors) {

            const allFieldsEmpty =
                !req.body.fullName?.trim() &&
                !req.body.phone?.trim() &&
                !req.body.street?.trim() &&
                !req.body.city?.trim() &&
                !req.body.state?.trim() &&
                !req.body.pincode?.trim();

            return res.render('user/add-address', {
                user,
                activePage: 'address',
                timestamp: Date.now(),
                formData: req.body,
                errors: allFieldsEmpty ? {} : error.validationErrors,
                error: allFieldsEmpty
                    ? "All fields are required"
                    : null
            });
        }

        console.error(error);

        res.render('user/add-address', {
            user,
            activePage: 'address',
            timestamp: Date.now(),
            formData: req.body,
            error: error.message || "Something went wrong"
        });
    }
};

export const removeAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id; 
        
        await userService.deleteAddress(userId, addressId);
        req.flash('success',"Address deleted successfully");
        
        res.redirect('/user/address');
    } catch (error) {
        res.redirect('/user/address');
    }
};

export const postEditAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;

        const updatedData = {
            ...req.body,
            isDefault: req.body.isDefault === 'on'
        };

        await userService.editAddress(userId, addressId, updatedData);
        req.flash("success", "Address updated Successfully");
        res.redirect('/user/address');

    } catch (error) {
        const user = await userService.getUserById(req.session.user.id);

        const dbAddress = user.addresses.find(addr => addr._id.toString() === req.params.id);
        
        const mergedAddress = { ...dbAddress, ...req.body };

        if (error.validationErrors) {
            return res.render('user/edit-address', {
                user, 
                address: mergedAddress, 
                errors: error.validationErrors,
                activePage: 'address'
            });
        }

        console.error("Edit Error:", error);
        res.render('user/edit-address', {
            user,
            address: mergedAddress,
            error: "Something went wrong",
            activePage: 'address'
        });
    }
};

export const getEditAddress = async (req, res) => {
    try {
        const user = await userService.getUserById(
            req.session.user.id
        );

        const address = user.addresses.find(
            addr => addr._id.toString() === req.params.id
        );

        if (!address) {
            return res.redirect('/user/address');
        }

        res.render('user/edit-address', {
             user, 
            address,
            activePage: 'address',
            timestamp: Date.now()
        });

    } catch (error) {
        console.error(error);
        res.redirect('/user/address');
    }
};

export const postUpdateProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        await userService.updateProfile(userId, req.body);

        req.session.user = { ...req.session.user, ...req.body };
        req.session.save(() => res.redirect('/user/profile?success=Updated'));
    } catch (error) {
        const user = await userService.getUserById(req.session.user.id);
        
        res.render('user/edit-profile', { 
            user: { ...user, ...req.body }, 
            errors: error.validationErrors,
            activePage: 'profile'
        });
    }
};

export const getEditProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const user = await userService.getUserById(userId);

        if (!user) return res.redirect('/user/login');

        res.render('user/edit-profile', { 
            user,
            errors:{},
            title: "Edit Profile",
            se: 'profile' 
        });
    } catch (error) {
        console.error("GET Edit Profile Error:", error);
        res.redirect('/user/profile');
    }
};


export const sendUpdatePasswordOTP = async (req, res) => {
    try {
        const email = req.session.user.email;
        await userService.sendOTP(email);

        req.session.otpExpiryTime = Date.now() + 60000; 

        res.redirect(`/user/verify-otp?email=${email}&target=updatepassword`);
    } catch (err) {
        res.redirect('/user/profile?error=Could not send verification code');
    }
};

export const getVerifyPasswordOTP = (req, res) => {
    res.render('user/verify-otp', {
        email: req.query.email,
        isPasswordUpdate: true ,
        otpExpiryTime:req.session.otpExpiryTime
    });
};


export const postVerifyPasswordOTP = async (req, res) => {
    try {
        const email = req.query.email || req.body.email;
        const target = req.query.target || req.body.target || 'updatepassword';

        let otp = req.body.otp;
        if (Array.isArray(otp)) {
            otp = otp.join('');
        }
        if (!otp && typeof req.body === 'object') {
            otp = Object.values(req.body)
                .filter(val => typeof val === 'string' && val.trim().length === 1)
                .join('');
        }

        await userService.verifyOTP(email, otp);

        res.redirect(`/user/changepass?email=${encodeURIComponent(email)}&verified=true&target=${encodeURIComponent(target)}`);

    } catch (err) {
        console.error("Verification Error:", err.message);
        
        const email = req.query.email || req.body.email || '';
        const target = req.query.target || req.body.target || 'updatepassword';

        res.redirect(`/user/verify-password-otp?error=${encodeURIComponent(err.message)}&email=${encodeURIComponent(email)}&target=${encodeURIComponent(target)}&isPasswordUpdate=true`);
    }
};

export const getChangeEmail = (req, res) => {
    res.render('user/change-email', { 
        user: req.session.user,
        title: "Change Email" 
    });
};

export const postChangeEmail = async (req, res) => {
    try {
        const { newEmail } = req.body;
        const userId = req.session.user.id;
        const currentEmail = req.session.user.email;

        await userService.changeEmailService(userId, currentEmail, newEmail);

        req.session.user.email = newEmail.trim().toLowerCase();
        req.flash('success', "Email updated successfully!");

        req.session.save((err) => {
            if (err) return res.redirect('/user/profile?error=Session sync failed');
            res.redirect('/user/profile');
        });

    } catch (error) {
        console.error("Change Email Error:", error);

        if (error.isValidation) {
            return res.render('user/change-email', { 
                error: error.message, 
                user: req.session.user,
                title: "Change Email"
            });
        }

        res.redirect('/user/profile?error=Something went wrong. Please try again.');
    }
};

export const getChangePassword = (req, res) => {
    if (!req.query.verified) {
        return res.redirect('/user/profile'); 
    }

    res.render('user/reset-password', {
        email: req.query.email,
        target: 'updatepassword',
        title: "Create New Password",
        isLoggedIn: true 
    });
};

export const postChangePassword = async (req, res) => {
    const { email, oldPassword, password, confirmPassword } = req.body;
    
    try {
        if (password !== confirmPassword) {
            return res.render('user/reset-password', { 
                error: "New passwords do not match", 
                email, 
                oldPassword: oldPassword || '', 
                isLoggedIn: true 
            });
        }

        await userService.changePasswordWithOld(email, oldPassword, password);
        
        req.flash('success', 'Password updated successfully');
        req.session.save(() => {
            res.redirect('/user/profile');
        });
    } catch (err) {
        res.render('user/reset-password', { 
            error: err.message, 
            email, 
            oldPassword: oldPassword || '', 
            isLoggedIn: true 
        });
    }
};


export const sendEmailChangeOTP = async (req, res) => {
    try {
        const email = req.session.user.email; 
        await userService.sendOTP(email);

        req.session.otpExpiryTime = Date.now() + 60000; 

        res.redirect(`/user/verify-otp?email=${email}&target=email`);
    } catch (err) {
        res.redirect('/user/profile?error=' + encodeURIComponent("Failed to send verification code"));
    }
};

export const googleAuthSuccess = (req, res) => {
    const user = req.user;
    const adminData = req.session.admin;

    if (user.isBlocked) {
        if (req.session.passport) {
            delete req.session.passport.user; 
        }

        req.user = null; 

        return req.session.save((err) => {
            if (err) console.error("Session save error:", err);
            res.redirect('/user/login?error=' + encodeURIComponent("Your account has been blocked by admin"));
        });
    }

   
    req.session.user = {
        id: user._id,
        name: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        profileImage: user.profileImage,
        gender: user.gender 
    };
        if(adminData){
            req.session.admin= adminData;
        }

    req.session.save((err) => {
        if (err) return res.redirect('/user/login?error=Session+Error');
        res.redirect('/'); 
    });
};


export const getAbout = async (req, res) => {
    try {
        res.render('user/about', { 
            user: req.session.user
        });
    } catch (error) {
        console.error("About Error:", error);
        res.redirect('/');
    }
};


export const getTerms= async(req,res)=>{
    try{
       res.render('user/terms');
    }catch(error){
       res.redirect('/');
    }
};

export const getPrivacy= async(req,res)=>{
    try{
       res.render('user/privacy');
    }catch(error){
       res.redirect('/');
    }
};

export const getContact= async(req,res)=>{
    try{
        res.render('user/contactUs');
    }catch(error){
        res.redirect('/');
    }
}


export const removeCoupon = async (req, res) => {
    try {
        req.session.appliedCouponCode = null;
        
        req.session.save((err) => {
            if (err) {
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Session error" });
            }
            return res.status(HTTP_STATUS.OK).json({ success: true, message: "Coupon removed successfully" });
        });
    } catch (error) {
        console.error("Remove Coupon Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to remove coupon" });
    }
};

export const postCheckoutAddAddress = async (req, res) => {
    console.log("=== DEBUG ADD ADDRESS ===");
    console.log("Session User:", req.session.user);
    console.log("Request Body:", req.body);
    
    try {
        const userId = req.session.user?.id || req.session.user?._id;
        console.log("Resolved User ID:", userId);

        await userService.addAddress(userId, {
            ...req.body,
            isDefault: req.body.isDefault === 'on' || req.body.isDefault === true
        });

        return res.status(HTTP_STATUS.OK).json({ success: true, message: "Address added successfully" });
    } catch (error) {
        console.error("Controller Error:", error);
        if (error.validationErrors) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, errors: error.validationErrors });
        }
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message });
    }
};

export const getAddressForEdit = async (req, res) => {
    try {
        let sessionUser = req.session.userId || req.session.user;
        const userId = typeof sessionUser === 'object' ? (sessionUser.id || sessionUser._id) : sessionUser;
        
        const addressId = req.params.id;

        const address = await userService.getAddressByIdService(userId, addressId);
        
        if (!address) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Address not found" });
        }

        res.status(HTTP_STATUS.OK).json({ success: true, address });
    } catch (err) {
        console.error("getAddressForEdit error:", err);
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message || "Could not retrieve address" });
    }
};

export const handleEditAddress = async (req, res) => {
    try {
        let sessionUser = req.session.userId || req.session.user;
        const userId = typeof sessionUser === 'object' ? (sessionUser.id || sessionUser._id) : sessionUser;
        const addressId = req.params.id;

        const updatedAddress = await userService.editAddressCheckout(userId, addressId, req.body);
        res.status(HTTP_STATUS.OK).json({ success: true, message: "Address updated successfully", address: updatedAddress });
    } catch (err) {
        if (err.validationErrors) {
            return res.status(HTTP_STATUS.OK).json({ success: false, errors: err.validationErrors });
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || "Internal server error" });
    }
};

export const deleteCheckoutAddress = async (req, res) => {
    try {
        let sessionUser = req.session.userId || req.session.user;
        const userId = typeof sessionUser === 'object' ? (sessionUser.id || sessionUser._id) : sessionUser;
        const addressId = req.params.id;

        await userService.deleteAddressService(userId, addressId); 
        res.status(HTTP_STATUS.OK).json({ success: true, message: "Address deleted successfully" });
    } catch (err) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message || "Internal server error" });
    }
};

export const resendSignupOTP = async (req, res) => {
    try {
        if (!req.session.signupData || !req.session.signupData.email) {
            return res.redirect('/user/signup?error=' + encodeURIComponent("Session expired. Please sign up again."));
        }

        const email = req.session.signupData.email;
        const newOtp = await userService.sendSignupOTP(email);

        req.session.otp = newOtp;
        req.session.otpExpiryTime = Date.now() + 60 * 1000;

        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error on Resend:", err);
            }
            return res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=signup&success=` + encodeURIComponent("A new OTP has been sent to your email."));
        });

    } catch (err) {
        console.error("Resend Signup OTP Error:", err.message);
        const email = req.session.signupData?.email || '';
        return res.redirect(`/user/verify-otp?email=${encodeURIComponent(email)}&target=signup&error=` + encodeURIComponent("Failed to resend OTP. Please try again."));
    }
};