import * as brandRepo from '../repositories/brandRepository.js';

export const getBrandsPageData = async (queryParameters) => {
    const page = parseInt(queryParameters.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const searchQuery = queryParameters.search ? queryParameters.search.trim() : '';

    const filter = {};
    if (searchQuery) {
        filter.name = { $regex: searchQuery, $options: 'i' };
    }

    let totalBrands = await brandRepo.countBrands(filter);
    let rawBrands = await brandRepo.findBrands(filter, skip, limit);

    if (totalBrands === 0 && !searchQuery) { 
        const uniqueBrandNames = await brandRepo.findUniqueProductBrands();
        
        for (const brandName of uniqueBrandNames) {
            if (!brandName) continue;
            await brandRepo.ensureBrandExists(brandName);
        }

        totalBrands = await brandRepo.countBrands(filter);
        rawBrands = await brandRepo.findBrands(filter, skip, limit);
    }

    const brands = await Promise.all(rawBrands.map(async (brand) => {
        const totalProducts = await brandRepo.countProductsForBrand(brand.name);
        const listedProducts = await brandRepo.countListedProductsForBrand(brand.name);
        const unlistedProducts = totalProducts - listedProducts;

        return {
            ...brand, 
            _id: brand._id.toString(),
            isActive: brand.isListed ? 'listed' : 'unlisted', 
            listedProductCount: listedProducts,
            unlistedProductCount: unlistedProducts
        };
    }));

    const totalPages = Math.ceil(totalBrands / limit);

    return {
        brands,
        searchQuery,
        currentPage: page,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1
    };
};


export const toggleBrandStatus = async (brandId) => {
    const brand = await brandRepo.findBrandById(brandId);
    if (!brand) {
        throw new Error("Brand data target record not found.");
    }

    brand.isListed = !brand.isListed;
    await brand.save();

    await brandRepo.updateProductsStatusByBrand(brand.name, brand.isListed);

    return brand;
};