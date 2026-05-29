
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

export const getCategories = async (req, res) => {
   try {

      const data =
         await adminService.getCategoriesPage(req.query);

      res.render('admin/categories', data);

   } catch (error) {

      console.error(error);
      res.redirect('/admin/dashboard');

   }
};

export const getProducts = async (req, res) => {
   try {

      const data =
         await adminService.getProductsPage(req.query);

      res.render('admin/product', data);

   } catch (error) {

      console.error(error);
      res.status(500).send("Internal Server Error");

   }
};


export const getAddProduct = async (req, res) => {
   try {

      const data =
         await adminService.getAddProductPage();

      res.render('admin/add-product', data);

   } catch (error) {

      console.error(error);
      res.redirect('/admin/dashboard');

   }
};

export const getEditProduct = async (req, res) => {
   try {

      const data = await adminService.getEditProductPage(req.params.id);

      res.render('admin/edit-product', {
         ...data,
         activePage: 'products'
      });

   } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
   }
};

export const toggleListing = async (req, res) => {
   try {

      const result =
         await adminService.toggleCategoryListing(
            req.params.id
         );

      req.flash('success', result.message);

      res.redirect('/admin/categories');

   } catch (error) {

      req.flash('error', error.message);

      res.redirect('/admin/categories');

   }
};


export const postAddProduct = async (req, res) => {
   try {

      await adminService.createProduct(
         req.body,
         req.files
      );

      req.flash(
         'success',
         'Product saved successfully!'
      );

      res.redirect('/admin/products');

   } catch (error) {

      req.flash('error', error.message);

      res.redirect('/admin/products');

   }
};

export const postEditProduct = async (req, res) => {
   try {

      await adminService.updateProduct(
         req.params.id,
         req.body,
         req.files
      );

      req.flash("success", "Product updated successfully");
      return res.redirect('/admin/products');
     

   } catch (error) {

      console.error("EDIT PRODUCT ERROR:", error.message);

      req.flash("error", error.message || "Something went wrong");
      return res.redirect(`/admin/products/edit/${req.params.id}`);
   }
};

export const toggleProductStatus = async (req, res) => {
   try {

      const result =
         await adminService.toggleProductStatus(
            req.params.id
         );

      req.flash('success', result.message);

      req.session.save(() => {
         res.redirect('/admin/products');
      });

   } catch (error) {

      req.flash('error', error.message);

      req.session.save(() => {
         res.redirect('/admin/products');
      });

   }
};

export const postAddCategory = async (req, res) => {
   try {

      await adminService.createCategory(req.body);

      req.flash('success', 'New Category added successfully!');

      res.redirect('/admin/categories');

   } catch (error) {

      req.flash('error', error.message);

      res.redirect('/admin/categories');

   }
};

export const updateCategory = async (req, res) => {
   try {

      const result =
         await adminService.updateCategory(
            req.params.id,
            req.body
         );

       req.flash('success', 'Category updated successfully!');

      req.session.save(() => {
         res.redirect('/admin/categories');
      });

   } catch (error) {

      req.flash('error', error.message);

      req.session.save(() => {
         res.redirect('/admin/categories');
      });

   }
};

export const getSubcategoriesByParent = async (req, res) => {
   try {

      const subcategories =
         await adminService.getSubcategoriesByParent(req.params.id);

      res.json({
         success: true,
         subcategories
      });

   } catch (error) {
      res.status(500).json({
         success: false,
         message: "Failed to load subcategories"
      });
   }
};