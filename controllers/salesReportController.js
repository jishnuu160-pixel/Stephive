import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { HTTP_STATUS } from '../constants/httpStatusCode.js';
import * as salesService from '../services/salesReportService.js';

const getDateRangeFromQuery = (query) => {
    let { filter, startDate, endDate } = query;
    let start, end;
    const now = new Date(); 

    if (!filter && (!startDate || !endDate)) {
        filter = 'daily';
    }

    if (filter === 'daily') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } 
    else if (filter === 'weekly') {
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        start = new Date();
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
    } 
    else if (filter === 'yearly') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } 
    else if (startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
    }
    return { start, end };
};


export const viewSalesReport = async (req, res) => {
    try {
        const { start, end } = getDateRangeFromQuery(req.query);
        
        const report = await salesService.generateReport(start, end);

        const formattedStartDate = start ? start.toLocaleDateString('en-CA') : '';
        const formattedEndDate = end ? end.toLocaleDateString('en-CA') : '';

        res.render('admin/salesReport', {
            admin: true,
            orders: report.orders,
            summary: report.summary,
            activePage: 'sales',
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            filter: req.query.filter || 'daily'
        });
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Server Error');
    }
};


export const downloadCSV = async (req, res) => {
    try {
        const { start, end } = getDateRangeFromQuery(req.query);
        
        const reportData = await salesService.generateReport(start, end);
        
        const csvData = reportData.orders.map(order => ({
            "Order ID": order.orderId,
            "Customer": order.customerName,
            "Date": new Date(order.createdAt).toLocaleDateString(),
            "Discount (₹)": order.discount,
            "Total (₹)": order.total,
            "Status": order.status
        }));

        const fields = ["Order ID", "Customer", "Date", "Discount (₹)", "Total (₹)", "Status"];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(csvData);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
        res.status(HTTP_STATUS.OK).end(csv);
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error generating CSV file");
    }
};


export const downloadPDF = async (req, res) => {
    try {
        const { start, end } = getDateRangeFromQuery(req.query);
        const reportData = await salesService.generateReport(start, end);

        const doc = new PDFDocument({ margin: 40, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
        doc.pipe(res);

        const displayStart = start ? start.toLocaleDateString() : 'All';
        const displayEnd = end ? end.toLocaleDateString() : 'All';

        doc.fontSize(18).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(`Generated Range: ${displayStart} to ${displayEnd}`, { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(11).font('Helvetica-Bold').text('Summary Statistics');
        doc.font('Helvetica').fontSize(10);
        doc.text(`Total Orders: ${reportData.summary.totalOrders}`);
        doc.text(`Total Discount: Rs. ${reportData.summary.totalDiscount}`);
        doc.text(`Total Revenue: Rs. ${reportData.summary.totalRevenue}`);
        doc.moveDown(1.5);

        const startX = 40;
        let currentY = doc.y;
        
        const colWidths = {
            orderId: 95,
            customer: 85,
            date: 75,
            discount: 75,
            total: 75,
            status: 65
        };

        const drawTableHeader = (y) => {
            doc.font('Helvetica-Bold').fontSize(9);
            doc.text('ORDER ID', startX, y, { width: colWidths.orderId, continued: false });
            doc.text('CUSTOMER', startX + colWidths.orderId, y, { width: colWidths.customer, continued: false });
            doc.text('DATE', startX + colWidths.orderId + colWidths.customer, y, { width: colWidths.date, continued: false });
            doc.text('DISCOUNT', startX + colWidths.orderId + colWidths.customer + colWidths.date, y, { width: colWidths.discount, continued: false });
            doc.text('TOTAL', startX + colWidths.orderId + colWidths.customer + colWidths.date + colWidths.discount, y, { width: colWidths.total, continued: false });
            doc.text('STATUS', startX + colWidths.orderId + colWidths.customer + colWidths.date + colWidths.discount + colWidths.total, y, { width: colWidths.status, continued: false });
            
            doc.moveTo(startX, y + 12).lineTo(530, y + 12).strokeColor('#cccccc').lineWidth(1).stroke();
        };

        drawTableHeader(currentY);
        currentY += 22;
        doc.font('Helvetica').fontSize(9);

        reportData.orders.forEach((order) => {
            if (currentY > 750) {
                doc.addPage();
                currentY = 40;
                drawTableHeader(currentY);
                currentY += 22;
                doc.font('Helvetica').fontSize(9);
            }

            const dateStr = new Date(order.createdAt).toLocaleDateString();

            doc.text(order.orderId, startX, currentY, { width: colWidths.orderId });
            doc.text(order.customerName, startX + colWidths.orderId, currentY, { width: colWidths.customer });
            doc.text(dateStr, startX + colWidths.orderId + colWidths.customer, currentY, { width: colWidths.date });
            doc.text(`Rs.${order.discount}`, startX + colWidths.orderId + colWidths.customer + colWidths.date, currentY, { width: colWidths.discount });
            doc.text(`Rs.${order.total}`, startX + colWidths.orderId + colWidths.customer + colWidths.date + colWidths.discount, currentY, { width: colWidths.total });
            doc.text(order.status, startX + colWidths.orderId + colWidths.customer + colWidths.date + colWidths.discount + colWidths.total, currentY, { width: colWidths.status });

            currentY += 20; 
        });

        doc.end();
    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error generating PDF file");
    }
};