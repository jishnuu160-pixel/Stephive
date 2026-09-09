import * as salesRepo from '../repositories/salesRepository.js';

export const generateReport = async (startDate, endDate) => {
    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : null;
    
    if (end) {
        end.setHours(23, 59, 59, 999);
    }

    const orders = await salesRepo.getOrdersByDate(start, end);

    let grossSales = 0;
    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalShipping = 0;

    const formattedOrders = orders.map(order => {
        grossSales += order.subtotal || order.total || 0;
        totalRevenue += order.finalAmount || order.total || 0;
        totalDiscount += order.discount || 0;
        totalShipping += order.shippingCharge || 0;

        return {
            ...order.toObject(),
            customerName: order.user_id?.fullName || 'Unknown User',
        };
    });

    return {
        orders: formattedOrders,
        summary: {
            totalOrders: formattedOrders.length,
            grossSales: Number(grossSales.toFixed(2)),
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalDiscount: Number(totalDiscount.toFixed(2)),
            totalShipping: Number(totalShipping.toFixed(2))
        }
    };
};

export const getDateBounds = async () => {
    const bounds = await salesRepo.getOrderDateBounds();
    return {
        minDate: bounds.minDate ? new Date(bounds.minDate).toLocaleDateString('en-CA') : '',
        maxDate: bounds.maxDate ? new Date(bounds.maxDate).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA')
    };
};