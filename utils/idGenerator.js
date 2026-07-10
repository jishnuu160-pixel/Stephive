export const generateOrderID = () => {
    const randomNum = Math.ceil(Math.random() * 9999);  
    const paddedNum = randomNum.toString().padStart(4, '0');  
    const timestamp = Date.now().toString().slice(-4);
    
    return `ORD-${timestamp}-${paddedNum}`; 
};

export const generateReturnID = () => {
    const randomNum = Math.ceil(Math.random() * 9999);
    const paddedNum = randomNum.toString().padStart(4, '0');
    const timestamp = Date.now().toString().slice(-4);
    return `RET-${timestamp}-${paddedNum}`; 
};