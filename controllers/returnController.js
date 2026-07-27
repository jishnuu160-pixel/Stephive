import * as ReturnService from '../services/ReturnService.js';

export const handleReturnRequest = async (req, res) => {
    try {
        console.log("Full Request Body:", JSON.stringify(req.body, null, 2));
        const orderIdString = req.body.orderId;
        const userId = req.session.user.id;
        const mongoId = req.params.id; 

        if (!orderIdString || orderIdString === 'undefined') {
            console.error("CRITICAL: Return request attempted without orderIdString");
            req.flash('error', 'Invalid request: Order ID is missing.');
            return res.redirect(`/orders/${mongoId}`);
        }

        const exists = await ReturnService.checkIfReturnExists(orderIdString);
        if (exists) {
            req.flash('error', 'Return already requested for this order.');
            return res.redirect(`/orders/${mongoId}`);
        }

        const formattedBody = {
            orderId: orderIdString,
            productId: req.body.productId,
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
            req.flash('error', 'A return request has already been submitted for this order.');
            return res.redirect(`/orders/${req.params.id}`);
        }
        console.error("Return Request Error:", error);
        res.status(500).send("Failed to process return request due to a server error.");
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
        console.error("Error loading return details:", error);
        res.status(500).send("Unable to load return details");
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
        console.log("Error Return:", error);
        res.status(500).send("Error loading returns");
    }
};