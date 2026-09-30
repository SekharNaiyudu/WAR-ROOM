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
   SHARE YOUR PROGRESS
   ========================================================= */

const openShareProgressButton =
    document.getElementById(
        "openShareProgress"
    );

const shareProgressModal =
    document.getElementById(
        "shareProgressModal"
    );

const closeShareProgressButton =
    document.getElementById(
        "closeShareProgress"
    );

const shareProgressBackdrop =
    document.getElementById(
        "shareProgressBackdrop"
    );

const shareProgressPreview =
    document.getElementById(
        "shareProgressPreview"
    );

const downloadShareImageButton =
    document.getElementById(
        "downloadShareImage"
    );

let shareImageBlob = null;
let shareImageUrl = "";
let shareImageFileName =
    "war-room-progress.png";


/* =========================================================
   CURRENT PARTICIPANT
   ========================================================= */

function getCurrentParticipantName() {

    const storageKeys = [

        "user_data",

        "workshop_user_data",

        "hackathon_team_data"

    ];

    for (
        const key of storageKeys
    ) {

        try {

            const raw =
                sessionStorage.getItem(
                    key
                );

            if (!raw) {
                continue;
            }

            const data =
                JSON.parse(raw);

            const name =
                data.name
                ||
                data.team_name
                ||
                data.account_name
                ||
                "";

            if (name) {
                return String(name);
            }

        }

        catch {

            /* Ignore malformed session data. */

        }

    }


    return (

        sessionStorage.getItem(
            "workshop_user_name"
        )

        ||

        sessionStorage.getItem(
            "hackathon_team_name"
        )

        ||

        "Participant"

    );

}


/* =========================================================
   CURRENT PARTICIPANT ROW
   ========================================================= */

function getCurrentParticipantRow() {

    const participantName =
        getCurrentParticipantName()
            .trim()
            .toLowerCase();

    if (!participantName) {
        return null;
    }

    const index =
        leaderboardRows.findIndex(
            function(row) {

                const rowName =
                    String(
                        row.name
                        ||
                        row.account_name
                        ||
                        row.team_name
                        ||
                        ""
                    )
                    .trim()
                    .toLowerCase();

                return (
                    rowName ===
                    participantName
                );

            }
        );

    if (index === -1) {
        return null;
    }

    return {

        row:
            leaderboardRows[index],

        rank:
            index + 1

    };

}


/* =========================================================
   CANVAS TEXT WRAP
   ========================================================= */

function drawWrappedCanvasText(
    ctx,
    text,
    x,
    y,
    maxWidth,
    lineHeight
) {

    const words =
        String(text).split(" ");

    let line = "";

    for (
        let index = 0;
        index < words.length;
        index += 1
    ) {

        const testLine =
            line
            ? `${line} ${words[index]}`
            : words[index];

        const width =
            ctx.measureText(
                testLine
            ).width;

        if (
            width > maxWidth
            &&
            line
        ) {

            ctx.fillText(
                line,
                x,
                y
            );

            line =
                words[index];

            y +=
                lineHeight;

        }

        else {

            line =
                testLine;

        }

    }

    if (line) {

        ctx.fillText(
            line,
            x,
            y
        );

    }

    return y;

}


/* =========================================================
   BUILD STORY IMAGE
   ========================================================= */

async function buildShareProgressImage() {

    const participant =
        getCurrentParticipantRow();

    const participantName =
        participant?.row?.name
        ||
        participant?.row?.account_name
        ||
        participant?.row?.team_name
        ||
        getCurrentParticipantName();

    const rank =
        participant?.rank
        ||
        "—";

    const points =
        Number(
            participant?.row?.points
            ??
            0
        );

    const eventName =
        formatEvent(
            currentEvent
        );

    const domainName =
        formatDomain(
            currentDomain
        );


    /*
       1080 × 1350 is a portrait social-story
       format and keeps the placement prominent.
    */

    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width = 1080;
    canvas.height = 1350;

    const ctx =
        canvas.getContext(
            "2d"
        );


    /* Background */

    const background =
        ctx.createLinearGradient(
            0,
            0,
            1080,
            1350
        );

    background.addColorStop(
        0,
        "#080808"
    );

    background.addColorStop(
        .55,
        "#120607"
    );

    background.addColorStop(
        1,
        "#050505"
    );

    ctx.fillStyle =
        background;

    ctx.fillRect(
        0,
        0,
        1080,
        1350
    );


    /* Red glow */

    const glow =
        ctx.createRadialGradient(
            540,
            220,
            20,
            540,
            220,
            650
        );

    glow.addColorStop(
        0,
        "rgba(229,9,20,.25)"
    );

    glow.addColorStop(
        1,
        "rgba(229,9,20,0)"
    );

    ctx.fillStyle =
        glow;

    ctx.fillRect(
        0,
        0,
        1080,
        700
    );


    /* Top accent */

    ctx.fillStyle =
        "#e50914";

    ctx.fillRect(
        72,
        72,
        220,
        6
    );


    /* Brand */

    ctx.font =
        "900 28px Arial";

    ctx.fillStyle =
        "#ffffff";

    ctx.fillText(
        "SYNTHO",
        72,
        140
    );

    ctx.fillStyle =
        "#e50914";

    ctx.fillText(
        "QUEST",
        205,
        140
    );


    ctx.font =
        "700 15px Arial";

    ctx.fillStyle =
        "#666666";

    ctx.fillText(
        "WAR ROOM / CYBERSECURITY EVENT PLATFORM",
        72,
        178
    );


    /* Main message */

    ctx.font =
        "900 58px Arial";

    ctx.fillStyle =
        "#ffffff";

    ctx.fillText(
        "I'M ON THE",
        72,
        315
    );

    ctx.fillStyle =
        "#ff2634";

    ctx.fillText(
        "LEADERBOARD.",
        72,
        382
    );


    /* Placement card */

    const cardX = 72;
    const cardY = 455;
    const cardW = 936;
    const cardH = 420;

    ctx.fillStyle =
        "#111111";

    ctx.beginPath();

    ctx.roundRect(
        cardX,
        cardY,
        cardW,
        cardH,
        28
    );

    ctx.fill();


    ctx.strokeStyle =
        "rgba(229,9,20,.42)";

    ctx.lineWidth =
        2;

    ctx.stroke();


    /* Rank */

    ctx.font =
        "900 18px Arial";

    ctx.fillStyle =
        "#666666";

    ctx.fillText(
        "MY PLACEMENT",
        120,
        515
    );


    ctx.font =
        "900 150px Arial";

    ctx.fillStyle =
        "#ff2634";

    ctx.fillText(
        `#${rank}`,
        120,
        670
    );


    /* Participant */

    ctx.font =
        "900 38px Arial";

    ctx.fillStyle =
        "#ffffff";

    const nameY =
        drawWrappedCanvasText(
            ctx,
            participantName,
            120,
            755,
            650,
            48
        );


    /* Meta */

    ctx.font =
        "800 20px Arial";

    ctx.fillStyle =
        "#777777";

    ctx.fillText(
        `${eventName}  •  ${domainName}`,
        120,
        Math.max(
            815,
            nameY + 35
        )
    );


    /* Points block */

    ctx.textAlign =
        "right";

    ctx.font =
        "900 62px Arial";

    ctx.fillStyle =
        "#ffffff";

    ctx.fillText(
        points.toLocaleString(),
        945,
        690
    );

    ctx.font =
        "900 14px Arial";

    ctx.fillStyle =
        "#666666";

    ctx.fillText(
        "POINTS",
        945,
        720
    );

    ctx.textAlign =
        "left";


    /* Footer */

    ctx.font =
        "800 19px Arial";

    ctx.fillStyle =
        "#ffffff";

    ctx.fillText(
        "YOUR CYBERSECURITY PROGRESS",
        72,
        1010
    );

    ctx.font =
        "500 17px Arial";

    ctx.fillStyle =
        "#777777";

    drawWrappedCanvasText(
        ctx,
        "Challenge by challenge. Point by point. Keep climbing the WAR ROOM leaderboard.",
        72,
        1045,
        850,
        29
    );


    /* Bottom CTA */

    ctx.fillStyle =
        "#e50914";

    ctx.beginPath();

    ctx.roundRect(
        72,
        1165,
        360,
        66,
        14
    );

    ctx.fill();

    ctx.font =
        "900 18px Arial";

    ctx.fillStyle =
        "#ffffff";

    ctx.fillText(
        "SHARE YOUR PROGRESS",
        105,
        1207
    );


    ctx.font =
        "700 16px Arial";

    ctx.fillStyle =
        "#555555";

    ctx.fillText(
        "synthoquest.com",
        72,
        1285
    );


    return new Promise(
        function(resolve) {

            canvas.toBlob(
                function(blob) {

                    resolve(blob);

                },
                "image/png",
                1
            );

        }
    );

}


/* =========================================================
   PREPARE SHARE IMAGE
   ========================================================= */

async function prepareShareImage() {

    if (
        shareImageBlob
    ) {

        return shareImageBlob;

    }


    shareImageBlob =
        await buildShareProgressImage();


    if (!shareImageBlob) {

        throw new Error(
            "Unable to create the share image."
        );

    }


    shareImageUrl =
        URL.createObjectURL(
            shareImageBlob
        );


    shareImageFileName =
        `war-room-${currentEvent}-${currentDomain}-rank.png`;


    if (
        shareProgressPreview
    ) {

        shareProgressPreview.src =
            shareImageUrl;

    }


    return shareImageBlob;

}


/* =========================================================
   OPEN SHARE MODAL
   ========================================================= */

async function openShareProgress() {

    if (
        !shareProgressModal
    ) {

        return;

    }


    shareProgressModal.classList.add(
        "open"
    );

    shareProgressModal.setAttribute(
        "aria-hidden",
        "false"
    );


    try {

        await prepareShareImage();

    }

    catch (
        error
    ) {

        console.error(
            "SHARE IMAGE ERROR:",
            error
        );

    }

}


/* =========================================================
   CLOSE SHARE MODAL
   ========================================================= */

function closeShareProgress() {

    if (
        !shareProgressModal
    ) {

        return;

    }


    shareProgressModal.classList.remove(
        "open"
    );

    shareProgressModal.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* =========================================================
   PLATFORM SHARE — WEB
   ========================================================= */

async function copyShareImageToClipboard(blob) {

    /*
       Best-effort copy only. This does NOT download the image.
       If the browser/platform supports pasting an image, the
       generated Story card is already available in the clipboard.
    */

    if (
        !navigator.clipboard
        ||
        typeof ClipboardItem === "undefined"
        ||
        typeof navigator.clipboard.write !== "function"
    ) {

        return false;

    }

    try {

        const item =
            new ClipboardItem({
                "image/png": blob
            });

        await navigator.clipboard.write(
            [item]
        );

        return true;

    }

    catch (error) {

        console.warn(
            "IMAGE CLIPBOARD COPY NOT AVAILABLE:",
            error
        );

        return false;

    }

}


/* =========================================================
   OPEN PLATFORM WEB
   ========================================================= */

function openPlatformWeb(platform) {

    let url = "";

    if (
        platform === "instagram"
    ) {

        url =
            "https://www.instagram.com/";

    }

    else if (
        platform === "whatsapp"
    ) {

        url =
            "https://web.whatsapp.com/";

    }

    if (!url) {

        return;

    }

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}


/* =========================================================
   PLATFORM SHARE
   ========================================================= */

async function shareProgressToPlatform(
    platform
) {

    try {

        const blob =
            await prepareShareImage();


        /*
           Do not download here.
           The Download Story Image button is the separate
           explicit download option.
        */

        await copyShareImageToClipboard(
            blob
        );


        /*
           Open the requested web platform in a new tab.
           A normal web page cannot programmatically inject a
           local Blob into Instagram/WhatsApp's cross-origin
           file picker. The generated image is therefore kept
           in memory and copied to the clipboard when the browser
           permits it, while the platform itself is opened here.
        */

        openPlatformWeb(
            platform
        );

    }

    catch (error) {

        console.error(
            "PLATFORM SHARE ERROR:",
            error
        );

        /* Even if clipboard access is blocked, still open the
           requested platform so the user can continue there. */

        openPlatformWeb(
            platform
        );

    }

}


/* =========================================================
   DOWNLOAD SHARE IMAGE
   ========================================================= */

async function downloadShareProgressImage() {

    try {

        const blob =
            await prepareShareImage();

        const url =
            URL.createObjectURL(
                blob
            );

        const anchor =
            document.createElement(
                "a"
            );

        anchor.href =
            url;

        anchor.download =
            shareImageFileName;

        document.body.appendChild(
            anchor
        );

        anchor.click();

        anchor.remove();

        setTimeout(
            function() {

                URL.revokeObjectURL(
                    url
                );

            },
            1000
        );

    }

    catch (
        error
    ) {

        console.error(
            "DOWNLOAD SHARE IMAGE ERROR:",
            error
        );

    }

}


/* =========================================================
   SHARE EVENTS
   ========================================================= */

if (
    openShareProgressButton
) {

    openShareProgressButton.addEventListener(
        "click",
        openShareProgress
    );

}


if (
    closeShareProgressButton
) {

    closeShareProgressButton.addEventListener(
        "click",
        closeShareProgress
    );

}


if (
    shareProgressBackdrop
) {

    shareProgressBackdrop.addEventListener(
        "click",
        closeShareProgress
    );

}


if (
    downloadShareImageButton
) {

    downloadShareImageButton.addEventListener(
        "click",
        downloadShareProgressImage
    );

}


document
    .querySelectorAll(
        "[data-share-platform]"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    shareProgressToPlatform(
                        button.dataset.sharePlatform
                    );

                }
            );

        }
    );


document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key ===
            "Escape"
        ) {

            closeShareProgress();

        }

    }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadLeaderboard();

    }
);