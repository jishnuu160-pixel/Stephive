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

      const result =
         await categoryService.toggleCategoryListing(
            req.params.id
         );

      req.flash('success', result.message);

      res.redirect('/admin/categories');

   } catch (error) {

      req.flash('error', error.message);

      res.redirect('/admin/categories');

   }
};


export const postAddCategory = async (req, res) => {
   try {

      await categoryService.createCategory(req.body);

      req.flash('success', 'New Category added successfully!');

      res.redirect('/admin/categories');

   } catch (error) {

      req.flash('error', error.message);

      res.redirect('/admin/categories');

   }
};


export const updateCategory = async (req, res) => {
   try {

      const result = await categoryService.updateCategory(
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
      const subcategories = await categoryService.getSubcategoriesByParent(req.params.id);

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

