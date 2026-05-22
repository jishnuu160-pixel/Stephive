document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('addressModal');
    
    if (!modal) {
        console.log("ℹ️ Address modal layout elements not found. Skipping script safely.");
        return; 
    }

    const openBtn = document.getElementById('openAddressModal');
    const closeX = document.getElementById('closeX');
    const cancelBtn = document.getElementById('btnCancel');
    const addressForm = document.getElementById('addressForm');
    const modalTitle = modal.querySelector('.modal-header h3');

    if (openBtn) {
        openBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (addressForm) addressForm.reset();
            if (addressForm) addressForm.action = '/user/add-address';
            if (modalTitle) modalTitle.innerHTML = 'Add <b>New Address</b>';
            
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
  
            if (addressForm) {
                addressForm.action = `/user/edit-address/${id}`;
                if (modalTitle) modalTitle.innerHTML = 'Edit <b>Address</b>';

                const fieldFullName = addressForm.querySelector('[name="fullName"]');
                const fieldPhone = addressForm.querySelector('[name="phone"]');
                const fieldStreet = addressForm.querySelector('[name="street"]');
                const fieldApartment = addressForm.querySelector('[name="apartment"]');
                const fieldCity = addressForm.querySelector('[name="city"]');
                const fieldState = addressForm.querySelector('[name="state"]');
                const fieldPincode = addressForm.querySelector('[name="pincode"]');
                const fieldDefault = addressForm.querySelector('#isDefault');

                if (fieldFullName) fieldFullName.value = name;
                if (fieldPhone) fieldPhone.value = phone;
                if (fieldStreet) fieldStreet.value = street;
                if (fieldApartment) fieldApartment.value = apartment || '';
                if (fieldCity) fieldCity.value = city;
                if (fieldState) fieldState.value = state;
                if (fieldPincode) fieldPincode.value = pincode;
                if (fieldDefault) fieldDefault.checked = isDefault;

                const typeRadio = addressForm.querySelector(`input[name="label"][value="${label}"]`);
                if (typeRadio) typeRadio.checked = true;
            }

            modal.classList.add('active');
        }
    });

    const hideModal = () => {
        modal.classList.remove('active');
    };

    if (closeX) closeX.addEventListener('click', hideModal);
    if (cancelBtn) cancelBtn.addEventListener('click', hideModal);
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });
});