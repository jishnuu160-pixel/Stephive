async function toggleCategoryListing(categoryId, buttonElement) {
   
    const response = await fetch(`/admin/categories/toggle-status/${categoryId}`, {
        method: 'POST' 
    });
    
    if (response.ok) {
        window.location.reload();
    }
}

