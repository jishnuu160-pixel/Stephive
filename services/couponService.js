import * as couponRepo from '../repositories/couponRepository.js';

export const getAllCoupons = async (page, limit, search) => {
    return await couponRepo.findAll(page, limit, search);
};

export const createNewCoupon = async (data) => {
    if (!data.expiryDate) {
        throw new Error("Expiry Date is required.");
    }

    const couponData = {
        name: data.name,                
        code: data.couponCode.toUpperCase(),
        startDate: data.startDate || Date.now(),
        expiryDate: new Date(data.expiryDate), 
        discountValue: Number(data.discountValue),
        discountType: data.discountType,
        min_orderAmount: Number(data.min_orderAmount), 
        use_count: data.maxUseCount,
        visibility: data.visibility,
        maxDiscountAmount: Number(data.maxOrderAmount)
    };
    return await couponRepo.create(couponData);
};


export const getCouponById = async (id) => {
    return await couponRepo.findById(id);
};


export const updateCoupon = async (id, data) => {
    const updatedData = {
        name: data.name,
        code: data.couponCode.toUpperCase(),
        expiryDate: new Date(data.expiryDate),
        discountValue: Number(data.discountValue),
        discountType: data.discountType,
        use_count:data.maxUseCount,
        min_orderAmount: Number(data.min_orderAmount),
        maxDiscountAmount: Number(data.maxDiscountAmount),
        visibility: data.visibility
    };
    return await couponRepo.updateCouponData(id, updatedData); 
};


export const toggleCouponStatus = async (id) => {
    const coupon = await couponRepo.findById(id);
    if (!coupon) throw new Error("Coupon not found");

    const newStatus = (coupon.status === 'Active') ? 'Inactive' : 'Active';    
    return await couponRepo.updateStatus(id, newStatus);
};

export const fetchAvailableCoupons = async () => {
    const data = await couponRepo.getActiveCoupons();
    return data;
};

export const validate = async (code, subtotal) => {
    const coupon = await couponRepo.findByCode(code);
    
    if (!coupon) throw new Error("Invalid coupon code");

    if (coupon.status !== 'Active') throw new Error("Coupon is not active");

    if (coupon.usedCount >= coupon.usageLimit) {
        throw new Error("This coupon has reached its usage limit.");
    }

    let discount = 0;
    if (coupon.discountType === 'percentage') {
        discount = subtotal * (coupon.discountValue / 100);
        
        if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
        }
    } else {
        discount = coupon.discountAmount;
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        throw new Error(`Minimum order amount is ₹${coupon.minOrderAmount}`);
    }
   return {
    amount: Number(discount.toFixed(2)),
    _id: coupon._id
};
};