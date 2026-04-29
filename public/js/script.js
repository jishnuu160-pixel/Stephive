

document.addEventListener('DOMContentLoaded', () => {
    const welcomeToast = document.getElementById('welcomeToast');

    if (welcomeToast) {
       
        setTimeout(() => {
            
            welcomeToast.style.transition = "opacity 1s ease, transform 1s ease, visibility 1s";
            
            welcomeToast.style.opacity = '0';
            welcomeToast.style.transform = 'translateY(-20px)';
            welcomeToast.style.visibility = 'hidden';

            setTimeout(() => {
                welcomeToast.remove();
            }, 1000);

        }, 4000); 
    }
});