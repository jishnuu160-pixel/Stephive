import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: false },
    password: { type: String, required: false }, 
    profileImage:{
        type:String,
        default: ''
    },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    isBlocked: { type: Boolean, default: false },
    gender:{
        type:String,
        default:''
    },
    addresses: [{
        fullName: String,
        phone: String,
        street: String,
        apartment: String,
        city: String,
        state: String,
        pincode: String,
        label: String, // 'Home', 'Office', etc.
        isDefault: { type: Boolean, default: false }
    }]
});


const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;

