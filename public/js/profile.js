
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