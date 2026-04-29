function showToast(message, type = "success") {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: type === "success" ? "#28a745" : "#dc3545",
            color: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        },
        stopOnFocus: true,
    }).showToast();
}