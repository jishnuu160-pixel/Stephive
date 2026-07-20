import * as userRepo from '../repositories/userRepository.js';
import { uploadToCloudinary } from '../utils/cloudinaryUtils.js'; 
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { generateReferralCode } from '../utils/idGenerator.js';

export const signup = async (data) => {
    const existingUser = await userRepo.findByEmail(data.email);
    if (existingUser) {
        throw new Error('User already exists');
    }
   
    const myCode = generateReferralCode(data.fullName);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    const userData = {
        ...data,
        password: hashedPassword,
        referralCode: myCode,
        isBlocked: false, 
        otp: null,
        otpExpiry: null
    };

    const newUser = await userRepo.createUser(userData);

    if (data.referralCode) {
        if (data.referralCode.toUpperCase() === myCode.toUpperCase()) {
            throw new Error("You cannot use your own referral code.");
        }

        const referrer = await userRepo.findByReferralCode(data.referralCode.toUpperCase());
        
        if (referrer) {
            await userRepo.createReferral({
                referrer_user_id: referrer._id,
                referred_user_id: newUser._id, 
                status: 'pending',
                rewardAmount: 2000 
            });
        } else {
            throw new Error("Invalid referral code.");
        }
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
        user: 'stephive3@gmail.com', 
        pass: 'cyit nike essc orls'  
    }
});


export const sendOTP = async (email) => {
    const user = await userRepo.findByEmail(email);
    if (!user) throw new Error("No account found with this email address.");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await userRepo.saveOTP(email, otp); 
  

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


export const resetPassword = async (email, newPassword) => {
    if (!newPassword) {
        throw new Error("Password is required for hashing");
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const updatedUser = await userRepo.findOneAndUpdate(
        { email: email },
        { $set: { password: hashedPassword } },
        { new: true }
    );

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
    } else if (!/^\d{11,12}$/.test(phoneStr)) {
        errors.phone = "*Phone number must be 11 or 12 digits";
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
    } else if (!/^\d{11,12}$/.test(phoneStr)) {
        errors.phone = "Phone number must be exactly 11 or 12 digits and contain only numbers";
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

