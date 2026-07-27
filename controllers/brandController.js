import * as brandService from '../services/brandService.js';

export const getBrand = async (req, res) => {
    try {
        const viewData = await brandService.getBrandsPageData(req.query);
        
        res.render('admin/brands', {
            ...viewData,
            activePage: 'brands',
        });
    } catch (error) {
        console.error("Controller Error loading brands:", error);
        res.status(500).send("Internal Server Error: Could not display brands table.");
    }
};


export const toggleBrandStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const isNowListed = await brandService.toggleBrandStatus(id);
        
        const message = isNowListed 
            ? "Brand listed successfully!" 
            : "Brand unlisted successfully!";
            
        req.flash('success', message);
      
        const page = req.query.page || 1;
        const search = req.query.search ? req.query.search.trim() : '';
        let redirectUrl = `/admin/brands?page=${page}`;
        if (search) redirectUrl += `&search=${encodeURIComponent(search)}`;
        
        res.redirect(redirectUrl);
    } catch (error) {
        console.error("Controller Error:", error);
        req.flash('error', "Failed to update brand status.");
        res.redirect('/admin/brands');
    }
};


export const getEditBrandPage = async (req, res) => {
    try {
        const brand = await brandService.findBrandById(req.params.id);
        if (!brand) return res.status(404).send("Brand not found.");

        res.render('admin/edit-brand', { 
            name: brand.name,
            description: brand.description,
            image: brand.logo,
            _id: brand._id,
            activePage: 'brands' 
        });
    } catch (error) {
        res.status(500).send("Error loading brand.");
    }
};

export const updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        
        await brandService.updateBrand(id, req.body);
        
        req.flash('success', 'Brand updated successfully!');
        res.redirect('/admin/brands');
    } catch (error) {
        console.error("Update Error:", error);
        
        const { id } = req.params;

        if (error.code === 11000 || error.message.includes('already exists')) {
            req.flash('error', 'A brand with this name already exists.');
        } else {
            req.flash('error', error.message || 'Brand update failed!');
        }

        res.redirect(`/admin/brands/edit/${id}`);
    }
};

export const getAddBrandPage = async (req, res) => {
    try {
        res.render('admin/add-brand', { activePage: 'brands' });
    } catch (error) {
        res.status(500).send("Error loading add brand page.");
    }
};

export const postAddBrand = async (req, res) => {
    try {
        await brandService.addBrand(req.body);
        
        req.flash('success', 'Brand added successfully!');
        res.redirect('/admin/brands');
    } catch (error) {
        console.error("Add Brand Error:", error);
        
        if (error.code === 11000 || error.message.includes('already exists')) {
            req.flash('error', 'A brand with this name already exists.');
        } else {
            req.flash('error', error.message || 'Failed to add brand.');
        }

        res.redirect('/admin/brands/add');
    }
};

export const getTopSellingBrands = async (req, res) => {
    try {
        const topBrands = await brandService.getTopBrandsService();
        res.status(200).json(topBrands);
    } catch (error) {
        console.error("Error fetching top brands analytics:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};