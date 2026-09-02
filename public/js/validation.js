const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const jsErrorBox = document.getElementById("js-error-message"); 

if (loginForm) {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const serverErrorBox = document.querySelector(".server-error"); 

    const showError = (message) => {
        if (serverErrorBox) {
            serverErrorBox.style.display = "none";
        }

        if (jsErrorBox) {
            jsErrorBox.innerText = message;
            jsErrorBox.style.display = "block";
        }
    };

    const hideError = () => {
        if (serverErrorBox) {
            serverErrorBox.style.display = "none";
        }
        if (jsErrorBox) {
            jsErrorBox.style.display = "none";
            jsErrorBox.innerText = "";
        }
    };

    emailInput?.addEventListener("input", hideError);
    passwordInput?.addEventListener("input", hideError);

    loginForm.addEventListener("submit", (e) => {
        const email = emailInput?.value.trim();
        const password = passwordInput?.value.trim();

        if (!email || !password) {
            e.preventDefault(); 
            showError("All fields are required!");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            e.preventDefault();
            showError("Please enter a valid email address!");
            return;
        }
        
       const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

       if (!password) {
         e.preventDefault();
         showError("Password is required!");
         return;
       }

       if (!passwordRegex.test(password)) {
         e.preventDefault();
         showError("Must be 8+ chars with uppercase, lowercase, number, and symbol.");
         return;
        }
    });
}

if (signupForm) {
    const fullNameInput = document.getElementById("fullName");
    const emailAddressInput = document.getElementById("email");
    const phoneNumberInput = document.getElementById("phoneNumber");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const referralCodeInput = document.getElementById("referralCode");

    const requiredFormInputs = [
        fullNameInput, 
        emailAddressInput, 
        phoneNumberInput, 
        passwordInput, 
        confirmPasswordInput
    ];

    requiredFormInputs.forEach(inputField => {
        inputField?.addEventListener("input", () => {
            const currentFullName = fullNameInput?.value.trim();
            const currentEmail = emailAddressInput?.value.trim();
            const currentPhone = phoneNumberInput?.value.trim();
            const currentPassword = passwordInput?.value;
            const currentConfirmPassword = confirmPasswordInput?.value;

            if (currentFullName && currentEmail && currentPhone && currentPassword && currentConfirmPassword) {
                if (jsErrorBox && jsErrorBox.innerText === "All fields are required!") {
                    jsErrorBox.style.display = "none";
                    jsErrorBox.innerText = "";
                }
            }
        });
    });

    signupForm.addEventListener("submit", (submitEvent) => {
        let isFormValid = true;

        document.querySelectorAll('.field-error').forEach(errorElement => {
            errorElement.style.display = 'none';
            errorElement.innerText = '';
        });

        const fullNameValue = fullNameInput?.value.trim();
        const emailAddressValue = emailAddressInput?.value.trim();
        const phoneNumberValue = phoneNumberInput?.value.trim();
        const passwordValue = passwordInput?.value;
        const confirmPasswordValue = confirmPasswordInput?.value;
        const referralCodeValue = referralCodeInput?.value.trim();

        if (!fullNameValue || !emailAddressValue || !phoneNumberValue || !passwordValue || !confirmPasswordValue) {
            submitEvent.preventDefault();

            if (jsErrorBox) {
                jsErrorBox.innerText = "Please fill in all required fields.";
                jsErrorBox.style.display = "block";
            }

            return;
        }

        const fullNameRegex = /^[A-Za-z ]{3,10}$/;
        if (!fullNameValue) {
            showFieldError("fullNameError", "Full Name is required.");
            isFormValid = false;
        } else if (fullNameValue.length < 3) {
            showFieldError("fullNameError", "Full Name must be at least 3 characters.");
            isFormValid = false;
        } else if (!fullNameRegex.test(fullNameValue)) {
            showFieldError("fullNameError", "Only letters and spaces are allowed.");
            isFormValid = false;
        } 

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailAddressValue) {
            showFieldError("emailError", "Email address is required.");
            isFormValid = false;
        } else if (!emailRegex.test(emailAddressValue)) {
            showFieldError("emailError", "Please enter a valid email address.");
            isFormValid = false;
        }

        const phoneValue = phoneNumberValue ? phoneNumberValue.toString().replace(/[\s-]/g, '') : ""; 
        const phoneRegex = /^\d{10}$/;
        if (!phoneValue) {
            showFieldError("phoneError", "Phone number is required.");
            isFormValid = false;
        } else if (!phoneRegex.test(phoneValue)) {
            showFieldError("phoneError", "Phone number must be exactly 10 digits.");
            isFormValid = false;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordValue) {
            showFieldError("passwordError", "Password is required.");
            isFormValid = false;
        } else if (!passwordRegex.test(passwordValue)) {
            showFieldError("passwordError", "Must be 8+ chars with uppercase, lowercase, number, and symbol.");
            isFormValid = false;
        } 

        if (!confirmPasswordValue) {
            showFieldError("confirmPasswordError", "Please confirm your password.");
            isFormValid = false;
        } else if (passwordValue !== confirmPasswordValue) {
            showFieldError("confirmPasswordError", "Passwords do not match.");
            isFormValid = false;
        }

        if (referralCodeValue) {
            const referralCodeRegex = /^STEPHYVE-[A-Za-z0-9]{4}$/;
            if (!referralCodeRegex.test(referralCodeValue)) {
                showFieldError("referralError", "Invalid referral code format. (e.g., STEPHYVE-ALEG)");
                isFormValid = false; 
            }
        }

        if (!isFormValid) {
            submitEvent.preventDefault();
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
        serverError.style.display = "block";
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
     
        const otp = document.getElementById("otp").value.trim();
        const password = document.getElementById("password").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();

        if (!otp) {
            e.preventDefault();
            showError("Please enter the OTP code!");
            return;
        }
        
        if (!password || !confirmPassword) {
            e.preventDefault(); 
            showError("Please enter your new password!");
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!passwordRegex.test(password)) {
            e.preventDefault();
            showError("Must be 8+ chars with uppercase, lowercase, number, and symbol.");
            return;
        }

        if (password !== confirmPassword) {
            e.preventDefault(); 
            showError("Passwords do not match!");
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

function showFieldError(id, message) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = message;
        element.style.display = "block";
    }
}