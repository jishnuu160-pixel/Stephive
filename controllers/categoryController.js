import * as categoryService from '../services/categoryService.js';

export const getCategories = async (req, res) => {
   try {

      const data =
         await categoryService.getCategoriesPage(req.query);

      res.render('admin/categories', data);

   } catch (error) {

      console.error(error);
      res.redirect('/admin/dashboard');

   }
};


export const toggleListing = async (req, res) => {
   try {
      const result = await categoryService.toggleCategoryListing(req.params.id);
      
      return res.status(200).json({ 
          success: true, 
          message: result.message || 'Status updated successfully!' 
      });

   } catch (error) {
      return res.status(400).json({ 
          success: false, 
          message: error.message 
      });
   }
};


export const postAddCategory = async (req, res) => {
    try {
        const sanitizedBody = {
            ...req.body,
            parentCategory: (!req.body.parentCategory || 
                             req.body.parentCategory === "undefined" || 
                             req.body.parentCategory === "null" || 
                             req.body.parentCategory === "") 
                            ? null 
                            : req.body.parentCategory
        };

        await categoryService.createCategory(sanitizedBody);

        return res.status(200).json({ 
            success: true, 
            message: 'Category added successfully!' 
        });

    } catch (error) {
        console.error("Error adding category:", error.message);
        return res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};


export const updateCategory = async (req, res) => {
   try {
      const sanitizedBody = {
          ...req.body,
          parentCategory: (!req.body.parentCategory || 
                           req.body.parentCategory === "undefined" || 
                           req.body.parentCategory === "null" || 
                           req.body.parentCategory === "") 
                          ? null 
                          : req.body.parentCategory
      };

      await categoryService.updateCategory(req.params.id, sanitizedBody);
      
      return res.status(200).json({ 
          success: true, 
          message: 'Category updated successfully!' 
      });

   } catch (error) {
      console.error(`Error updating category ${req.params.id}:`, error.message);
      
      return res.status(400).json({ 
          success: false, 
          message: error.message || 'An unexpected error occurred.' 
      });
   }
};

export const getSubcategoriesByParent = async (req, res) => {
    try {
        const { id } = req.params;
        const subcategories = await categoryService.getSubcategoriesByParent(id);
        
        res.json({ success: true, subcategories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

