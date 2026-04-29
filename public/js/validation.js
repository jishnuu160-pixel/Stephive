const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const jsErrorBox = document.getElementById("js-error-message"); 

if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
        const email = document.getElementById("email")?.value.trim();
        const password = document.getElementById("password")?.value.trim();

        if (!email || !password) {
            e.preventDefault(); 
            
            if (jsErrorBox) {
                jsErrorBox.innerText = "All fields are required!";
                jsErrorBox.style.display = "block"; 

                setTimeout(() => {
                    jsErrorBox.style.display = "none";
                }, 3000);
            }
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
            if (jsErrorBox) {
                jsErrorBox.innerText = "Please fill required fields!";
                jsErrorBox.style.display = "block"; 

                setTimeout(() => {
                    jsErrorBox.style.display = "none";
                }, 3000);
            }
        }

        if (password !== confirmPass) {
            e.preventDefault();
            if (jsErrorBox) {
                jsErrorBox.innerText = "Passwords doesn't match";
                jsErrorBox.style.display = "block"; 

                setTimeout(() => {
                    jsErrorBox.style.display = "none";
                }, 3000);
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const toggleIcons = document.querySelectorAll('.fa-eye, #togglePassword');

    toggleIcons.forEach(icon => {
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
            if (passwordInput) {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            }
        });
    });

    const timerElement = document.getElementById("timer");
    const serverExpiryInput = document.getElementById("serverExpiryTime");
    const resendLink = document.getElementById("resend-link");

    if (timerElement && serverExpiryInput) {
        const otpEndTime = parseInt(serverExpiryInput.value);
        const updateTimer = () => {
            const now = Date.now();
            const distance = otpEndTime - now;
            const secondsRemaining = Math.floor(distance / 1000);

            if (secondsRemaining <= 0) {
                clearInterval(timerInterval);
                const container = document.getElementById("timer-container");
                if (container) container.style.display = "none";
                if (resendLink) resendLink.style.display = "inline";
            } else {
                let minutes = Math.floor(secondsRemaining / 60);
                let seconds = secondsRemaining % 60;
                timerElement.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        const timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const serverError = document.querySelector(".server-error");
    if (serverError) {
        setTimeout(() => {
            serverError.style.display = "none";
        }, 3000);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const resetForm = document.getElementById("resetPasswordForm");
    const jsErrorBox = document.getElementById("js-error-message");
    const eyes = document.querySelectorAll(".eye");

   
    eyes.forEach(eye => {
        eye.style.cursor = "pointer";
        eye.addEventListener("click", function() {
            const input = this.parentElement.querySelector("input");
            if (input) {
                const isPassword = input.getAttribute("type") === "password";
                input.setAttribute("type", isPassword ? "text" : "password");
                
                this.style.opacity = isPassword ? "0.5" : "1";
            }
        });
    });

  
    if (resetForm) {
    resetForm.addEventListener("submit", (e) => {
     
        const password = document.getElementById("password").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();

        
        if (!password || !confirmPassword) {
            e.preventDefault(); 
            showError("Please enter your new password!");
            return;
        }

        if (password !== confirmPassword) {
            e.preventDefault(); 
            showError("Passwords do not match!");
            return;
        }

        if (password.length < 6) {
            e.preventDefault();
            showError("Password must be at least 6 characters.");
            return;
        }
    });
}


function showError(message) {
    if (jsErrorBox) {
        jsErrorBox.innerText = message;
        jsErrorBox.style.display = "block";
        
        setTimeout(() => {
            jsErrorBox.style.display = "none";
        }, 3000);
    }
}
});