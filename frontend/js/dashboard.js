/* =========================================================
   SYNTHOQUEST WAR ROOM
   DASHBOARD.JS
   ========================================================= */


/* =========================================================
   UPDATE SERVER STATE
   ========================================================= */

/* =========================================================
   UPDATE SERVER STATE
   ========================================================= */

async function updateServerState(
    section,
    item,
    enabled
) {

    try {

        /* =====================================================
           NORMALIZE VALUES
           ===================================================== */

        section =
            String(section || "")
                .trim()
                .toLowerCase();

        item =
            String(item || "")
                .trim()
                .toLowerCase();

        enabled =
            Boolean(enabled);


        /* =====================================================
           VALIDATION
           ===================================================== */

        if (!section) {

            throw new Error(
                "State section is missing."
            );

        }


        if (!item) {

            throw new Error(
                "State item is missing."
            );

        }


        /* =====================================================
           DEBUG
           ===================================================== */

        console.log(
            "===================================="
        );

        console.log(
            "WAR ROOM STATE REQUEST"
        );

        console.log(
            "SECTION:",
            section
        );

        console.log(
            "ITEM:",
            item
        );

        console.log(
            "ENABLED:",
            enabled
        );

        console.log(
            "===================================="
        );


        /* =====================================================
           SEND REQUEST TO BACKEND
           ===================================================== */

        const response =
            await fetch(
                "/api/system/state",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        section:
                            section,

                        item:
                            item,

                        enabled:
                            enabled

                    }),

                    cache:
                        "no-store"
                }
            );


        /* =====================================================
           READ RESPONSE
           ===================================================== */

        const data =
            await response
                .json()
                .catch(
                    function () {

                        return {};

                    }
                );


        /* =====================================================
           API ERROR
           ===================================================== */

        if (!response.ok) {

            console.error(
                "===================================="
            );

            console.error(
                "WAR ROOM STATE UPDATE FAILED"
            );

            console.error(
                "HTTP STATUS:",
                response.status
            );

            console.error(
                "RESPONSE:",
                data
            );

            console.error(
                "===================================="
            );


            throw new Error(
                data.detail ||
                data.message ||
                "Failed to update system state."
            );

        }


        /* =====================================================
           SUCCESS
           ===================================================== */

        console.log(
            "===================================="
        );

        console.log(
            "WAR ROOM STATE UPDATED SUCCESSFULLY"
        );

        console.log(
            "SECTION:",
            section
        );

        console.log(
            "ITEM:",
            item
        );

        console.log(
            "ENABLED:",
            enabled
        );

        console.log(
            "SERVER RESPONSE:",
            data
        );

        console.log(
            "===================================="
        );


        return true;


    } catch (error) {

        console.error(
            "STATE UPDATE ERROR:",
            error
        );


        WarRoomAlert(
            error.message ||
            "Unable to update WAR ROOM state."
        );


        return false;

    }

}


/* =========================================================
   LOAD SERVER STATE
   ========================================================= */

async function loadServerState() {

    try {

        const response =
            await fetch(
                "/api/system/state?time=" +
                Date.now(),
                {
                    method: "GET",

                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load system state."
            );

        }


        const state =
            await response.json();


        console.log(
            "CURRENT WAR ROOM STATE:",
            state
        );


        return state;


    } catch (error) {

        console.error(
            "STATE LOAD ERROR:",
            error
        );


        return null;

    }

}


/* =========================================================
   UPDATE ON / OFF TEXT
   ========================================================= */

function updateStateText(
    stateId,
    enabled
) {

    const stateElement =
        document.getElementById(
            stateId
        );


    if (!stateElement) {

        console.warn(
            "State element not found:",
            stateId
        );

        return;

    }


    stateElement.textContent =
        enabled
            ? "ON"
            : "OFF";


    stateElement.classList.toggle(
        "state-off",
        !enabled
    );


    const action =
        stateElement.closest(
            ".control-action"
        );


    if (action) {

        action.classList.toggle(
            "off",
            !enabled
        );

    }

}


/* =========================================================
   CONNECT STATE TOGGLE
   ========================================================= */

function connectStateToggle(
    toggleId,
    stateId,
    section,
    item,
    currentValue
) {

    const toggle =
        document.getElementById(
            toggleId
        );


    if (!toggle) {

        console.warn(
            "Toggle not found:",
            toggleId
        );

        return;

    }


    /* =====================================================
       CURRENT SERVER VALUE
       ===================================================== */

    const actualValue =
        Boolean(
            currentValue
        );


    toggle.checked =
        actualValue;


    updateStateText(
        stateId,
        actualValue
    );


    /* =====================================================
       PREVENT DUPLICATE EVENT LISTENER
       ===================================================== */

    if (
        toggle.dataset.connected ===
        "true"
    ) {

        return;

    }


    toggle.dataset.connected =
        "true";


    /* =====================================================
       CHANGE EVENT
       ===================================================== */

    toggle.addEventListener(
        "change",
        async function () {

            const newValue =
                toggle.checked;


            /* Disable while API request runs */

            toggle.disabled =
                true;


            const success =
                await updateServerState(
                    section,
                    item,
                    newValue
                );


            /* =================================================
               API FAILED
               ================================================= */

            if (!success) {

                toggle.checked =
                    !newValue;


                updateStateText(
                    stateId,
                    !newValue
                );


                toggle.disabled =
                    false;


                return;

            }


            /* =================================================
               API SUCCESS
               ================================================= */

            updateStateText(
                stateId,
                newValue
            );


            toggle.disabled =
                false;


            console.log(
                "STATE CHANGED:",
                section +
                "." +
                item,
                "=",
                newValue
            );

        }
    );

}


/* =========================================================
   HOME EVENT CONTROLS
   ========================================================= */

function initializeHomeEventControls(
    state
) {

    console.log(
        "Initializing Home Event controls..."
    );


    /* =====================================================
       WORKSHOP MAIN EVENT
       ===================================================== */

    connectStateToggle(

        "homeWorkshopToggle",

        "homeWorkshopState",

        "home",

        "workshop",

        state.home?.workshop

    );


    /* =====================================================
       HACKATHON MAIN EVENT
       ===================================================== */

    connectStateToggle(

        "homeHackathonToggle",

        "homeHackathonState",

        "home",

        "hackathon",

        state.home?.hackathon

    );

}


/* =========================================================
   WORKSHOP DOMAIN CONTROLS
   ========================================================= */

function initializeWorkshopControls(
    state
) {

    console.log(
        "Initializing Workshop controls..."
    );


    /* =====================================================
       CEH
       ===================================================== */

    connectStateToggle(

        "homeWorkshopCehToggle",

        "homeWorkshopCehState",

        "home",

        "workshop_ceh",

        state.home?.workshop_ceh

    );


    /* =====================================================
       VAPT
       ===================================================== */

    connectStateToggle(

        "homeWorkshopVaptToggle",

        "homeWorkshopVaptState",

        "home",

        "workshop_vapt",

        state.home?.workshop_vapt

    );


    /* =====================================================
       SOC
       ===================================================== */

    connectStateToggle(

        "homeWorkshopSocToggle",

        "homeWorkshopSocState",

        "home",

        "workshop_soc",

        state.home?.workshop_soc

    );


    /* =====================================================
       DIGITAL FORENSICS
       ===================================================== */

    connectStateToggle(

        "homeWorkshopForensicsToggle",

        "homeWorkshopForensicsState",

        "home",

        "workshop_forensics",

        state.home?.workshop_forensics

    );

}


/* =========================================================
   HACKATHON DOMAIN CONTROLS
   ========================================================= */

function initializeHackathonControls(
    state
) {

    console.log(
        "Initializing Hackathon controls..."
    );


    /* =====================================================
       CEH HACKATHON

       IMPORTANT:
       item MUST be:
       ceh_hackathon

       NOT:
       home
       ===================================================== */

    connectStateToggle(

        "homeHackathonCehToggle",

        "homeHackathonCehState",

        "home",

        "ceh_hackathon",

        state.home?.ceh_hackathon

    );


    /* =====================================================
       VAPT HACKATHON
       ===================================================== */

    connectStateToggle(

        "homeHackathonVaptToggle",

        "homeHackathonVaptState",

        "home",

        "vapt_hackathon",

        state.home?.vapt_hackathon

    );


    /* =====================================================
       SOC HACKATHON
       ===================================================== */

    connectStateToggle(

        "homeHackathonSocToggle",

        "homeHackathonSocState",

        "home",

        "soc_hackathon",

        state.home?.soc_hackathon

    );


    /* =====================================================
       DIGITAL FORENSICS HACKATHON
       ===================================================== */

    connectStateToggle(

        "homeHackathonForensicsToggle",

        "homeHackathonForensicsState",

        "home",

        "forensics_hackathon",

        state.home?.forensics_hackathon

    );

}


/* =========================================================
   LEADERBOARD CONTROLS
   ========================================================= */

function initializeLeaderboardControls(
    state
) {

    console.log(
        "Initializing Leaderboard controls..."
    );


    /* =====================================================
       WORKSHOP LEADERBOARD
       ===================================================== */

    connectStateToggle(

        "workshopLeaderboardToggle",

        "workshopLeaderboardState",

        "leaderboard",

        "workshop",

        state.leaderboard?.workshop

    );


    /* =====================================================
       HACKATHON LEADERBOARD
       ===================================================== */

    connectStateToggle(

        "hackathonLeaderboardToggle",

        "hackathonLeaderboardState",

        "leaderboard",

        "hackathon",

        state.leaderboard?.hackathon

    );


    /* =====================================================
       LEADERBOARD PAGE - WORKSHOP
       ===================================================== */

    connectStateToggle(

        "leaderboardWorkshopToggle",

        "leaderboardWorkshopStatus",

        "leaderboard",

        "workshop",

        state.leaderboard?.workshop

    );


    /* =====================================================
       LEADERBOARD PAGE - HACKATHON
       ===================================================== */

    connectStateToggle(

        "leaderboardHackathonToggle",

        "leaderboardHackathonStatus",

        "leaderboard",

        "hackathon",

        state.leaderboard?.hackathon

    );

}


/* =========================================================
   INITIALIZE ALL HOME CONTROLS
   ========================================================= */

function initializeHomeControls(
    state
) {

    if (!state) {

        console.error(
            "Cannot initialize controls. State missing."
        );

        return;

    }


    initializeHomeEventControls(
        state
    );


    initializeWorkshopControls(
        state
    );


    initializeHackathonControls(
        state
    );


    initializeLeaderboardControls(
        state
    );

}


/* =========================================================
   SIDEBAR NAVIGATION
   ========================================================= */

function setupNavigation() {

    const sidebarItems =
        document.querySelectorAll(
            ".sidebar-item"
        );


    sidebarItems.forEach(
        function (item) {

            item.addEventListener(
                "click",
                function () {

                    const sectionName =
                        item.dataset.section;


                    console.log(
                        "NAVIGATION:",
                        sectionName
                    );


                    /* =============================
                       DASHBOARD
                       ============================= */

                    if (
                        sectionName ===
                        "home"
                    ) {

                        window.location.href =
                            "/admin/dashboard";

                        return;

                    }


                    /* =============================
                       WORKSHOP
                       ============================= */

                    if (
                        sectionName ===
                        "workshop"
                    ) {

                        window.location.href =
                            "/admin/workshop";

                        return;

                    }


                    /* =============================
                       HACKATHON
                       ============================= */

                    if (
                        sectionName ===
                        "hackathon"
                    ) {

                        window.location.href =
                            "/admin/hackathon";

                        return;

                    }


                    /* =============================
                       LEADERBOARD
                       ============================= */

                    if (
                        sectionName ===
                        "leaderboard"
                    ) {

                        window.location.href =
                            "/admin/leaderboard";

                        return;

                    }

                }
            );

        }
    );


    /* =====================================================
       VIEW ALL BUTTONS
       ===================================================== */

    document
        .querySelectorAll(
            ".view-all-btn"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const section =
                            button.dataset.section;


                        if (
                            section ===
                            "workshop"
                        ) {

                            window.location.href =
                                "/admin/workshop";

                        }

                        else if (
                            section ===
                            "hackathon"
                        ) {

                            window.location.href =
                                "/admin/hackathon";

                        }

                    }
                );

            }
        );


    /* =====================================================
       QUICK ACTION BUTTONS
       ===================================================== */

    document
        .querySelectorAll(
            ".quick-action"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const section =
                            button.dataset.section;


                        if (
                            section ===
                            "workshop"
                        ) {

                            window.location.href =
                                "/admin/workshop";

                        }

                        else if (
                            section ===
                            "hackathon"
                        ) {

                            window.location.href =
                                "/admin/hackathon";

                        }

                        else if (
                            section ===
                            "leaderboard"
                        ) {

                            window.location.href =
                                "/admin/leaderboard";

                        }

                    }
                );

            }
        );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    const logoutBtn =
        document.getElementById(
            "logoutBtn"
        );


    if (!logoutBtn) {

        return;

    }


    if (
        logoutBtn.dataset.connected ===
        "true"
    ) {

        return;

    }


    logoutBtn.dataset.connected =
        "true";


    logoutBtn.addEventListener(
        "click",
        function () {

            window.location.href =
                "/admin";

        }
    );

}


/* =========================================================
   WORKSHOP MANAGEMENT
   ========================================================= */

function initializeWorkshopManagement() {

    const domains = [

        "ceh",

        "vapt",

        "soc",

        "forensics"

    ];


    domains.forEach(
        function (domain) {

            const toolkitButton =
                document.querySelector(
                    `[data-action="toolkit"][data-domain="${domain}"]`
                );


            if (toolkitButton) {

                if (
                    toolkitButton.dataset.connected ===
                    "true"
                ) {

                    return;

                }


                toolkitButton.dataset.connected =
                    "true";


                toolkitButton.addEventListener(
                    "click",
                    function () {

                        openToolkitManager(
                            "workshop",
                            domain
                        );

                    }
                );

            }

        }
    );

}


/* =========================================================
   HACKATHON MANAGEMENT
   ========================================================= */

function initializeHackathonManagement() {

    const challengeList =
        document.getElementById(
            "challengeList"
        );


    if (!challengeList) {

        return;

    }


    const toolkitButtons =
        challengeList.querySelectorAll(
            '[data-action="toolkit"]'
        );


    toolkitButtons.forEach(
        function (button) {

            const challenge =
                button.dataset.challenge;


            if (!challenge) {

                return;

            }


            if (
                button.dataset.connected ===
                "true"
            ) {

                return;

            }


            button.dataset.connected =
                "true";


            button.addEventListener(
                "click",
                function () {

                    openToolkitManager(
                        "hackathon",
                        challenge
                    );

                }
            );

        }
    );


    setupAddChallenge();

}


/* =========================================================
   OPEN TOOLKIT MANAGER
   ========================================================= */

function openToolkitManager(
    section,
    item
) {

    const modal =
        document.getElementById(
            "toolkitModal"
        );


    const modalTitle =
        modal?.querySelector(
            "h2"
        );


    const modalTarget =
        document.getElementById(
            "toolkitTarget"
        );


    if (!modal) {

        WarRoomAlert(
            "Toolkit manager UI is not available."
        );

        return;

    }


    if (modalTitle) {

        modalTitle.textContent =
            formatManagementName(
                item
            ) +
            " — ADD TOOL KIT";

    }


    if (modalTarget) {

        modalTarget.value =
            section +
            ":" +
            item;

    }


    modal.classList.add(
        "active"
    );

}


/* =========================================================
   CLOSE TOOLKIT MANAGER
   ========================================================= */

function closeToolkitManager() {

    const modal =
        document.getElementById(
            "toolkitModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


/* =========================================================
   ADD CHALLENGE
   ========================================================= */

function setupAddChallenge() {

    const addButton =
        document.getElementById(
            "addChallengeBtn"
        );


    if (!addButton) {

        return;

    }


    if (
        addButton.dataset.connected ===
        "true"
    ) {

        return;

    }


    addButton.dataset.connected =
        "true";


    addButton.addEventListener(
        "click",
        function () {

            WarRoomAlert(
                "Challenge creation backend will be connected next."
            );

        }
    );

}


/* =========================================================
   FORMAT MANAGEMENT NAME
   ========================================================= */

function formatManagementName(
    value
) {

    if (!value) {

        return "";

    }


    return value

        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )

        .replace(
            /[_-]/g,
            " "
        )

        .toUpperCase();

}


/* =========================================================
   TOOLKIT MODAL
   ========================================================= */

function setupToolkitModal() {

    const closeButton =
        document.getElementById(
            "closeToolkitModal"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeToolkitManager
        );

    }


    const modal =
        document.getElementById(
            "toolkitModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    closeToolkitManager();

                }

            }
        );

    }


    const form =
        document.getElementById(
            "toolkitForm"
        );


    if (!form) {

        return;

    }


    if (
        form.dataset.connected ===
        "true"
    ) {

        return;

    }


    form.dataset.connected =
        "true";


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const target =
                document.getElementById(
                    "toolkitTarget"
                )?.value;


            const toolName =
                document.getElementById(
                    "toolName"
                )?.value
                ?.trim();


            const toolFile =
                document.getElementById(
                    "toolFile"
                )?.files?.[0];


            /* =================================================
               VALIDATION
               ================================================= */

            if (!target) {

                WarRoomAlert(
                    "Toolkit target is missing."
                );

                return;

            }


            if (!toolName) {

                WarRoomAlert(
                    "Enter tool name."
                );

                return;

            }


            if (!toolFile) {

                WarRoomAlert(
                    "Please select a tool file."
                );

                return;

            }


            /* =================================================
               TARGET
               ================================================= */

            const parts =
                target.split(":");


            const eventType =
                parts[0];


            const item =
                parts[1];


            if (
                !eventType ||
                !item
            ) {

                WarRoomAlert(
                    "Invalid toolkit target."
                );

                return;

            }


            /* =================================================
               FORM DATA
               ================================================= */

            const formData =
                new FormData();


            formData.append(
                "file",
                toolFile
            );


            try {

                const response =
                    await fetch(

                        `/api/toolkit/upload?event_type=${encodeURIComponent(eventType)}&item=${encodeURIComponent(item)}`,

                        {

                            method:
                                "POST",

                            body:
                                formData

                        }

                    );


                const data =
                    await response
                        .json()
                        .catch(
                            function () {

                                return null;

                            }
                        );


                if (!response.ok) {

                    throw new Error(

                        data?.detail ||

                        "Toolkit upload failed."

                    );

                }


                console.log(
                    "TOOLKIT UPLOAD:",
                    data
                );


                WarRoomAlert(
                    "Toolkit uploaded successfully."
                );


                closeToolkitManager();


            } catch (error) {

                console.error(
                    "TOOLKIT UPLOAD ERROR:",
                    error
                );


                WarRoomAlert(
                    error.message ||
                    "Toolkit upload failed."
                );

            }

        }
    );

}


/* =========================================================
   INITIALIZE DASHBOARD
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "===================================="
        );

        console.log(
            "WAR ROOM ADMIN DASHBOARD"
        );

        console.log(
            "===================================="
        );


        /* =====================================================
           NAVIGATION
           ===================================================== */

        setupNavigation();


        /* =====================================================
           LOGOUT
           ===================================================== */

        setupLogout();


        /* =====================================================
           TOOLKIT MODAL
           ===================================================== */

        setupToolkitModal();


        /* =====================================================
           WORKSHOP MANAGEMENT
           ===================================================== */

        initializeWorkshopManagement();


        /* =====================================================
           HACKATHON MANAGEMENT
           ===================================================== */

        initializeHackathonManagement();


        /* =====================================================
           LOAD CURRENT SERVER STATE
           ===================================================== */

        const state =
            await loadServerState();


        if (!state) {

            console.error(
                "WAR ROOM STATE NOT AVAILABLE."
            );

            return;

        }


        /* =====================================================
           INITIALIZE ALL CONTROLS
           ===================================================== */

        initializeHomeControls(
            state
        );


        console.log(
            "===================================="
        );

        console.log(
            "WAR ROOM ADMIN CONTROL READY"
        );

        console.log(
            "===================================="

        );

    }
);