import * as userService from '../services/userServices.js';
import * as userRepo from '../repositories/userRepository.js';

// 🔹 Show Login Page
export const getLogin = (req, res) => {
    res.render('user/login', {
        layout: 'main', // <--- Force it to use views/layouts/main.hbs
        isLogin: true,
        error: req.query.error,
        success: req.query.success
    });
};

export const getSignup = (req, res) => {
    res.render('user/signup');
};

export const postSignup = async (req, res) => {
    try {
        // 1. Create the user in the database
        const user = await userService.signup(req.body);

        // 2. LOG THEM IN AUTOMATICALLY
        // We save the new user's info into the session right here
        req.session.user = {
            id: user._id,
            name: user.fullName, // Ensure this matches your schema field name
            email: user.email,
            phoneNumber: user.phoneNumber
        };

        // 3. Redirect to Home Page
        // Explicitly save the session before redirecting to ensure it's ready
        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.redirect('/user/login');
            }
            res.redirect('/'); 
        });

    } catch (err) {
        console.error("Signup Error:", err.message);
        // If signup fails, take them back to signup with the error message
        res.render('user/signup', { error: err.message });
    }
};

// userController.js
export const postLogin = async (req, res) => {
    try {
        const user = await userService.login(req.body); // Assume this returns user object { name, email, _id }
        
        // 1. SAVE TO SESSION
        req.session.user = {
            id: user._id,
            name: user.fullName,
            email: user.email,
            phoneNumber:user.phoneNumber
        };

        // 2. FORCE SAVE (Optional but safer)
        req.session.save((err) => {
            if (err) return next(err);
            res.redirect('/'); // Redirect to home
        });
    } catch (err) {
        res.redirect('/user/login?error=' + encodeURIComponent(err.message));
    }
};

// 🔹 Forgot Password
export const postForgot = async (req, res) => {
    try {
        const { email } = req.body;

        // 1. Check if email is empty
        if (!email || email.trim() === "") {
            return res.redirect('/user/forgot-password?error=' + encodeURIComponent("Please enter your email address."));
        }

        await userService.sendOTP(email);

        res.redirect(`/user/verify-otp?email=${email}`);
    } catch (err) {
        console.log("ERROR:", err.message);
        res.redirect('/user/forgot-password?error=' + encodeURIComponent(err.message));
    }
};


// 🔹 Verify OTP
export const postVerifyOTP = async (req, res) => {
    console.log("VERIFY BODY:", req.body); // 👈 ADD THIS

    try {
        const { email, otp } = req.body;

        await userService.verifyOTP(email, otp);

        res.redirect(`/user/reset-password?email=${email}`);
    } catch (err) {
        console.log("VERIFY ERROR:", err.message);
        res.redirect(`/user/verify-otp?error=${encodeURIComponent(err.message)}&email=${req.body.email}`);
    }
};


// 🔹 Reset Password
export const postResetPassword = async (req, res) => {
    const { email, password, confirmPassword } = req.body;

    try {
        if (password !== confirmPassword) {
            // Use render instead of redirect so the user doesn't lose their email/form data
            return res.render('user/reset-password', { 
                error: "Passwords do not match", 
                email 
            });
        }

        await userService.resetPassword(email, password);

        // SUCCESS: Go to login
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
        email: req.query.email   
    });
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

export const logout=(req,res)=>{
    req.session.destroy(()=>{
        res.redirect('/user/login');
    });
}

export const getProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        // 1. ADD .lean() HERE! (Crucial fix for Handlebars error)
        const user = await userRepo.findById(userId);
        console.log("Address found:", user.address); 

        if (!user) {
            console.log("User not found in database");
            return res.redirect('/user/login');
        }

        res.render('user/profile', { user, activePage: 'profile' });
    } catch (error) {
       
        console.error("Profile Error:", error);
        res.status(500).send(error.message);
    }
};


export const getAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const user = await userRepo.findById(userId); 

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


export const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const addressData = req.body;

        addressData.isDefault = req.body.isDefault === 'on';

        const updatedUser = await userRepo.addAddress(userId, addressData);

        if (!updatedUser) {
            console.log("Failed to update user in DB");
        }

        req.session.save(() => {
            res.redirect('/user/address');
        });
    } catch (error) {
        console.error("Post Address Error:", error);
        res.redirect('/user/address');
    }
};

export const removeAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id; // Pulls ID from the URL link
        
        await userRepo.deleteAddress(userId, addressId);
        
        res.redirect('/user/address');
    } catch (error) {
        res.redirect('/user/address');
    }
};

export const postEditAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const addressId = req.params.id;
        const updatedData = { ...req.body };

        updatedData.isDefault = req.body.isDefault === 'on';

        await userRepo.updateAddress(userId, addressId, updatedData);
        
        res.redirect('/user/address');
    } catch (error) {
        console.error("Edit Error:", error);
        res.redirect('/user/address');
    }
};


export const postUpdateProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { fullName, phoneNumber, gender } = req.body;

        await userRepo.updateUserInfo(userId, { fullName, phoneNumber, gender });

        // 🔹 Update the whole session object
        req.session.user.name = fullName;
        req.session.user.phoneNumber = phoneNumber;

        req.session.save(() => {
            res.redirect('/user/profile?success=Profile updated');
        });
    } catch (error) {
        res.redirect('/user/profile?error=Update failed');
    }
};

export const getEditProfile = async (req, res) => {
    try {
        const userId = req.session.user.id;
        
        const user = await userRepo.findById(userId);

        if (!user) return res.redirect('/user/login');

        res.render('user/edit-profile', { 
            user,
            title: "Edit Profile",
            activePage: 'profile' 
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

        res.redirect(`/user/verify-password-otp?email=${email}`);
    } catch (err) {
        console.error("OTP Send Error:", err.message);
        res.redirect('/user/profile?error=Could not send verification code');
    }
};

export const getVerifyPasswordOTP = (req, res) => {
    res.render('user/verify-otp', {
        email: req.query.email,
        isPasswordUpdate: true 
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

        await userRepo.updateUserInfo(userId, { email: sanitizedEmail });

        req.session.user.email = sanitizedEmail;

        req.session.save((err) => {
            if (err) return res.redirect('/user/profile?error=Session sync failed');
            res.redirect('/user/profile?success=Email updated successfully');
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

    res.render('user/changepass', {
        email: req.query.email,
        title: "Create New Password",
        isLoggedIn: !!req.session.user 
    });
};

export const postChangePassword = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log("--- DEBUG START ---");
        console.log("Email found in body:", email);
        console.log("Password received length:", password ? password.length : "EMPTY");

        const result = await userService.resetPassword(email, password);
        console.log("Database Update Result:", result ? "SUCCESS" : "USER NOT FOUND");

        if (req.session.user) {
            console.log("Redirecting to: /user/profile");
            return res.redirect('/user/profile?success=Password updated');
        } else {
            console.log("Redirecting to: /user/login");
            return res.redirect('/user/login?success=Password reset');
        }

    } catch (err) {
        console.log("!!! ERROR IN CONTROLLER:", err.message);
        res.render('user/changepass', { error: err.message, email });
    }
};

export const getResendOTP = async (req, res) => {
    try {
        const { email, isPasswordUpdate } = req.query;

        await userService.sendOTP(email);

        const redirectPath = (isPasswordUpdate === 'true') 
            ? '/user/verify-password-otp' 
            : '/user/verify-otp';

        res.redirect(`${redirectPath}?email=${email}&success=A new OTP has been sent!`);
    } catch (err) {
        console.error("Resend Error:", err);
        res.redirect('/user/login?error=Failed to resend OTP');
    }
};