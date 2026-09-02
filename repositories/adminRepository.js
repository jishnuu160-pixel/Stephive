import Admin from '../models/adminModel.js';
import User from '../models/userModel.js';

export const findAdminByEmail = async (email) => {
    return await Admin.findOne({ email });
};


const buildCustomerQuery = (search) => {
    const query = {isAdmin: { $ne: true }};

    if (search) {
        query.$or = [
            {
                fullName: {
                    $regex: search,
                    $options: 'i'
                }
            },
            {
                email: {
                    $regex: search,
                    $options: 'i'
                }
            }
        ];
    }

    return query;
};


export const findCustomers = async (search, skip, limit) => {
    const query = buildCustomerQuery(search);

    return await User.find(query)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
};


export const countCustomers = async (search) => {
    const query = buildCustomerQuery(search);

    return await User.countDocuments(query);
};


export const findUserById = async (userId) => {
    return await User.findById(userId);
};