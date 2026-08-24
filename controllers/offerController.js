import { HTTP_STATUS } from '../constants/httpStatusCode.js';
import * as OfferService from '../services/offerService.js';


export const loadOffersPage = async (req, res) => {
    try {
        const pageData = await OfferService.getOfferPageData();
       
        res.render("admin/offer", {
             ...pageData,
            activePage: 'offer'
         });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("admin/error", { message: "Internal Server Error" });
    }
};


export const processProductOffer = async (req, res) => {
    try {
        const { targetProduct, discountValue, startDate, expiryDate } = req.body;
        await OfferService.applyProductOffer(targetProduct, discountValue, startDate, expiryDate);
        
        req.flash('success', "Product offer added successfully");
        res.redirect("/admin/offer");
    } catch (error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            field: 'targetProduct', 
            error: error.message 
        });
    }
};

export const processCategoryOffer = async (req, res) => {
    try {
        const { subCategoryName, targetParentCategories, discountValue, startDate, expiryDate } = req.body;
        await OfferService.applyCategoryOffer(subCategoryName, targetParentCategories, discountValue, startDate, expiryDate);
        
        req.flash('success', "Category offer added successfully");
        res.redirect("/admin/offer");
    } catch (error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
            success: false, 
            field: 'subCategoryName', 
            error: error.message 
        });
    }
};


export const deleteProductOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await OfferService.removeProductOffer(id);
        req.flash("success", "Product offer deleted successfully.");
        res.redirect("/admin/offer");
    } catch (error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: error.message });
    }
};


export const deleteCategoryOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await OfferService.removeCategoryOffer(id);
        req.flash("success", "Category offer deleted successfully.");
        res.redirect("/admin/offer");
    } catch (error) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: error.message });
    }
};