document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('addressModal');
    const openBtn = document.getElementById('openAddressModal');
    const closeX = document.getElementById('closeX');
    const cancelBtn = document.getElementById('btnCancel');
    const addressForm = document.getElementById('addressForm');
    const modalTitle = modal.querySelector('.modal-header h3');

    
    if (openBtn && modal) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Reset form and title for a fresh address
            addressForm.reset();
            addressForm.action = '/user/add-address';
            modalTitle.innerHTML = 'Add <b>New Address</b>';
            
            modal.classList.add('active');
        });
    }

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn'); 
        if (editBtn) {
            e.preventDefault();
            
            const id = editBtn.dataset.id;
            const name = editBtn.dataset.name;
            const phone = editBtn.dataset.phone;
            const street = editBtn.dataset.street;
            const apartment = editBtn.dataset.apartment;
            const city = editBtn.dataset.city;
            const state = editBtn.dataset.state;
            const pincode = editBtn.dataset.pincode;
            const label = editBtn.dataset.label;
            const isDefault = editBtn.dataset.default === 'true';
  
            addressForm.action = `/user/edit-address/${id}`;
            modalTitle.innerHTML = 'Edit <b>Address</b>';

            addressForm.querySelector('[name="fullName"]').value = name;
            addressForm.querySelector('[name="phone"]').value = phone;
            addressForm.querySelector('[name="street"]').value = street;
            addressForm.querySelector('[name="apartment"]').value = apartment || '';
            addressForm.querySelector('[name="city"]').value = city;
            addressForm.querySelector('[name="state"]').value = state;
            addressForm.querySelector('[name="pincode"]').value = pincode;
            addressForm.querySelector('#isDefault').checked = isDefault;

            const typeRadio = addressForm.querySelector(`input[name="label"][value="${label}"]`);
            if (typeRadio) typeRadio.checked = true;

            modal.classList.add('active');
        }
    });

    const hideModal = () => {
        modal.classList.remove('active');
    };

    if(closeX) closeX.addEventListener('click', hideModal);
    if(cancelBtn) cancelBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });
});