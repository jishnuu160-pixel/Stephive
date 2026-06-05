
import adminRepo from '../repositories/adminRepository.js';
import * as categoryRepo from '../repositories/categoryRepository.js';
import * as productRepo from '../repositories/productRepository.js'; 

export const getCategoriesPage = async (queryParams) => {
   const search = queryParams.search || '';
   const page = parseInt(queryParams.page) || 1;
   const limit = 5;
   const skip = (page - 1) * limit;

   let query = {};
   if (search) {
      query.name = {
         $regex: search,
         $options: 'i'
      };
   }

   const categories = await categoryRepo.findCategoriesWithPagination(
         query,
         skip,
         limit
      );

   const parentCategories = await categoryRepo.findParentCategories();
   const totalItems = await categoryRepo.countCategories(query);
   const totalPages = Math.ceil(totalItems / limit);
 
   return {
      isAdmin: true,
      activePage: 'categories',
      categories,
      parentCategories,
      startIndex: skip,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      searchQuery: search
   };
};

export const createCategory = async (body) => {
   const { categoryName, description, parentCategory, childCategory, discountValue } = body;

   if (!categoryName?.trim()) {
      throw new Error("Category name is required");
   }

   if (!description?.trim()) {
      throw new Error("Description is required");
   }

   const existingCategory = await categoryRepo.findCategoryByNameAndParent(categoryName.trim(), parentCategory || null);

   if (existingCategory) {
      throw new Error('Category already exists.');
   }

   const categoryData = {
      name: categoryName.trim(),
      description: description?.trim() || '', 
      parentCategory: parentCategory || null, 
      isListed: true, 
      offer: {
         discountValue: discountValue ? parseInt(discountValue) : 0,
         offerType: 'Percentage',
         isActive: Number(discountValue) > 0
      }
   };

   await categoryRepo.createCategory(categoryData);
};

export const updateCategory = async (categoryId, body) => {
   const { categoryName, description, parentCategory, discountValue } = body;

   if (!categoryName?.trim() || !description?.trim()) {
      throw new Error('Category name and description fields are required.');
   }

   const updatedCategory = await categoryRepo.updateCategory(
         categoryId,
         {
            name: categoryName.trim(),
            description: description.trim(),
            parentCategory: parentCategory || null,
            offer: {
               discountValue: discountValue ? parseInt(discountValue) : 0,
               offerType: 'Percentage',
               isActive: discountValue && parseInt(discountValue) > 0
            }
         }
      );

   if (!updatedCategory) {
      throw new Error('Category not found.');
   }

   return updatedCategory;
};

export const toggleCategoryListing = async (categoryId) => {
   const category = await categoryRepo.findCategoryById(categoryId);

   if (!category) {
      throw new Error('Category not found');
   }

   const nextListingState = !category.isListed;

   await categoryRepo.updateCategory(categoryId, { isListed: nextListingState });

   if (productRepo && typeof productRepo.updateProduct === 'function') {
      const associatedProducts = await productRepo.findProducts({ Category: categoryId }, {}, 0, 99999);
      
      for (const product of associatedProducts) {
         await productRepo.updateProduct(product._id, { isListed: nextListingState });
      }
   }

   return {
      message: `${category.name} has been ${nextListingState ? 'listed' : 'unlisted'}`
   };
};

export const getSubcategoriesByParent = async (parentId) => {
   if (!parentId) return [];
   return await categoryRepo.findSubCategoriesByParent(parentId);
};