// public/js/script.js

document.addEventListener('DOMContentLoaded', () => {
    // Select the welcome box by its ID
    const welcomeToast = document.getElementById('welcomeToast');

    if (welcomeToast) {
        // 1. Wait for 4 seconds before starting the disappearance
        setTimeout(() => {
            
            // 2. Add transition styles via JS (or keep them in CSS)
            welcomeToast.style.transition = "opacity 1s ease, transform 1s ease, visibility 1s";
            
            // 3. Trigger the fade and a slight slide-up motion
            welcomeToast.style.opacity = '0';
            welcomeToast.style.transform = 'translateY(-20px)';
            welcomeToast.style.visibility = 'hidden';

            // 4. Fully remove it from the document flow after the 1s transition finishes
            setTimeout(() => {
                welcomeToast.remove();
            }, 1000);

        }, 4000); 
    }
});