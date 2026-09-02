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
    console.log("1. sendOTP service started with raw email:", email);
    
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    console.log("2. Normalized email for search:", cleanEmail);
    
    const user = await userRepo.findByEmail(cleanEmail);
    console.log("3. Database user lookup result:", user ? "User found!" : "User NOT found!");

    if (!user) {
        throw new Error("No account found with this email address.");
    }

    const otp = generateOTP();
    console.log("4. Generated OTP, about to save to DB:", otp);

    await userRepo.saveOTP(cleanEmail, otp); 
 
    console.log(`\n=========================================`);
    console.log(` OTP for ${cleanEmail} is [ ${otp} ]`);
    console.log(`=========================================\n`);

    await sendOtpEmail(cleanEmail, otp);
    return otp; 
};


export const sendSignupOTP = async (email) => {
       const otp = generateOTP();

       await sendOtpEmail(email, otp);

       return otp; 
};

export const verifyOTP = async (email, otp) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    
    if (!cleanEmail) {
        throw new Error("Session expired. Please request a new OTP.");
    }

    const user = await userRepo.findByEmail(cleanEmail);

    if (!user) {
        throw new Error("User not found.");
    }

    if (user.otpExpiry && Date.now() > new Date(user.otpExpiry).getTime()) {
        await userRepo.clearOTP(cleanEmail); 
        throw new Error("OTP has expired.");
    }

    if (!user.otp || !user.otpExpiry) {
        throw new Error("Please request a new one");
    }

    if (String(user.otp).trim() !== String(otp).trim()) {
        throw new Error("Invalid OTP code.");
    }
 
    return true;
};


export const changePasswordWithOld = async (email, newPassword) => {

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (!cleanEmail) {
        throw new Error("Email is required for password change.");
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!newPassword || !passwordRegex.test(newPassword)) {
        throw new Error("Must be 8+ chars with uppercase, lowercase, number, and symbol.");
    }

    const user = await userRepo.findByEmailWithPassword(email);
    if (!user) {
        throw new Error("User not found");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    return await userRepo.updateUser(cleanEmail, { password: hashedPassword });
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


export const resetPassword = async (email, otp, newPassword) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    
    const user = await userRepo.findByEmail(cleanEmail);
    if (!user) {
        throw new Error("User not found.");
    }

    if (String(user.otp).trim() !== String(otp).trim()) {
        throw new Error("Invalid OTP code.");
    }

    if (!newPassword) {
        throw new Error("Password is required for hashing");
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        throw new Error("Must be 8+ chars with uppercase, lowercase, number, and symbol.");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatedUser = await userRepo.updateUser(cleanEmail, { password: hashedPassword });

    if (!updatedUser) {
        throw new Error("User not found during password reset");
    }
    
    await userRepo.clearOTP(cleanEmail);

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

    const fullNameValue = /^[A-Za-z\s]+$/;
    if (!fullName) {
        errors.fullName = "*Full Name is required";
    }else if(!fullNameValue.test(fullName)){
        errors.fullName = "FullName should contain only letters and space.";
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

    const fullNameValue = /^[A-Za-z\s]+$/;
    if (!fullName?.trim()){
      errors.fullName = "*Full Name is required";
    }else if(!fullNameValue.test(fullName)){
        errors.fullName = "FullName should contain only letters and space.";
    } 
        
    const streetValue = /^[A-Za-z\s]+$/;
    if (!street?.trim()){
        errors.street = "*Address Line 1 is required";
    } else if(!streetValue.test(street)){
        errors.street = "*Please Enter a valid Address.";
    }
 
    const cityValue = /^[A-Za-z\s]+$/;
    if (!city?.trim()){
        errors.city = "*City is required";
    } else if (!cityValue.test(city)){
        errors.city = "Should contain only Letters and space"
    }

    const stateValue = /^[A-Za-z\s]+$/;
    if (!state?.trim()){
       errors.state = "*State is required";
    } else if(!stateValue.test(state)){
        errors.state = "Should contain only letter and space."
    }
   
    const phoneValue = /^\d{10}$/;
    const cleanPhone = phone?.toString().replace(/[\s-]/g, "") || "";

    if (!cleanPhone) {
       errors.phone = "*Phone Number is required";
    } else if (!phoneValue.test(cleanPhone)) {
       errors.phone = "Should contain 10 digits";
    }

    const pincodeValue = /^\d{6}$/;

    if (!pincode?.toString().trim()) {
        errors.pincode = "*Pincode is required";
    } else if (!pincodeValue.test(pincode)) {
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

   const fullNameValue = /^[A-Za-z\s]+$/;
    if (!fullName?.trim()){
      errors.fullName = "*Full Name is required";
    }else if(!fullNameValue.test(fullName)){
        errors.fullName = "FullName should contain only letters and space.";
    }

    const phoneValue = /^\d{10}$/;
    const cleanPhone = phone?.toString().replace(/[\s-]/g, "") || "";

    if (!cleanPhone) {
       errors.phone = "*Phone Number is required";
    } else if (!phoneValue.test(cleanPhone)) {
       errors.phone = "Should contain 10 digits";
    }
 

    const streetValue = /^[A-Za-z\s]+$/;
    if (!street?.trim()){
        errors.street = "*Address Line 1 is required";
    } else if(!streetValue.test(street)){
        errors.street = "*Please Enter a valid Address.";
    }

    const cityValue = /^[A-Za-z\s]+$/;
    if (!city?.trim()){
        errors.city = "*City is required";
    } else if (!cityValue.test(city)){
        errors.city = "Should contain only Letters and space"
    }

    const stateValue = /^[A-Za-z\s]+$/;
    if (!state?.trim()){
       errors.state = "*State is required";
    } else if(!stateValue.test(state)){
        errors.state = "Should contain only letter and space."
    }

    const pincodeValue = /^\d{6}$/;
    if (!pincode?.toString().trim()) {
        errors.pincode = "*Pincode is required";
    } else if (!pincodeValue.test(pincode)) {
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
        const error = new Error("New email is required.");
        error.isValidation = true;
        throw error;
    }

    const sanitizedEmail = newEmail.trim().toLowerCase();

    if (sanitizedEmail === currentEmail.toLowerCase()) {
        const error = new Error("New email must be different from your current one.");
        error.isValidation = true;
        throw error;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
        const error = new Error("Please enter a valid email address.");
        error.isValidation = true;
        throw error;
    }

    const existingUser = await userRepo.findByEmail(sanitizedEmail);
    if (existingUser) {
        const error = new Error("This email is already registered to another account.");
        error.isValidation = true;
        throw error;
    }

    const otp = generateOTP();
    await userRepo.saveEmailChangeOTP(userId, sanitizedEmail, otp);
    
    await sendOtpEmail(sanitizedEmail, otp);

    return otp;
};

export const verifyEmailChangeOTP = async (userId, submittedOtp) => {
    const user = await userRepo.findById(userId);
    
    if (!user || !user.otp) {
        const error = new Error("Session expired. Please request a new OTP.");
        error.isValidation = true;
        error.otpExpiryTime = user?.otpExpiry ? new Date(user.otpExpiry).getTime() : Date.now();
        throw error;
    }

    if (user.otpExpiry && Date.now() > new Date(user.otpExpiry).getTime()) {
        const expiryTime = new Date(user.otpExpiry).getTime();
        await userRepo.clearEmailChangeOTP(userId); 
        const error = new Error("OTP has expired.");
        error.isValidation = true;
        error.otpExpiryTime = expiryTime;
        throw error;
    }

    if (String(user.otp).trim() !== String(submittedOtp).trim()) {
        const error = new Error("Invalid OTP code.");
        error.isValidation = true;
        error.otpExpiryTime = new Date(user.otpExpiry).getTime();
        throw error;
    }

    const newEmail = user.pendingEmail;

    await userRepo.updateUserInfo(userId, { 
        email: newEmail,
        pendingEmail: null,
        otp: null,
        otpExpiry: null
    });

    return newEmail;
};

export const resendEmailChangeOTPService = async (userId, sessionPendingEmail) => {
    const user = await userRepo.findById(userId);
    
    const targetEmail = user?.pendingEmail || sessionPendingEmail;
    
    if (!user || !targetEmail) {
        throw new Error("No pending email change found.");
    }
    
    await changeEmailService(userId, user.email, targetEmail);
    
    return targetEmail;
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

    const nameRegex = /^[A-Za-z ]{3,10}$/;
    
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

    const cleanPhone = phoneNumber?.toString().replace(/\D/g, "") || "";

    if (!cleanPhone) {
    errors.phoneNumber = "Phone Number is required";
    } else if (cleanPhone.length !== 10) {
    errors.phoneNumber = "Phone number must be exactly 10 digits";
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!password) {
        errors.password = "Password is required";
    } else if (!passwordRegex.test(password)) {
        errors.password = "Must be 8+ chars with uppercase, lowercase, number, and symbol.";
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

    if (cleanPhone) {
        const existingPhone = await userRepo.findByPhone(cleanPhone);
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

