import * as categoryRepo from '../repositories/categoryRepository.js';
import * as productRepo from '../repositories/productRepository.js'; 

export const getCategoriesPage = async (queryParams) => {
   const search = queryParams.search || '';
   const page = parseInt(queryParams.page) || 1;
   const limit = 8;
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
   const { categoryName, description, parentCategory, discountValue } = body;

   const nameRegex = /^[A-Za-z\s]+$/;
   const trimmedName = categoryName?.trim();
   const trimmedDesc = description?.trim();
   const resolvedParent = parentCategory || null;

   if (!trimmedName && !trimmedDesc) {
      throw new Error("Category and description is required");
   } else if (!nameRegex.test(trimmedName) && !nameRegex.test(trimmedDesc)) {
      throw new Error("Category and description should contain letters.");
   }

   if (!trimmedName) {
      throw new Error("Category name is required");
   } else if (!nameRegex.test(trimmedName)) {
      throw new Error("Category should contain letters.");
   }

   if (!trimmedDesc) {
      throw new Error("Description is required");
   } else if (!nameRegex.test(trimmedDesc)) {
      throw new Error("Description should contain letters.");
   }

   if (resolvedParent) {
      const parentDoc = await categoryRepo.findCategoryById(resolvedParent);
      if (parentDoc && parentDoc.name.localeCompare(trimmedName, undefined, { sensitivity: 'accent' }) === 0) {
         throw new Error("A subcategory cannot have the same name as its parent category.");
      }
   }

   const existingCategory = await categoryRepo.findCategoryByNameAndParent(trimmedName, resolvedParent);

   if (existingCategory) {
      throw new Error('Category already exists.');
   }

   const categoryData = {
      name: trimmedName,
      description: trimmedDesc || '', 
      parentCategory: resolvedParent, 
      isListed: true, 
      offer: {
         discountValue: discountValue ? parseInt(discountValue, 10) : 0,
         offerType: 'Percentage',
         isActive: Number(discountValue) > 0
      }
   };

   await categoryRepo.createCategory(categoryData);
};

export const updateCategory = async (categoryId, body) => {
   const { categoryName, description, parentCategory, discountValue } = body;

   if (!categoryName?.trim() && !description?.trim()) {
      throw new Error('Category name and description fields are required.');
   }

   const nameRegex = /^[A-Za-z\s]+$/;
   const trimmedName = categoryName?.trim();
   const trimmedDesc = description?.trim();
   const resolvedParent = parentCategory || null;

   if (!trimmedName) {
      throw new Error("Category name is required");
   } else if (!nameRegex.test(trimmedName)) {
      throw new Error("Category should contain letters.");
   }

   if (!trimmedDesc) {
      throw new Error("Description is required");
   } else if (!nameRegex.test(trimmedDesc)) {
      throw new Error("Description should contain letters.");
   }

   if (resolvedParent === categoryId) {
      throw new Error('A category cannot be its own parent.');
   }

   if (resolvedParent) {
      const parentDoc = await categoryRepo.findCategoryById(resolvedParent);
      if (parentDoc && parentDoc.name.localeCompare(trimmedName, undefined, { sensitivity: 'accent' }) === 0) {
         throw new Error("A subcategory cannot have the same name as its parent category.");
      }
   }

   const duplicate = await categoryRepo.findCategoryByNameAndParent(
       trimmedName, 
       resolvedParent,
       categoryId 
   );

   if (duplicate) {
       throw new Error('Another category with this name already exists.');
   }

   const updatedCategory = await categoryRepo.updateCategory(
         categoryId,
         {
            name: trimmedName,
            description: trimmedDesc,
            parentCategory: resolvedParent,
            offer: {
               discountValue: discountValue ? parseInt(discountValue, 10) : 0,
               offerType: 'Percentage',
               isActive: discountValue && parseInt(discountValue, 10) > 0
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