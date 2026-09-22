// =====================================================
// ADMIN LOGIN
// =====================================================

const loginForm = document.getElementById("adminLoginForm");

const usernameInput = document.getElementById("username");

const passwordInput = document.getElementById("password");


loginForm.addEventListener("submit", async function (event) {

    // Prevent normal form submission
    event.preventDefault();


    const username = usernameInput.value.trim();

    const password = passwordInput.value;


    // =================================================
    // BASIC VALIDATION
    // =================================================

    if (!username || !password) {

        WarRoomAlert("Please enter username and password.");

        return;
    }


    try {

        // =================================================
        // SEND LOGIN REQUEST TO FASTAPI
        // =================================================

        const response = await fetch(
            "/api/admin/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    username: username,

                    password: password

                })
            }
        );


        const data = await response.json();


        // =================================================
        // LOGIN SUCCESS
        // =================================================

        if (response.ok && data.success) {

            window.location.href =
                "/admin/dashboard";

            return;
        }


        // =================================================
        // LOGIN FAILED
        // =================================================

        WarRoomAlert(
            data.detail ||
            "Invalid administrator credentials."
        );

    }

    catch (error) {

        console.error(
            "Login Error:",
            error
        );

        WarRoomAlert(
            "Unable to connect to WAR ROOM server."
        );

    }

});