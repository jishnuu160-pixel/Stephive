import Coupon from '../models/couponModel.js';

export const findAll = async (page, limit, search) => {
    const query = search ? { $or: [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
    ]} : {};

    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
        Coupon.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        Coupon.countDocuments(query)
    ]);

    return { 
        coupons, 
        total, 
        totalPages: Math.ceil(total / limit) 
    };
};


export const create = async (couponData) => {
    const coupon = new Coupon(couponData);
    return await coupon.save();
};

export const findById = async (id) => {
    return await Coupon.findOne({ _id: id });
};

export const updateStatus = async (id, newStatus) => {
    return await Coupon.findByIdAndUpdate(id, { status: newStatus }, { new: true });
};


export const updateCouponData = async (id, updatedData) => {
    return await Coupon.findByIdAndUpdate(
        id, 
        { $set: updatedData }, 
        { returnDocument: 'after', runValidators: true }
    );
};


export const getActiveCoupons = async () => {
    const currentDate = new Date();
    return await Coupon.find({
        status: 'Active',
        startDate: { $lte: currentDate },
        expiryDate: { $gte: currentDate }
    });
};


export const findByCode = async (codeValue) => {
    return await Coupon.findOne({ code: String(codeValue) });
};


export const decrementUseCount = async (couponId) => {
    try {
        const result = await Coupon.findOneAndUpdate(
            { 
                _id: couponId, 
                use_count: { $gt: 0 } 
            },
            { $inc: { use_count: -1 } }, 
            { new: true }
        );

        if (!result) {
            throw new Error("Coupon has no remaining uses.");
        } 
        return result;
    } catch (error) {
        throw error;
    }
};


