export const isOfferActiveByDate = (startDateOrOffer, expiryDate) => {
    let startDate;
    let endDate;

    if (startDateOrOffer && typeof startDateOrOffer === 'object') {
        if (startDateOrOffer.isActive === false) {
            return false;
        }

        startDate = startDateOrOffer.startDate;
        endDate = startDateOrOffer.expiryDate || startDateOrOffer.endDate;
    } else {
        startDate = startDateOrOffer;
        endDate = expiryDate;
    }

    if (!startDate || !endDate) {
        return false;
    }

    const now = new Date();

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    if (now < start) {
        return false;
    }

    const expiry = new Date(endDate);
    expiry.setHours(23, 59, 59, 999);

    if (now > expiry) {
        return false;
    }

    return true;
};