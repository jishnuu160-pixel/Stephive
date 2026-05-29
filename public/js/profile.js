document.addEventListener('DOMContentLoaded', function () {

    /* =========================
       GENDER UPDATE
    ========================= */
    const genderSelect = document.getElementById('genderSelect');

    if (genderSelect) {
        genderSelect.addEventListener('change', async function () {

            try {
                const response = await fetch('/user/update-gender', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ gender: this.value })
                });

                const result = await response.json();
if (result.success) {

 const newUrl = result.profileImage + "?t=" + Date.now();

document.querySelectorAll('.user-avatar')
    .forEach(img => {
        img.src = newUrl;
    });

    modal.style.display = 'none';
    fileInput.value = "";

    if (cropper) cropper.destroy();

    showToast(result.message || "Profile updated", "success");
}

            } catch (err) {
                console.error("Gender update error:", err);
                showToast("Something went wrong", "error");
            }
        });
    }

    /* =========================
       AVATAR + CROPPER FLOW
    ========================= */

    const fileInput = document.getElementById('avatar-upload');
    const previewImg = document.getElementById('profile-preview');

    const modal = document.getElementById('cropperModal');
    const cropImage = document.getElementById('image-to-crop');
    const cancelBtn = document.getElementById('cancelCropBtn');
    const saveBtn = document.getElementById('saveCropBtn');

    let cropper;

    if (!fileInput) return;

    fileInput.addEventListener('change', function (e) {

        const files = e.target.files;
        if (!files || files.length === 0) return;

        const selectedFile = files[0];

        if (selectedFile.size > 2 * 1024 * 1024) {
            showToast("File too large (max 2MB)", "error");
            fileInput.value = "";
            return;
        }

        const allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowed.includes(selectedFile.type)) {
            showToast("Only JPG, PNG, WEBP allowed", "error");
            fileInput.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {

            cropImage.src = event.target.result;
            modal.style.display = 'flex';

            if (cropper) cropper.destroy();

            cropper = new Cropper(cropImage, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 1,
                background: false
            });
        };

        reader.readAsDataURL(selectedFile);
    });

    /* =========================
       CANCEL CROPPING
    ========================= */

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            modal.style.display = 'none';
            fileInput.value = "";
            if (cropper) cropper.destroy();
        });
    }

    /* =========================
       SAVE CROPPED IMAGE
    ========================= */

    if (saveBtn) {
        saveBtn.addEventListener('click', function () {

            if (!cropper) return;

            const canvas = cropper.getCroppedCanvas({
                width: 250,
                height: 250
            });

            canvas.toBlob(async function (blob) {

                const formData = new FormData();
                formData.append('profileImage', blob, 'avatar.png');

                try {
                    const response = await fetch('/user/update-avatar', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (result.success) {

                        previewImg.src = result.profileImage + "?t=" + Date.now();

                      document.querySelectorAll('.user-avatar')
                            .forEach(img => {
                                img.src = result.profileImage + "?t=" + Date.now();
                            });

                        modal.style.display = 'none';
                        fileInput.value = "";

                        if (cropper) cropper.destroy();

                        showToast(result.message || "Profile updated", "success");

                    } else {
                        showToast(result.message || "Upload failed", "error");
                    }

                } catch (err) {
                    console.error("Upload error:", err);
                    showToast("Something went wrong", "error");
                }

            }, 'image/png');
        });
    }

});

/* =========================
   TOAST FUNCTION
========================= */

function showToast(message, type = "success") {
    const toast = document.createElement("div");

    toast.innerText = message;

    toast.style.position = "fixed";
    toast.style.top = "20px";
    toast.style.right = "20px";
    toast.style.padding = "12px 18px";
    toast.style.borderRadius = "8px";
    toast.style.color = "#fff";
    toast.style.fontSize = "14px";
    toast.style.zIndex = "9999";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
    toast.style.opacity = "0";
    toast.style.transition = "all 0.3s ease";

    if (type === "success") {
        toast.style.background = "#22c55e";
    } else if (type === "error") {
        toast.style.background = "#ef4444";
    } else {
        toast.style.background = "#3b82f6";
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "1";
    }, 100);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}