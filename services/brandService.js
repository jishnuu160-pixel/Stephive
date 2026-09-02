import * as brandRepo from '../repositories/brandRepository.js';
import cloudinary from '../config/cloudinary.js';

export const getBrandsPageData = async (queryParameters) => {
    const page = parseInt(queryParameters.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const searchQuery = queryParameters.search ? queryParameters.search.trim() : '';

    const filter = {};
    if (searchQuery) {
        filter.name = { $regex: searchQuery, $options: 'i' };
    }

    const totalBrands = await brandRepo.countBrands(filter);
    const rawBrands = await brandRepo.findBrands(filter, skip, limit);

    const brands = await Promise.all(rawBrands.map(async (brandDoc) => {
        const brand = typeof brandDoc.toObject === 'function' ? brandDoc.toObject() : brandDoc;

        const totalProducts = await brandRepo.countProductsForBrand(brand.name);
        const listedProducts = await brandRepo.countListedProductsForBrand(brand.name);
        const unlistedProducts = totalProducts - listedProducts;

        return {
            ...brand, 
            _id: brand._id.toString(),
            name: brand.name,
            description: brand.description || 'No description provided.',
            logo: brand.logo || 'default-logo.png',
            isListed: Boolean(brand.isListed), 
            listedProductCount: listedProducts,
            unlistedProductCount: unlistedProducts
        };
    }));

    const totalPages = Math.ceil(totalBrands / limit) || 1;

    return {
        brands,
        searchQuery,
        currentPage: page,
        totalPages,
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

    return brand.isListed; 
};


export const findBrandById = async (id) => {
    return await brandRepo.findBrandById(id);
};


export const updateBrand = async (id, data) => {
    const { croppedImage, name, description } = data;
    let updateData = { name, description };

    if (croppedImage && croppedImage.startsWith('data:image')) {
        const base64Data = croppedImage.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'brands' }, 
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        updateData.logo = uploadResult.secure_url;
    }
    return await brandRepo.updateBrand(id, updateData);
};


export const addBrand = async (data) => {
    const { croppedImage, name, description } = data;
    
    let logoUrl = 'default-logo.png';

    if (croppedImage && croppedImage.startsWith('data:image')) {
        const base64Data = croppedImage.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'brands' }, 
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });
        logoUrl = uploadResult.secure_url;
    }

    return await brandRepo.createBrand({
        name,
        description,
        logo: logoUrl,
        isListed: true 
    });
};


export const getTopBrandsService = async () => {
    return await brandRepo.getTopSellingBrandsFromDB();
};