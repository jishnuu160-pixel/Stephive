import * as userService from '../services/userServices.js';
import * as userRepo from '../repositories/userRepository.js';
import { error, profile } from 'console';
import { title } from 'process';

export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const cloudinaryUrl = await userService.updateAvatar(req.session.user.id, req.file.buffer);
        req.session.user.profileImage = cloudinaryUrl;

        return res.status(200).json({
            success: true,
            message: "Profile image updated successfully"
        });

    } catch (err) {
        console.error("Avatar Update Error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const getLogin = (req, res) => {
    res.render('user/login', {
        layout: 'main', 
        isLogin: true
    });
};

export const getSignup = (req, res) => {
    res.render('user/signup');
};

export const postSignup = async (req, res, next) => {
    try {
        const { password, confirmPassword, email,phoneNumber,referralCode } = req.body;

        if (password !== confirmPassword) {
            return res.redirect('/user/signup?error=' + encodeURIComponent("Passwords do not match!"));
        }

        const existingEmail= await userRepo.findByEmail(email);

        if(existingEmail){
            return res.redirect('/user/signup?error=' + encodeURIComponent("Email already exists"));
        }

        const existingPhone= await userRepo.findByPhone(phoneNumber);

        if(existingPhone){
            return res.redirect('/user/signup?error=' + encodeURIComponent("Phone already registered"));
        }
      
        const user = await userService.signup({...req.body,phoneNumber});

        req.session.user = {
            id: user._id,
            name: user.fullName,
            email: user.email,
            phoneNumber: user.phoneNumber
        };

        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.redirect('/user/signup?error=' + encodeURIComponent("Session error, please try again."));
            }

            res.redirect('/?success=' + encodeURIComponent("Account created Successfully.")); 
        });

    } catch (err) {
        console.error("Signup Error:", err.message);

        res.redirect('/user/signup?error=' + encodeURIComponent(err.message));
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

        res.redirect(`/user/verify-otp?email=${email}`);
    } catch (err) {
        console.log("ERROR:", err.message);
        res.redirect('/user/forgot-password?error=' + encodeURIComponent(err.message));
    }
};


export const postVerifyOTP = async (req, res) => {
    try {
        const { email, otp, target } = req.body;
        const finalOtp = Array.isArray(otp) ? otp.join('') : otp.toString().trim();

        await userService.verifyOTP(email, finalOtp);

        if (target === 'email') {
            res.redirect(`/user/change-email?verified=true`);
        }
        else if (target === 'updatepassword') {
             res.redirect(`/user/changepass?email=${email}&verified=true`);
        } 
        else {
            res.redirect(`/user/reset-password?email=${email}`);
        }
    } catch (err) {
res.redirect(`/user/verify-otp?error=${encodeURIComponent(err.message)}&email=${req.body.email}&target=${req.body.target}`);    }
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
        const { email, isPasswordUpdate,target } = req.query;

        if (!email) {
            return res.redirect('/user/login?error=Email missing, please try again.');
        }

        await userService.sendOTP(email);

        req.session.otpExpiryTime=Date.now() + 60000;

        const redirectPath = (isPasswordUpdate === 'true') 
            ? '/user/verify-password-otp' 
            : '/user/verify-otp';

        req.flash('success', 'A new OTP code has been sent!');    
        res.redirect(`${redirectPath}?email=${email}&target=${target}&success=A new OTP has been sent!`);
    } catch (err) {
        console.error("Resend Error:", err);
        res.redirect(`/user/verify-otp?email&target=${req.query.email}&error=Failed to resend OTP`);
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
        res.status(500).send(error.message);
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
        const { email, otp } = req.body;
        const finalOtp = Array.isArray(otp) ? otp.join('') : otp;

        await userService.verifyOTP(email, finalOtp);

    
        res.redirect(`/user/changepass?email=${email}&verified=true`);

    } catch (err) {
        console.error("Verification Error:", err.message);
        res.redirect(`/user/verify-password-otp?error=${encodeURIComponent(err.message)}&email=${req.body.email}`);
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

        const sanitizedEmail = newEmail.trim().toLowerCase();

        if (sanitizedEmail === currentEmail.toLowerCase()) {
            return res.render('user/change-email', { 
                error: "New email must be different from your current one.",
                user: req.session.user 
            });
        }

        const existingUser = await userRepo.findByEmail(sanitizedEmail);
        if (existingUser) {
            return res.render('user/change-email', { 
                error: "This email is already registered to another account.",
                user: req.session.user 
            });
        }

        await userService.updateUserInfo(userId, { email: sanitizedEmail });

        req.session.user.email = sanitizedEmail;

        req.flash('success',"Email updated successfully!");

        req.session.save((err) => {
            if (err) return res.redirect('/user/profile?error=Session sync failed');
            res.redirect('/user/profile');
        });

    } catch (error) {
        console.error("Change Email Error:", error);
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
    const { email, password } = req.body;
    try {
        await userService.resetPassword(email, password);
        req.flash('success', 'Password updated successfully');

        req.session.save(() => {
            res.redirect('/user/profile');
        });
    } catch (err) {
        res.render('user/reset-password', { error: err.message, email, isLoggedIn: true });
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




