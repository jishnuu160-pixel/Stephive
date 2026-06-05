
import * as adminService from '../services/adminService.js';

export const getAdminLogin = (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    req.flash("success");
    req.flash("error");

    res.render('admin/login', { 
        title: 'Admin Login',
        layout:'auth-layout',
        isAdmin: true,  
        isAdminLogin: true,
        isLogin: true  
    });
};

export const postAdminLogin = async (req, res) => {
    try {

        const { email, password } = req.body;

        const admin = await adminService.login(
            email,
            password
        );

        req.session.admin = {
            id: admin._id,
            email: admin.email
        };

        req.flash(
            'success',
            'Welcome back, Admin!'
        );

        req.session.save(() => {
            res.redirect('/admin/dashboard');
        });

    } catch (error) {

        res.render('admin/login', {
            isAdmin: true,
            isAdminLogin: true,
            error: error.message
        });

    }
};

export const getDashboard = (req, res) => {

       res.render('admin/dashboard', {
        isAdmin: true, 
        title: 'Admin Dashboard',
        activePage:'dashboard'
    });
};

export const getCustomers = async (req, res) => {
   try {

      const data =
         await adminService.getCustomersPage(req.query);

      res.render('admin/customers', data);

   } catch (error) {

      res.status(500).send("Internal Server Error");

   }
};

export const toggleUserStatus = async (req, res) => {
   try {

      const result =
         await adminService.toggleUserStatus(
            req.params.id
         );

      req.flash('success', result.message);

      req.session.save(() => {
         res.redirect('/admin/customers');
      });

   } catch (error) {

      req.flash('error', error.message);

      req.session.save(() => {
         res.redirect('/admin/customers');
      });

   }
};

export const adminLogout = (req, res) => {
    
    delete req.session.admin;

    req.session.save((err) => {
        if (err) {
            console.error("Logout save error:", err);
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/admin/login');
    });
};



















