import * as userRepo from '../repositories/userRepository.js';
import User from '../models/userModel.js'; 
import bcrypt from 'bcrypt';

export const signup = async (data) => {
    const existingUser = await userRepo.findByEmail(data.email);

    if (existingUser) {
        throw new Error('User already exists');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const userData = {
        ...data,
        password: hashedPassword,
        isBlocked: false, 
        otp: null,
        otpExpiry: null
    };

    return await userRepo.createUser(userData);
};



export const login = async (data) => {
    const user = await userRepo.findByEmail(data.email);

    if (!user) {
        throw new Error("User does not exist");
    }

    if (user.isBlocked) {
        throw new Error("Your account has been blocked by the administrator.");
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    
    if (!isMatch) {
        throw new Error("Incorrect password");
    }

    return user;
};


export const sendOTP = async (email) => {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new Error("No account found with this email address.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await userRepo.saveOTP(email, otp); 

    console.log("-------------------------------");
    console.log(`DEBUG: OTP for ${email} is [ ${otp} ]`);
    console.log("-------------------------------");

   
    return otp; 
};


export const verifyOTP = async (email, otp) => {
    const user = await userRepo.findByEmail(email);

    if (!user || !user.otp) {
        throw new Error("OTP not generated or user not found");
    }

    if (user.otp !== otp) {
        throw new Error("Invalid OTP");
    }

    if (user.otpExpiry < Date.now()) {
        throw new Error("OTP expired");
    }

    return true;
};


export const resetPassword = async (email, newPassword) => {
    if (!newPassword) {
        throw new Error("Password is required for hashing");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatedUser = await User.findOneAndUpdate(
        { email: email },
        { $set: { password: hashedPassword } },
        { new: true }
    );

    if (!updatedUser) {
        throw new Error("User not found during password reset");
    }

    return updatedUser;
};

export const addAddress = async (userId, addressData) => {
   

    return await userRepo.addAddress(userId, addressData);
};