import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productName: String,
    productImage: String,
    productColor: String,
    price: Number,
    quantity: Number,
    size: String,
    color: String,
    status: { 
      type: String, 
      enum: ['failed','placed','pending' ,'processing', 'shipped', 'out of delivery', 'delivered', 'cancelled', 'returned', 'refunded'],
      default: 'placed',
      lowercase: true,
    }
  }],

  deliveryAddress: {
    fullName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    mobileNumber: String
  },

  subtotal: Number,
  tax: Number,
  shippingCharge: Number,
  discount: Number,
  finalAmount: Number,
  total: Number,

  paymentMethod: { type: String, enum: ['razorpay', 'cod', 'wallet'] },
  status: { 
    type: String, 
    enum: ['failed','placed','pending', 'processing', 'shipped', 'out of delivery', 'delivered', 'cancelled', 'returned','refunded'],
    default: 'placed',
    lowercase: true,
  },
  expectedDeliveryDate: { type: Date },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  courierName: String,
  cancelReason: String,
  cancelledAt: Date
}, { timestamps: true }); 

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;