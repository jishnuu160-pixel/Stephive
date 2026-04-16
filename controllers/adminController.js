import adminRepository from '../repositories/adminRepository.js';
import User from '../models/userModel.js'; 
import bcrypt from 'bcrypt';

// 1. GET Admin Login Page
export const getAdminLogin = (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.render('admin/login', { 
        title: 'Admin Login',
        isLogin: true,  
        isAdmin: false  
    });
};

// 2. POST Admin Login (Updated to use Database + Repository)
export const postAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await adminRepository.findAdminByEmail(email);

        if (!admin) {
            return res.render('admin/login', { 
                layout: 'admin-auth', 
                error: "Invalid Admin Email" 
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (isMatch) {
            req.session.admin = {
                id: admin._id,
                email: admin.email
            };
            
            return res.redirect('/admin/dashboard');
        } else {
            return res.render('admin/login', { 
                layout: 'admin-auth', 
                error: "Incorrect Password" 
            });
        }

    } catch (error) {
        console.error("Login Controller Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

export const getDashboard = (req, res) => {
    res.render('admin/dashboard', {
        isAdmin: true, 
        title: 'Admin Dashboard'
    });
};

export const getCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const query = { isAdmin: { $ne: true } };

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

        const customersData = await User.find(query)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.render('admin/customers', {
            isAdmin: true,
            users: customersData,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};

export const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (user) {
            user.isBlocked = !user.isBlocked; 
            await user.save();
            res.redirect('/admin/customers');
        } else {
            res.status(404).send("User not found");
        }
    } catch (error) {
        console.error("Status Toggle Error:", error);
        res.status(500).send("Internal Server Error");
    }
};