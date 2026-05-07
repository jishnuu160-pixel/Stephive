import User from '../models/userModel.js';

export const findByEmail = async (email) => {
    return await User.findOne({ email: email }).lean();
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

export const saveOTP = async (email, otp) => {
    try {
        return await User.findOneAndUpdate(
            { email: email },
            { 
                $set: { 
                    otp: otp, 
                    otpExpiry: Date.now() + 300000 
                } 
            },
            { returnDocument: 'after' } 
        );
    } catch (error) {
        throw new Error('Error saving OTP to database');
    }
};

export const findById = async (id) => {
    try {
        return await User.findById(id).lean();
    } catch (error) {
        throw new Error('Error fetching user by ID');
    }
};


export const addAddress = async (userId, addressData) => {
    try {
        console.log("Repo: Attempting to save for ID:", userId);
        
        const result = await User.findByIdAndUpdate(
            userId,
            { $push: { addresses: addressData } }, 
            { new: true }
        ).lean();

        console.log("Repo: Update result:", result ? "SUCCESS" : "FAILED (User not found)");
        return result;
    } catch (error) {
        console.error("Repo: DB Error:", error.message);
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
        console.error("Repository Error (updateUserInfo):", error.message);
        throw new Error("Failed to update user in database");
    }
};
