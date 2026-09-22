/* =========================================================
   WAR ROOM
   HACKATHON MANAGEMENT
   HACKATHON.JS
   ========================================================= */


/* =========================================================
   CURRENT DOMAIN
   ========================================================= */

let selectedDomain = "ceh_hackathon";


/* =========================================================
   DOMAIN INFORMATION
   ========================================================= */

const domainInfo = {

    ceh_hackathon: {
        name: "CEH HACKATHON",
        title: "CEH Hackathon"
    },

    vapt_hackathon: {
        name: "VAPT HACKATHON",
        title: "VAPT Hackathon"
    },

    soc_hackathon: {
        name: "SOC HACKATHON",
        title: "SOC Hackathon"
    },

    forensics_hackathon: {
        name: "DIGITAL FORENSICS HACKATHON",
        title: "Digital Forensics Hackathon"
    }

};


/* =========================================================
   PARTICIPANT DATA
   ========================================================= */

let allTeams = [];

let filteredTeams = [];


/* =========================================================
   NAVIGATION
   ========================================================= */

function goToPage(url) {

    window.location.href = url;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value ?? "";

    return div.innerHTML;

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatRegisteredDate(value) {

    if (!value) {

        return "-";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return escapeHtml(value);

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   FORMAT STATUS
   ========================================================= */

function formatStatus(status) {

    if (!status) {

        return "Registered";

    }


    const value =
        String(status);


    return (
        value.charAt(0).toUpperCase() +
        value.slice(1).toLowerCase()
    );

}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(status) {

    const value =
        String(status || "")
            .toLowerCase();


    if (
        value === "registered" ||
        value === "active"
    ) {

        return "status-active";

    }


    if (
        value === "completed"
    ) {

        return "status-completed";

    }


    if (
        value === "inactive" ||
        value === "disabled"
    ) {

        return "status-inactive";

    }


    return "status-default";

}


/* =========================================================
   SELECT DOMAIN
   ========================================================= */

function selectDomain(domain) {

    if (
        !domainInfo[domain]
    ) {

        return;

    }


    selectedDomain =
        domain;


    /* =====================================================
       ACTIVE DOMAIN CARD
       ===================================================== */

    document
        .querySelectorAll(
            ".hackathon-domain-card, .domain-tab"
        )
        .forEach(
            function(card) {

                card.classList.toggle(
                    "active",
                    card.dataset.domain ===
                    domain
                );

            }
        );


    /* =====================================================
       SELECTED DOMAIN TEXT
       ===================================================== */

    const selectedDomainText =
        document.getElementById(
            "selectedDomainText"
        );


    if (selectedDomainText) {

        selectedDomainText.textContent =
            domainInfo[domain].name;

    }


    /* =====================================================
       DOMAIN CODE
       ===================================================== */

    const domainCode =
        document.getElementById(
            "domainCode"
        );


    if (domainCode) {

        domainCode.textContent =
            domainInfo[domain].name;

    }


    /* =====================================================
       DOMAIN TITLE
       ===================================================== */

    const domainTitle =
        document.getElementById(
            "domainTitle"
        );


    if (domainTitle) {

        domainTitle.textContent =
            domainInfo[domain].title;

    }


    /* =====================================================
       PARTICIPANT TITLE
       ===================================================== */

    const participantsTitle =
        document.getElementById(
            "participantsTitle"
        );


    if (participantsTitle) {

        participantsTitle.textContent =
            domainInfo[domain].title +
            " — Registered Teams";

    }


    /* =====================================================
       TOOLKIT LOCATION
       ===================================================== */

    const toolkitLocation =
        document.getElementById(
            "toolkitLocation"
        );


    if (toolkitLocation) {

        toolkitLocation.textContent =
            "hackathon / " +
            selectedDomain;

    }


    const toolkitPath =
        document.getElementById(
            "toolkitPath"
        );


    if (toolkitPath) {

        toolkitPath.textContent =
            "hackathon / " +
            selectedDomain;

    }


    /* =====================================================
       CLEAR SEARCH
       ===================================================== */

    const search =
        document.getElementById(
            "participantSearch"
        );


    if (search) {

        search.value = "";

    }


    /* =====================================================
       LOAD DATA
       ===================================================== */

    loadToolkits();

    loadParticipants();

}


/* =========================================================
   SETUP DOMAIN CARDS
   ========================================================= */

function setupDomainCards() {

    document
        .querySelectorAll(
            ".hackathon-domain-card, .domain-tab"
        )
        .forEach(
            function(card) {

                card.addEventListener(
                    "click",
                    function() {

                        const domain =
                            card.dataset.domain;


                        if (!domain) {

                            return;

                        }


                        selectDomain(
                            domain
                        );

                    }
                );

            }
        );

}


/* =========================================================
   FILE INPUT
   ========================================================= */

function setupFileInput() {

    const browseButton =
        document.getElementById(
            "browseFileBtn"
        );


    const oldBrowseButton =
        document.getElementById(
            "browseButton"
        );


    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    if (!fileInput) {

        return;

    }


    const button =
        browseButton ||
        oldBrowseButton;


    if (button) {

        button.addEventListener(
            "click",
            function() {

                fileInput.click();

            }
        );

    }

}


/* =========================================================
   SHOW FILE NAME
   ========================================================= */

function updateSelectedFileName(
    fileName
) {

    const element =
        document.getElementById(
            "fileName"
        );


    const oldElement =
        document.getElementById(
            "selectedFileName"
        );


    const target =
        element ||
        oldElement;


    if (target) {

        target.textContent =
            fileName ||
            "No file selected";

    }

}


/* =========================================================
   PROCESS SELECTED FILE
   ========================================================= */

async function processSelectedFile(
    file
) {

    if (!file) {

        return;

    }


    /* =====================================================
       ZIP VALIDATION
       ===================================================== */

    if (
        !file.name
            .toLowerCase()
            .endsWith(".zip")
    ) {

        WarRoomAlert(
            "Only ZIP files are allowed."
        );


        const fileInput =
            document.getElementById(
                "toolkitFile"
            );


        if (fileInput) {

            fileInput.value = "";

        }


        updateSelectedFileName(
            "No file selected"
        );


        return;

    }


    updateSelectedFileName(
        file.name
    );


    /* =====================================================
       CONFIRM
       ===================================================== */

    const confirmed =
        await WarRoomConfirm(
            `Upload ${file.name} to ${domainInfo[selectedDomain].name}?`
        );


    if (!confirmed) {

        const fileInput =
            document.getElementById(
                "toolkitFile"
            );


        if (fileInput) {

            fileInput.value = "";

        }


        updateSelectedFileName(
            "No file selected"
        );


        return;

    }


    await uploadToolkit();

}


/* =========================================================
   DRAG AND DROP
   ========================================================= */

function setupDropZone() {

    const dropZone =
        document.getElementById(
            "uploadDropZone"
        );


    const oldDropZone =
        document.getElementById(
            "dropZone"
        );


    const zone =
        dropZone ||
        oldDropZone;


    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    if (
        !zone ||
        !fileInput
    ) {

        return;

    }


    /* =====================================================
       DRAG ENTER / OVER
       ===================================================== */

    [
        "dragenter",
        "dragover"

    ].forEach(
        function(eventName) {

            zone.addEventListener(
                eventName,
                function(event) {

                    event.preventDefault();

                    event.stopPropagation();

                    zone.classList.add(
                        "dragging"
                    );

                }
            );

        }
    );


    /* =====================================================
       DRAG LEAVE
       ===================================================== */

    zone.addEventListener(
        "dragleave",
        function(event) {

            event.preventDefault();

            event.stopPropagation();

            zone.classList.remove(
                "dragging"
            );

        }
    );


    /* =====================================================
       DROP
       ===================================================== */

    zone.addEventListener(
        "drop",
        async function(event) {

            event.preventDefault();

            event.stopPropagation();


            zone.classList.remove(
                "dragging"
            );


            const files =
                event.dataTransfer.files;


            if (
                !files ||
                !files.length
            ) {

                return;

            }


            const file =
                files[0];


            try {

                const dataTransfer =
                    new DataTransfer();


                dataTransfer.items.add(
                    file
                );


                fileInput.files =
                    dataTransfer.files;


            } catch (error) {

                console.error(
                    "DATA TRANSFER ERROR:",
                    error
                );

            }


            await processSelectedFile(
                file
            );

        }
    );

}


/* =========================================================
   UPLOAD TOOLKIT
   ========================================================= */

async function uploadToolkit() {

    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    const file =
        fileInput?.files?.[0];


    if (!file) {

        WarRoomAlert(
            "Please select a ZIP toolkit."
        );

        return;

    }


    if (
        !file.name
            .toLowerCase()
            .endsWith(".zip")
    ) {

        WarRoomAlert(
            "Only ZIP files are allowed."
        );

        return;

    }


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                `/api/toolkit/upload?event_type=hackathon&item=${encodeURIComponent(selectedDomain)}`,
                {
                    method: "POST",
                    body: formData
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
                "Toolkit upload failed."
            );

        }


        console.log(
            "HACKATHON TOOLKIT UPLOADED:",
            data
        );


        WarRoomAlert(
            `${domainInfo[selectedDomain].name} toolkit uploaded successfully.`
        );


        fileInput.value = "";


        updateSelectedFileName(
            "No file selected"
        );


        await loadToolkits();


    } catch (error) {

        console.error(
            "HACKATHON TOOLKIT UPLOAD ERROR:",
            error
        );


        WarRoomAlert(
            error.message ||
            "Toolkit upload failed."
        );

    }

}


/* =========================================================
   LOAD TOOLKITS
   ========================================================= */

/* =========================================================
   LOAD TOOLKITS
   ========================================================= */

async function loadToolkits() {

    const list =
        document.getElementById(
            "recentUploadList"
        );


    if (!list) {

        return;

    }


    list.innerHTML = `
        <div class="empty-toolkit">
            Loading toolkit files...
        </div>
    `;


    try {

        const response =
            await fetch(
                `/api/toolkit/hackathon/${encodeURIComponent(selectedDomain)}?time=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
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
                "Unable to load toolkit files."
            );

        }


        const files =
            data.files || [];


        /* =====================================================
           TOOLKIT COUNT
           ===================================================== */

        const summary =
            document.getElementById(
                "domainToolkitSummary"
            );


        if (summary) {

            const strong =
                summary.querySelector(
                    "strong"
                );


            if (strong) {

                strong.textContent =
                    files.length;

            }

        }


        /* =====================================================
           NO FILES
           ===================================================== */

        if (!files.length) {

            list.innerHTML = `
                <div class="empty-toolkit">
                    No toolkit uploaded yet.
                </div>
            `;

            return;

        }


        /* =====================================================
           CLEAR
           ===================================================== */

        list.innerHTML = "";


        /* =====================================================
           FILE LIST
           ===================================================== */

        files.forEach(
            function(file) {

                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "toolkit-file";


                row.innerHTML = `

                    <div class="toolkit-file-info">

                        <strong>
                            ${escapeHtml(
                                file.filename
                            )}
                        </strong>

                        <small>
                            ${escapeHtml(
                                domainInfo[
                                    selectedDomain
                                ].name
                            )}
                        </small>

                    </div>


                    <div class="toolkit-file-actions">

                        <a
                            class="toolkit-file-download"
                            href="${encodeURI(
                                file.download_url
                            )}"
                            download
                        >
                            DOWNLOAD
                        </a>


                        <button
                            type="button"
                            class="toolkit-file-delete"
                            data-filename="${escapeHtml(
                                file.filename
                            )}"
                        >
                            DELETE
                        </button>

                    </div>

                `;


                list.appendChild(
                    row
                );

            }
        );


        /* =====================================================
           DELETE TOOLKIT BUTTONS
           ===================================================== */

        list
            .querySelectorAll(
                ".toolkit-file-delete"
            )
            .forEach(
                function(button) {

                    button.addEventListener(
                        "click",
                        async function() {

                            const filename =
                                button.dataset.filename;


                            if (!filename) {

                                return;

                            }


                            const confirmed =
                                await WarRoomConfirm(
                                    `Delete "${filename}" from ${domainInfo[selectedDomain].name}?`
                                );


                            if (!confirmed) {

                                return;

                            }


                            try {

                                button.disabled =
                                    true;


                                button.textContent =
                                    "DELETING...";


                                const response =
                                    await fetch(
                                        `/api/toolkit/hackathon/${encodeURIComponent(selectedDomain)}/${encodeURIComponent(filename)}`,
                                        {
                                            method:
                                                "DELETE"
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
                                        "Unable to delete toolkit."
                                    );

                                }


                                WarRoomAlert(
                                    "Toolkit deleted successfully."
                                );


                                await loadToolkits();


                            } catch (error) {

                                console.error(
                                    "HACKATHON TOOLKIT DELETE ERROR:",
                                    error
                                );


                                WarRoomAlert(
                                    error.message ||
                                    "Unable to delete toolkit."
                                );


                                button.disabled =
                                    false;


                                button.textContent =
                                    "DELETE";

                            }

                        }
                    );

                }
            );


    } catch (error) {

        console.error(
            "HACKATHON TOOLKIT LOAD ERROR:",
            error
        );


        list.innerHTML = `
            <div class="empty-toolkit">
                Unable to load toolkit files.
            </div>
        `;

    }

}


/* =========================================================
   LOAD REGISTERED HACKATHON TEAMS
   ========================================================= */

async function loadParticipants() {

    const tableBody =
        document.getElementById(
            "participantsTableBody"
        );


    if (!tableBody) {

        return;

    }


    tableBody.innerHTML = `
        <tr>
            <td colspan="7">
                <div class="empty-participants">
                    Loading registered teams...
                </div>
            </td>
        </tr>
    `;


    try {

        /* =================================================
           CORRECT BACKEND ENDPOINT
           =================================================

           GET
           /api/hackathon/{domain}/participants

           Example:

           /api/hackathon/ceh_hackathon/participants

           ================================================= */

        const response =
            await fetch(
                `/api/hackathon/${encodeURIComponent(selectedDomain)}/participants?time=${Date.now()}`,
                {
                    method: "GET",
                    cache: "no-store"
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
                "Unable to load registered teams."
            );

        }


        /* =================================================
           BACKEND RESPONSE
           =================================================

           {
               success: true,
               domain: "...",
               total: 1,
               participants: [...]
           }

           ================================================= */

        const teams =
            data.participants || [];


        allTeams =
            Array.isArray(
                teams
            )
                ? teams
                : [];


        filteredTeams =
            [...allTeams];


        /* =================================================
           UPDATE STATISTICS
           ================================================= */

        updateParticipantStatistics(
            allTeams,
            data.stats
        );


        /* =================================================
           UPDATE TABLE HEADER
           ================================================= */

        updateParticipantTableHeader();


        /* =================================================
           RENDER
           ================================================= */

        renderParticipants();


    } catch (error) {

        console.error(
            "HACKATHON TEAM LOAD ERROR:",
            error
        );


        allTeams = [];

        filteredTeams = [];


        updateParticipantStatistics(
            [],
            null
        );


        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-participants">
                        Unable to load registered teams.
                    </div>
                </td>
            </tr>
        `;

    }

}


/* =========================================================
   UPDATE PARTICIPANT TABLE HEADER
   ========================================================= */

function updateParticipantTableHeader() {

    const table =
        document.querySelector(
            ".participants-table"
        );


    if (!table) {

        return;

    }


    const thead =
        table.querySelector(
            "thead"
        );


    if (!thead) {

        return;

    }


    thead.innerHTML = `

        <tr>

            <th>
                #
            </th>

            <th>
                Team Name
            </th>

            <th>
                Email
            </th>

            <th>
                Team Members
            </th>

            <th>
                Registered On
            </th>

            <th>
                Status
            </th>

            <th>
                Action
            </th>

        </tr>

    `;

}


/* =========================================================
   UPDATE PARTICIPANT STATISTICS
   ========================================================= */

function updateParticipantStatistics(
    teams,
    stats
) {

    const totalElement =
        document.getElementById(
            "totalRegistered"
        );


    const activeElement =
        document.getElementById(
            "activeParticipants"
        );


    const completedElement =
        document.getElementById(
            "completedParticipants"
        );


    const total =
        stats?.total ??
        teams.length;


    const active =
        stats?.active ??
        teams.filter(
            function(team) {

                const status =
                    String(
                        team.status ||
                        "registered"
                    ).toLowerCase();


                return (
                    status === "active" ||
                    status === "registered"
                );

            }
        ).length;


    const completed =
        stats?.completed ??
        teams.filter(
            function(team) {

                return (
                    String(
                        team.status || ""
                    ).toLowerCase()
                    ===
                    "completed"
                );

            }
        ).length;


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (activeElement) {

        activeElement.textContent =
            active;

    }


    if (completedElement) {

        completedElement.textContent =
            completed;

    }

}


/* =========================================================
   RENDER PARTICIPANTS
   ========================================================= */

function renderParticipants() {

    const tableBody =
        document.getElementById(
            "participantsTableBody"
        );


    if (!tableBody) {

        return;

    }


    tableBody.innerHTML = "";


    if (
        !filteredTeams.length
    ) {

        tableBody.innerHTML = `
            <tr>

                <td colspan="7">

                    <div class="empty-participants">
                        No registered teams yet.
                    </div>

                </td>

            </tr>
        `;

        return;

    }


    filteredTeams.forEach(
        function(team, index) {

            const row =
                document.createElement(
                    "tr"
                );


            /* =================================================
               BACKEND FIELD NAMES
               ================================================= */

            const teamName =
                team.team_name ||
                "-";


            const email =
                team.email ||
                "-";


            const memberCount =
                team.team_members_count ??
                (
                    Array.isArray(
                        team.team_members
                    )
                        ? team.team_members.length
                        : 0
                );


            const registeredAt =
                team.registered_at ||
                "-";


            const status =
                team.status ||
                "active";


            /* =================================================
               TABLE ROW
               ================================================= */

            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>

                    <strong>
                        ${escapeHtml(
                            teamName
                        )}
                    </strong>

                </td>


                <td>

                    ${escapeHtml(
                        email
                    )}

                </td>


                <td>

                    <span class="member-count-badge">

                        ${escapeHtml(
                            memberCount
                        )}

                        ${
                            Number(
                                memberCount
                            ) === 1
                                ? " Member"
                                : " Members"
                        }

                    </span>

                </td>


                <td>

                    ${formatRegisteredDate(
                        registeredAt
                    )}

                </td>


                <td>

                    <span
                        class="status-badge ${getStatusClass(
                            status
                        )}"
                    >

                        ${escapeHtml(
                            formatStatus(
                                status
                            )
                        )}

                    </span>

                </td>


                <td>

                    <button
                        type="button"
                        class="participant-action-btn"
                        data-team-id="${escapeHtml(
                            team.id
                        )}"
                    >

                        VIEW

                    </button>

                </td>

            `;


            tableBody.appendChild(
                row
            );


            /* =================================================
               VIEW BUTTON
               ================================================= */

            const actionButton =
                row.querySelector(
                    ".participant-action-btn"
                );


            if (actionButton) {

                actionButton.addEventListener(
                    "click",
                    function() {

                        viewHackathonTeam(
                            team
                        );

                    }
                );

            }

        }
    );

}


/* =========================================================
   VIEW TEAM
   ========================================================= */

function viewHackathonTeam(
    team
) {

    if (!team) {

        return;

    }


    const teamName =
        team.team_name ||
        "-";


    const email =
        team.email ||
        "-";


    const memberCount =
        team.team_members_count ??
        (
            Array.isArray(
                team.team_members
            )
                ? team.team_members.length
                : 0
        );


    const members =
        Array.isArray(
            team.team_members
        )
            ? team.team_members
            : [];


    const registeredAt =
        team.registered_at ||
        "-";


    const status =
        team.status ||
        "active";


    const memberList =
        members.length
            ? members.join("\n")
            : "No member names available.";


    WarRoomAlert(

        "TEAM DETAILS\n\n" +

        "Team Name: " +
        teamName +

        "\n\n" +

        "Team Lead Email: " +
        email +

        "\n\n" +

        "Team Members: " +
        memberCount +

        "\n\n" +

        "Members:\n" +
        memberList +

        "\n\n" +

        "Registered On: " +
        formatRegisteredDate(
            registeredAt
        ) +

        "\n\n" +

        "Status: " +
        formatStatus(
            status
        )

    );

}


/* =========================================================
   SEARCH PARTICIPANTS
   ========================================================= */

function setupSearch() {

    const search =
        document.getElementById(
            "participantSearch"
        );


    if (!search) {

        return;

    }


    search.addEventListener(
        "input",
        function() {

            const keyword =
                search.value
                    .trim()
                    .toLowerCase();


            if (!keyword) {

                filteredTeams =
                    [...allTeams];

                renderParticipants();

                return;

            }


            filteredTeams =
                allTeams.filter(
                    function(team) {

                        const teamName =
                            String(
                                team.team_name ||
                                ""
                            ).toLowerCase();


                        const email =
                            String(
                                team.email ||
                                ""
                            ).toLowerCase();


                        const members =
                            Array.isArray(
                                team.team_members
                            )
                                ? team.team_members
                                    .join(" ")
                                    .toLowerCase()
                                : "";


                        const status =
                            String(
                                team.status ||
                                ""
                            ).toLowerCase();


                        return (

                            teamName.includes(
                                keyword
                            )

                            ||

                            email.includes(
                                keyword
                            )

                            ||

                            members.includes(
                                keyword
                            )

                            ||

                            status.includes(
                                keyword
                            )

                        );

                    }
                );


            renderParticipants();

        }
    );

}


/* =========================================================
   DOWNLOAD REGISTERED TEAMS
   ========================================================= */

function setupDownloadParticipants() {

    const button =
        document.getElementById(
            "downloadParticipantsBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        function() {

            if (
                !allTeams.length
            ) {

                WarRoomAlert(
                    "No registered teams available to download."
                );

                return;

            }


            const rows = [];


            rows.push([

                "S.No",

                "Team Name",

                "Team Lead Email",

                "Team Members Count",

                "Team Members",

                "Registered On",

                "Status",

                "Domain"

            ]);


            allTeams.forEach(
                function(team, index) {

                    const members =
                        Array.isArray(
                            team.team_members
                        )
                            ? team.team_members.join(
                                " | "
                            )
                            : "";


                    const memberCount =
                        team.team_members_count ??
                        (
                            Array.isArray(
                                team.team_members
                            )
                                ? team.team_members.length
                                : ""
                        );


                    rows.push([

                        index + 1,

                        team.team_name ||
                            "",

                        team.email ||
                            "",

                        memberCount,

                        members,

                        team.registered_at ||
                            "",

                        team.status ||
                            "active",

                        selectedDomain

                    ]);

                }
            );


            const csv =
                rows
                    .map(
                        function(row) {

                            return row
                                .map(
                                    function(value) {

                                        return (
                                            '"' +
                                            String(
                                                value
                                            )
                                                .replace(
                                                    /"/g,
                                                    '""'
                                                ) +
                                            '"'
                                        );

                                    }
                                )
                                .join(",");

                        }
                    )
                    .join("\n");


            const blob =
                new Blob(
                    [csv],
                    {
                        type:
                            "text/csv;charset=utf-8;"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                `${selectedDomain}_registered_teams.csv`;


            document.body.appendChild(
                link
            );


            link.click();


            document.body.removeChild(
                link
            );


            URL.revokeObjectURL(
                url
            );

        }
    );

}


/* =========================================================
   UPLOAD BUTTONS
   ========================================================= */

function setupUploadButtons() {

    const uploadSelected =
        document.getElementById(
            "uploadSelectedBtn"
        );


    const uploadFromDomain =
        document.getElementById(
            "uploadFromDomain"
        );


    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    if (
        uploadSelected &&
        fileInput
    ) {

        uploadSelected.addEventListener(
            "click",
            function() {

                fileInput.click();

            }
        );

    }


    if (
        uploadFromDomain &&
        fileInput
    ) {

        uploadFromDomain.addEventListener(
            "click",
            function() {

                fileInput.click();

            }
        );

    }


    if (fileInput) {

        fileInput.addEventListener(
            "change",
            async function() {

                const file =
                    fileInput.files?.[0];


                if (!file) {

                    return;

                }


                await processSelectedFile(
                    file
                );

            }
        );

    }

}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

function setupRefresh() {

    const refreshButton =
        document.getElementById(
            "refreshFilesBtn"
        );


    const oldRefreshButton =
        document.getElementById(
            "refreshToolkit"
        );


    const button =
        refreshButton ||
        oldRefreshButton;


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        async function() {

            await loadToolkits();

            await loadParticipants();

        }
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

function setupLogout() {

    const button =
        document.getElementById(
            "logoutBtn"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        function() {

            window.location.href =
                "/admin";

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "===================================="
        );


        console.log(
            "WAR ROOM HACKATHON MANAGEMENT"
        );


        console.log(
            "===================================="
        );


        /* =====================================================
           SETUP
           ===================================================== */

        setupFileInput();

        setupDropZone();

        setupDomainCards();

        setupUploadButtons();

        setupRefresh();

        setupLogout();

        setupSearch();

        setupDownloadParticipants();


        /* =====================================================
           INITIAL DOMAIN
           ===================================================== */

        selectDomain(
            selectedDomain
        );


        console.log(
            "HACKATHON MANAGEMENT READY"
        );

    }
);


/* =========================================================
   AUTO REFRESH
   ========================================================= */

setInterval(
    function() {

        if (
            document.visibilityState ===
            "visible"
        ) {

            loadToolkits();

            loadParticipants();

        }

    },
    10000
);


/* =========================================================
   PAGE SHOW
   ========================================================= */

window.addEventListener(
    "pageshow",
    function() {

        loadToolkits();

        loadParticipants();

    }
);

