import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'admin'
    }
}, { 
    timestamps: true // Automatically creates createdAt and updatedAt fields
});

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;