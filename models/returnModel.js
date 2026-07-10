import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    returnId:{ type: String,unique:true, required: true },
    orderId: { type: String, unique:true,required: true },
    productName: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: String, required: true },
    productImage: { type: String, required: true },
    returnType: { type: String, required: true }, 
    returnStatus: { type: String, default: 'Pending' }, 
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
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const ReturnModel = mongoose.model('ReturnDetail', returnSchema, 'return_details');
export default ReturnModel;