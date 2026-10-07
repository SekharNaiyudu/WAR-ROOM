/* =========================================================
   WAR ROOM
   ADMIN LEADERBOARD
   ========================================================= */


/* =========================================================
   DOMAIN NAMES
   ========================================================= */

const DOMAIN_NAMES = {

    ceh:
        "CEH",

    vapt:
        "VAPT",

    soc:
        "SOC",

    forensics:
        "DIGITAL FORENSICS"

};


/* =========================================================
   DOM REFERENCES
   ========================================================= */

const pageTitle =
    document.getElementById(
        "pageTitle"
    );


const pageDescription =
    document.getElementById(
        "pageDescription"
    );


const eventCards =
    document.querySelectorAll(
        ".leaderboard-event-card"
    );


const domainCards =
    document.querySelectorAll(
        ".leaderboard-domain-card"
    );


const domainSectionTitle =
    document.getElementById(
        "domainSectionTitle"
    );


const currentEventLabel =
    document.getElementById(
        "currentEventLabel"
    );


const leaderboardTitle =
    document.getElementById(
        "leaderboardTitle"
    );


const leaderboardSubtitle =
    document.getElementById(
        "leaderboardSubtitle"
    );


const totalRanked =
    document.getElementById(
        "totalRanked"
    );


const topScore =
    document.getElementById(
        "topScore"
    );


const selectedDomainStat =
    document.getElementById(
        "selectedDomainStat"
    );


const selectedEventStat =
    document.getElementById(
        "selectedEventStat"
    );


const leaderboardTableBody =
    document.getElementById(
        "leaderboardTableBody"
    );


const participantSearch =
    document.getElementById(
        "participantSearch"
    );


const refreshLeaderboardBtn =
    document.getElementById(
        "refreshLeaderboardBtn"
    );


const leaderboardFooterText =
    document.getElementById(
        "leaderboardFooterText"
    );


const nameColumn =
    document.getElementById(
        "nameColumn"
    );


/* =========================================================
   CURRENT SELECTION
   ========================================================= */

let currentEvent =
    "workshop";


let currentDomain =
    "ceh";


let leaderboardRows =
    [];


/* =========================================================
   FORMAT DOMAIN
   ========================================================= */

function formatDomain(
    domain
) {

    const normalized =
        String(
            domain || ""
        )
        .trim()
        .toLowerCase()
        .replace(
            "_hackathon",
            ""
        );


    return (
        DOMAIN_NAMES[
            normalized
        ]
        ||
        normalized
            .replaceAll(
                "_",
                " "
            )
            .toUpperCase()
    );

}


/* =========================================================
   FORMAT EVENT
   ========================================================= */

function formatEvent(
    event
) {

    return (
        event === "hackathon"
    )
        ? "HACKATHON"
        : "WORKSHOP";

}


/* =========================================================
   API DOMAIN
   ========================================================= */

function getApiDomain() {

    if (
        currentEvent ===
        "hackathon"
    ) {

        return (
            currentDomain +
            "_hackathon"
        );

    }


    return currentDomain;

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================================
   READ URL STATE
   ========================================================= */

function readUrlState() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const event =
        (
            params.get(
                "event"
            )
            ||
            "workshop"
        )
        .trim()
        .toLowerCase();


    let domain =
        (
            params.get(
                "domain"
            )
            ||
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


    if (
        event === "workshop"
        ||
        event === "hackathon"
    ) {

        currentEvent =
            event;

    }

    else {

        currentEvent =
            "workshop";

    }


    if (
        [
            "ceh",
            "vapt",
            "soc",
            "forensics"
        ]
        .includes(
            domain
        )
    ) {

        currentDomain =
            domain;

    }

    else {

        currentDomain =
            "ceh";

    }

}


/* =========================================================
   UPDATE URL
   ========================================================= */

function updateUrl() {

    const params =
        new URLSearchParams();


    params.set(
        "event",
        currentEvent
    );


    params.set(
        "domain",
        getApiDomain()
    );


    window.history.replaceState(
        {},
        "",
        `/admin/leaderboard?${params.toString()}`
    );

}


/* =========================================================
   UPDATE EVENT CARD ACTIVE STATE
   ========================================================= */

function updateEventCards() {

    eventCards.forEach(
        function(card) {

            const event =
                (
                    card.dataset.event
                    ||
                    ""
                )
                .trim()
                .toLowerCase();


            card.classList.toggle(
                "active",
                event === currentEvent
            );

        }
    );

}


/* =========================================================
   UPDATE DOMAIN CARD ACTIVE STATE
   ========================================================= */

function updateDomainCards() {

    domainCards.forEach(
        function(card) {

            const domain =
                (
                    card.dataset.domain
                    ||
                    ""
                )
                .trim()
                .toLowerCase();


            card.classList.toggle(
                "active",
                domain === currentDomain
            );

        }
    );

}


/* =========================================================
   UPDATE PAGE TEXT
   ========================================================= */

function updatePageText() {

    const eventName =
        formatEvent(
            currentEvent
        );


    const domainName =
        formatDomain(
            currentDomain
        );


    /* =====================================================
       MAIN PAGE HEADER
       ===================================================== */

    if (
        pageTitle
    ) {

        pageTitle.textContent =
            "Leaderboard";

    }


    if (
        pageDescription
    ) {

        pageDescription.textContent =
            `View ${eventName} ${domainName} rankings and points.`;

    }


    /* =====================================================
       DOMAIN SECTION
       ===================================================== */

    if (
        domainSectionTitle
    ) {

        domainSectionTitle.textContent =
            `${eventName} DOMAINS`;

    }


    if (
        currentEventLabel
    ) {

        currentEventLabel.textContent =
            eventName;

    }


    /* =====================================================
       LEADERBOARD HEADER
       ===================================================== */

    if (
        leaderboardTitle
    ) {

        leaderboardTitle.textContent =
            `${eventName} — ${domainName}`;

    }


    if (
        leaderboardSubtitle
    ) {

        leaderboardSubtitle.textContent =
            `Ranked participants for the selected ${eventName.toLowerCase()} domain.`;

    }


    /* =====================================================
       STATISTICS
       ===================================================== */

    if (
        selectedDomainStat
    ) {

        selectedDomainStat.textContent =
            domainName;

    }


    if (
        selectedEventStat
    ) {

        selectedEventStat.textContent =
            eventName;

    }

}


/* =========================================================
   SHOW LOADING
   ========================================================= */

function showLoading() {

    if (
        !leaderboardTableBody
    ) {

        return;

    }


    leaderboardTableBody.innerHTML = `

        <tr>

            <td
                colspan="5"
            >

                <div class="leaderboard-empty">
                    Loading leaderboard...
                </div>

            </td>

        </tr>

    `;

}


/* =========================================================
   SHOW MESSAGE
   ========================================================= */

function showMessage(
    message
) {

    if (
        !leaderboardTableBody
    ) {

        return;

    }


    leaderboardTableBody.innerHTML = `

        <tr>

            <td
                colspan="5"
            >

                <div class="leaderboard-empty">
                    ${escapeHtml(message)}
                </div>

            </td>

        </tr>

    `;

}


/* =========================================================
   ADMIN EXTRA POINTS MODAL
   ========================================================= */

let adminPointsModal = null;

let adminPointsModalRow = null;


function ensureAdminPointsModal() {

    if (
        adminPointsModal
        &&
        document.body.contains(
            adminPointsModal
        )
    ) {

        return adminPointsModal;

    }


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "admin-points-modal";


    wrapper.innerHTML = `

        <div
            class="admin-points-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adminPointsModalTitle"
        >

            <div
                class="admin-points-modal-kicker"
            >
                LEADERBOARD / ADMIN ACTION
            </div>


            <div
                class="admin-points-modal-title"
                id="adminPointsModalTitle"
            >
                ADD EXTRA POINTS
            </div>


            <div
                class="admin-points-modal-subtitle"
            >
                Add points for an approved activity outside
                the automatic CTF score. The new total will be
                reflected on both Admin and User leaderboards.
            </div>


            <div
                class="admin-points-account"
            >

                <span>
                    ACCOUNT
                </span>

                <strong
                    id="adminPointsAccountName"
                >
                    Participant
                </strong>

                <div
                    class="admin-points-current"
                >
                    Current Points:
                    <strong
                        id="adminPointsCurrent"
                    >
                        0
                    </strong>
                </div>

            </div>


            <form
                class="admin-points-form"
                id="adminPointsForm"
            >

                <label
                    for="adminPointsInput"
                >
                    EXTRA POINTS TO ADD
                </label>

                <input
                    id="adminPointsInput"
                    class="admin-points-input"
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    inputmode="numeric"
                    placeholder="Example: 25"
                    autocomplete="off"
                    required
                >

                <div
                    class="admin-points-message"
                    id="adminPointsMessage"
                    aria-live="polite"
                ></div>


                <div
                    class="admin-points-modal-actions"
                >

                    <button
                        type="button"
                        class="admin-points-modal-btn admin-points-cancel"
                        id="adminPointsCancel"
                    >
                        CANCEL
                    </button>

                    <button
                        type="submit"
                        class="admin-points-modal-btn admin-points-submit"
                        id="adminPointsSubmit"
                    >
                        ADD POINTS
                    </button>

                </div>

            </form>

        </div>

    `;


    document.body.appendChild(
        wrapper
    );


    adminPointsModal =
        wrapper;


    const cancelButton =
        wrapper.querySelector(
            "#adminPointsCancel"
        );


    const form =
        wrapper.querySelector(
            "#adminPointsForm"
        );


    const input =
        wrapper.querySelector(
            "#adminPointsInput"
        );


    cancelButton.addEventListener(
        "click",
        closeAdminPointsModal
    );


    wrapper.addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                wrapper
            ) {

                closeAdminPointsModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Escape"
                &&
                wrapper.classList.contains(
                    "open"
                )
            ) {

                closeAdminPointsModal();

            }

        }
    );


    form.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            await submitAdminPoints();

        }
    );


    input.addEventListener(
        "input",
        function() {

            const message =
                wrapper.querySelector(
                    "#adminPointsMessage"
                );

            if (message) {

                message.textContent =
                    "";

                message.className =
                    "admin-points-message";

            }

        }
    );


    return wrapper;

}


function closeAdminPointsModal() {

    if (
        !adminPointsModal
    ) {

        return;

    }


    adminPointsModal.classList.remove(
        "open"
    );


    adminPointsModalRow =
        null;

}


function openAdminPointsModal(
    row
) {

    const modal =
        ensureAdminPointsModal();


    adminPointsModalRow =
        row;


    const accountName =
        modal.querySelector(
            "#adminPointsAccountName"
        );


    const currentPoints =
        modal.querySelector(
            "#adminPointsCurrent"
        );


    const input =
        modal.querySelector(
            "#adminPointsInput"
        );


    const message =
        modal.querySelector(
            "#adminPointsMessage"
        );


    const submit =
        modal.querySelector(
            "#adminPointsSubmit"
        );


    if (accountName) {

        accountName.textContent =
            row.name
            ||
            row.account_name
            ||
            row.team_name
            ||
            "Participant";

    }


    if (currentPoints) {

        currentPoints.textContent =
            Number(
                row.points
                ??
                0
            ).toLocaleString();

    }


    if (input) {

        input.value =
            "";

    }


    if (message) {

        message.textContent =
            "";

        message.className =
            "admin-points-message";

    }


    if (submit) {

        submit.disabled =
            false;

        submit.textContent =
            "ADD POINTS";

    }


    modal.classList.add(
        "open"
    );


    window.setTimeout(
        function() {

            if (input) {

                input.focus();

            }

        },
        40
    );

}


async function submitAdminPoints() {

    if (
        !adminPointsModal
        ||
        !adminPointsModalRow
    ) {

        return;

    }


    const row =
        adminPointsModalRow;


    const input =
        adminPointsModal.querySelector(
            "#adminPointsInput"
        );


    const message =
        adminPointsModal.querySelector(
            "#adminPointsMessage"
        );


    const submit =
        adminPointsModal.querySelector(
            "#adminPointsSubmit"
        );


    const rawValue =
        String(
            input?.value
            ||
            ""
        ).trim();


    const addPoints =
        Number(
            rawValue
        );


    if (
        !Number.isInteger(
            addPoints
        )
        ||
        addPoints < 1
        ||
        addPoints > 100000
    ) {

        if (message) {

            message.textContent =
                "Enter a whole number between 1 and 100000.";

            message.className =
                "admin-points-message error";

        }

        input?.focus();

        return;

    }


    if (submit) {

        submit.disabled =
            true;

        submit.textContent =
            "SAVING...";

    }


    if (message) {

        message.textContent =
            "";

        message.className =
            "admin-points-message";

    }


    try {

        const response =
            await fetch(
                "/api/admin/leaderboard/points",
                {

                    method:
                        "POST",

                    credentials:
                        "same-origin",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            event:
                                currentEvent,

                            domain:
                                getApiDomain(),

                            account_type:
                                row.account_type,

                            account_id:
                                Number(
                                    row.id
                                ),

                            add_points:
                                addPoints

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


        if (
            !response.ok
        ) {

            throw new Error(

                data.detail
                ||
                data.message
                ||
                "Unable to update points."

            );

        }


        closeAdminPointsModal();


        await loadLeaderboard();

    }

    catch (
        error
    ) {

        console.error(
            "ADMIN EXTRA POINTS ERROR:",
            error
        );


        if (message) {

            message.textContent =
                error.message
                ||
                "Unable to update points.";

            message.className =
                "admin-points-message error";

        }

        if (submit) {

            submit.disabled =
                false;

            submit.textContent =
                "ADD POINTS";

        }

    }

}


/* =========================================================
   RANKING TIME
   ========================================================= */

function formatRankingTime(value) {

    if (!value) {
        return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    ).format(date);

}


/* =========================================================
   RENDER LEADERBOARD
   ========================================================= */

function renderLeaderboard() {

    if (
        !leaderboardTableBody
    ) {

        return;

    }


    const keyword =
        (
            participantSearch?.value
            ||
            ""
        )
        .trim()
        .toLowerCase();


    const filteredRows =
        leaderboardRows.filter(
            function(row) {

                const name =
                    row.name
                    ||
                    row.account_name
                    ||
                    row.team_name
                    ||
                    "";


                const domain =
                    row.domain
                    ||
                    "";


                const points =
                    row.points
                    ??
                    0;


                const text = [

                    name,

                    domain,

                    points,

                    row.ranking_time

                ]

                    .join(" ")

                    .toLowerCase();


                return (
                    !keyword
                    ||
                    text.includes(
                        keyword
                    )
                );

            }
        );


    if (
        filteredRows.length === 0
    ) {

        showMessage(

            leaderboardRows.length

                ?

                "No matching leaderboard records found."

                :

                "No approved participants or teams have logged in yet."

        );


        if (
            leaderboardFooterText
        ) {

            leaderboardFooterText.textContent =
                "Showing 0 ranked participants";

        }


        return;

    }


    leaderboardTableBody.innerHTML =

        filteredRows

            .map(
                function(
                    row,
                    index
                ) {

                    const rank =
                        index + 1;


                    const accountName =
                        row.name
                        ||
                        row.account_name
                        ||
                        row.team_name
                        ||
                        "Participant";


                    const points =
                        Number(
                            row.points
                            ??
                            0
                        );


                    const rowDomain =
                        formatDomain(
                            row.domain
                            ||
                            getApiDomain()
                        );


                    let rankClass =
                        "";


                    if (
                        rank === 1
                    ) {

                        rankClass =
                            "rank-first";

                    }

                    else if (
                        rank === 2
                    ) {

                        rankClass =
                            "rank-second";

                    }

                    else if (
                        rank === 3
                    ) {

                        rankClass =
                            "rank-third";

                    }


                    return `

                        <tr>

                            <td>

                                <span
                                    class="
                                        rank-badge
                                        ${rankClass}
                                    "
                                >

                                    ${String(
                                        rank
                                    ).padStart(
                                        2,
                                        "0"
                                    )}

                                </span>

                            </td>


                            <td>

                                <strong>

                                    ${escapeHtml(
                                        accountName
                                    )}

                                </strong>

                            </td>


                            <td>

                                <span
                                    class="domain-badge"
                                >

                                    ${escapeHtml(
                                        rowDomain
                                    )}

                                </span>

                            </td>


                            <td>

                                <strong
                                    class="points-value"
                                >

                                    ${points.toLocaleString()}

                                </strong>

                            </td>


                            <td>

                                <span class="ranking-time-value">
                                    ${escapeHtml(
                                        formatRankingTime(
                                            row.ranking_time
                                        )
                                    )}
                                </span>

                            </td>


                            <td>

                                <button
                                    type="button"
                                    class="leaderboard-edit-points-btn"
                                    data-edit-points="true"
                                    data-account-type="${escapeHtml(
                                        row.account_type
                                        ||
                                        ""
                                    )}"
                                    data-account-id="${escapeHtml(
                                        row.id
                                        ??
                                        ""
                                    )}"
                                    title="Add extra points"
                                >
                                    EDIT
                                </button>

                            </td>

                        </tr>

                    `;

                }
            )

            .join("");


    if (
        leaderboardFooterText
    ) {

        leaderboardFooterText.textContent =

            `Showing ${filteredRows.length} ranked participant${
                filteredRows.length === 1
                    ? ""
                    : "s"
            }`;

    }

}


/* =========================================================
   LOAD LEADERBOARD
   ========================================================= */

async function loadLeaderboard() {

    showLoading();


    try {

        updatePageText();


        updateEventCards();


        updateDomainCards();


        const apiDomain =
            getApiDomain();


        const params =
            new URLSearchParams();


        params.set(
            "event",
            currentEvent
        );


        params.set(
            "domain",
            apiDomain
        );


        params.set(
            "time",
            Date.now()
                .toString()
        );


        const response =
            await fetch(
                `/api/admin/leaderboard?${params.toString()}`,
                {

                    method:
                        "GET",

                    credentials:
                        "same-origin",

                    cache:
                        "no-store"

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


        if (
            !response.ok
        ) {

            throw new Error(

                data.detail
                ||
                data.message
                ||
                "Unable to load leaderboard."

            );

        }


        leaderboardRows =
            Array.isArray(
                data.rows
            )

                ?

                data.rows

                :

                [];


        /* =================================================
           TOTAL
           ================================================= */

        if (
            totalRanked
        ) {

            totalRanked.textContent =
                Number(
                    data.total
                    ??
                    leaderboardRows.length
                )
                .toLocaleString();

        }


        /* =================================================
           TOP SCORE
           ================================================= */

        if (
            topScore
        ) {

            topScore.textContent =
                Number(
                    data.top_score
                    ??
                    (
                        leaderboardRows.length
                            ?

                            Math.max(
                                ...leaderboardRows.map(
                                    function(row) {

                                        return Number(
                                            row.points
                                            ??
                                            0
                                        );

                                    }
                                )
                            )

                            :

                            0
                    )
                )
                .toLocaleString();

        }


        renderLeaderboard();

    }

    catch (
        error
    ) {

        console.error(
            "ADMIN LEADERBOARD ERROR:",
            error
        );


        showMessage(
            error.message
            ||
            "Unable to load leaderboard."
        );


        if (
            totalRanked
        ) {

            totalRanked.textContent =
                "0";

        }


        if (
            topScore
        ) {

            topScore.textContent =
                "0";

        }

    }

}


/* =========================================================
   EVENT CARD CLICK
   ========================================================= */

eventCards.forEach(
    function(card) {

        card.addEventListener(
            "click",
            function() {

                const selectedEvent =
                    (
                        card.dataset.event
                        ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if (
                    selectedEvent !==
                    "workshop"
                    &&
                    selectedEvent !==
                    "hackathon"
                ) {

                    return;

                }


                /* =========================================
                   UPDATE CURRENT EVENT
                   ========================================= */

                currentEvent =
                    selectedEvent;


                /*
                   Keep selected domain.

                   Example:
                   Workshop CEH
                   →
                   Hackathon CEH

                   The API conversion happens through
                   getApiDomain().
                */


                updateUrl();


                updateEventCards();


                updateDomainCards();


                updatePageText();


                loadLeaderboard();

            }
        );

    }
);


/* =========================================================
   DOMAIN CARD CLICK
   ========================================================= */

domainCards.forEach(
    function(card) {

        card.addEventListener(
            "click",
            function() {

                const selectedDomain =
                    (
                        card.dataset.domain
                        ||
                        ""
                    )
                    .trim()
                    .toLowerCase();


                if (
                    ![
                        "ceh",
                        "vapt",
                        "soc",
                        "forensics"
                    ]
                    .includes(
                        selectedDomain
                    )
                ) {

                    return;

                }


                currentDomain =
                    selectedDomain;


                updateUrl();


                updateDomainCards();


                updatePageText();


                loadLeaderboard();

            }
        );

    }
);


/* =========================================================
   EDIT POINTS ACTION
   ========================================================= */

if (
    leaderboardTableBody
) {

    leaderboardTableBody.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    "[data-edit-points]"
                );


            if (
                !button
            ) {

                return;

            }


            const accountType =
                String(
                    button.dataset.accountType
                    ||
                    ""
                ).trim();


            const accountId =
                String(
                    button.dataset.accountId
                    ||
                    ""
                ).trim();


            const row =
                leaderboardRows.find(
                    function(item) {

                        return (
                            String(
                                item.account_type
                                ||
                                ""
                            ).trim()
                            ===
                            accountType
                            &&
                            String(
                                item.id
                                ??
                                ""
                            ).trim()
                            ===
                            accountId
                        );

                    }
                );


            if (
                !row
            ) {

                return;

            }


            openAdminPointsModal(
                row
            );

        }
    );

}


/* =========================================================
   SEARCH
   ========================================================= */

if (
    participantSearch
) {

    participantSearch.addEventListener(
        "input",
        function() {

            renderLeaderboard();

        }
    );

}


/* =========================================================
   REFRESH
   ========================================================= */

if (
    refreshLeaderboardBtn
) {

    refreshLeaderboardBtn.addEventListener(
        "click",
        async function() {

            refreshLeaderboardBtn.disabled =
                true;


            const originalText =
                refreshLeaderboardBtn.textContent;


            refreshLeaderboardBtn.textContent =
                "↻ Loading...";


            try {

                await loadLeaderboard();

            }

            finally {

                refreshLeaderboardBtn.disabled =
                    false;

                refreshLeaderboardBtn.textContent =
                    originalText;

            }

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        readUrlState();


        updateUrl();


        updateEventCards();


        updateDomainCards();


        updatePageText();


        loadLeaderboard();

    }
);