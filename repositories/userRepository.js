import User from '../models/userModel.js';

export const findByEmail = async (email) => {
    return await User.findOne({ email });
};

export const createUser = async (data) => {
    return await User.create(data);
};