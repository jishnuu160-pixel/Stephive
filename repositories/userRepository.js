import User from '../models/userModel.js';
import Referral from '../models/referralModel.js';

export const findByEmail = async (email) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    return await User.findOne({ 
        email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } 
    }).lean();
};

export const findByPhone = async (phoneNumber) => {
    return await User.findOne({ phoneNumber: phoneNumber }).lean();
};

export const findByEmailWithPassword = async (email) => {
    return await User.findOne({
        email: email.trim().toLowerCase()
    }).select('+password');
};

export const createUser = async (data) => {
    try {
        return await User.create(data);
    } catch (error) {
        throw new Error('Error saving user to database');
    }
};

export const updateUser = async (email, data) => {
    try {
        return await User.findOneAndUpdate(
            { email: email },
            { $set: data },
            { new: true }
        );
    } catch (error) {
        throw new Error('Error updating user in database');
    }
};

export const saveOTP = async (email, otp, expiryTime = 60000) => {
    try {
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        console.log("Attempting to save OTP for email:", cleanEmail);

        const updatedUser = await User.findOneAndUpdate(
            { email: { $regex: new RegExp(`^${cleanEmail}$`, "i") } },
            { 
                $set: { 
                    otp: String(otp), 
                    otpExpiry: new Date(Date.now() + expiryTime) 
                } 
            },
            { new: true }
        );

        console.log("Database update result:", updatedUser ? "Success!" : "Failed - User not found!");
        return updatedUser;
    } catch (error) {
        console.error("Save OTP Error:", error);
        throw new Error('Error saving OTP to database');
    }
};



export const addAddress = async (userId, addressData) => {
    try {
      
        const result = await User.findByIdAndUpdate(
            userId,
            { $push: { addresses: addressData } }, 
            { new: true }
        ).lean();

        return result;
    } catch (error) {
        throw error;
    }
};

export const deleteAddress = async (userId, addressId) => {
    try {
        return await User.findByIdAndUpdate(
            userId,
            { $pull: { addresses: { _id: addressId } } },
            { returnDocument: 'after' }
        ).lean();
    } catch (error) {
        throw new Error('Error deleting address: ' + error.message);
    }
};

export const updateAddress = async (userId, addressId, updatedData) => {
    try {
        return await User.findOneAndUpdate(
            { _id: userId, "addresses._id": addressId },
            { 
                $set: { "addresses.$": { ...updatedData, _id: addressId } } 
            },
            { returnDocument: 'after' }
        ).lean();
    } catch (error) {
        throw new Error('Error updating address: ' + error.message);
    }
};


export const updateUserInfo = async (userId, updateData) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { $set: updateData }, 
            { returnDocument: 'after' } 
        );
        return updatedUser;
    } catch (error) {
        throw new Error("Failed to update user in database");
    }
};

export const updateUserById = async (userId, updateData) => {
    return await User.findByIdAndUpdate(
        userId,
        updateData,
        {
            new: true
        }
    );
};

export const findById = async (userId) => {
    try {
        return await User.findById(userId).lean();
    } catch (error) {
        throw new Error('Error finding user by ID');
    }
};


export const saveUser= async(user)=>{
      return await user.save();
};

export const clearDefaultAddresses = async (userId) => {
    return await User.updateOne(
        { _id: userId },
        {
            $set: {
                "addresses.$[].isDefault": false
            }
        }
    );
};

export const clearOTP = async (email) => {
    return await User.updateOne(
        { email: email },
        { $unset: { otp: "", otpExpiry: "" } }
    );
};


export const getAddressById = async (userId, addressId) => {
    try {
        const user = await User.findById(userId, 'addresses').lean();
        if (!user || !user.addresses) return null;
        
        return user.addresses.find(addr => addr._id.toString() === addressId.toString());
    } catch (error) {
        throw error;
    }
};


export const findByReferralCode = async (code) => {
    return await User.findOne({ referralCode: code });
};

export const createReferral = async (referralData) => {
    const newReferral = new Referral(referralData);
    return await newReferral.save();
};

export const findByIdAndUpdate = async (userId, updateQuery, options = { new: true }) => {
    return await User.findByIdAndUpdate(userId, updateQuery, options).lean();
};

export const removeAddressFromDb = async (userId, addressId) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                $pull: { addresses: { _id: addressId } } 
            },
            { new: true } 
        );

        return updatedUser;
    } catch (error) {
        throw error;
    }
};

export const saveEmailChangeOTP = async (userId, newEmail, otp) => {
    console.log("Saving to pendingEmail ->", newEmail);
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                pendingEmail: newEmail,
                otp: String(otp),
                otpExpiry: new Date(Date.now() + 60000)
            }
        },
        { new: true }
    );
    console.log("Repository update execution result:", updatedUser ? "Success!" : "Failed!");
    return updatedUser;
};

export const clearEmailChangeOTP = async (userId) => {
    return await User.findByIdAndUpdate(
        userId,
        {
            $unset: { pendingEmail: "", otp: "", otpExpiry: "" }
        },
        { new: true }
    );
};