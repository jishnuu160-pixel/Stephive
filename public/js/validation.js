document.addEventListener("DOMContentLoaded", () => {
   
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const forgotForm = document.getElementById("forgotForm"); // Added
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const jsError = document.getElementById("jsError");


    if (window.location.search.includes('error') || window.location.search.includes('success')) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }

    const hideErrors = () => {
        if (jsError) jsError.style.display = "none";

        const serverErrors = document.querySelectorAll(".server-error, .error-msg, .alert");
        serverErrors.forEach(err => {
            err.style.display = "none";
        });
    };


    document.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", hideErrors);
    });

 
    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const showError = (message) => {
        if (jsError) {
            jsError.textContent = message;
            jsError.style.display = "block";
        } else {
            alert(message);
        }
    };


 
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            const email = emailInput?.value.trim();
            const password = passwordInput?.value.trim();
            if (!email || !password) {
                e.preventDefault();
                showError("All fields are required!.");
            } else if (!validateEmail(email)) {
                e.preventDefault();
                showError("Please enter a valid email address.");
            }
        });
    }

    
    if (signupForm) {
        signupForm.addEventListener("submit", (e) => {
            const email = emailInput?.value.trim();
            const password = passwordInput?.value;
            const confirmPassword = document.getElementById("confirmPassword")?.value;

            if (!email || !password) {
                e.preventDefault();
                showError("All fields are required.");
            } else if (password.length < 6) {
                e.preventDefault();
                showError("Password must be at least 6 characters.");
            } else if (confirmPassword !== undefined && password !== confirmPassword) {
                e.preventDefault();
                showError("Passwords do not match.");
            }
        });
    }

  
    if (forgotForm) {
        forgotForm.addEventListener("submit", (e) => {
            const email = emailInput?.value.trim();

            if (!email) {
                e.preventDefault();
                showError("Please enter your email address.");
                emailInput.focus();
            } else if (!validateEmail(email)) {
                e.preventDefault();
                showError("Please enter a valid email address.");
            }
        });
    }
});


document.addEventListener("DOMContentLoaded", () => {
    const welcomeBox = document.getElementById("welcomeToast");
    if (welcomeBox) {
        setTimeout(() => {
            welcomeBox.style.transition = "opacity 1s ease, transform 1s ease";
            welcomeBox.style.opacity = "0";
            welcomeBox.style.transform = "translateX(50px)";
            setTimeout(() => { welcomeBox.remove(); }, 1000); 
        }, 4000);
    }

    const timerElement = document.getElementById("timer");
    const timerContainer = document.getElementById("timer-container");
    const resendLink = document.getElementById("resend-link");

    if (timerElement) {
        let timeLeft = 60; 

        const countdown = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(countdown);
                if (timerContainer) timerContainer.style.display = "none";
                if (resendLink) resendLink.style.display = "inline";
            } else {
                timeLeft--;
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                // Formats to 00:00 style
                timerElement.textContent = 
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
});

