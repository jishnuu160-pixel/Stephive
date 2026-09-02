import { HTTP_STATUS } from '../constants/httpStatusCode.js';
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
    return res.status(HTTP_STATUS.UNAUTHORIZED).render('admin/login', {
        title: 'Admin Login',
        layout: 'auth-layout',
        isAdmin: true,
        isAdminLogin: true,
        isLogin: true,
        error: error.message
    });

    }
};


export const getDashboard = async (req, res) => {
    try {
        const userCount = await adminService.countCustomers();
        const cancelledOrder= await adminService.cancelledOrder();
        const metrics = await adminService.getDashboardMetrics(); 
        
        const initialChartData = await adminService.getSalesChartData('week');
        res.render('admin/dashboard', {
            isAdmin: true, 
            title: 'Admin Dashboard',
            activePage: 'dashboard',
            userCount,
            cancelledOrder,
            totalOrders: metrics.totalOrders,
            totalSales: metrics.totalSales,
            initialChartData: JSON.stringify(initialChartData)
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
    }
};

export const getChartData = async (req, res) => {
    try {
        const { filter = 'week' } = req.query;
        const chartData = await adminService.getSalesChartData(filter);
         
        res.json(chartData); 
    } catch (error) {
        console.error("Chart Data Controller Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch chart metrics' });
    }
};


export const getTopProductsApi = async (req, res) => {
    try {
        const topProducts = await adminService.getTopSellingProducts();
        
        return res.status(HTTP_STATUS.OK).json({
            success: true,
            products: topProducts
        });
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};


export const getTopCategories = async (req, res) => {
    try {
        const topCategories = await adminService.getTopCategoriesService();
        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: topCategories
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message
        });
    }
};

export const getCustomers = async (req, res) => {
   try {
      const data =  await adminService.getCustomersPage(req.query);

      res.render('admin/customers', {...data});
   } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
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
        res.status(HTTP_STATUS.BAD_REQUEST).redirect('/admin/customers');
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
            startIndex: ordersData.startIndex,
            pagination: ordersData.pagination, 
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
};



export const getOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await adminService.getOrderById(id);
        
        if (!order) return res.status(HTTP_STATUS.NOT_FOUND).send("Order not found");

        res.render('admin/orders-details', { order: order ,
            ...order, 
            isAdmin: true,
           activePage: 'orders'
        });
    } catch (error) {
        console.error(error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Server Error");
    }
};


export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params; 
        const { status } = req.body;
        
        await adminService.updateOrderStatus(id, status);
        req.flash("success", "Order Status updated");
        return res.redirect(`/admin/orders/${id}`); 
    } catch (error) {
        console.error("Update failed:", error.message);
        req.flash("error", error.message || "Error updating order status");
        return res.status(HTTP_STATUS.BAD_REQUEST).redirect(`/admin/orders/${req.params.id}`);
    }
};



export const updateReturnStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        await adminService.changeReturnStatus(id, status);
        
        return res.status(HTTP_STATUS.OK).json({ success: true, message: "Status updated successfully" });
    } catch (error) {
        console.error("Update Controller Error:", error);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message || "Failed to update status" });
    }
};

