import mongoose from 'mongoose';
import { type } from 'os';

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: false },
    phoneNumber: { type: String, required: false, unique:true, sparse:true },
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
        label: String, 
        isDefault: { type: Boolean, default: false }
    }]
});


const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;

