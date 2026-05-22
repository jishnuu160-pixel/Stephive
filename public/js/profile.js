
document.addEventListener('DOMContentLoaded', function() {
    
    const genderSelect = document.getElementById('genderSelect');
    if (genderSelect) {
        genderSelect.addEventListener('change', async function() {
            const selectedGender = this.value;
            try {
                const response = await fetch('/user/update-gender', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gender: selectedGender }),
                });

                const result = await response.json();
                if (result.success) {
                    console.log("Gender updated to:", selectedGender);
                }
            } catch (error) {
                console.error("Error saving gender:", error);
            }
        });
    }

    const avatarInput = document.getElementById('avatar-upload');
    if (avatarInput) {
        avatarInput.addEventListener('change', async function() {
            const file = this.files[0]; 
            
            if (file) {
                console.log("File selected:", file.name);

                if (file.size > 2 * 1024 * 1024) {
                    return alert("File is too large! Please choose an image under 2MB.");
                }

                const formData = new FormData();
               
                formData.append('profileImage', file);

                try {
                    console.log("Attempting upload to server...");
                    
                    const response = await axios.post('/user/update-avatar', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (response.data.success) {
                        console.log("Upload successful!");
                       
                        document.getElementById('profile-preview').src = response.data.imagePath;
                        alert("Profile picture updated successfully!"); 
                        window.location.reload(); 
                    }
                } catch (err) {
                    console.error("Upload error details:", err.response ? err.response.data : err);
                    alert("Error uploading image. Please try again.");
                }
            }
        });
    } else {
        console.warn("Could not find 'avatar-upload' input on this page.");
    }
});

let cropperInstance;
const fileInputElement = document.getElementById('avatar-upload');
const imagePreviewElement = document.getElementById('profile-preview');
const cropperModal = document.getElementById('cropperModal');
const imageToCropCanvas = document.getElementById('image-to-crop');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const saveCropBtn = document.getElementById('saveCropBtn');

    fileInputElement.addEventListener('change', function(e) {
       
        const files = this.files || (e.target && e.target.files);
        
        if (!files || files.length === 0) {
            console.warn("No files selected or file retrieval cancelled.");
            return;
        }

        const selectedFile = files; 

        if (!selectedFile) {
            alert("Error reading file properties. Please try re-selecting a different file layout.");
            fileInputElement.value = '';
            return;
        }

        console.log("File selected successfully:", selectedFile.name);

        if (selectedFile.size > 2 * 1024 * 1024) {
            alert("File is too large! Please choose an image under 2MB.");
            fileInputElement.value = '';
            return;
        }

        const fileName = selectedFile.name.toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

        const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const isMimeValid = selectedFile.type && validImageTypes.includes(selectedFile.type);

        if (!hasValidExtension && !isMimeValid) {
            alert('Invalid file type! Only JPEG, JPG, PNG, and WEBP images are allowed.');
            fileInputElement.value = ''; 
            return; 
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            imageToCropCanvas.src = event.target.result;
            cropperModal.style.display = 'flex';

            if (cropperInstance) cropperInstance.destroy();

            cropperInstance = new Cropper(imageToCropCanvas, {
                aspectRatio: 1, 
                viewMode: 1,
                background: false,
                responsive: true,
                autoCropArea: 1
            });
        };
        reader.readAsDataURL(selectedFile);
    });

cancelCropBtn.addEventListener('click', function() {
    cropperModal.style.display = 'none';
    fileInputElement.value = ''; 
    if (cropperInstance) cropperInstance.destroy();
});

saveCropBtn.addEventListener('click', function() {
    if (!cropperInstance) return;

    const canvasDetails = cropperInstance.getCroppedCanvas({
        width: 250,
        height: 250
    });

    if (!canvasDetails) {
        alert('Could not generate cropped canvas.');
        return;
    }

    canvasDetails.toBlob(function(imageBlob) {
        if (!imageBlob) {
            alert('Error processing image data.');
            return;
        }

        const transmissionForm = new FormData();
        transmissionForm.append('profileImage', imageBlob, 'avatar.png');

        fetch('/user/update-avatar', { 
            method: 'POST',
            body: transmissionForm
        })
        .then(async (response) => {
            const resultData = await response.json();
            
            if (response.ok && resultData.success) {
                imagePreviewElement.src = resultData.imagePath;
                
                const companionAvatars = document.querySelectorAll('.admin-photo, .user-sidebar-avatar');
                companionAvatars.forEach(imgElement => {
                    imgElement.src = resultData.imagePath;
                });

                cropperModal.style.display = 'none';
                if (cropperInstance) cropperInstance.destroy();
                fileInputElement.value = ''; 
            } else {
                alert(resultData.message || 'Invalid file type! Only JPEG, JPG, PNG, and WEBP images are allowed.');
                cropperModal.style.display = 'none';
                fileInputElement.value = '';
                if (cropperInstance) cropperInstance.destroy();
            }
        })
        .catch(err => {
            console.error('Systemic transmission failure:', err);
            alert('Invalid file type! Only JPEG, JPG, PNG, and WEBP images are allowed.');
            cropperModal.style.display = 'none';
            fileInputElement.value = '';
            if (cropperInstance) cropperInstance.destroy();
        });
    }, 'image/png'); 
});
