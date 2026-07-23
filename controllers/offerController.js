import * as OfferService from '../services/offerService.js';


export const loadOffersPage = async (req, res) => {
    try {
        const pageData = await OfferService.getOfferPageData();
       
        res.render("admin/offer", {
             ...pageData,
            activePage: 'offer'
         });
    } catch (error) {
        console.error("Failed to load offers panel:", error);
        res.status(500).render("admin/error", { message: "Internal Server Error" });
    }
};


export const processProductOffer = async (req, res) => {
    try {
        const { targetProduct, discountValue } = req.body;
        await OfferService.applyProductOffer(targetProduct, discountValue);
        req.flash('success',"Product offer added successfully");
        res.redirect("/admin/offer");
    } catch (error) {
        console.error("Failed to apply product offer:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};


export const processCategoryOffer = async (req, res) => {
    try {
        const { targetSubCategoryName, targetParentCategories, discountValue } = req.body;
        
        await OfferService.applyCategoryOffer(targetSubCategoryName, targetParentCategories, discountValue);
        
        req.flash('success', "Category offer added successfully");
        res.redirect("/admin/offer");
    } catch (error) {
        console.error("Failed to apply category offer:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};


export const deleteProductOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await OfferService.removeProductOffer(id);
        req.flash("success", "Product offer deleted successfully.");
        res.redirect("/admin/offer");
    } catch (error) {
        console.error("Failed to remove product offer:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};


export const deleteCategoryOffer = async (req, res) => {
    try {
        const { id } = req.params;
        await OfferService.removeCategoryOffer(id);
        req.flash("success", "Category offer deleted successfully.");
        res.redirect("/admin/offer");
    } catch (error) {
        console.error("Failed to remove category offer:", error);
        res.status(400).json({ success: false, error: error.message });
    }
};