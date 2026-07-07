import * as ReturnService from '../services/ReturnService.js';

export const handleReturnRequest = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { id } = req.params; 

        const formattedBody = {
            productId: req.body.productId,
            returnType: 'Standard', 
            reason: req.body.reason,
            refundMode: req.body.refundMethod, 
            description: req.body.description,
            pickupDate: new Date()
        };
        
        await ReturnService.processReturnRequest(userId, id, formattedBody);  
        req.flash('success', 'Return request submitted successfully!');      
        res.redirect('/history?return_requested=true');
    } catch (error) {
        console.error("Return Request Error:", error);
        res.status(500).send("Failed to process return request.");
    }
};