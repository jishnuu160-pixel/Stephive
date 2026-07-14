import mongoose  from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  startDate: {
        type: Date,
        required: true,
        default: Date.now 
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: { 
        type: String, 
        enum: ['Active', 'Inactive'], 
        default: 'Active' 
    },
  maxDiscountAmount: { type: Number }, 
  use_count: { type: Number, default: 0 },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  discountValue: { type: Number, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  min_orderAmount: { type: Number, required: true }
}, { timestamps: true }); 

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;