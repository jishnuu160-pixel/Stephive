import * as salesRepo from '../repositories/salesRepository.js';

export const generateReport = async (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const orders = await salesRepo.getOrdersByDate(start, end);

    let totalRevenue = 0;
    let totalDiscount = 0;

    const formattedOrders = orders.map(order => {
        console.log("DEBUG user_id field:", order.user_id);
        totalRevenue += order.finalAmount || 0;
        totalDiscount += order.discount || 0;

        return {
            ...order.toObject(),
            customerName: order.user_id?.fullName || 'Unknown User',
        };
    });

    return {
        orders: formattedOrders,
        summary: {
            totalOrders: formattedOrders.length,
            totalRevenue:Number(totalRevenue.toFixed(2)),
            totalDiscount:Number(totalDiscount.toFixed(2))
        }
    };
};