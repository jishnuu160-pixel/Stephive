import * as userRepo from '../repositories/userRepository.js';
import * as walletRepo from '../repositories/walletRepository.js';
import { uploadToCloudinary } from '../utils/cloudinaryUtils.js'; 
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { generateReferralCode } from '../utils/idGenerator.js';
import { generateOTP } from '../utils/otpUtils.js';         
import { sendOtpEmail } from '../utils/sendOtpEmail.js';



export const signup = async (data) => {
    const { fullName, email, phoneNumber, password, referralCode } = data;
    const phoneStr = phoneNumber ? phoneNumber.toString() : '';

    const myCode = generateReferralCode(fullName.trim());
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userData = {
        ...data,
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneStr,
        password: hashedPassword,
        referralCode: myCode,
        isBlocked: false, 
        otp: null,
        otpExpiry: null
    };

    let referrer = null;

    if (referralCode && referralCode.trim() !== '') {
        const cleanRefCode = referralCode.trim().toUpperCase();

        referrer = await userRepo.findByReferralCode(cleanRefCode);
    
    }

    const newUser = await userRepo.createUser(userData);

    const SIGNUP_BONUS = 500;
    const REFERRAL_BONUS = 500;

    await walletRepo.createWallet(newUser._id);

    if (referrer) {
        await walletRepo.updateWallet(
            newUser._id, 
            SIGNUP_BONUS, 
            'credit', 
            'Signup bonus via referral code'
        );

        await userRepo.createReferral({
            referrer_user_id: referrer._id,
            referred_user_id: newUser._id, 
            status: 'completed', 
            rewardAmount: REFERRAL_BONUS,
            referralCode: referralCode.trim().toUpperCase()
        });

        await walletRepo.updateWallet(
            referrer._id, 
            REFERRAL_BONUS, 
            'credit', 
            `Referral reward for inviting ${newUser.fullName || 'a user'}`
        );
    }
    return newUser;
};


export const login = async (data) => {
    const user = await userRepo.findByEmail(data.email);

    if (!user) {
        throw new Error("User does not exist");
    }

    if (user.isBlocked) {
        throw new Error("Your account has been blocked by admin.");
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    
    if (!isMatch) {
        throw new Error("Incorrect password");
    }

    return user;
};


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS
    }
});


export const sendOTP = async (email) => {
       const user = await userRepo.findByEmail(email);
       if (!user) throw new Error("No account found with this email address.");

    const otp = generateOTP();
    await userRepo.saveOTP(email, otp); 
 
    console.log(`\n=========================================`);
    console.log(` OTP for ${email} is [ ${otp} ]`);
    console.log(`=========================================\n`);

    await sendOtpEmail(email, otp);
    return otp; 
};



export const sendSignupOTP = async (email) => {
       const otp = generateOTP();

       await sendOtpEmail(email, otp);

       return otp; 
};

export const verifyOTP = async (email, otp) => {
    const user = await userRepo.findByEmail(email);
    
    if (!user || !user.otp) {
        throw new Error("Invalid or expired OTP.");
    }

    if (Date.now() > user.otpExpiry) {
        await userRepo.clearOTP(email);
        throw new Error("OTP has expired.");
    }

    if (user.otp !== otp) {
        throw new Error('Invalid OTP code.');
    }

    await userRepo.clearOTP(email); 
    return true;
};

export const changePasswordWithOld = async (email, oldPassword, newPassword) => {
    const user = await userRepo.findByEmailWithPassword(email);
    if (!user) {
        throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        throw new Error("Incorrect old password");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    return await userRepo.updateUser(email, { password: hashedPassword });
};

export const verifySignupSession = (session, submittedOtp) => {
    if (!session.signupData || !session.otp) {
        throw new Error("Session expired. Please sign up again.");
    }
    if (Date.now() > session.otpExpiryTime) {
        throw new Error("OTP has expired.");
    }
    if (String(session.otp).trim() !== String(submittedOtp).trim()) {
        throw new Error("Invalid OTP code.");
    }
    return true;
};


export const resetPassword = async (email, newPassword) => {
    if (!newPassword) {
        throw new Error("Password is required for hashing");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatedUser = await userRepo.updateUser(email, { password: hashedPassword });

    if (!updatedUser) {
        throw new Error("User not found during password reset");
    }
    
    return updatedUser;
};

export const updateAvatar = async (userId, fileBuffer) => {
    const imageUrl = await uploadToCloudinary(fileBuffer);
    
    return await userRepo.updateUserInfo(userId, {
        profileImage: imageUrl
    });
};

export const getUserById = async (userId) => {
   return await userRepo.findById(userId);
};

export const updateProfile = async (userId, data) => {
    const { fullName, phoneNumber } = data;
    const errors = {};

    if (!fullName || fullName.trim() === "") {
        errors.fullName = "*Full Name is required";
    }

    const phoneStr = phoneNumber ? phoneNumber.toString().trim() : "";
    if (!phoneStr) {
        errors.phone = "*Mobile Number is required";
    } else if (!/^\d{10}$/.test(phoneStr)) {
        errors.phone = "*Phone number must be 10 digits";
    }

    if (Object.keys(errors).length > 0) {
        const error = new Error("Validation Failed");
        error.validationErrors = errors; 
        throw error;
    }
    return await userRepo.updateUserInfo(userId, data);
};

export const addAddress = async (userId, addressData) => {

    const {
        fullName,
        phone,
        street,
        city,
        state,
        pincode
    } = addressData;

    const errors = {};

    if (!fullName?.trim()) errors.fullName = "*Full Name is required";
    if (!phone?.trim()) errors.phone = "*Mobile Number is required";
    if (!street?.trim()) errors.street = "*Address Line 1 is required";
    if (!city?.trim()) errors.city = "*City is required";
    if (!state?.trim()) errors.state = "*State is required";
    if (!pincode?.trim()) errors.pincode = "*Pincode is required";

    if (phone?.trim() && !/^\d{10}$/.test(phone.trim())) {
        errors.phone = "Phone number must be 10 digits";
    }

    if (pincode?.trim() && !/^\d{6}$/.test(pincode.trim())) {
        errors.pincode = "Pincode must be 6 digits";
    }

    if (Object.keys(errors).length > 0) {
        throw { validationErrors: errors };
    }

    const user = await userRepo.findById(userId);

    const duplicateAddress = user.addresses.find(addr =>
        addr.fullName?.trim().toLowerCase() === fullName.trim().toLowerCase() &&
        addr.phone === phone.trim() &&
        addr.street?.trim().toLowerCase() === street.trim().toLowerCase() &&
        addr.city?.trim().toLowerCase() === city.trim().toLowerCase() &&
        addr.state?.trim().toLowerCase() === state.trim().toLowerCase() &&
        addr.pincode === pincode.trim()
    );

    if (duplicateAddress) {
        throw {
            validationErrors: {
                street: "This address already exists"
            }
        };
    }

    if (user.addresses.length === 0) {
        addressData.isDefault = true;
    }

   

if (addressData.isDefault) {
    await userRepo.clearDefaultAddresses(userId);
}

    return await userRepo.addAddress(userId, {
        ...addressData,
        fullName: fullName.trim(),
        phone: phone.trim(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim()
    });
};

export const deleteAddress = async (userId, addressId) => {
   return await userRepo.deleteAddress(userId, addressId);
};

export const editAddress = async (
    userId,
    addressId,
    updatedData
) => {

    const {
        fullName,
        phone,
        street,
        city,
        state,
        pincode
    } = updatedData;

    const errors = {};

    if (!fullName?.trim()) {
        errors.fullName = "Full Name is required";
    }

    const phoneStr = phone?.trim();

    if (!phoneStr) {
        errors.phone = "*Mobile Number is required";
    } else if (!/^\d{10}$/.test(phoneStr)) {
        errors.phone = "Phone number must be exactly 10 digits and contain only numbers";
    }  

    if (!street?.trim()) {
        errors.street = "Address Line 1 is required";
    }

    if (!city?.trim()) {
        errors.city = "City is required";
    }

    if (!state?.trim()) {
        errors.state = "State is required";
    }

    if (!pincode?.trim()) {
        errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(pincode.trim())) {
        errors.pincode = "Pincode must be 6 digits";
    }

    if (Object.keys(errors).length > 0) {
        throw {
            validationErrors: errors
        };
    }

    const user = await userRepo.findById(userId);

    const duplicateAddress = user.addresses.find(addr =>
        addr._id.toString() !== addressId &&
        addr.fullName?.trim().toLowerCase() === fullName.trim().toLowerCase() &&
        addr.phone === phone.trim() &&
        addr.street?.trim().toLowerCase() === street.trim().toLowerCase() &&
        addr.city?.trim().toLowerCase() === city.trim().toLowerCase() &&
        addr.state?.trim().toLowerCase() === state.trim().toLowerCase() &&
        addr.pincode === pincode.trim()
    );

    if (duplicateAddress) {
        throw {
            validationErrors: {
                street: "This address already exists"
            }
        };
    }

    if (updatedData.isDefault) {
        await userRepo.clearDefaultAddresses(userId);
    }

    return await userRepo.updateAddress(
        userId,
        addressId,
        {
            ...updatedData,
            fullName: fullName.trim(),
            phone: phone.trim(),
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim()
        }
    );
};

export const addAddressCheckout = async (userId, addressData) => {
    const { fullName, phone, street, city, state, pincode } = addressData;
    const errors = {};

    if (!fullName || !fullName.trim()) {
        errors.fullName = "Full name is required.";
    }

    if (!phone || !phone.trim()) {
        errors.phone = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(phone.trim())) {
        errors.phone = "Enter a valid 10-digit mobile number.";
    }

    if (!street || !street.trim()) {
        errors.street = "Street address is required.";
    }

    if (!city || !city.trim()) {
        errors.city = "City is required.";
    }

    if (!state || !state.trim()) {
        errors.state = "State is required.";
    }

    if (!pincode || !pincode.trim()) {
        errors.pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(pincode.trim())) {
        errors.pincode = "Enter a valid 6-digit pincode.";
    }

    if (Object.keys(errors).length > 0) {
        const validationError = new Error("Validation failed");
        validationError.validationErrors = errors;
        throw validationError;
    }

    const sanitizedData = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        street: street.trim(),
        apartment: addressData.apartment?.trim() || '',
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        label: addressData.label?.trim() || 'Home',
        isDefault: addressData.isDefault || false
    };

    if (sanitizedData.isDefault) {
        await userRepo.clearDefaultAddresses(userId);
    }

    return await userRepo.addAddress(userId, sanitizedData);
};

export const clearDefaultAddresses = async (userId) => {
    return await User.updateOne(
        { _id: userId },
        { $set: { "addresses.$[].isDefault": false } }
    );
};


export const getAddressByIdService = async (userId, addressId) => {
    const address = await userRepo.getAddressById(userId, addressId);
    if (!address) {
        throw new Error("Address not found");
    }
    return address;
};


export const editAddressCheckout = async (userId, addressId, addressData) => {
    const { fullName, phone, street, city, state, pincode } = addressData;
    const errors = {};

    if (!fullName || !fullName.trim()) {
        errors.fullName = "Full name is required.";
    }

    if (!phone || !phone.trim()) {
        errors.phone = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(phone.trim())) {
        errors.phone = "Enter a valid 10-digit mobile number.";
    }

    if (!street || !street.trim()) {
        errors.street = "Street address is required.";
    }

    if (!city || !city.trim()) {
        errors.city = "City is required.";
    }

    if (!state || !state.trim()) {
        errors.state = "State is required.";
    }

    if (!pincode || !pincode.trim()) {
        errors.pincode = "Pincode is required.";
    } else if (!/^\d{6}$/.test(pincode.trim())) {
        errors.pincode = "Enter a valid 6-digit pincode.";
    }

    if (Object.keys(errors).length > 0) {
        const validationError = new Error("Validation failed");
        validationError.validationErrors = errors;
        throw validationError;
    }

    const sanitizedData = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        street: street.trim(),
        apartment: addressData.apartment?.trim() || '',
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        label: addressData.label?.trim() || 'Home',
        isDefault: addressData.isDefault || false
    };

    if (sanitizedData.isDefault) {
        await userRepo.clearDefaultAddresses(userId);
    }

    return await userRepo.updateAddress(userId, addressId, sanitizedData);
};

export const deleteAddressService = async (userId, addressId) => {
    if (!addressId) {
        throw new Error("Address ID is required.");
    }

    const updatedUser = await userRepo.removeAddressFromDb(userId, addressId);

    if (!updatedUser) {
        throw new Error("User or address not found.");
    }

    return updatedUser;
};

export const changeEmailService = async (userId, currentEmail, newEmail) => {
    if (!newEmail || !newEmail.trim()) {
        throw new Error("New email is required.");
    }

    const sanitizedEmail = newEmail.trim().toLowerCase();

    if (sanitizedEmail === currentEmail.toLowerCase()) {
        const error = new Error("New email must be different from your current one.");
        error.isValidation = true;
        throw error;
    }

    const existingUser = await userRepo.findByEmail(sanitizedEmail);
    if (existingUser) {
        const error = new Error("This email is already registered to another account.");
        error.isValidation = true;
        throw error;
    }

    return await userRepo.updateUserInfo(userId, { email: sanitizedEmail });
};


export const validateSignupInitial = async (data) => {
    const { fullName, email, phoneNumber, password, confirmPassword, referralCode } = data;
    const errors = {};

    const allEmpty = !fullName?.trim() && !email?.trim() && !phoneNumber?.toString().trim() && !password && !confirmPassword;
    if (allEmpty) {
        const validationError = new Error("Please fill in all required fields");
        validationError.topError = "Please fill in all required fields"; 
        throw validationError;
    }

    const nameRegex = /^[A-Za-z ]{3,50}$/;
    
    if (!fullName || !fullName.trim()) {
        errors.fullName = "Full Name is required";
    } else if (!nameRegex.test(fullName.trim())) {
        errors.fullName = "Full Name can only contain letters and spaces";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
        errors.email = "Email Address is required";
    } else if (!emailRegex.test(email.trim())) {
        errors.email = "Please enter a valid email address";
    }

    const phoneStr = phoneNumber ? phoneNumber.toString().trim() : "";
    if (!phoneStr) {
        errors.phoneNumber = "Phone Number is required";
    } else if (!/^\d{10}$/.test(phoneStr)) {
        errors.phoneNumber = "Phone number must be exactly 10 digits";
    }

    if (!password) {
        errors.password = "Password is required";
    } else if (password.length < 6) {
        errors.password = "Password must be at least 6 characters long";
    }

    if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
        const validationError = new Error("Validation Failed");
        validationError.validationErrors = errors;
        throw validationError;
    }

    const existingUser = await userRepo.findByEmail(email.trim());
    if (existingUser) {
        throw new Error('User already exists');
    }

    if (phoneStr) {
        const existingPhone = await userRepo.findByPhone(phoneStr);
        if (existingPhone) {
            throw new Error('Phone number already registered');
        }
    }

    if (referralCode && referralCode.trim() !== '') {
        const myCode = generateReferralCode(fullName.trim());
        const cleanRefCode = referralCode.trim().toUpperCase();
        
        if (cleanRefCode === myCode.toUpperCase()) {
            throw new Error("You cannot use your own referral code.");
        }

        const referrer = await userRepo.findByReferralCode(cleanRefCode);
        if (!referrer) {
            throw new Error("Invalid referral code."); 
        }
    }

    return true;
};

