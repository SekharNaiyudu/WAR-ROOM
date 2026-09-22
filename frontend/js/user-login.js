/* =========================================================
   WAR ROOM
   USER LOGIN / REGISTRATION
   USER-LOGIN.JS
   ========================================================= */


/* =========================================================
   DOMAIN CONFIGURATION
   ========================================================= */

const domainConfig = {

    ceh: {
        name: "CEH WORKSHOP",
        icon: "⌘"
    },

    vapt: {
        name: "VAPT WORKSHOP",
        icon: "◯"
    },

    soc: {
        name: "SOC WORKSHOP",
        icon: "◈"
    },

    forensics: {
        name: "DIGITAL FORENSICS WORKSHOP",
        icon: "◎"
    }

};


/* =========================================================
   CURRENT DOMAIN
   ========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );


let selectedDomain =
    (
        urlParams.get("domain") ||
        "ceh"
    )
    .toLowerCase();


if (
    !domainConfig[selectedDomain]
) {

    selectedDomain =
        "ceh";

}


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const domainName =
    document.getElementById(
        "domainName"
    );


const domainIcon =
    document.getElementById(
        "domainIcon"
    );


const registerTab =
    document.getElementById(
        "registerTab"
    );


const loginTab =
    document.getElementById(
        "loginTab"
    );


const registerForm =
    document.getElementById(
        "registerForm"
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );


const authMessage =
    document.getElementById(
        "authMessage"
    );


/* =========================================================
   DISPLAY SELECTED DOMAIN
   ========================================================= */

function updateDomainDisplay() {

    const domain =
        domainConfig[
            selectedDomain
        ];


    if (!domain) {

        return;

    }


    if (domainName) {

        domainName.textContent =
            domain.name;

    }


    if (domainIcon) {

        domainIcon.textContent =
            domain.icon;

    }

}


/* =========================================================
   SHOW MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = "error"
) {

    if (!authMessage) {

        return;

    }


    authMessage.textContent =
        String(message);


    authMessage.className =
        "auth-message show " +
        type;

}


/* =========================================================
   CLEAR MESSAGE
   ========================================================= */

function clearMessage() {

    if (!authMessage) {

        return;

    }


    authMessage.textContent =
        "";


    authMessage.className =
        "auth-message";

}


/* =========================================================
   SHOW REGISTER
   ========================================================= */

function showRegister() {

    if (registerTab) {

        registerTab.classList.add(
            "active"
        );

    }


    if (loginTab) {

        loginTab.classList.remove(
            "active"
        );

    }


    if (registerForm) {

        registerForm.classList.remove(
            "hidden"
        );

    }


    if (loginForm) {

        loginForm.classList.add(
            "hidden"
        );

    }


    clearMessage();

}


/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLogin() {

    if (loginTab) {

        loginTab.classList.add(
            "active"
        );

    }


    if (registerTab) {

        registerTab.classList.remove(
            "active"
        );

    }


    if (loginForm) {

        loginForm.classList.remove(
            "hidden"
        );

    }


    if (registerForm) {

        registerForm.classList.add(
            "hidden"
        );

    }


    clearMessage();

}


/* =========================================================
   TAB EVENTS
   ========================================================= */

if (registerTab) {

    registerTab.addEventListener(
        "click",
        showRegister
    );

}


if (loginTab) {

    loginTab.addEventListener(
        "click",
        showLogin
    );

}


/* =========================================================
   WORKSHOP REGISTRATION
   ========================================================= */

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            clearMessage();


            const name =
                document
                    .getElementById(
                        "registerName"
                    )
                    ?.value
                    .trim();


            const email =
                document
                    .getElementById(
                        "registerEmail"
                    )
                    ?.value
                    .trim()
                    .toLowerCase();


            const phone =
                document
                    .getElementById(
                        "registerPhone"
                    )
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById(
                        "registerPassword"
                    )
                    ?.value
                || "";


            const confirmPassword =
                document
                    .getElementById(
                        "confirmPassword"
                    )
                    ?.value
                || "";


            if (
                !name ||
                !email ||
                !phone ||
                !password ||
                !confirmPassword
            ) {

                showMessage(
                    "Please fill all required fields.",
                    "error"
                );

                return;

            }


            const emailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


            if (
                !emailPattern.test(
                    email
                )
            ) {

                showMessage(
                    "Please enter a valid email address.",
                    "error"
                );

                return;

            }


            const phonePattern =
                /^[0-9+\-\s()]{10,15}$/;


            if (
                !phonePattern.test(
                    phone
                )
            ) {

                showMessage(
                    "Please enter a valid phone number.",
                    "error"
                );

                return;

            }


            if (
                password.length < 6
            ) {

                showMessage(
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;

            }


            if (
                password !==
                confirmPassword
            ) {

                showMessage(
                    "Passwords do not match.",
                    "error"
                );

                return;

            }


            const registerButton =
                document.getElementById(
                    "registerButton"
                );


            if (registerButton) {

                registerButton.disabled =
                    true;

            }


            try {

                const response =
                    await fetch(
                        "/api/workshop/register",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    name:
                                        name,

                                    email:
                                        email,

                                    phone:
                                        phone,

                                    password:
                                        password,

                                    confirm_password:
                                        confirmPassword,

                                    domain:
                                        selectedDomain

                                })
                        }
                    );


                const data =
                    await response
                        .json()
                        .catch(
                            function() {

                                return {};

                            }
                        );


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        data.message ||
                        "Registration failed."
                    );

                }


                console.log(
                    "REGISTRATION SUCCESS:",
                    data
                );


                /*
                 * Save registered name/email
                 * as temporary convenience data.
                 */

                if (data.user) {

                    if (data.user.name) {

                        sessionStorage.setItem(
                            "pending_registered_name",
                            data.user.name
                        );

                    }

                    if (data.user.email) {

                        sessionStorage.setItem(
                            "pending_registered_email",
                            data.user.email
                        );

                    }

                }


                showMessage(
                    "Account created successfully. Please login.",
                    "success"
                );


                const loginEmail =
                    document.getElementById(
                        "loginEmail"
                    );


                if (loginEmail) {

                    loginEmail.value =
                        email;

                }


                registerForm.reset();


                setTimeout(
                    function() {

                        showLogin();


                        if (loginEmail) {

                            loginEmail.value =
                                email;

                        }

                    },
                    900
                );


            }

            catch (error) {

                console.error(
                    "REGISTRATION ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to create account.",
                    "error"
                );

            }

            finally {

                if (registerButton) {

                    registerButton.disabled =
                        false;

                }

            }

        }
    );

}


/* =========================================================
   WORKSHOP LOGIN
   ========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            clearMessage();


            const email =
                document
                    .getElementById(
                        "loginEmail"
                    )
                    ?.value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    ?.value
                || "";


            if (
                !email ||
                !password
            ) {

                showMessage(
                    "Please enter your email and password.",
                    "error"
                );

                return;

            }


            const loginButton =
                document.getElementById(
                    "loginButton"
                );


            if (loginButton) {

                loginButton.disabled =
                    true;

            }


            try {

                const response =
                    await fetch(
                        "/api/workshop/login",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    email:
                                        email,

                                    password:
                                        password,

                                    domain:
                                        selectedDomain

                                })
                        }
                    );


                const data =
                    await response
                        .json()
                        .catch(
                            function() {

                                return {};

                            }
                        );


                if (!response.ok) {

                    throw new Error(
                        data.detail ||
                        data.message ||
                        "Login failed."
                    );

                }


                console.log(
                    "LOGIN SUCCESS:",
                    data
                );


                /* =================================================
                   SESSION TOKEN
                   ================================================= */

                if (
                    data.session_token
                ) {

                    sessionStorage.setItem(
                        "user_session_token",
                        data.session_token
                    );


                    sessionStorage.setItem(
                        "workshop_session_token",
                        data.session_token
                    );

                }


                /* =================================================
                   EVENT
                   ================================================= */

                sessionStorage.setItem(
                    "user_event",
                    "workshop"
                );


                sessionStorage.setItem(
                    "workshop_event",
                    "workshop"
                );


                /* =================================================
                   DOMAIN
                   ================================================= */

                sessionStorage.setItem(
                    "user_domain",
                    selectedDomain
                );


                sessionStorage.setItem(
                    "workshop_domain",
                    selectedDomain
                );


                sessionStorage.setItem(
                    "workshop_user_domain",
                    selectedDomain
                );


                /* =================================================
                   USER EMAIL
                   ================================================= */

                sessionStorage.setItem(
                    "workshop_user_email",
                    data.user?.email ||
                    email
                );


                /* =================================================
                   ACTUAL BACKEND USER DATA
                   ================================================= */

                if (data.user) {

                    sessionStorage.setItem(
                        "user_data",
                        JSON.stringify(
                            data.user
                        )
                    );


                    sessionStorage.setItem(
                        "workshop_user_data",
                        JSON.stringify(
                            data.user
                        )
                    );


                    if (
                        data.user.name
                    ) {

                        sessionStorage.setItem(
                            "workshop_user_name",
                            data.user.name
                        );

                    }

                }


                /*
                 * Remove stale temporary registration
                 * data after successful login.
                 */

                sessionStorage.removeItem(
                    "pending_registered_name"
                );


                sessionStorage.removeItem(
                    "pending_registered_email"
                );


                showMessage(
                    "Login successful. Opening dashboard...",
                    "success"
                );


                console.log(
                    "REDIRECTING TO:",
                    "/user/dashboard"
                );


                setTimeout(
                    function() {

                        window.location.replace(
                            "/user/dashboard"
                        );

                    },
                    700
                );


            }

            catch (error) {

                console.error(
                    "LOGIN ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to login.",
                    "error"
                );

            }

            finally {

                if (loginButton) {

                    loginButton.disabled =
                        false;

                }

            }

        }
    );

}


/* =========================================================
   BACK TO WORKSHOPS
   ========================================================= */

const backButton =
    document.getElementById(
        "backToWorkshop"
    );


if (backButton) {

    backButton.addEventListener(
        "click",
        function() {

            window.location.href =
                "/";

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeWorkshopAuth() {

    updateDomainDisplay();

    showRegister();


    console.log(
        "===================================="
    );


    console.log(
        "WAR ROOM USER LOGIN"
    );


    console.log(
        "SELECTED DOMAIN:",
        selectedDomain
    );


    console.log(
        "USER LOGIN JS LOADED SUCCESSFULLY"
    );


    console.log(
        "===================================="
    );

}


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeWorkshopAuth
    );

}

else {

    initializeWorkshopAuth();

}