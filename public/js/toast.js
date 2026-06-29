function showToast(message, type = "success") {
    Toastify({
        text: message,
        duration: 2000,
        gravity: "top",
        position: "right",
        style: {
            background: type === "success" ? "#6badb0" : "#dc3545",
            color: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(18, 18, 18, 0.1)"
        },
        stopOnFocus: true,
    }).showToast();
}