/* =========================================================
   WAR ROOM
   HACKATHON TEAM AUTHENTICATION
   USER-HACKATHON.JS
   ========================================================= */


/* =========================================================
   DOMAIN CONFIGURATION
   ========================================================= */

const domainConfig = {

    ceh_hackathon: {

        name:
            "CEH HACKATHON",

        icon:
            "◇"

    },


    vapt_hackathon: {

        name:
            "VAPT HACKATHON",

        icon:
            "⬡"

    },


    soc_hackathon: {

        name:
            "SOC HACKATHON",

        icon:
            "◈"

    },


    forensics_hackathon: {

        name:
            "DIGITAL FORENSICS HACKATHON",

        icon:
            "◎"

    }

};


/* =========================================================
   GET DOMAIN FROM URL
   Example:

   /user-hackathon?domain=vapt_hackathon
   ========================================================= */

const urlParams =
    new URLSearchParams(
        window.location.search
    );


let selectedDomain =
    (
        urlParams.get("domain") ||
        "ceh_hackathon"
    ).toLowerCase();


if (
    !domainConfig[
        selectedDomain
    ]
) {

    selectedDomain =
        "ceh_hackathon";

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


const memberCount =
    document.getElementById(
        "memberCount"
    );


const teamMembersContainer =
    document.getElementById(
        "teamMembersContainer"
    );


/* =========================================================
   UPDATE DOMAIN DISPLAY
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
   FASTAPI ERROR HANDLER
   ========================================================= */

function getApiErrorMessage(
    data,
    fallbackMessage
) {

    if (!data) {

        return fallbackMessage;

    }


    /*
     * Normal backend error
     */

    if (
        typeof data.detail ===
        "string"
    ) {

        return data.detail;

    }


    /*
     * FastAPI validation error
     */

    if (
        Array.isArray(
            data.detail
        )
    ) {

        const messages =
            data.detail
                .map(
                    function(item) {

                        if (
                            item &&
                            typeof item.msg ===
                            "string"
                        ) {

                            return item.msg;

                        }


                        if (
                            item &&
                            typeof item.message ===
                            "string"
                        ) {

                            return item.message;

                        }


                        return "";

                    }
                )
                .filter(
                    Boolean
                );


        if (
            messages.length > 0
        ) {

            return messages.join(
                " "
            );

        }

    }


    if (
        typeof data.message ===
        "string"
    ) {

        return data.message;

    }


    return fallbackMessage;

}


/* =========================================================
   SHOW REGISTER FORM
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
   SHOW LOGIN FORM
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
   CREATE TEAM MEMBER FIELDS
   ========================================================= */

function createTeamMemberFields() {

    if (
        !memberCount ||
        !teamMembersContainer
    ) {

        return;

    }


    const count =
        parseInt(
            memberCount.value,
            10
        );


    teamMembersContainer.innerHTML =
        "";


    if (
        !count ||
        count < 1
    ) {

        return;

    }


    if (
        count > 10
    ) {

        showMessage(
            "Maximum 10 team members are allowed.",
            "error"
        );


        memberCount.value =
            "10";


        return;

    }


    for (
        let index = 1;
        index <= count;
        index++
    ) {

        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "team-member-field";


        const label =
            document.createElement(
                "label"
            );


        label.setAttribute(
            "for",
            "teamMember" +
            index
        );


        label.textContent =
            "TEAM MEMBER " +
            String(index).padStart(
                2,
                "0"
            );


        const input =
            document.createElement(
                "input"
            );


        input.type =
            "text";


        input.name =
            "team_member_" +
            index;


        input.id =
            "teamMember" +
            index;


        input.placeholder =
            "Enter team member " +
            index +
            " name";


        input.maxLength =
            100;


        input.required =
            true;


        wrapper.appendChild(
            label
        );


        wrapper.appendChild(
            input
        );


        teamMembersContainer.appendChild(
            wrapper
        );

    }

}


/* =========================================================
   MEMBER COUNT CHANGE
   ========================================================= */

if (memberCount) {

    memberCount.addEventListener(
        "change",
        function() {

            createTeamMemberFields();

            clearMessage();

        }
    );

}


/* =========================================================
   GET TEAM MEMBERS
   ========================================================= */

function getTeamMembers() {

    if (
        !teamMembersContainer
    ) {

        return [];

    }


    const inputs =
        teamMembersContainer
            .querySelectorAll(
                "input"
            );


    const members = [];


    inputs.forEach(
        function(input) {

            const name =
                input.value.trim();


            if (name) {

                members.push(
                    name
                );

            }

        }
    );


    return members;

}


/* =========================================================
   EMAIL VALIDATION
   ========================================================= */

function isValidEmail(
    email
) {

    const pattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    return pattern.test(
        email
    );

}


/* =========================================================
   REGISTER TEAM
   ========================================================= */

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            clearMessage();


            /* -------------------------------------------------
               GET FORM VALUES
               ------------------------------------------------- */

            const teamName =
                document
                    .getElementById(
                        "teamName"
                    )
                    ?.value
                    .trim();


            const count =
                parseInt(
                    memberCount?.value,
                    10
                );


            const teamMembers =
                getTeamMembers();


            const teamLeadEmail =
                document
                    .getElementById(
                        "teamLeadEmail"
                    )
                    ?.value
                    .trim()
                    .toLowerCase();


            const password =
                document
                    .getElementById(
                        "registerPassword"
                    )
                    ?.value ||
                "";


            const confirmPassword =
                document
                    .getElementById(
                        "confirmPassword"
                    )
                    ?.value ||
                "";


            /* -------------------------------------------------
               BASIC VALIDATION
               ------------------------------------------------- */

            if (
                !teamName ||
                !count ||
                !teamLeadEmail ||
                !password ||
                !confirmPassword
            ) {

                showMessage(
                    "Please fill all required fields.",
                    "error"
                );

                return;

            }


            if (
                count < 1 ||
                count > 10
            ) {

                showMessage(
                    "Team members must be between 1 and 10.",
                    "error"
                );

                return;

            }


            if (
                teamMembers.length !==
                count
            ) {

                showMessage(
                    "Please enter all team member names.",
                    "error"
                );

                return;

            }


            if (
                !isValidEmail(
                    teamLeadEmail
                )
            ) {

                showMessage(
                    "Please enter a valid team lead email.",
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


            /* -------------------------------------------------
               DISABLE REGISTER BUTTON
               ------------------------------------------------- */

            const registerButton =
                document.getElementById(
                    "registerButton"
                );


            if (registerButton) {

                registerButton.disabled =
                    true;

            }


            try {

                /* -------------------------------------------------
                   BACKEND PAYLOAD
                   ------------------------------------------------- */

                const payload = {

                    team_name:
                        teamName,

                    team_members_count:
                        count,

                    team_members:
                        teamMembers,

                    email:
                        teamLeadEmail,

                    password:
                        password,

                    confirm_password:
                        confirmPassword,

                    domain:
                        selectedDomain

                };


                console.log(
                    "HACKATHON REGISTRATION REQUEST:",
                    payload
                );


                /* -------------------------------------------------
                   API REQUEST
                   ------------------------------------------------- */

                const response =
                    await fetch(
                        "/api/hackathon/register",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    payload
                                )

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


                /* -------------------------------------------------
                   ERROR
                   ------------------------------------------------- */

                if (
                    !response.ok
                ) {

                    throw new Error(
                        getApiErrorMessage(
                            data,
                            "Team registration failed."
                        )
                    );

                }


                /* -------------------------------------------------
                   SUCCESS
                   ------------------------------------------------- */

                console.log(
                    "HACKATHON REGISTRATION SUCCESS:",
                    data
                );


                showMessage(
                    data.message ||
                    "Team registered successfully. Please login.",
                    "success"
                );


                const registeredTeamName =
                    teamName;


                const loginTeamName =
                    document.getElementById(
                        "loginTeamName"
                    );


                if (
                    loginTeamName
                ) {

                    loginTeamName.value =
                        registeredTeamName;

                }


                /* -------------------------------------------------
                   RESET REGISTER FORM
                   ------------------------------------------------- */

                registerForm.reset();


                if (
                    teamMembersContainer
                ) {

                    teamMembersContainer.innerHTML =
                        "";

                }


                /* -------------------------------------------------
                   MOVE TO LOGIN
                   ------------------------------------------------- */

                setTimeout(
                    function() {

                        showLogin();


                        if (
                            loginTeamName
                        ) {

                            loginTeamName.value =
                                registeredTeamName;

                        }

                    },
                    900
                );


            }
            catch (error) {

                console.error(
                    "HACKATHON REGISTRATION ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to register team.",
                    "error"
                );


            }
            finally {

                if (
                    registerButton
                ) {

                    registerButton.disabled =
                        false;

                }

            }

        }
    );

}


/* =========================================================
   LOGIN TEAM
   ========================================================= */

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            clearMessage();


            /* -------------------------------------------------
               GET LOGIN VALUES
               ------------------------------------------------- */

            const teamName =
                document
                    .getElementById(
                        "loginTeamName"
                    )
                    ?.value
                    .trim();


            const password =
                document
                    .getElementById(
                        "loginPassword"
                    )
                    ?.value ||
                "";


            /* -------------------------------------------------
               VALIDATION
               ------------------------------------------------- */

            if (
                !teamName ||
                !password
            ) {

                showMessage(
                    "Please enter team name and password.",
                    "error"
                );

                return;

            }


            /* -------------------------------------------------
               DISABLE LOGIN BUTTON
               ------------------------------------------------- */

            const loginButton =
                document.getElementById(
                    "loginButton"
                );


            if (loginButton) {

                loginButton.disabled =
                    true;

            }


            try {

                /* -------------------------------------------------
                   LOGIN PAYLOAD
                   ------------------------------------------------- */

                const payload = {

                    team_name:
                        teamName,

                    password:
                        password,

                    domain:
                        selectedDomain

                };


                console.log(
                    "HACKATHON LOGIN REQUEST:",
                    payload
                );


                /* -------------------------------------------------
                   API REQUEST
                   ------------------------------------------------- */

                const response =
                    await fetch(
                        "/api/hackathon/login",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify(
                                    payload
                                )

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


                /* -------------------------------------------------
                   ERROR
                   ------------------------------------------------- */

                if (
                    !response.ok
                ) {

                    throw new Error(
                        getApiErrorMessage(
                            data,
                            "Hackathon login failed."
                        )
                    );

                }


                /* -------------------------------------------------
                   LOGIN SUCCESS
                   ------------------------------------------------- */

                console.log(
                    "HACKATHON LOGIN SUCCESS:",
                    data
                );


                /* =================================================
                   SAVE SESSION TOKEN
                   ================================================= */

                if (
                    data.session_token
                ) {

                    sessionStorage.setItem(
                        "hackathon_session_token",
                        data.session_token
                    );


                    sessionStorage.setItem(
                        "user_session_token",
                        data.session_token
                    );

                }


                /* =================================================
                   SAVE EVENT
                   ================================================= */

                sessionStorage.setItem(
                    "user_event",
                    "hackathon"
                );


                /* =================================================
                   SAVE DOMAIN
                   ================================================= */

                sessionStorage.setItem(
                    "hackathon_domain",
                    selectedDomain
                );


                sessionStorage.setItem(
                    "user_domain",
                    selectedDomain
                );


                /* =================================================
                   SAVE TEAM NAME
                   ================================================= */

                sessionStorage.setItem(
                    "hackathon_team_name",
                    teamName
                );


                /* =================================================
                   SAVE TEAM ID
                   ================================================= */

                const teamId =
                    data.team_id ??
                    data.team?.id;


                if (
                    teamId !== undefined &&
                    teamId !== null
                ) {

                    sessionStorage.setItem(
                        "hackathon_team_id",
                        String(
                            teamId
                        )
                    );

                }


                /* =================================================
                   SAVE TEAM DATA
                   ================================================= */

                if (
                    data.team
                ) {

                    sessionStorage.setItem(
                        "user_data",
                        JSON.stringify(
                            data.team
                        )
                    );


                    sessionStorage.setItem(
                        "hackathon_team_data",
                        JSON.stringify(
                            data.team
                        )
                    );

                }


                /* =================================================
                   SUCCESS MESSAGE
                   ================================================= */

                showMessage(
                    "Login successful. Opening dashboard...",
                    "success"
                );


                /* =================================================
                   ALWAYS REDIRECT TO USER DASHBOARD
                   ================================================= */

                /*
                 * IMPORTANT:
                 *
                 * Backend redirect_url is intentionally
                 * NOT used here.
                 *
                 * Even if backend sends:
                 *
                 * "/"
                 *
                 * or:
                 *
                 * "/hackathon"
                 *
                 * the user will ALWAYS be sent to:
                 *
                 * /user/dashboard
                 *
                 */

                console.log(
                    "REDIRECTING HACKATHON USER TO USER DASHBOARD"
                );


                setTimeout(
                    function() {

                        window.location.href =
                            "/user/dashboard";

                    },
                    700
                );


            }
            catch (error) {

                console.error(
                    "HACKATHON LOGIN ERROR:",
                    error
                );


                showMessage(
                    error.message ||
                    "Unable to login.",
                    "error"
                );


            }
            finally {

                if (
                    loginButton
                ) {

                    loginButton.disabled =
                        false;

                }

            }

        }
    );

}


/* =========================================================
   BACK TO HACKATHON PAGE
   ========================================================= */

const backButton =
    document.getElementById(
        "backToHackathon"
    );


if (
    backButton
) {

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

function initializeHackathonAuth() {

    updateDomainDisplay();

    showRegister();


    console.log(
        "===================================="
    );


    console.log(
        "WAR ROOM HACKATHON TEAM AUTH"
    );


    console.log(
        "SELECTED DOMAIN:",
        selectedDomain
    );


    console.log(
        "DOMAIN NAME:",
        domainConfig[
            selectedDomain
        ].name
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
        initializeHackathonAuth
    );

}
else {

    initializeHackathonAuth();

}