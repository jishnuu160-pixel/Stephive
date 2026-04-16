document.getElementById('genderSelect').addEventListener('change', async function() {
    const selectedGender = this.value;

    try {
        const response = await fetch('/user/update-gender', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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