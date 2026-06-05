import * as brandService from '../services/brandService.js';


export const getBrand = async (req, res) => {
    try {
        const viewData = await brandService.getBrandsPageData(req.query);
        
        res.render('admin/brands', {
            ...viewData,
            activePage:'brands',
        });
    } catch (error) {
        console.error("Controller Error loading brands:", error);
        res.status(500).send("Internal Server Error: Could not display brands table.");
    }
};


export const toggleBrandStatus = async (req, res) => {
    try {
        const { id } = req.params;
        await brandService.toggleBrandStatus(id);
      
        res.redirect('/admin/brands');
    } catch (error) {
        console.error("Controller Error processing status toggle:", error);
        res.status(400).send("Failed to execute brand status toggle operation.");
    }
};