import { HTTP_STATUS } from '../constants/httpStatusCode.js';
import * as ReturnService from '../services/returnService.js';

export const handleReturnRequest = async (req, res) => {
    try {
        const orderIdString = req.body.orderId;
        const userId = req.session.user.id;
        const mongoId = req.params.id; 
        const itemId = req.body.itemId;

        if (!orderIdString || orderIdString === 'undefined') {
            console.error("CRITICAL: Return request attempted without orderIdString");
            req.flash('error', 'Invalid request: Order ID is missing.');
            return res.redirect(`/orders/${mongoId}`);
        }

        const exists = await ReturnService.checkIfReturnExists(orderIdString, itemId);
        if (exists) {
            req.flash('error', 'Return already requested for this item.');
            return res.redirect(`/orders/${mongoId}`);
        }

        const rawPrice = req.body.price;
        const itemPrice = Array.isArray(rawPrice) ? Number(rawPrice[0]) : Number(rawPrice);

        const formattedBody = {
            orderId: orderIdString,
            productId: req.body.productId,
            itemId: itemId,
            price: itemPrice,
            returnType: req.body.returnType,
            size: req.body.size,
            quantity: req.body.quantity,
            reason: req.body.reason,
            refundMode: req.body.refundMethod,
            description: req.body.description,
            pickupDate: req.body.pickupDate,
            returnStatus: 'Pending'
        };

        await ReturnService.processReturnRequest(userId, mongoId, formattedBody);
        

        req.flash('success', 'Return request submitted successfully!');
        res.redirect('/history?return_requested=true');

    } catch (error) {
        if (error.code === 11000) {
            req.flash('error', 'Duplicate error: A return for this specific item already exists in database index.');
            return res.redirect(`/orders/${req.params.id}`);
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Failed to process return request due to a server error.");
    }
};

export const getReturnDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const returnData = await ReturnService.getReturnDetailsById(id);
        
        res.render('admin/return-details', { 
            returnDetails: returnData,
            pageTitle: 'Return Request Details',
            activePage:'return'
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Unable to load return details");
    }
};


export const getAllReturns = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const paginatedData = await ReturnService.getAllReturnsPaginated(page, limit, search);

        res.render('admin/returns', { 
            ...paginatedData,
            layout: 'admin-layout',
            pageTitle: 'Return Requests',
            activePage: 'return',
            currentPage: paginatedData.currentPage,
            hasPrevPage: paginatedData.currentPage > 1,
            hasNextPage: paginatedData.currentPage < paginatedData.totalPages,
            totalPages: paginatedData.totalPages 
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error loading returns");
    }
};

export const getReturnFormForEdit = async (req, res) => {
    try {
        let sessionUser = req.session.userId || req.session.user;
        const userId = typeof sessionUser === 'object' ? (sessionUser.id || sessionUser._id) : sessionUser;
        
        const formId = req.params.id;

        const returnForm = await returnFormService.getReturnFormByIdService(userId, formId);
        
        if (!returnForm) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Return form not found" });
        }

        res.status(HTTP_STATUS.OK).json({ success: true, returnForm });
    } catch (err) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: err.message || "Could not retrieve return form" });
    }
};
