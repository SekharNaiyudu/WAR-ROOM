/* =========================================================
   WAR ROOM
   USER LEADERBOARD
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
        "DIGITAL FORENSICS",

    ceh_hackathon:
        "CEH",

    vapt_hackathon:
        "VAPT",

    soc_hackathon:
        "SOC",

    forensics_hackathon:
        "DIGITAL FORENSICS"

};


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const titleElement =
    document.getElementById(
        "leaderboardTitle"
    );


const subtitleElement =
    document.getElementById(
        "leaderboardSubtitle"
    );


const totalElement =
    document.getElementById(
        "totalCount"
    );


const topScoreElement =
    document.getElementById(
        "topScore"
    );


const domainElement =
    document.getElementById(
        "summaryDomain"
    );


const eventElement =
    document.getElementById(
        "summaryEvent"
    );


const bodyElement =
    document.getElementById(
        "leaderboardBody"
    );


const searchElement =
    document.getElementById(
        "leaderboardSearch"
    );


const refreshButton =
    document.getElementById(
        "refreshLeaderboard"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/* =========================================================
   STATE
   ========================================================= */

let leaderboardRows = [];

let currentEvent = "";

let currentDomain = "";


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
        .toLowerCase();


    return (

        DOMAIN_NAMES[
            normalized
        ]

        ||

        normalized
            .replace(
                "_hackathon",
                ""
            )
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
   GET USER EVENT
   ========================================================= */

function getUserEvent() {

    const event =
        (
            sessionStorage.getItem(
                "user_event"
            )
            ||
            ""
        )
        .trim()
        .toLowerCase();


    if (
        event !== "workshop" &&
        event !== "hackathon"
    ) {

        throw new Error(
            "User event information is missing. Please login again."
        );

    }


    return event;

}


/* =========================================================
   GET USER DOMAIN
   ========================================================= */

function getUserDomain(
    event
) {

    let domain = "";


    if (
        event === "hackathon"
    ) {

        domain =
            (
                sessionStorage.getItem(
                    "hackathon_domain"
                )
                ||
                ""
            )
            .trim()
            .toLowerCase();

    }

    else {

        domain =
            (
                sessionStorage.getItem(
                    "user_domain"
                )
                ||

                sessionStorage.getItem(
                    "workshop_domain"
                )
                ||

                ""
            )
            .trim()
            .toLowerCase();

    }


    if (!domain) {

        throw new Error(
            "User domain information is missing. Please login again."
        );

    }


    return domain;

}


/* =========================================================
   GET SESSION TOKEN
   ========================================================= */

function getSessionToken(
    event
) {

    let token = "";


    if (
        event === "hackathon"
    ) {

        token =
            (
                sessionStorage.getItem(
                    "hackathon_session_token"
                )
                ||

                sessionStorage.getItem(
                    "user_session_token"
                )
                ||

                ""
            )
            .trim();

    }

    else {

        token =
            (
                sessionStorage.getItem(
                    "user_session_token"
                )
                ||

                sessionStorage.getItem(
                    "workshop_session_token"
                )
                ||

                ""
            )
            .trim();

    }


    if (!token) {

        throw new Error(
            "User session is missing. Please login again."
        );

    }


    return token;

}


/* =========================================================
   UPDATE HEADER
   ========================================================= */

function updateHeader() {

    const eventName =
        formatEvent(
            currentEvent
        );


    const domainName =
        formatDomain(
            currentDomain
        );


    if (
        titleElement
    ) {

        titleElement.textContent =
            `${eventName} — ${domainName}`;

    }


    if (
        subtitleElement
    ) {

        subtitleElement.textContent =
            `Ranked participants for the selected ${eventName.toLowerCase()} domain.`;

    }


    if (
        domainElement
    ) {

        domainElement.textContent =
            domainName;

    }


    if (
        eventElement
    ) {

        eventElement.textContent =
            eventName;

    }

}


/* =========================================================
   SHOW TABLE MESSAGE
   ========================================================= */

function showTableMessage(
    message,
    className = "empty-state"
) {

    if (
        !bodyElement
    ) {

        return;

    }


    bodyElement.innerHTML = `

        <tr>

            <td colspan="4">

                <div
                    class="empty-state ${className}"
                >
                    ${escapeHtml(message)}
                </div>

            </td>

        </tr>

    `;

}


/* =========================================================
   RENDER LEADERBOARD
   ========================================================= */

function renderLeaderboard() {

    if (
        !bodyElement
    ) {

        return;

    }


    const keyword =
        (
            searchElement?.value
            ||
            ""
        )
        .trim()
        .toLowerCase();


    const filteredRows =
        leaderboardRows.filter(
            function(row) {

                const text = [

                    row.name,

                    row.domain,

                    String(
                        row.points
                        ??
                        0
                    )

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

        showTableMessage(

            leaderboardRows.length > 0

                ? "No matching participants found."

                : "No approved participants have logged in yet."

        );

        return;

    }


    bodyElement.innerHTML =

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
                        "Participant";


                    const rowDomain =
                        row.domain
                        ||
                        currentDomain;


                    const points =
                        Number(
                            row.points
                            ??
                            0
                        );


                    return `

                        <tr>

                            <td>

                                <span
                                    class="
                                        rank-badge
                                        ${
                                            rank === 1
                                                ? "top"
                                                : ""
                                        }
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

                                ${escapeHtml(
                                    accountName
                                )}

                            </td>


                            <td>

                                <span
                                    class="domain-badge"
                                >
                                    ${escapeHtml(
                                        formatDomain(
                                            rowDomain
                                        )
                                    )}
                                </span>

                            </td>


                            <td>

                                <span
                                    class="points-value"
                                >
                                    ${points.toLocaleString()}
                                </span>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   LOAD USER LEADERBOARD
   ========================================================= */

async function loadLeaderboard() {

    try {

        currentEvent =
            getUserEvent();


        currentDomain =
            getUserDomain(
                currentEvent
            );


        const sessionToken =
            getSessionToken(
                currentEvent
            );


        updateHeader();


        showTableMessage(
            "Loading leaderboard...",
            "loading-state"
        );


        const params =
            new URLSearchParams({

                event:
                    currentEvent,

                domain:
                    currentDomain,

                session_token:
                    sessionToken,

                time:
                    String(
                        Date.now()
                    )

            });


        const response =
            await fetch(
                `/api/user/leaderboard?${params.toString()}`,
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
                ? data.rows
                : [];


        if (
            totalElement
        ) {

            totalElement.textContent =
                Number(
                    data.total
                    ??
                    leaderboardRows.length
                )
                .toLocaleString();

        }


        if (
            topScoreElement
        ) {

            topScoreElement.textContent =
                Number(
                    data.top_score
                    ??
                    0
                )
                .toLocaleString();

        }


        renderLeaderboard();

    }

    catch (
        error
    ) {

        console.error(
            "USER LEADERBOARD ERROR:",
            error
        );


        if (
            error.message.includes(
                "session"
            )
            ||
            error.message.includes(
                "login"
            )
        ) {

            showTableMessage(
                error.message,
                "error-state"
            );

            return;

        }


        showTableMessage(
            error.message
            ||
            "Unable to load leaderboard.",
            "error-state"
        );

    }

}


/* =========================================================
   SEARCH
   ========================================================= */

if (
    searchElement
) {

    searchElement.addEventListener(
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
    refreshButton
) {

    refreshButton.addEventListener(
        "click",
        async function() {

            refreshButton.disabled =
                true;


            try {

                await loadLeaderboard();

            }

            finally {

                refreshButton.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   LOGOUT
   ========================================================= */

if (
    logoutButton
) {

    logoutButton.addEventListener(
        "click",
        async function() {

            let event = "";

            try {

                event =
                    getUserEvent();

            }

            catch {

                window.location.href =
                    "/";

                return;

            }


            const token =
                (
                    event === "hackathon"

                        ?

                        sessionStorage.getItem(
                            "hackathon_session_token"
                        )

                        :

                        sessionStorage.getItem(
                            "user_session_token"
                        )

                )
                ||
                "";


            try {

                if (
                    token
                ) {

                    const endpoint =
                        event === "hackathon"

                            ?

                            "/api/hackathon/logout"

                            :

                            "/api/workshop/logout";


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
                                        token

                                }),

                            credentials:
                                "same-origin"

                        }
                    );

                }

            }

            catch (
                error
            ) {

                console.error(
                    "USER LOGOUT ERROR:",
                    error
                );

            }


            sessionStorage.removeItem(
                "user_session_token"
            );

            sessionStorage.removeItem(
                "workshop_session_token"
            );

            sessionStorage.removeItem(
                "hackathon_session_token"
            );

            sessionStorage.removeItem(
                "user_event"
            );

            sessionStorage.removeItem(
                "user_domain"
            );

            sessionStorage.removeItem(
                "workshop_domain"
            );

            sessionStorage.removeItem(
                "hackathon_domain"
            );

            sessionStorage.removeItem(
                "hackathon_team_id"
            );

            sessionStorage.removeItem(
                "hackathon_team_name"
            );

            sessionStorage.removeItem(
                "user_data"
            );

            sessionStorage.removeItem(
                "hackathon_team_data"
            );


            window.location.href =
                "/";

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadLeaderboard();

    }
);