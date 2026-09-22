/* =========================================================
   WAR ROOM
   USER DASHBOARD
   USER_DASHBOARD.JS
   ========================================================= */


/* =========================================================
   DOMAIN INFORMATION
   ========================================================= */

const domainInfo = {

    ceh: {
        name: "CEH",
        description:
            "Certified Ethical Hacking"
    },

    vapt: {
        name: "VAPT",
        description:
            "Vulnerability Assessment & Penetration Testing"
    },

    soc: {
        name: "SOC",
        description:
            "Security Operations Center"
    },

    forensics: {
        name: "DIGITAL FORENSICS",
        description:
            "Digital Evidence & Forensic Investigation"
    }

};


/* =========================================================
   TOOLKIT STATE
   ========================================================= */

let toolkitState = {

    available: false,

    filename: "",

    description: "",

    downloadUrl: "",

    files: []

};


/* =========================================================
   USER SESSION
   ========================================================= */

let userSession = {

    name: "",

    email: "",

    event: "workshop",

    domain: "ceh",

    points: 0,

    status: "active",

    userData: null,

    accountData: null

};


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeUserDashboard();

    }
);


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

async function initializeUserDashboard() {

    console.log(
        "======================================"
    );

    console.log(
        "WAR ROOM USER DASHBOARD"
    );

    console.log(
        "======================================"
    );


    const authenticated =
        await loadCurrentAuthenticatedUser();


    if (!authenticated) {

        console.error(
            "AUTHENTICATED USER COULD NOT BE LOADED."
        );

        return;

    }


    updateUserInformation();

    updateEventInformation();

    updateDomainInformation();

    updatePoints();

    updateAccountStatus();

    await updateToolkit();

    updateRegistrationDetails();

    updateActivity();

    setupToolkitDownload();

    setupSearch();

    setupLogout();


    console.log(
        "======================================"
    );

    console.log(
        "FINAL USER SESSION:"
    );

    console.log(
        userSession
    );

    console.log(
        "======================================"
    );

}


/* =========================================================
   GET CURRENT EVENT
   ========================================================= */

function getCurrentEvent() {

    const event =
        sessionStorage.getItem(
            "user_event"
        );


    if (
        String(event || "")
            .trim()
            .toLowerCase()
            ===
            "hackathon"
    ) {

        return "hackathon";

    }


    return "workshop";

}


/* =========================================================
   GET WORKSHOP SESSION TOKEN
   ========================================================= */

function getWorkshopSessionToken() {

    return (

        sessionStorage.getItem(
            "user_session_token"
        )

        ||

        sessionStorage.getItem(
            "workshop_session_token"
        )

    );

}


/* =========================================================
   GET HACKATHON SESSION TOKEN
   ========================================================= */

function getHackathonSessionToken() {

    return (

        sessionStorage.getItem(
            "hackathon_session_token"
        )

        ||

        sessionStorage.getItem(
            "user_session_token"
        )

    );

}


/* =========================================================
   LOAD CURRENT AUTHENTICATED ACCOUNT
   ========================================================= */

async function loadCurrentAuthenticatedUser() {

    const event =
        getCurrentEvent();


    /* =====================================================
       WORKSHOP ACCOUNT
       ===================================================== */

    if (
        event === "workshop"
    ) {

        const sessionToken =
            getWorkshopSessionToken();


        if (!sessionToken) {

            console.error(
                "WORKSHOP SESSION TOKEN NOT FOUND."
            );

            redirectToLogin();

            return false;

        }


        try {

            const response =
                await fetch(
                    `/api/user/data?session_token=${encodeURIComponent(
                        sessionToken
                    )}&time=${Date.now()}`,
                    {
                        method:
                            "GET",

                        cache:
                            "no-store"
                    }
                );


            const data =
                await response
                    .json()
                    .catch(
                        function () {

                            return {};

                        }
                    );


            if (
                !response.ok
            ) {

                console.error(
                    "WORKSHOP ACCOUNT DATA ERROR:",
                    data
                );

                redirectToLogin();

                return false;

            }


            if (
                !data.user
            ) {

                console.error(
                    "WORKSHOP USER DATA NOT FOUND."
                );

                redirectToLogin();

                return false;

            }


            const user =
                data.user;


            const accountData =
                data.account_data ||
                null;


            let domain =
                String(
                    user.domain ||
                    accountData?.domain ||
                    "ceh"
                )
                    .trim()
                    .toLowerCase();


            if (
                domain.endsWith(
                    "_hackathon"
                )
            ) {

                domain =
                    domain.replace(
                        "_hackathon",
                        ""
                    );

            }


            userSession = {

                name:
                    user.name ||
                    "",

                email:
                    user.email ||
                    "",

                event:
                    "workshop",

                domain:
                    domain,

                points:
                    Number(
                        accountData?.points ||
                        0
                    ),

                status:
                    user.status ||
                    "active",

                userData:
                    user,

                accountData:
                    accountData

            };


            console.log(
                "CURRENT WORKSHOP USER:",
                user
            );


            console.log(
                "CURRENT WORKSHOP ACCOUNT DATA:",
                accountData
            );


            return true;

        }

        catch (error) {

            console.error(
                "WORKSHOP DASHBOARD LOAD ERROR:",
                error
            );

            return false;

        }

    }


    /* =====================================================
       HACKATHON ACCOUNT
       ===================================================== */

    if (
        event === "hackathon"
    ) {

        const sessionToken =
            getHackathonSessionToken();


        if (!sessionToken) {

            console.error(
                "HACKATHON SESSION TOKEN NOT FOUND."
            );

            redirectToLogin();

            return false;

        }


        try {

            const response =
                await fetch(
                    `/api/hackathon/data?session_token=${encodeURIComponent(
                        sessionToken
                    )}&time=${Date.now()}`,
                    {
                        method:
                            "GET",

                        cache:
                            "no-store"
                    }
                );


            const data =
                await response
                    .json()
                    .catch(
                        function () {

                            return {};

                        }
                    );


            if (
                !response.ok
            ) {

                console.error(
                    "HACKATHON ACCOUNT DATA ERROR:",
                    data
                );

                redirectToLogin();

                return false;

            }


            if (
                !data.team
            ) {

                console.error(
                    "HACKATHON TEAM DATA NOT FOUND."
                );

                redirectToLogin();

                return false;

            }


            const team =
                data.team;


            const accountData =
                data.account_data ||
                null;


            let domain =
                String(
                    team.domain ||
                    accountData?.domain ||
                    "ceh_hackathon"
                )
                    .trim()
                    .toLowerCase();


            if (
                domain.endsWith(
                    "_hackathon"
                )
            ) {

                domain =
                    domain.replace(
                        "_hackathon",
                        ""
                    );

            }


            userSession = {

                name:
                    team.team_name ||
                    "",

                email:
                    team.email ||
                    "",

                event:
                    "hackathon",

                domain:
                    domain,

                points:
                    Number(
                        accountData?.points ||
                        0
                    ),

                status:
                    team.status ||
                    "active",

                userData:
                    team,

                accountData:
                    accountData

            };


            console.log(
                "CURRENT HACKATHON TEAM:",
                team
            );


            console.log(
                "CURRENT HACKATHON ACCOUNT DATA:",
                accountData
            );


            return true;

        }

        catch (error) {

            console.error(
                "HACKATHON DASHBOARD LOAD ERROR:",
                error
            );

            return false;

        }

    }


    return false;

}


/* =========================================================
   REDIRECT TO LOGIN
   ========================================================= */

function redirectToLogin() {

    const event =
        getCurrentEvent();


    const storedDomain =
        sessionStorage.getItem(
            "user_domain"
        )

        ||

        sessionStorage.getItem(
            "workshop_domain"
        )

        ||

        sessionStorage.getItem(
            "hackathon_domain"
        )

        ||

        "ceh";


    if (
        event === "hackathon"
    ) {

        const hackathonDomain =
            storedDomain.endsWith(
                "_hackathon"
            )
                ? storedDomain
                : storedDomain +
                  "_hackathon";


        window.location.href =
            "/user-hackathon?domain=" +
            encodeURIComponent(
                hackathonDomain
            );


        return;

    }


    window.location.href =
        "/user-login?domain=" +
        encodeURIComponent(
            storedDomain.replace(
                "_hackathon",
                ""
            )
        );

}


/* =========================================================
   UPDATE USER INFORMATION
   ========================================================= */

function updateUserInformation() {

    setText(
        "userName",
        userSession.name
    );


    setText(
        "detailName",
        userSession.name
    );


    setText(
        "detailEmail",
        userSession.email
    );

}


/* =========================================================
   EVENT NAME
   ========================================================= */

function getEventName() {

    return (
        userSession.event ===
        "hackathon"
    )

        ? "HACKATHON"

        : "WORKSHOP";

}


/* =========================================================
   EVENT DESCRIPTION
   ========================================================= */

function getEventDescription() {

    return (
        userSession.event ===
        "hackathon"
    )

        ? "Hackathon team dashboard."

        : "Workshop participant dashboard.";

}


/* =========================================================
   UPDATE EVENT INFORMATION
   ========================================================= */

function updateEventInformation() {

    const eventName =
        getEventName();


    setText(
        "userEvent",
        eventName
    );


    setText(
        "detailEvent",
        eventName
    );


    setText(
        "toolkitActivity",
        "Checking toolkit availability..."
    );


    console.log(
        "EVENT:",
        eventName
    );


    console.log(
        "EVENT DESCRIPTION:",
        getEventDescription()
    );

}


/* =========================================================
   UPDATE DOMAIN INFORMATION
   ========================================================= */

function updateDomainInformation() {

    const domain =
        domainInfo[
            userSession.domain
        ];


    if (
        !domain
    ) {

        setText(
            "userDomain",
            userSession.domain.toUpperCase()
        );


        setText(
            "detailDomain",
            userSession.domain.toUpperCase()
        );


        return;

    }


    setText(
        "userDomain",
        domain.name
    );


    setText(
        "userDomainDescription",
        domain.description
    );


    setText(
        "detailDomain",
        domain.name
    );

}


/* =========================================================
   UPDATE POINTS
   ========================================================= */

function updatePoints() {

    setText(
        "userPoints",
        userSession.points
    );

}


/* =========================================================
   UPDATE ACCOUNT STATUS
   ========================================================= */

function updateAccountStatus() {

    const statusElement =
        document.getElementById(
            "userAccountStatus"
        );


    if (
        !statusElement
    ) {

        console.warn(
            "ACCOUNT STATUS ELEMENT NOT FOUND."
        );

        return;

    }


    let status =
        String(
            userSession.status ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        !status
    ) {

        status =
            "active";

    }


    statusElement.textContent =
        status.toUpperCase();


    statusElement.classList.remove(
        "status-active",
        "status-inactive",
        "status-registered",
        "status-completed",
        "status-pending",
        "status-disabled"
    );


    if (
        status === "active"
    ) {

        statusElement.classList.add(
            "status-active"
        );

    }

    else if (
        status === "inactive"
    ) {

        statusElement.classList.add(
            "status-inactive"
        );

    }

    else if (
        status === "registered"
    ) {

        statusElement.classList.add(
            "status-registered"
        );

    }

    else if (
        status === "completed"
    ) {

        statusElement.classList.add(
            "status-completed"
        );

    }

    else if (
        status === "pending"
    ) {

        statusElement.classList.add(
            "status-pending"
        );

    }

    else if (
        status === "disabled"
    ) {

        statusElement.classList.add(
            "status-disabled"
        );

    }

}


/* =========================================================
   UPDATE TOOLKIT
   ========================================================= */

async function updateToolkit() {

    const event =
        userSession.event;


    const domain =
        userSession.domain;


    toolkitState = {

        available: false,

        filename: "",

        description: "",

        downloadUrl: "",

        files: []

    };


    const fileNameElement =
        document.getElementById(
            "toolkitFileName"
        );


    const descriptionElement =
        document.getElementById(
            "toolkitFileDescription"
        );


    const downloadButton =
        document.getElementById(
            "downloadToolkitBtn"
        );


    const emptyState =
        document.getElementById(
            "toolkitEmptyState"
        );


    try {

        let sessionToken = "";


        let endpoint = "";


        /* =================================================
           HACKATHON TOOLKIT
           ================================================= */

        if (
            event === "hackathon"
        ) {

            sessionToken =
                getHackathonSessionToken();


            endpoint =
                `/api/hackathon/toolkit?session_token=${encodeURIComponent(
                    sessionToken
                )}&time=${Date.now()}`;

        }


        /* =================================================
           WORKSHOP TOOLKIT
           
           IMPORTANT:
           Use authenticated user toolkit endpoint.
           This automatically checks the logged-in user's
           registered event and domain.
           ================================================= */

        else {

            sessionToken =
                getWorkshopSessionToken();


            endpoint =
                `/api/user/toolkit?session_token=${encodeURIComponent(
                    sessionToken
                )}&time=${Date.now()}`;

        }


        if (
            !sessionToken
        ) {

            throw new Error(
                "Session token not found."
            );

        }


        console.log(
            "TOOLKIT EVENT:",
            event
        );


        console.log(
            "TOOLKIT DOMAIN:",
            domain
        );


        console.log(
            "TOOLKIT ENDPOINT:",
            endpoint
        );


        const response =
            await fetch(
                endpoint,
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        const data =
            await response
                .json()
                .catch(
                    function () {

                        return {};

                    }
                );


        console.log(
            "TOOLKIT API RESPONSE:",
            data
        );


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                data.message ||
                "Unable to load toolkit."
            );

        }


        const files =
            Array.isArray(
                data.files
            )
                ? data.files
                : [];


        /* =================================================
           NO TOOLKIT
           ================================================= */

        if (
            files.length === 0
        ) {

            if (
                fileNameElement
            ) {

                fileNameElement.textContent =
                    "No toolkit available";

            }


            if (
                descriptionElement
            ) {

                descriptionElement.textContent =
                    "No toolkit has been uploaded for your registered event and domain.";

            }


            if (
                downloadButton
            ) {

                downloadButton.classList.add(
                    "disabled"
                );

                downloadButton.removeAttribute(
                    "href"
                );

            }


            if (
                emptyState
            ) {

                emptyState.textContent =
                    "Toolkit is currently unavailable.";

            }


            return;

        }


        /* =================================================
           TOOLKIT FOUND
           ================================================= */

        const firstFile =
            files[0];


        toolkitState = {

            available:
                true,

            filename:
                firstFile.filename ||
                firstFile.name ||
                "Toolkit",

            description:
                firstFile.description ||
                "Admin-uploaded toolkit for your registered event and domain.",

            downloadUrl:
                firstFile.download_url ||
                firstFile.url ||
                "",

            files:
                files

        };


        console.log(
            "TOOLKIT FOUND:",
            toolkitState
        );


        /* =================================================
           UPDATE FILE NAME
           ================================================= */

        if (
            fileNameElement
        ) {

            if (
                files.length === 1
            ) {

                fileNameElement.textContent =
                    toolkitState.filename;

            }

            else {

                fileNameElement.textContent =
                    files.length +
                    " toolkit files available";

            }

        }


        /* =================================================
           UPDATE DESCRIPTION
           ================================================= */

        if (
            descriptionElement
        ) {

            descriptionElement.textContent =
                toolkitState.description;

        }


        /* =================================================
           ENABLE DOWNLOAD BUTTON
           ================================================= */

        if (
            downloadButton
        ) {

            downloadButton.classList.remove(
                "disabled"
            );


            if (
                toolkitState.downloadUrl
            ) {

                downloadButton.href =
                    toolkitState.downloadUrl;

                downloadButton.target =
                    "_self";

                downloadButton.removeAttribute(
                    "aria-disabled"
                );

            }

        }


        /* =================================================
           UPDATE EMPTY STATE
           ================================================= */

        if (
            emptyState
        ) {

            emptyState.textContent =
                "Toolkit available for your registered event and domain.";

        }

    }

    catch (error) {

        console.error(
            "TOOLKIT LOAD ERROR:",
            error
        );


        if (
            fileNameElement
        ) {

            fileNameElement.textContent =
                "No toolkit available";

        }


        if (
            descriptionElement
        ) {

            descriptionElement.textContent =
                "Toolkit information could not be loaded.";

        }


        if (
            downloadButton
        ) {

            downloadButton.classList.add(
                "disabled"
            );

            downloadButton.removeAttribute(
                "href"
            );

        }


        if (
            emptyState
        ) {

            emptyState.textContent =
                "Toolkit is currently unavailable.";

        }

    }

}


/* =========================================================
   TOOLKIT DOWNLOAD
   ========================================================= */

function setupToolkitDownload() {

    const button =
        document.getElementById(
            "downloadToolkitBtn"
        );


    if (
        !button
    ) {

        return;

    }


    button.addEventListener(
        "click",
        function (event) {

            if (
                button.classList.contains(
                    "disabled"
                )
            ) {

                event.preventDefault();

                return;

            }


            /*
             * If the backend supplied a
             * download URL, allow the browser
             * to perform the actual download.
             */

            if (
                button.href &&
                button.href !==
                window.location.href + "#"
            ) {

                return;

            }


            /*
             * Fallback for a malformed
             * toolkit response.
             */

            event.preventDefault();


            if (
                !toolkitState.available
            ) {

                alert(
                    "Toolkit is not available."
                );

                return;

            }


            if (
                toolkitState.downloadUrl
            ) {

                window.location.href =
                    toolkitState.downloadUrl;

                return;

            }


            alert(
                "Toolkit download is currently unavailable."
            );

        }
    );

}


/* =========================================================
   UPDATE REGISTRATION DETAILS
   ========================================================= */

function updateRegistrationDetails() {

    setText(
        "detailName",
        userSession.name
    );


    setText(
        "detailEmail",
        userSession.email
    );


    setText(
        "detailEvent",
        getEventName()
    );


    setText(
        "detailDomain",
        domainInfo[
            userSession.domain
        ]?.name ||
        userSession.domain.toUpperCase()
    );

}


/* =========================================================
   UPDATE ACTIVITY
   ========================================================= */

function updateActivity() {

    updateToolkitActivity();

}


/* =========================================================
   UPDATE TOOLKIT ACTIVITY
   ========================================================= */

function updateToolkitActivity() {

    const toolkitActivity =
        document.getElementById(
            "toolkitActivity"
        );


    if (
        !toolkitActivity
    ) {

        return;

    }


    if (
        toolkitState.available
    ) {

        if (
            toolkitState.files.length >
            1
        ) {

            toolkitActivity.textContent =
                toolkitState.files.length +
                " toolkit files are available.";

        }

        else {

            toolkitActivity.textContent =
                toolkitState.filename +
                " is available.";

        }

    }

    else {

        toolkitActivity.textContent =
            "No toolkit is currently available.";

    }

}


/* =========================================================
   SEARCH
   ========================================================= */

function setupSearch() {

    const input =
        document.querySelector(
            ".dashboard-search input"
        );


    if (
        !input
    ) {

        return;

    }


    input.addEventListener(
        "input",
        function () {

            const value =
                input.value
                    .trim()
                    .toLowerCase();


            if (
                !value
            ) {

                clearSearchHighlight();

                return;

            }


            highlightSearchText(
                value
            );

        }
    );

}


/* =========================================================
   SEARCH HIGHLIGHT
   ========================================================= */

function highlightSearchText(
    keyword
) {

    clearSearchHighlight();


    const content =
        document.querySelector(
            ".user-dashboard-content"
        );


    if (
        !content
    ) {

        return;

    }


    const elements =
        content.querySelectorAll(
            "h2, h3, p, strong, span"
        );


    elements.forEach(
        function (element) {

            if (
                element.textContent
                    .toLowerCase()
                    .includes(
                        keyword
                    )
            ) {

                element.style.textShadow =
                    "0 0 8px rgba(229,9,20,.55)";

            }

        }
    );

}


/* =========================================================
   CLEAR SEARCH
   ========================================================= */

function clearSearchHighlight() {

    const elements =
        document.querySelectorAll(
            ".user-dashboard-content h2, " +
            ".user-dashboard-content h3, " +
            ".user-dashboard-content p, " +
            ".user-dashboard-content strong, " +
            ".user-dashboard-content span"
        );


    elements.forEach(
        function (element) {

            element.style.textShadow =
                "";

        }
    );

}


/* =========================================================
   USER LOGOUT
   ========================================================= */

function setupLogout() {

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (
        !logoutButton
    ) {

        console.warn(
            "LOGOUT BUTTON NOT FOUND."
        );

        return;

    }


    logoutButton.addEventListener(
        "click",
        async function () {

            if (
                logoutButton.disabled
            ) {

                return;

            }


            logoutButton.disabled =
                true;


            const event =
                getCurrentEvent();


            let sessionToken =
                "";


            if (
                event === "hackathon"
            ) {

                sessionToken =
                    sessionStorage.getItem(
                        "hackathon_session_token"
                    )

                    ||

                    sessionStorage.getItem(
                        "user_session_token"
                    );

            }

            else {

                sessionToken =
                    sessionStorage.getItem(
                        "workshop_session_token"
                    )

                    ||

                    sessionStorage.getItem(
                        "user_session_token"
                    );

            }


            try {

                if (
                    sessionToken
                ) {

                    const endpoint =
                        event === "hackathon"
                            ? "/api/hackathon/logout"
                            : "/api/workshop/logout";


                    const response =
                        await fetch(
                            endpoint,
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({

                                        session_token:
                                            sessionToken

                                    })

                            }
                        );


                    const data =
                        await response
                            .json()
                            .catch(
                                function () {

                                    return {};

                                }
                            );


                    if (
                        !response.ok
                    ) {

                        console.error(
                            "LOGOUT API ERROR:",
                            data
                        );

                    }

                }

            }

            catch (error) {

                console.error(
                    "LOGOUT REQUEST ERROR:",
                    error
                );

            }

            finally {

                const sessionKeys = [

                    "user_session_token",

                    "workshop_session_token",

                    "workshop_session_id",

                    "hackathon_session_token",

                    "hackathon_team_id",

                    "user_event",

                    "workshop_event",

                    "hackathon_event",

                    "user_domain",

                    "workshop_domain",

                    "workshop_user_domain",

                    "hackathon_domain",

                    "workshop_user_email",

                    "workshop_user_name",

                    "hackathon_team_name",

                    "hackathon_team_email",

                    "user_data",

                    "workshop_user_data",

                    "hackathon_team_data",

                    "user_points",

                    "pending_registered_name",

                    "pending_registered_email"

                ];


                sessionKeys.forEach(
                    function (key) {

                        sessionStorage.removeItem(
                            key
                        );

                    }
                );


                userSession = {

                    name: "",

                    email: "",

                    event: "workshop",

                    domain: "ceh",

                    points: 0,

                    status: "active",

                    userData: null,

                    accountData: null

                };


                toolkitState = {

                    available: false,

                    filename: "",

                    description: "",

                    downloadUrl: "",

                    files: []

                };


                window.location.replace(
                    "/"
                );

            }

        }
    );

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (
        !element
    ) {

        console.warn(
            "DASHBOARD ELEMENT NOT FOUND:",
            id
        );

        return;

    }


    element.textContent =
        value === undefined ||
        value === null
            ? ""
            : String(value);

}


/* =========================================================
   FINAL LOAD MESSAGE
   ========================================================= */

console.log(
    "WAR ROOM USER DASHBOARD JS LOADED"
);