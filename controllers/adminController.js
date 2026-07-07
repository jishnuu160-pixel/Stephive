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

        const admin = await adminService.login(email,password);

        req.session.admin = {
            id: admin._id,
            email: admin.email
        };
        req.flash('success','Welcome back, Admin!');

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

export const getDashboard = async(req, res) => {
   try{
    const userCount= await adminService.countCustomers();
   
       res.render('admin/dashboard', {
        isAdmin: true, 
        title: 'Admin Dashboard',
        activePage:'dashboard',
        userCount,
    });
}catch(error){
    console.error("Dashboard Error:",error);
 }
};

//Get User data
export const getCustomers = async (req, res) => {
   try {
      const data =  await adminService.getCustomersPage(req.query);

      res.render('admin/customers', data);
   } catch (error) {
      res.status(500).send("Internal Server Error");
   }
};

//Toggle User
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

export const getOrders = async (req, res) => {
    try {
        const { search, page } = req.query;
        const ordersData = await adminService.getAllOrders({ search, page });
        
        res.render('admin/orders', {
            isAdmin: true,
            title: 'Order Management',
            activePage: 'orders',
            ...ordersData,
            orders: ordersData.orders,
            pagination: ordersData.pagination 
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
    }
};



export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await adminService.getOrderById(id);
        
        if (!order) return res.status(404).send("Order not found");

       res.render('admin/orders-details', { order: order ,
            ...order, 
            isAdmin: true,
           activePage: 'orders'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};


export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params; 
        const { status } = req.body;
        
        await adminService.updateOrderStatus(id, status);
        req.flash("success","Order Status updated");
        res.redirect(`/admin/orders/${id}`); 
    } catch (error) {
        console.error("Update failed:", error);
        res.status(500).send("Error updating order status");
    }
};


export const getAllReturns = async (req, res) => {
    try {
        const returns = await adminService.fetchAllReturns();
        res.render('admin/returns', { 
            returns, 
            layout: 'admin-layout',
            activePage:'return' });
    } catch (error) {
        console.log("Error Return:",error);
        res.status(500).send("Error loading returns");
    }
};

export const updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; 
        await adminService.changeReturnStatus(id, status);
        req.flash("success","Status updated successfully");
        res.status(200).json({ message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ error: "Failed to update status" });
    }
};