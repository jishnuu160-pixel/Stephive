import adminRepository from '../repositories/adminRepository.js';
import User from '../models/userModel.js'; 
import bcrypt from 'bcrypt';

export const getAdminLogin = (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    res.render('admin/login', { 
        title: 'Admin Login',
        isAdmin: true,  
        isAdminLogin: true,
        isLogin: true  
    });
};

export const postAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await adminRepository.findAdminByEmail(email);

        if (!admin) {
            return res.render('admin/login', { 
                isAdmin: true,
                isAdminLogin: true,
                error:"Invalid Admin Email"
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
               isAdmin: true,
               isAdminLogin: true,
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
        const search = req.query.search || ''; // 1. Capture search
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        let query = { isAdmin: { $ne: true } };

        if (search) {
            query.$and = [
                { isAdmin: { $ne: true } },
                {
                    $or: [
                        { fullName: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

        const customersData = await User.find(query)
            .sort({ _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.render('admin/customers', {
            isAdmin: true,
            title: 'Customer Management',
            users: customersData,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            searchQuery: search 
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



export const adminLogout = (req, res) => {
    req.session.admin=null;

    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.redirect('/admin/dashboard');
        }
        res.clearCookie('connect.sid'); 
        res.redirect('/admin/login');
    });
};