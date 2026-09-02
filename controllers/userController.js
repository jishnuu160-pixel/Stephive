import * as userService from '../services/userServices.js';
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
        error: error,
        formData,
        error
    });
};


export const postSignup = async (req, res) => {
    try {
        await userService.validateSignupInitial(req.body);

        const { email } = req.body;

        const otp = await userService.sendSignupOTP(email.trim());

        req.session.signupData = req.body;
        req.session.otp = otp;
        req.session.otpExpiryTime = Date.now() + 60 * 1000; 

        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.render('user/signup', {
                    error: 'Session error, please try again.',
                    formData: req.body
                });
            }

            return res.redirect(`/user/verify-otp?&target=signup`);
        });

    } catch (err) {        
        return res.render('user/signup', {
            error: err.message, 
            validationErrors: err.validationErrors || {},
            formData: req.body 
        });
    }
};


export const postVerifyOTP = async (req, res, next) => {
    try {
        const email = req.query.email || req.body.email || req.session.email || (req.session.signupData ? req.session.signupData.email : '');
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

        if (target === 'signup') {
            if (!req.session.otp) {
                req.session.errorMessage = "Session expired. Please sign up again.";
                req.session.otpTarget = "signup";
                return res.redirect('/user/verify-otp');
            }
            if (Date.now() > req.session.otpExpiryTime) {
                return res.redirect(`/user/verify-otp?target=signup&error=` + encodeURIComponent("OTP has expired."));
            }

            if (String(req.session.otp).trim() !== String(otp).trim()) {
                req.session.errorMessage = "Invalid OTP code.";
                req.session.otpTarget = "signup";
                return res.redirect('/user/verify-otp');
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

            req.flash('success', 'Account created successfully');
            return res.redirect('/shop');
        } 
        
       else {
            if (target === 'email') {
                const userId = req.session.user.id || req.session.user._id;
                
                await userService.verifyEmailChangeOTP(userId, otp);

                const user = await userService.getUserById(userId);
                req.session.user.email = user.email;
                delete req.session.otpTarget;

                req.flash('success', "Email updated successfully!");
                return req.session.save(() => {
                    res.redirect('/user/profile');
                });
            } else if (target === 'updatepassword') {
                await userService.verifyOTP(email, otp);
                return res.redirect(`/user/changepass?verified=true`);
            }  else {
        await userService.verifyOTP(email, otp);
        
        req.session.isOtpVerified = true;
        req.session.resetEmail = email;
        req.session.resetOtp = otp;

        return req.session.save(() => {
            res.redirect('/user/reset-password');
        });
    }
        }

    } catch (err) {
        const target = req.query.target || req.body.target || (req.session.signupData ? 'signup' : '');

        req.session.errorMessage = err.message;
        req.session.otpTarget = target;
        return res.redirect('/user/verify-otp');
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

        req.flash('success', 'Logged in successfully.');
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

        req.session.otpTarget='forgot';
        req.session.email=email;
        res.redirect('/user/verify-otp');
    } catch (err) {
        res.redirect('/user/forgot-password?error=' + encodeURIComponent(err.message));
    }
};


export const postResetPassword = async (req, res) => {
    const { email, otp, password, confirmPassword } = req.body;

    try {
        if (!otp) {
            return res.render('user/reset-password', { 
                formError: "Reset failed: OTP is missing. Please request a new one.", 
                email 
            });
        }

        if (!password || !confirmPassword) {
            return res.render('user/reset-password', { 
                formError: "Please fill in all password fields.", 
                email, 
                otp 
            });
        }

        if (password !== confirmPassword) {
            return res.render('user/reset-password', { 
                formError: "Passwords do not match.", 
                email, 
                otp 
            });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.render('user/reset-password', { 
                formError: "Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.", 
                email, 
                otp 
            });
        }

        await userService.resetPassword(email, otp, password);

        delete req.session.isOtpVerified;
        delete req.session.resetEmail;
        delete req.session.resetOtp;

        req.flash('success', 'Password updated successfully');
      return req.session.save(() => {
    res.redirect('/user/login');
});
    } catch (err) {
        res.render('user/reset-password', { 
            formError: "Reset failed: " + err.message, 
            email, 
            otp 
        });
    }
};


export const getVerifyOTP = (req, res) => {
    const email = req.query.email;
    const error = req.query.error || req.session.errorMessage;
    const target = req.query.target || req.session.otpTarget;

    delete req.session.errorMessage;
    delete req.session.otpTarget;

    res.render('user/verify-otp', {
        email: email,
        error: error,
        target: target,
        isPasswordUpdate: req.query.isPasswordUpdate === 'true',
        otpExpiryTime: req.session.otpExpiryTime
    });
};


export const getResendOTP = async (req, res) => {
    const userId = req.session?.user?._id || req.session?.user?.id;

    try {
        const { isPasswordUpdate } = req.query;
        const target = req.query.target || req.session.otpTarget || (req.session.signupData ? 'signup' : '');
        const email = req.query.email || req.session.email || req.session.signupData?.email;

        if (!email && target !== 'signup' && target !== 'email-change') {
            req.session.errorMessage = 'Email missing, please try again.';
            return req.session.save(() => res.redirect('/user/login'));
        }

        let activeEmail = email;

        if (target === 'signup') {
            if (!req.session.signupData || !req.session.signupData.email) {
                req.session.errorMessage = "Session expired. Please sign up again.";
                return req.session.save(() => res.redirect('/user/signup'));
            }
            activeEmail = req.session.signupData.email;
            const newOtp = await userService.sendSignupOTP(activeEmail);
            req.session.otp = newOtp;
            req.session.otpExpiryTime = Date.now() + 60 * 1000;
        } 
        else if (target === 'email-change') {
            if (!userId) {
                throw new Error("Session expired. Please log in again.");
            }
            activeEmail = await userService.resendEmailChangeOTPService(userId, req.session.pendingEmail);
            req.session.email = activeEmail;
            req.session.otpExpiryTime = Date.now() + 60000;
        }
        else {
            req.session.email = activeEmail; 
            await userService.sendOTP(activeEmail);
            req.session.otpExpiryTime = Date.now() + 60000;
        }

        const redirectPath = (isPasswordUpdate === 'true') 
            ? '/user/verify-password-otp' 
            : '/user/verify-otp';

        req.session.otpTarget = target;
        req.flash("success", "A new OTP code has been sent!");
        delete req.session.errorMessage; 

        req.session.save((err) => {
            if (err) console.error("Session Save Error on Resend:", err);
            res.redirect(redirectPath);
        });

    } catch (err) {
        console.error("Resend OTP Error:", err.message);
        const target = req.query.target || req.session.otpTarget || (req.session.signupData ? 'signup' : '');
        
        req.session.otpTarget = target;
        req.session.errorMessage = err.message || 'Failed to resend OTP';

        req.session.save(() => {
            res.redirect('/user/verify-otp');
        });
    }
};

export const getForgot = (req, res) => {
    res.render('user/forgot-password', {
        error: req.query.error,
        success: req.query.success
    });
};


export const getResetPassword = (req, res) => { 
    if (!req.session.isOtpVerified) {
        req.session.errorMessage = "Please verify your OTP first.";
        return req.session.save(() => {
            res.redirect('/user/verify-otp');
        });
    }

    const email = req.query.email || req.session.resetEmail || req.session.email;
    const otp = req.session.resetOtp; 

    if (!email || !otp) {
        req.session.errorMessage = "Invalid reset session. Please try again.";
        return req.session.save(() => {
            res.redirect('/user/forgot-password');
        });
    }

    res.render('user/reset-password', {
        email: email,
        otp: otp, 
        error: req.query.error || req.session.errorMessage
    });
    
    delete req.session.errorMessage;
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
        const success = req.session.success;
       delete req.session.success;

        const userId = req.session.user.id;
        const user = await userService.getUserById(userId);

        if (!user) {
            return res.redirect('/user/login');
        }

      res.render('user/profile', {
        success,
    user,
    timestamp: Date.now(),
    activePage:'profile'
});
    } catch (error) {
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
        const user = await userService.getUserById(req.session.user.id);

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
        res.redirect('/user/address');
    }
};


export const postUpdateProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        await userService.updateProfile(userId, req.body);

        req.session.user = { ...req.session.user, ...req.body };
        req.session.success = 'Profile updated successfully';
        req.session.save(() => res.redirect('/user/profile'));
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
        res.redirect('/user/profile');
    }
};


export const sendUpdatePasswordOTP = async (req, res) => {
    try {
        const email = req.session.user.email;
        req.session.email = email;

        await userService.sendOTP(email);

        req.session.otpExpiryTime = Date.now() + 60000; 

        res.redirect(`/user/verify-otp?target=updatepassword`);
    } catch (err) {
        res.redirect('/user/profile?error=Could not send verification code');
    }
};


export const getVerifyPasswordOTP = (req, res) => {
    res.render('user/verify-otp', {
        email: req.query.email,
        isPasswordUpdate: true ,
        target: 'updatepassword',
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
        const userId = req.session?.user?._id || req.session?.user?.id;
        const currentEmail = req.session?.user?.email;
        const { newEmail } = req.body;

        console.log("Post Change Email - Resolved User ID:", userId);

        if (!userId) {
            throw new Error("User session not found or expired. Please log in again.");
        }

        await userService.changeEmailService(userId, currentEmail, newEmail);

        req.session.pendingEmail = newEmail.trim().toLowerCase();
        req.session.otpTarget = 'email-change'; 

        req.session.save((err) => {
            if (err) console.error("Session Save Error:", err);
            return res.redirect('/user/verify-email-change-otp');
        });

    } catch (error) {
        console.log("error:", error);
        return res.render('user/change-email', { 
            user: req.session.user,
            errorMessage: error.message
        });
    }
};


export const getChangePassword = (req, res) => {
    if (!req.query.verified) {
        return res.redirect('/user/profile'); 
    }

    res.render('user/changePass', {
        email: req.query.email,
        target: 'updatepassword',
        title: "Create New Password",
        isLoggedIn: true 
    });
};


export const postChangePassword = async (req, res) => {
    const { email, password, confirmPassword } = req.body;
    

    const targetEmail = email || req.session.email;
    try {
        if (password !== confirmPassword) {
            return res.render('user/changePass', { 
                error: "New passwords do not match", 
                email, 
                isLoggedIn: true 
            });
        }else if (!password?.trim() || !confirmPassword?.trim()) {
            return res.render('user/changePass', {
                error: "Please fill in both password fields.",
                email: targetEmail,
                isLoggedIn: true
        });
    }

        await userService.changePasswordWithOld(targetEmail, password);
        delete req.session.email;
        
        req.session.success='Password Updated Successfully';
        req.session.save(() => {
            res.redirect('/user/profile');
        });
    } catch (err) {
        res.render('user/changePass', { 
            error: err.message, 
            email: targetEmail,
            isLoggedIn: false 
        });
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
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to remove coupon" });
    }
};


export const postCheckoutAddAddress = async (req, res) => {
    
    try {
        const userId = req.session.user?.id || req.session.user?._id;

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
            req.session.errorMessage = "Session expired. Please sign up again.";
            return res.redirect('/user/signup?');
        }

        const email = req.session.signupData.email;
        const newOtp = await userService.sendSignupOTP(email);

        req.session.otp = newOtp;
        req.session.otpExpiryTime = Date.now() + 60 * 1000;

        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error on Resend:", err);
            }
            req.session.success='A new OTP has been sent to your email.';
            return res.redirect('/user/verify-otp?target=signup');
        });

    } catch (err) {
        const email = req.session.signupData?.email || '';
        return res.redirect(`/user/verify-otp?target=signup&error=` + encodeURIComponent("Failed to resend OTP. Please try again."));
    }
};


export const getVerifyEmailChangeOTP = (req, res) => {
    res.render('user/verify-otp', { 
        email: req.session.pendingEmail || 'your new email',
        target: 'email-change',
        otpExpiryTime: Date.now() + 60000 
    });
};


export const postVerifyEmailChangeOTP = async (req, res) => {
    try {
        const userId = req.session?.user?._id || req.session?.user?.id;

        if (!userId) {
            throw new Error("Session expired. Please log in again.");
        }

        const otp = Array.isArray(req.body.otp) ? req.body.otp.join('') : req.body.otp;

        const newEmail = await userService.verifyEmailChangeOTP(userId, otp);

        req.session.user.email = newEmail;
        delete req.session.pendingEmail;

        req.session.success = "Email updated successfully";
        return res.redirect('/user/profile');
    } catch (error) {
        console.error("Verification Error:", error.message);
        
        return res.render('user/verify-otp', { 
            error: error.message, 
            target: 'email-change', 
            email: req.session.pendingEmail || 'your new email',
            otpExpiryTime: error.otpExpiryTime || Date.now() + 60000 
        });
    }
};


export const sendEmailChangeOTP = async (req, res) => {
    try {
        return res.render('user/change-email', { user: req.session.user });
    } catch (error) {
        return res.render('profile', { 
            user: req.session.user, 
            errorMessage: error.message 
        });
    }
};