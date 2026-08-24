import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    returnId:{ type: String,unique: true, required: true },
    orderId: { type: String, required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productName: { type: String, required: true },
    color: { type: String, default: '' },
    size: { type: String, required: true },
    quantity: { type: String, required: true },
    productImage: { type: String, required: true },
    returnType: { type: String, required: true }, 
    price: { type: Number, required: true }, 
    description: { type: String },
    status: {
    type: String,
    enum: ['Requested', 'Picked Up', 'Refunded', 'Rejected'],
    default: 'Requested'
}, 
    reason: { type: String, required: true },
    refundAmount: { type: Number },
    refundMode: { type: String },
    expectedPickupDate: { type: Date },
    pickupAddress: {
        fullName: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        pincode: String,
        mobileNumber: String
    },
 }, { timestamps: true });

 returnSchema.index({ orderId: 1, itemId: 1 }, { unique: true });

const ReturnModel = mongoose.model('ReturnDetail', returnSchema, 'return_details');
export default ReturnModel;