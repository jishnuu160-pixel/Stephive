import { HTTP_STATUS } from '../constants/httpStatusCode.js';
import * as couponService from '../services/couponService.js';
import * as OrderService from '../services/orderService.js';

export const getCouponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5; 
        const search = req.query.search || "";

        const { coupons, total, totalPages } = await couponService.getAllCoupons(page, limit, search);

        res.render('admin/coupons', {
            hasCoupons:coupons.length>0,
            coupons,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            search,
            activePage: 'coupons'
        });
    } catch (error) {
        console.error("Error loading coupons:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error loading coupons");
    }
};

export const getAddCouponPage = (req, res) => {
    res.render('admin/add-coupon', { layout: 'admin-layout',activePage:'coupons' });
};

export const addCoupon = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            throw new Error("req.body is empty. Check your form inputs.");
        }
        await couponService.createNewCoupon(req.body);
        req.flash("success","New Coupon Added");
        return res.redirect('/admin/coupons');
    }catch (error) {
    console.error("addCoupon Error:", error);

    res.status(HTTP_STATUS.BAD_REQUEST).render("admin/add-coupon", {
        layout: "admin-layout",
        activePage: "coupons",
        errors: error.errors || {},
        formData: req.body
    });
}
}

export const getEditCouponPage = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("DEBUG: Fetching coupon with ID:", id);

        const couponDoc = await couponService.getCouponById(id);
        
        if (!couponDoc) {
            return res.status(HTTP_STATUS.NOT_FOUND).send("Coupon not found.");
        }

        const coupon = couponDoc.toObject();

        if (coupon.expiryDate instanceof Date) {
            coupon.expiryDate = coupon.expiryDate.toISOString().split('T')[0];
        } else if (typeof coupon.expiryDate === 'string') {
            coupon.expiryDate = coupon.expiryDate.split('T')[0];
        }   
        res.render('admin/edit-coupon', { coupon ,activePage:'coupons'});
    } catch (error) {
        console.error("DEBUG: Error in getEditCouponPage:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error loading edit page");
    }
};

export const updateCoupon = async (req, res) => {
    try {
        await couponService.updateCoupon(req.params.id, req.body);
        req.flash("success","Coupon updated");
        res.redirect('/admin/coupons');
    } catch (error) {
        console.log("error:",error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error updating coupon");
    }
};


export const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        await couponService.toggleCouponStatus(id);  
        
        res.redirect('/admin/coupons');
    } catch (error) {
        console.error("Error toggling status:", error.message);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error updating coupon status");
    }
};

export const applyCoupon = async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        
        if (subtotal === undefined) return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Subtotal is missing" });

        const sub = parseFloat(subtotal);
        const rawDiscount = await couponService.validate(code, sub);
        const discount = isNaN(rawDiscount) ? 0 : rawDiscount;
        
        const tax = sub * 0.1;
        const total = (sub - discount) + tax;

        req.session.appliedCouponCode = code;
        req.session.save((err) => {
            if (err) {
                console.error("Session Save Error:", err);
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Session save failed" });
            }
            
            res.status(HTTP_STATUS.OK).json({ success: true, discount: discount, tax: tax, total: total });
        });
    } catch (error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

export const getAvailableCoupons = async (req, res) => {
    try {
        const coupons = await couponService.getActiveCoupons();
        res.status(HTTP_STATUS.OK).json(coupons);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Error fetching coupons" });
    }
};

export const getAvailableCouponsAjax = async (req, res) => {
    try {
        const data = await couponService.fetchAvailableCoupons();
        res.status(HTTP_STATUS.OK).json(data);
    } catch (error) {
        console.error("TRACE [Controller]: Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Error" });
    }
};


export const removeCoupon = async (req, res) => {
    try {
        req.session.appliedCouponCode = null;
        
        req.session.save((err) => {
            if (err) {
                return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Session error" });
            }
            return res.status(HTTP_STATUS.OK).json({ success: true, message: "Coupon removed successfully" });
        });
    } catch (error) {
        console.error("Remove Coupon Error:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to remove coupon" });
    }
};