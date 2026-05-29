import  adminRepo from '../repositories/adminRepository.js';
import bcrypt from 'bcrypt';

export const login = async (
   email,
   password
) => {

   const admin =
      await adminRepo.findAdminByEmail(email);

   if (!admin) {
      throw new Error("Invalid email");
   }

   const isMatch =
      await bcrypt.compare(
         password,
         admin.password
      );

   if (!isMatch) {
      throw new Error("Incorrect password");
   }

   return admin;
};

export const getCustomers = async (
   query,
   skip,
   limit
) => {

   return await adminRepo.findCustomers(
      query,
      skip,
      limit
   );

};

export const countCustomers = async (query) => {

   return await adminRepo.countCustomers(query);

};

export const getCustomersPage = async (queryParams) => {

   const search = queryParams.search || '';

   const page = parseInt(queryParams.page) || 1;

   const limit = 4;

   const skip = (page - 1) * limit;

   let query = {
      isAdmin: { $ne: true }
   };

   if (search) {

      query.$and = [
         { isAdmin: { $ne: true } },
         {
            $or: [
               {
                  fullName: {
                     $regex: search,
                     $options: 'i'
                  }
               },
               {
                  email: {
                     $regex: search,
                     $options: 'i'
                  }
               }
            ]
         }
      ];

   }

   const totalUsers =
      await adminRepo.countCustomers(query);

   const customers =
      await adminRepo.findCustomers(
         query,
         skip,
         limit
      );

   const totalPages =
      Math.max(
         1,
         Math.ceil(totalUsers / limit)
      );

   return {
      isAdmin: true,
      title: 'Customer Management',
      activePage: 'customers',
      startIndex: skip,
      users: customers,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      searchQuery: search
   };

};

export const toggleUserStatus = async (userId) => {

   const user =
      await adminRepo.findUserById(userId);

   if (!user) {
      throw new Error('User not found.');
   }

   user.isBlocked = !user.isBlocked;

   await user.save();

   return {
      message: `User ${user.fullName} has been ${
         user.isBlocked
            ? 'blocked'
            : 'unblocked'
      }`
   };

};

export const getCategoriesPage = async (queryParams) => {

   const search =
      queryParams.search || '';

   const page =
      parseInt(queryParams.page) || 1;

   const limit = 5;

   const skip =
      (page - 1) * limit;

   let query = {};

   if (search) {

      query.name = {
         $regex: search,
         $options: 'i'
      };

   }

   const categories =
      await adminRepo.findCategoriesWithPagination(
         query,
         skip,
         limit
      );

   const parentCategories =
      await adminRepo.findParentCategories();

   const totalItems =
      await adminRepo.countCategories(query);

   const totalPages =
      Math.ceil(totalItems / limit);

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

export const getProductsPage = async (queryParams) => {

   const searchQuery =
      queryParams.search
         ? queryParams.search.trim()
         : '';

   const page =
      parseInt(queryParams.page) || 1;

   const limit = 5;

   const skip =
      (page - 1) * limit;

   let searchFilter = {};

   if (searchQuery) {

      searchFilter = {
         productName: {
            $regex: searchQuery,
            $options: 'i'
         }
      };

   }

   const products =
      await adminRepo.findProducts(
         searchFilter,
         skip,
         limit
      );

   const totalProducts =
      await adminRepo.countProducts(
         searchFilter
      );

   const rawCategories =
      await adminRepo.findAllCategories();

   const totalPages =
      Math.ceil(totalProducts / limit);

   const parentCategories =
      rawCategories.filter(cat =>
         !cat.parentCategory
      );

   const subcategories =
      rawCategories.filter(cat =>
         cat.parentCategory
      );

   return {
      isAdmin: true,
      activePage: 'products',
      products,
      startIndex: skip,

      parentCategories,
      subcategories,

      pagination: {
         page,
         limit,
         totalPages:
            totalPages || 1,
         totalProducts,
         hasNextPage:
            page < totalPages,
         hasPrevPage:
            page > 1,
         nextPage: page + 1,
         prevPage: page - 1
      },

      searchQuery
   };

};

export const getAddProductPage = async () => {

   const parentCategories =
      await adminRepo.findParentCategories();

   return {
      isAdmin: true,
      activePage: 'products',
      parentCategories
   };
};

export const getEditProductPage = async (productId) => {

   const product = await adminRepo.findProductById(productId);

   if (!product) throw new Error("Product not found");

   const parentCategories = await adminRepo.findParentCategories();

   // 👇 GET SELECTED PARENT CATEGORY FROM PRODUCT
   const selectedParentId = product.Category?.parentCategory?._id;

   const subcategories = selectedParentId
      ? await adminRepo.findSubCategoriesByParent(selectedParentId)
      : [];

   return {
      product,
      parentCategories,
      subcategories,
      selectedParentId
   };
};

export const toggleCategoryListing = async (categoryId) => {

   const category =
      await adminRepo.findCategoryById(
         categoryId
      );

   if (!category) {
      throw new Error(
         'Category not found'
      );
   }

   category.isListed =
      !category.isListed;

   await category.save();

   return {
      message: `${category.name} has been ${
         category.isListed
            ? 'listed'
            : 'unlisted'
      }`
   };

};

export const createProduct = async (body, files) => {

   const {
      productName,
      brand,
      regularPrice,
      salePrice,
      description,
      parentCategory,
      category,
      countryOfOrigin,
      material,
      closureType,
      soleType,
      weight
   } = body;

   // ======================
   // 1. VALIDATIONS
   // ======================
   if (!productName?.trim()) {
      throw new Error("Product name is required");
   }

   if (!brand?.trim()) {
      throw new Error("Brand is required");
   }

   if (!description?.trim()) {
      throw new Error("Description is required");
   }

   if (!category) {
      throw new Error("Please select category");
   }

   if (!regularPrice || Number(regularPrice) <= 0) {
      throw new Error("Enter valid price");
   }

   const resolvedCategoryId = category;

   // ======================
   // 2. DUPLICATE CHECK 
   // ======================
   const existingProduct =
      await adminRepo.findProductByNameAndCategory(
         productName.trim(),
         resolvedCategoryId
      );

   if (existingProduct) {
      throw new Error("Product already exists in this category");
   }

   // ======================
   // 3. IMAGE VALIDATION
   // ======================
   if (!files || files.length < 3) {
      throw new Error("Please upload at least 3 images");
   }

   const imagePaths = files.map(file => file.filename);

   // ======================
   // 4. VARIANT PROCESSING
   // ======================
   const colors = body.colorHex || [];
   const colorNames = body.colorNames || [];
   const sizes = body.sizes || [];
   const stocks = body.stocks || [];

   const colorArray = Array.isArray(colors) ? colors : [colors];
   const sizeArray = Array.isArray(sizes) ? sizes : [sizes];
   const stockArray = Array.isArray(stocks) ? stocks : [stocks];

   let finalVariantsArray = [];
   let globalTotalStockCount = 0;

   colorArray.forEach((color, index) => {

      const stockNum = Number(stockArray[index]) || 0;

      globalTotalStockCount += stockNum;

      finalVariantsArray.push({
         colorName: colorNames[index],
         colorHex: color,
         sizes: [
            {
               size: Number(sizeArray[index]) || 0,
               stock: stockNum
            }
         ]
      });

   });

   // ======================
   // 5. BUILD PRODUCT DATA
   // ======================
   const productData = {
      productName: productName.trim(),
      brand: brand.trim(),
      regularPrice: Number(regularPrice) || 0,
      salePrice: salePrice ? Number(salePrice) : null,
      description: description.trim(),
      Category: resolvedCategoryId,
      productImage: imagePaths,
      variants: finalVariantsArray,
      totalQuantity: globalTotalStockCount,
      status: globalTotalStockCount > 0 ? 'In Stock' : 'Out of Stock',
      isListed: true,
      countryOfOrigin: countryOfOrigin?.trim() || 'India',
      material: material?.trim() || 'Leather',
      closureType: closureType?.trim() || 'Lace up',
      soleType: soleType?.trim() || 'Rubber',
      weight: weight?.trim() || '300g'
   };

   // ======================
   // 6. SAVE TO DB (via repo)
   // ======================
   await adminRepo.createProduct(productData);
};


export const updateProduct = async (productId, body, files) => {

   const {
      productName,
      brand,
      regularPrice,
      salePrice,
      description,
      parentCategory,
      subCategory,
      countryOfOrigin,
      material,
      closureType,
      soleType,
      weight
   } = body;

   const product =
      await adminRepo.findProductById(productId);

   if (!product) {
      throw new Error("Product not found");
   }

const updateData = {
   productName: productName?.trim(),
   brand: brand?.trim(),
   regularPrice: Number(regularPrice),
   salePrice: salePrice ? Number(salePrice) : null,
   description: description?.trim(),


   parentCategory: parentCategory || null,
   subCategory: subCategory || null,

   countryOfOrigin: countryOfOrigin?.trim(),
   material: material?.trim(),
   closureType: closureType?.trim(),
   soleType: soleType?.trim(),
   weight: weight?.trim()
};

  
   if (files && files.length > 0) {
      updateData.productImage =
         files.map(file => file.filename);
   }

   await adminRepo.updateProduct(productId, updateData);
};

export const toggleProductStatus = async (
   productId
) => {

   const product =
      await adminRepo.findProductById(
         productId
      );

   if (!product) {
      throw new Error(
         'Product not found.'
      );
   }

   product.isListed =
      !product.isListed;

   await product.save();

   return {
      message: `${product.productName} has been ${
         product.isListed
            ? 'listed'
            : 'unlisted'
      }.`
   };

};

export const createCategory = async (
   body
) => {

   const {
      categoryName,
      description,
      parentCategory,
      childCategory,
      discountValue
   } = body;

   if (!categoryName?.trim()) {
   throw new Error("Category name is required");
   }

   if (!description?.trim()) {
   throw new Error("Description is required");
   }

const existingCategory =
   await adminRepo.findCategoryByNameAndParent(
      categoryName.trim(),
      parentCategory || null
   );

   if (existingCategory) {
      throw new Error(
         'Category already exists.'
      );
   }

   const categoryData = {
      name:
         categoryName.trim(),

      description:
         description?.trim() || '',

      parentCategory:
         parentCategory || null,


      isListed: true,

      offer: {
         discountValue:
            discountValue
               ? parseInt(discountValue)
               : 0,

         offerType:
            'Percentage',

         isActive: Number(discountValue) > 0
      }
   };

   await adminRepo.createCategory(
      categoryData
   );

};

export const updateCategory = async (
   categoryId,
   body
) => {

   const {
      categoryName,
      description,
      parentCategory,
      discountValue
   } = body;

   if (
      !categoryName?.trim() ||
      !description?.trim()
   ) {
      throw new Error(
         'Category name and description fields are required.'
      );
   }

   const updatedCategory =
      await adminRepo.updateCategory(
         categoryId,
         {
            name:
               categoryName.trim(),

            description:
               description.trim(),

            parentCategory:
               parentCategory || null,

            offer: {
               discountValue:
                  discountValue
                     ? parseInt(discountValue)
                     : 0,

               offerType:
                  'Percentage',

               isActive:
                  discountValue &&
                  parseInt(discountValue) > 0
            }
         }
      );

   if (!updatedCategory) {
      throw new Error(
         'Category not found.'
      );
   }

   return updatedCategory;

};

export const getSubcategoriesByParent = async (parentId) => {

   if (!parentId) return [];

   return await adminRepo.findSubCategoriesByParent(parentId);
};