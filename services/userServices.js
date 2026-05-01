import * as userRepo from '../repositories/userRepository.js';
import User from '../models/userModel.js'; 
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

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
        user: 'stephive3@gmail.com', 
        pass: 'breq jigw tzzq xzzj'  
    }
});


export const sendOTP = async (email) => {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new Error("No account found with this email address.");

    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await userRepo.saveOTP(email, otp); 
  
    console.log(`-----------------------------------------`);
    console.log(`OTP for ${email} is [ ${otp} ]`);
    console.log(`-----------------------------------------`);

  
    const mailOptions = {
        from: '"StepHive Support" <stephive3@gmail.com>',
        to: email, 
        subject: 'StepHive - Your Verification Code',
        html: `<div style="font-family: Arial; text-align: center;">
                <h2>Verification Code</h2>
                <p>Your StepHive OTP is:</p>
                <h1 style="color: #007bff;">${otp}</h1>
                <p>This code expires in 1 minute.</p>
                <p><b>Don't share Otp with others.</b></p>
               </div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email successfully delivered to ${email}`);
    } catch (error) {
        console.error("Email failed to send, check your App Password.");
    }

    return otp; 
};


export const verifyOTP = async (email, otp) => {
    const user = await userRepo.findByEmail(email);
    
    if (!user || user.otp !== otp) {
        throw new Error("Invalid OTP code. Please try again.");
    }

    if (Date.now() > user.otpExpiry) {
        throw new Error("OTP has expired. Please request a new one.");
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