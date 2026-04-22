    const loginForm = document.getElementById("loginForm");
      const signupForm = document.getElementById("signupForm");

    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            const emailInput = document.getElementById("email") || document.querySelector('input[name="email"]');
            const passwordInput = document.getElementById("password") || document.querySelector('input[name="password"]');

            const email = emailInput?.value.trim();
            const password = passwordInput?.value.trim();

            if (!email || !password) {
                e.preventDefault(); 
                showToast("All fields are required!");
                return;
            }
        });
    }


if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
       
        const name = document.getElementById("fullName")?.value.trim();
        const email = document.getElementById("email")?.value.trim();
        const phone = document.getElementById("phoneNumber")?.value.trim();
        const password = document.getElementById("password")?.value;
        const confirmPass = document.getElementById("confirmPassword")?.value;

       
        if (!name || !email || !phone || !password || !confirmPass) {
            e.preventDefault();
            showToast("All fields are required!");
            return; 
        }

        if (password !== confirmPass) {
            e.preventDefault();
            showToast("Passwords do not match!");
            return;
        }
        
    });
}


const showToast = (message, type = "error") => {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`; 
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

document.addEventListener("DOMContentLoaded", () => {
    
    const urlParams = new URLSearchParams(window.location.search);
    const errorMsg = urlParams.get('error');
    const successMsg = urlParams.get('success');


    const messageId = errorMsg || successMsg;

    if (messageId) {
      
        const alreadyShown = sessionStorage.getItem('lastToast') === messageId;

        if (!alreadyShown) {
            if (errorMsg) showToast(decodeURIComponent(errorMsg));
            if (successMsg) showToast(decodeURIComponent(successMsg), "success");

            sessionStorage.setItem('lastToast', messageId);

            const email = urlParams.get('email');
            const cleanUrl = window.location.origin + window.location.pathname + (email ? `?email=${email}` : '');
            window.history.replaceState({}, document.title, cleanUrl);
        }
    } else {
        sessionStorage.removeItem('lastToast');
    }

    if(successMsg) showToast(decodeURIComponent(successMsg), "success");

  
    const otpForm = document.getElementById("otpForm");
    if (otpForm) {
        otpForm.addEventListener("submit", (e) => {
            const hiddenOtp = document.getElementById("fullOtp");
            if (!hiddenOtp || hiddenOtp.value.length !== 6) {
                e.preventDefault();
                showToast("Please enter the full 6-digit code.");
            }
        });
    }

  
const timerElement = document.getElementById("timer");
const serverExpiryInput = document.getElementById("serverExpiryTime");

if (timerElement && serverExpiryInput) {
    const otpEndTime = parseInt(serverExpiryInput.value);

    const updateTimer = () => {
        const now = Date.now();
        const distance = otpEndTime - now;
        const secondsRemaining = Math.floor(distance / 1000);

        if (secondsRemaining <= 0) {
            clearInterval(timerInterval);
            document.getElementById("timer-container").style.display = "none";
            document.getElementById("resend-link").style.display = "inline";
        } else {
            let minutes = Math.floor(secondsRemaining / 60);
            let seconds = secondsRemaining % 60;
            timerElement.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    };

    const timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}


    if (resendLink) {
        resendLink.addEventListener("click", () => {
            sessionStorage.removeItem("otpEndTime");
        });
    }
});