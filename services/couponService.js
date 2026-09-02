import * as couponRepo from '../repositories/couponRepository.js';

export const getAllCoupons = async (page, limit, search) => {
    return await couponRepo.findAll(page, limit, search);
};

export const createNewCoupon = async (data) => {
    const errors = {};

    if (!data.name?.trim()) {
        errors.name = "Coupon name is required.";
    }

    
    if (!data.couponCode?.trim()) {
        errors.couponCode = "Coupon code is required.";
    } else {
        const existingCoupon = await couponRepo.findByCode(data.couponCode.trim().toUpperCase());
        if (existingCoupon) {
            errors.couponCode = "Coupon code already exists.";
        }
    }

    if (!["percentage", "fixed"].includes(data.discountType)) {
        errors.discountType = "Please select a valid discount type.";
    }

    if (!data.discountValue || Number(data.discountValue) <= 0) {
        errors.discountValue = "Discount value must be greater than 0.";
    }

    if (!data.min_orderAmount || Number(data.min_orderAmount) <= 0) {
        errors.min_orderAmount = "Minimum purchase amount must be greater than 0.";
    }

    if (data.discountType === "percentage") {

        if (Number(data.discountValue) > 100) {
            errors.discountValue = "Percentage discount cannot exceed 100%.";
        }

        if (!data.maxDiscountAmount || Number(data.maxDiscountAmount) <= 0) {
            errors.maxDiscountAmount = "Maximum discount is required.";
        }
    }

    if (
        data.discountType === "fixed" &&
        Number(data.discountValue) >= Number(data.min_orderAmount)
    ) {
        errors.discountValue =
            "Flat discount must be less than the minimum purchase amount.";
    }

    if (!data.expiryDate) {
        errors.expiryDate = "Expiry date is required.";
    } else {
            const expiry = new Date(data.expiryDate);
             expiry.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (expiry <= today) {
            errors.expiryDate = "Expiry date must be a future date.";
        }
    }

    if (!data.maxUseCount || Number(data.maxUseCount) <= 0) {
        errors.maxUseCount = "Maximum use count must be greater than 0.";
    }

    if (Object.keys(errors).length > 0) {
        const err = new Error("Validation failed");
        err.errors = errors;
        throw err;
    }

    const expiryDate = new Date(data.expiryDate);
    expiryDate.setHours(23, 59, 59, 999);

    const couponData = {
        name: data.name.trim(),
        code: data.couponCode.trim().toUpperCase(),
        startDate: new Date(),
        expiryDate: expiryDate,
        discountValue: Number(data.discountValue),
        discountType: data.discountType,
        min_orderAmount: Number(data.min_orderAmount),
        use_count: Number(data.maxUseCount),
        visibility: data.visibility,
        maxDiscountAmount:
            data.discountType === "percentage"
                ? Number(data.maxDiscountAmount)
                : null
    };

    return await couponRepo.create(couponData);
};


export const getCouponById = async (id) => {
    return await couponRepo.findById(id);
};


export const updateCoupon = async (id, data) => {

    if (data.discountType === "percentage") {
        if (
            !data.maxDiscountAmount ||
            Number(data.maxDiscountAmount) <= 0
        ) {
            throw new Error("Maximum discount is required for percentage coupons.");
        }
    }

    if (
        data.discountType === "fixed" &&
        Number(data.discountValue) >= Number(data.min_orderAmount)
    ) {
        throw new Error(
            "Flat discount must be less than the minimum purchase amount."
        );
    }
    const expiryDate = new Date(data.expiryDate);
    expiryDate.setHours(23, 59, 59, 999);

    const updatedData = {
        name: data.name,
        code: data.couponCode.toUpperCase(),
        expiryDate: expiryDate,
        discountValue: Number(data.discountValue),
        discountType: data.discountType,
        use_count: data.maxUseCount,
        min_orderAmount: Number(data.min_orderAmount),
        maxDiscountAmount:
            data.discountType === "percentage"
                ? Number(data.maxDiscountAmount)
                : null,
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

    if (coupon.status !== "Active") {
        throw new Error("Coupon is not active");
    }

    if (coupon.use_count <= 0) {
        throw new Error("This coupon has reached its usage limit.");
    }

    let discount = 0;

    if (coupon.discountType === "percentage") {
        discount = subtotal * (coupon.discountValue / 100);

        if (
            coupon.maxDiscountAmount &&
            discount > coupon.maxDiscountAmount
        ) {
            discount = coupon.maxDiscountAmount;
        }
    } else {
        discount = coupon.discountValue;
    }

    if (
        coupon.min_orderAmount &&
        subtotal < coupon.min_orderAmount
    ) {
        throw new Error(
            `Minimum purchase amount is ₹${coupon.min_orderAmount}`
        );
    }

    return {
        amount: Number(discount.toFixed(2)),
        _id: coupon._id,
    };
};