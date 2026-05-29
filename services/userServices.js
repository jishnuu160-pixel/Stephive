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
        pass: 'luqf qasx eirr ggrj'  
    }
});


export const sendOTP = async (email) => {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new Error("No account found with this email address.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await userRepo.saveOTP(email, otp); 
  
    // --- THIS IS WHERE YOU ADD THE LOG BACK ---
    console.log(`\n=========================================`);
    console.log(` OTP for ${email} is [ ${otp} ]`);
    console.log(`=========================================\n`);
    // ------------------------------------------

    const mailOptions = {
        from: '"StepHive Support" <stephive3@gmail.com>',
        to: email, 
        subject: 'StepHive - Your Verification Code',
        html: `
    <div style="font-family: Arial; padding:20px;">
        <h2>StepHive Verification</h2>

        <p>Your OTP code is:</p>

        <h1 style="
            letter-spacing:5px;
            color:#2563eb;
        ">
            ${otp}
        </h1>

        <p>
            This OTP will expire in 1 minute.
        </p>
    </div>
`
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
    
    if (!user || !user.otp ) {
        throw new Error("Invalid OTP code. Please try again.");
    }

    if (Date.now() > user.otpExpiry) {
        await User.updateOne({email:email},{$unset:{otp:"",otpExpiry:""}});
        throw new Error("OTP has expired. Please request a new one.");
    }

    if (user.otp !== otp){
        throw new Error('Invalid OTP code. Please try again.');
    }
    await User.updateOne({email:email},{$unset:{otp:"",otpExpiry:""}});

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



export const updateAvatar = async (userId, imagePath) => {

    return await userRepo.updateUserInfo(userId, {
        profileImage: imagePath
    });

};

export const getUserById = async (userId) => {
   return await userRepo.findById(userId);
};

export const updateProfile = async (userId, data) => {
   return await userRepo.updateUserInfo(userId, data);
};

export const addAddress = async (userId, addressData) => {
   return await userRepo.addAddress(userId, addressData);
};

export const deleteAddress = async (userId, addressId) => {
   return await userRepo.deleteAddress(userId, addressId);
};

export const editAddress = async (
   userId,
   addressId,
   updatedData
) => {
   return await userRepo.updateAddress(
      userId,
      addressId,
      updatedData
   );
};

export const findUserByEmail = async (email) => {
   return await userRepo.findByEmail(email);
};