/* =========================================================
   WAR ROOM — USER CTF
   USERCTF.JS
   DOMAIN-WISE CTF VERSION
   ========================================================= */


/* =========================================================
   CTF EVENT
   ========================================================= */

const CTF_EVENT = "workshop";


/* =========================================================
   DOMAIN CONFIGURATION
   ========================================================= */

const DOMAIN_CONFIG = {

    ceh: {

        title: "CEH",

        displayTitle: "WORKSHOP / CEH",

        description:
            "Workshop · CEH · Capture The Flag",

        submissionTitle:
            "SUBMIT ANSWER",

        submissionLabel:
            "ENTER ANSWER",

        submitButton:
            "SUBMIT ANSWER",

        challengeButton:
            "ENTER KEY",

        challengeLabel:
            "CHALLENGES",

        categories: {

            steganography: {
                title: "STEGANOGRAPHY",
                description:
                    "Hidden data & image-based challenges",
                count: 20
            },

            wireshark: {
                title: "WIRESHARK",
                description:
                    "Network traffic analysis challenges",
                count: 7
            },

            "event-logs": {
                title: "EVENT LOGS",
                description:
                    "Windows event investigation challenges",
                count: 10
            }

        }

    },


    /* =====================================================
       VAPT
       ===================================================== */

    vapt: {

        title: "VAPT",

        displayTitle: "WORKSHOP / VAPT",

        description:
            "Workshop · VAPT · Capture The Flag",

        submissionTitle:
            "SUBMIT THE FLAG",

        submissionLabel:
            "ENTER FLAG",

        submitButton:
            "SUBMIT FLAG",

        challengeButton:
            "SUBMIT THE FLAG",

        challengeLabel:
            "FLAG",

        categories: {

            "test-cases": {
                title: "TEST CASES",
                description:
                    "Application security test case challenges",
                count: 1
            },

            "url-redirection": {
                title: "URL REDIRECTION",
                description:
                    "URL redirection vulnerability challenges",
                count: 1
            },

            "broken-link-hijack": {
                title: "BROKEN LINK HIJACK",
                description:
                    "Broken link hijacking security challenges",
                count: 1
            },

            "file-upload": {
                title: "FILE UPLOAD",
                description:
                    "File upload security challenges",
                count: 1
            },

            "error-bypass": {
                title: "ERROR BYPASS",
                description:
                    "Error handling and bypass challenges",
                count: 1
            }

        }

    }

};


/* =========================================================
   CURRENT USER CTF STATE
   ========================================================= */

let currentDomain = null;

let currentCategory = null;

let currentChallenge = null;

let solvedChallenges = {};

let totalPoints = 0;


/* =========================================================
   SESSION TOKEN
   ========================================================= */

function sessionToken() {

    return (

        sessionStorage.getItem(
            "user_session_token"
        ) ||

        sessionStorage.getItem(
            "workshop_session_token"
        ) ||

        ""

    ).trim();

}


/* =========================================================
   DOM HELPER
   ========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


/* =========================================================
   DOMAIN CONFIG
   ========================================================= */

function getDomainConfig() {

    return (
        DOMAIN_CONFIG[currentDomain] ||
        null
    );

}


/* =========================================================
   CATEGORY CONFIG
   ========================================================= */

function getCategoryConfig(category) {

    const domainConfig =
        getDomainConfig();

    if (!domainConfig) {

        return null;

    }

    return (
        domainConfig.categories[category] ||
        null
    );

}


/* =========================================================
   CATEGORY TITLE
   ========================================================= */

function categoryTitle(category) {

    return (

        getCategoryConfig(category)?.title ||

        String(category || "")
            .toUpperCase()

    );

}


/* =========================================================
   CHALLENGE KEY
   ========================================================= */

function challengeKey(
    category,
    number
) {

    return `${category}-${number}`;

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeCTF();

    }
);


/* =========================================================
   INITIALIZE CTF
   ========================================================= */

async function initializeCTF() {

    bindModalControls();

    bindLogout();


    const token =
        sessionToken();


    if (!token) {

        showPageMessage(
            "User session is missing. Please login again."
        );

        return;

    }


    /*
     * IMPORTANT:
     *
     * Do NOT assume CEH.
     *
     * Backend decides whether the
     * logged-in user is CEH or VAPT.
     */

    const loaded =
        await loadProgress();


    if (!loaded) {

        return;

    }


    renderDomainHeader();

    renderCategoryButtons();

    updateCurrentCategoryHeading();

    renderChallenges();

}


/* =========================================================
   JSON RESPONSE HELPER
   ========================================================= */

async function readJson(response) {

    try {

        return await response.json();

    } catch (_) {

        return {};

    }

}


/* =========================================================
   LOAD CTF PROGRESS
   ========================================================= */

async function loadProgress() {

    const token =
        sessionToken();


    if (!token) {

        showPageMessage(
            "User session is missing. Please login again."
        );

        return false;

    }


    try {

        /*
         * Domain is intentionally NOT trusted
         * from frontend.
         *
         * Backend identifies the user's
         * registered domain from session.
         */

        const response =
            await fetch(
                "/api/user/ctf/progress",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        session_token:
                            token,

                        event:
                            CTF_EVENT

                    })

                }
            );


        const data =
            await readJson(response);


        if (!response.ok) {

            throw new Error(

                data.detail ||

                "Unable to load CTF progress."

            );

        }


        /*
         * Backend should return:
         *
         * domain
         * categories
         * challenge_counts
         * solved
         * points
         */

        const backendDomain =
            String(
                data.domain || ""
            )
                .trim()
                .toLowerCase();


        if (
            !DOMAIN_CONFIG[backendDomain]
        ) {

            throw new Error(
                "CTF is not available for your registered domain."
            );

        }


        currentDomain =
            backendDomain;


        solvedChallenges =
            data.solved || {};


        totalPoints =
            Number(
                data.points || 0
            );


        /*
         * Use backend categories when
         * available, but keep frontend
         * configuration as the UI source.
         *
         * Backend remains authoritative
         * for access and validation.
         */

        const backendCategories =
            Array.isArray(
                data.categories
            )
                ? data.categories
                : [];


        if (
            backendCategories.length > 0
        ) {

            applyBackendCategoryData(
                backendCategories,
                data.challenge_counts
            );

        }


        updateProgressCounters();


        return true;


    } catch (error) {

        console.error(
            "CTF PROGRESS ERROR:",
            error
        );


        showPageMessage(

            error.message ||

            "Unable to load CTF progress."

        );


        return false;

    }

}


/* =========================================================
   APPLY BACKEND CATEGORY DATA
   ========================================================= */

function applyBackendCategoryData(
    categories,
    challengeCounts
) {

    const domainConfig =
        getDomainConfig();


    if (!domainConfig) {

        return;

    }


    const safeCategories =
        categories.filter(
            category =>
                Object.prototype.hasOwnProperty.call(
                    domainConfig.categories,
                    category
                )
        );


    /*
     * If backend provides challenge counts,
     * update configured counts.
     */

    if (
        challengeCounts &&
        typeof challengeCounts === "object"
    ) {

        safeCategories.forEach(
            category => {

                const count =
                    Number(
                        challengeCounts[category]
                    );


                if (
                    Number.isFinite(count) &&
                    count >= 0
                ) {

                    domainConfig.categories[
                        category
                    ].count = count;

                }

            }
        );

    }


    /*
     * Keep only categories allowed
     * for this user's domain.
     */

    const filteredCategories = {};

    safeCategories.forEach(
        category => {

            filteredCategories[category] =
                domainConfig.categories[
                    category
                ];

        }
    );


    /*
     * If backend sent valid categories,
     * use only those categories.
     */

    if (
        safeCategories.length > 0
    ) {

        domainConfig.categories =
            filteredCategories;

    }

}


/* =========================================================
   RENDER DOMAIN HEADER
   ========================================================= */

function renderDomainHeader() {

    const config =
        getDomainConfig();


    if (!config) {

        return;

    }


    const headerDescription =
        getElement(
            "ctfHeaderDescription"
        );


    const headerStatus =
        getElement(
            "ctfHeaderStatus"
        );


    if (headerDescription) {

        headerDescription.textContent =
            config.description;

    }


    if (headerStatus) {

        headerStatus.textContent =
            config.displayTitle;

    }


    /*
     * Original HTML had hardcoded
     * WORKSHOP / CEH in modal.
     *
     * Update it dynamically.
     */

    const modalEvent =
        getElement(
            "answerModalEvent"
        );


    const modalDomain =
        getElement(
            "answerModalDomain"
        );


    if (modalEvent) {

        modalEvent.textContent =
            "WORKSHOP";

    }


    if (modalDomain) {

        modalDomain.textContent =
            config.title;

    }

}


/* =========================================================
   RENDER CATEGORY BUTTONS
   ========================================================= */

function renderCategoryButtons() {

    const grid =
        getElement(
            "categoryGrid"
        );


    const config =
        getDomainConfig();


    if (!grid || !config) {

        return;

    }


    const categories =
        Object.entries(
            config.categories
        );


    if (
        categories.length === 0
    ) {

        grid.innerHTML = `

            <div
                style="
                    grid-column:1/-1;
                    padding:22px;
                    border:1px solid rgba(229,9,20,.18);
                    border-radius:14px;
                    background:#0d0d0d;
                    color:#777;
                    font-size:10px;
                "
            >
                No CTF categories are available
                for your domain.
            </div>

        `;

        return;

    }


    /*
     * First category becomes selected.
     */

    if (
        !currentCategory ||
        !config.categories[currentCategory]
    ) {

        currentCategory =
            categories[0][0];

    }


    const cards =
        categories.map(
            (
                [category, categoryConfig],
                index
            ) => {

                const active =
                    category ===
                    currentCategory;


                return `

                    <button
                        type="button"
                        class="category-card${active ? " active" : ""}"
                        data-category="${escapeHtml(category)}"
                    >

                        <div class="category-icon">
                            ${String(index + 1).padStart(2, "0")}
                        </div>


                        <div class="category-info">

                            <strong>
                                ${escapeHtml(
                                    categoryConfig.title
                                )}
                            </strong>


                            <small>
                                ${escapeHtml(
                                    categoryConfig.description
                                )}
                            </small>

                        </div>


                        <div class="category-total">
                            ${categoryConfig.count}
                        </div>

                    </button>

                `;

            }
        );


    grid.innerHTML =
        cards.join("");


    bindCategoryButtons();

}


/* =========================================================
   UPDATE PROGRESS COUNTERS
   ========================================================= */

function updateProgressCounters() {

    const config =
        getDomainConfig();


    if (!config) {

        return;

    }


    const total =
        getElement(
            "totalChallengeCount"
        );


    const current =
        getElement(
            "currentChallengeCount"
        );


    const currentLabel =
        getElement(
            "currentChallengeLabel"
        );


    const totalCount =
        Object.values(
            config.categories
        )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(item.count || 0),
                0
            );


    if (total) {

        total.textContent =
            totalCount;

    }


    if (current) {

        current.textContent =

            getCategoryConfig(
                currentCategory
            )?.count || 0;

    }


    if (currentLabel) {

        currentLabel.textContent =
            config.challengeLabel;

    }


    /*
     * Optional points elements.
     */

    updateLocalPointsDisplay();

}


/* =========================================================
   CATEGORY BUTTONS
   ========================================================= */

function bindCategoryButtons() {

    document
        .querySelectorAll(
            ".category-card[data-category]"
        )
        .forEach(button => {

            /*
             * Avoid duplicate listeners.
             */

            if (
                button.dataset.bound === "true"
            ) {

                return;

            }


            button.dataset.bound =
                "true";


            button.addEventListener(
                "click",
                () => {

                    const category =
                        button.dataset.category;


                    if (
                        !getCategoryConfig(
                            category
                        )
                    ) {

                        return;

                    }


                    currentCategory =
                        category;


                    document
                        .querySelectorAll(
                            ".category-card[data-category]"
                        )
                        .forEach(item => {

                            item.classList.toggle(

                                "active",

                                item.dataset.category ===
                                currentCategory

                            );

                        });


                    updateCurrentCategoryHeading();

                    renderChallenges();

                }
            );

        });

}


/* =========================================================
   UPDATE CURRENT CATEGORY HEADING
   ========================================================= */

function updateCurrentCategoryHeading() {

    const config =
        getCategoryConfig(
            currentCategory
        );


    const domainConfig =
        getDomainConfig();


    if (!config || !domainConfig) {

        return;

    }


    const title =
        getElement(
            "currentCategoryTitle"
        );


    const description =
        getElement(
            "currentCategoryDescription"
        );


    const count =
        getElement(
            "currentChallengeCount"
        );


    const label =
        getElement(
            "currentChallengeLabel"
        );


    if (title) {

        title.textContent =
            config.title;

    }


    if (description) {

        description.textContent =
            config.description;

    }


    if (count) {

        count.textContent =
            config.count;

    }


    if (label) {

        label.textContent =
            domainConfig.challengeLabel;

    }

}


/* =========================================================
   RENDER CHALLENGES
   ========================================================= */

function renderChallenges() {

    const list =
        getElement(
            "challengeList"
        );


    if (!list) {

        return;

    }


    const config =
        getCategoryConfig(
            currentCategory
        );


    const domainConfig =
        getDomainConfig();


    if (!config || !domainConfig) {

        list.innerHTML = "";

        return;

    }


    const cards = [];


    /*
     * VAPT:
     *
     * Every category has exactly
     * one flag.
     *
     * Therefore:
     *
     * Test Cases       -> 01
     * URL Redirection  -> 01
     * Broken Link      -> 01
     * File Upload      -> 01
     * Error Bypass     -> 01
     *
     * CEH:
     *
     * Existing multiple challenge
     * structure remains unchanged.
     */

    for (
        let number = 1;
        number <= config.count;
        number += 1
    ) {

        const key =
            challengeKey(
                currentCategory,
                number
            );


        const solved =
            Boolean(
                solvedChallenges[key]
            );


        const isVapt =
            currentDomain === "vapt";


        const cardTitle =
            isVapt
                ? "SUBMIT THE FLAG"
                : `Challenge ${String(number).padStart(2, "0")}`;


        const buttonText =
            solved
                ? "SOLVED"
                : (
                    isVapt
                        ? "SUBMIT THE FLAG"
                        : "ENTER KEY"
                );


        const description =
            solved
                ? "Challenge solved successfully."
                : (
                    isVapt
                        ? "Submit the correct flag for this category."
                        : "Analyze the challenge and submit the correct answer."
                );


        cards.push(`

            <article
                class="ctf-challenge-card${solved ? " solved" : ""}"
            >


                <div class="ctf-challenge-number">
                    ${String(number).padStart(2, "0")}
                </div>



                <div class="ctf-challenge-content">


                    <span>
                        ${escapeHtml(
                            config.title
                        )}
                    </span>


                    <h3>
                        ${escapeHtml(
                            cardTitle
                        )}
                    </h3>


                    <p>
                        ${escapeHtml(
                            description
                        )}
                    </p>


                </div>



                <div class="ctf-challenge-actions">


                    <button
                        type="button"
                        class="ctf-submit-btn"
                        data-challenge-number="${number}"
                        ${solved ? "disabled" : ""}
                    >

                        ${escapeHtml(
                            buttonText
                        )}

                    </button>


                </div>


            </article>

        `);

    }


    list.innerHTML =
        cards.join("");


    /*
     * Bind submission buttons.
     */

    list
        .querySelectorAll(
            ".ctf-submit-btn:not(:disabled)"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    openAnswerModal(
                        Number(
                            button.dataset
                                .challengeNumber
                        )
                    );

                }
            );

        });

}


/* =========================================================
   MODAL CONTROLS
   ========================================================= */

function bindModalControls() {

    const modal =
        getElement(
            "answerModal"
        );


    const close =
        getElement(
            "answerModalClose"
        );


    const cancel =
        getElement(
            "answerCancel"
        );


    const submit =
        getElement(
            "answerSubmit"
        );


    const input =
        getElement(
            "answerInput"
        );


    if (close) {

        close.addEventListener(
            "click",
            closeAnswerModal
        );

    }


    if (cancel) {

        cancel.addEventListener(
            "click",
            closeAnswerModal
        );

    }


    document
        .querySelectorAll(
            "[data-close-answer-modal]"
        )
        .forEach(element => {

            element.addEventListener(
                "click",
                closeAnswerModal
            );

        });


    if (submit) {

        submit.addEventListener(
            "click",
            submitAnswer
        );

    }


    if (input) {

        input.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    submitAnswer();

                }

            }
        );

    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    closeAnswerModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeAnswerModal();

            }

        }
    );

}


/* =========================================================
   OPEN ANSWER / FLAG MODAL
   ========================================================= */

function openAnswerModal(number) {

    const config =
        getCategoryConfig(
            currentCategory
        );


    const domainConfig =
        getDomainConfig();


    if (!config || !domainConfig) {

        return;

    }


    const modal =
        getElement(
            "answerModal"
        );


    const title =
        getElement(
            "answerModalTitle"
        );


    const challenge =
        getElement(
            "answerModalChallenge"
        );


    const category =
        getElement(
            "answerModalCategory"
        );


    const input =
        getElement(
            "answerInput"
        );


    const message =
        getElement(
            "answerMessage"
        );


    const inputLabel =
        getElement(
            "answerInputLabel"
        );


    const modalKicker =
        getElement(
            "answerModalKicker"
        );


    const submitButton =
        getElement(
            "answerSubmit"
        );


    currentChallenge = {

        category:
            currentCategory,

        number:
            number

    };


    const isVapt =
        currentDomain === "vapt";


    /*
     * Modal title.
     */

    if (title) {

        title.textContent =
            domainConfig.submissionTitle;

    }


    /*
     * Challenge / flag heading.
     */

    if (challenge) {

        if (isVapt) {

            challenge.textContent =
                "SUBMIT THE FLAG";

        } else {

            challenge.textContent =
                `Challenge ${String(number).padStart(2, "0")}`;

        }

    }


    /*
     * Modal category.
     */

    if (category) {

        category.textContent =
            categoryTitle(
                currentCategory
            );

    }


    /*
     * Input label.
     */

    if (inputLabel) {

        inputLabel.textContent =
            domainConfig.submissionLabel;

    }


    /*
     * Input placeholder.
     */

    if (input) {

        input.value = "";

        input.disabled = false;

        input.placeholder =
            isVapt
                ? "Enter the flag..."
                : "Enter your answer...";

    }


    /*
     * Modal kicker.
     */

    if (modalKicker) {

        modalKicker.textContent =
            isVapt
                ? "FLAG SUBMISSION"
                : "CHALLENGE ANSWER";

    }


    /*
     * Clear old message.
     */

    if (message) {

        message.textContent = "";

        message.className =
            "answer-message";

    }


    /*
     * Submit button.
     */

    if (submitButton) {

        submitButton.disabled =
            false;

        submitButton.textContent =
            domainConfig.submitButton;

    }


    /*
     * Modal.
     */

    if (modal) {

        modal.classList.add(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    window.setTimeout(
        () => {

            if (input) {

                input.focus();

            }

        },
        50
    );

}


/* =========================================================
   CLOSE ANSWER MODAL
   ========================================================= */

function closeAnswerModal() {

    const modal =
        getElement(
            "answerModal"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    currentChallenge =
        null;

}


/* =========================================================
   SUBMIT ANSWER / FLAG
   ========================================================= */

async function submitAnswer() {

    if (!currentChallenge) {

        return;

    }


    const input =
        getElement(
            "answerInput"
        );


    const message =
        getElement(
            "answerMessage"
        );


    const button =
        getElement(
            "answerSubmit"
        );


    const answer =
        String(
            input?.value || ""
        ).trim();


    if (!answer) {

        showAnswerMessage(

            currentDomain === "vapt"
                ? "Please enter the flag."
                : "Please enter an answer.",

            false

        );


        input?.focus();

        return;

    }


    const token =
        sessionToken();


    if (!token) {

        showAnswerMessage(

            "User session is missing. Please login again.",

            false

        );

        return;

    }


    /*
     * Prevent multiple submissions.
     */

    if (button) {

        button.disabled =
            true;


        button.textContent =
            "CHECKING...";

    }


    try {

        /*
         * IMPORTANT:
         *
         * Domain comes from backend
         * authenticated session.
         *
         * It is NOT hardcoded to CEH.
         */

        const response =
            await fetch(
                "/api/user/ctf/submit",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        event:
                            CTF_EVENT,

                        domain:
                            currentDomain,

                        category:
                            currentChallenge.category,

                        challenge_number:
                            currentChallenge.number,

                        answer:
                            answer,

                        session_token:
                            token

                    })

                }
            );


        const data =
            await readJson(response);


        if (!response.ok) {

            throw new Error(

                data.detail ||

                "Unable to submit answer."

            );

        }


        /* =================================================
           CORRECT ANSWER
           ================================================= */

        if (data.correct) {

            const key =
                challengeKey(

                    currentChallenge.category,

                    currentChallenge.number

                );


            solvedChallenges[key] = {

                category:
                    currentChallenge.category,

                challenge_number:
                    currentChallenge.number,

                points:
                    Number(
                        data.points_awarded || 0
                    )

            };


            /*
             * Do not add duplicate points.
             */

            if (
                !data.already_solved
            ) {

                const awardedPoints =
                    Number(
                        data.points_awarded || 0
                    );


                totalPoints +=
                    awardedPoints;

            }


            updateLocalPointsDisplay();


            showAnswerMessage(

                data.message ||

                (
                    currentDomain === "vapt"

                        ? "Correct flag. Challenge solved."

                        : "Correct answer. Challenge solved."
                ),

                true

            );


            if (button) {

                button.textContent =
                    "SOLVED";

            }


            /*
             * Refresh progress from backend
             * before closing.
             */

            await refreshProgressAfterSubmit();


            window.setTimeout(
                () => {

                    closeAnswerModal();

                    renderChallenges();

                },
                650
            );


            return;

        }


        /* =================================================
           WRONG ANSWER
           ================================================= */

        showAnswerMessage(

            data.message ||

            (
                currentDomain === "vapt"

                    ? "Incorrect flag. Try again."

                    : "Incorrect answer. Try again."
            ),

            false

        );


        if (button) {

            button.disabled =
                false;


            button.textContent =
                getDomainConfig()
                    ?.submitButton ||
                "SUBMIT ANSWER";

        }


    } catch (error) {

        console.error(
            "CTF SUBMISSION ERROR:",
            error
        );


        showAnswerMessage(

            error.message ||

            "Unable to submit answer.",

            false

        );


        if (button) {

            button.disabled =
                false;


            button.textContent =
                getDomainConfig()
                    ?.submitButton ||
                "SUBMIT ANSWER";

        }

    }

}


/* =========================================================
   REFRESH PROGRESS AFTER SUBMISSION
   ========================================================= */

async function refreshProgressAfterSubmit() {

    try {

        const token =
            sessionToken();


        if (!token) {

            return;

        }


        const response =
            await fetch(
                "/api/user/ctf/progress",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        session_token:
                            token,

                        event:
                            CTF_EVENT

                    })

                }
            );


        const data =
            await readJson(response);


        if (!response.ok) {

            return;

        }


        solvedChallenges =
            data.solved ||
            solvedChallenges;


        totalPoints =
            Number(
                data.points ??
                totalPoints
            );


        updateProgressCounters();

    } catch (error) {

        console.warn(
            "Unable to refresh CTF progress:",
            error
        );

    }

}


/* =========================================================
   UPDATE LOCAL POINT DISPLAY
   ========================================================= */

function updateLocalPointsDisplay() {

    const pointsElements = [

        "totalPoints",

        "userTotalPoints",

        "ctfPoints",

        "points"

    ];


    pointsElements.forEach(
        id => {

            const element =
                getElement(id);


            if (element) {

                element.textContent =
                    totalPoints;

            }

        }
    );


    /*
     * Optional progress bar.
     */

    const progressBar =
        getElement(
            "ctfProgressBar"
        );


    if (progressBar) {

        const config =
            getDomainConfig();


        const totalChallenges =
            config

                ? Object.values(
                    config.categories
                )
                    .reduce(
                        (sum, item) =>
                            sum +
                            Number(
                                item.count || 0
                            ),
                        0
                    )

                : 0;


        const solvedCount =
            Object.keys(
                solvedChallenges
            ).length;


        const percentage =
            totalChallenges > 0

                ? (
                    solvedCount /
                    totalChallenges
                ) * 100

                : 0;


        progressBar.style.width =
            `${percentage}%`;

    }

}


/* =========================================================
   ANSWER MESSAGE
   ========================================================= */

function showAnswerMessage(
    text,
    success
) {

    const message =
        getElement(
            "answerMessage"
        );


    if (!message) {

        return;

    }


    message.textContent =
        String(text || "");


    message.className =
        success

            ? "answer-message success"

            : "answer-message";

}


/* =========================================================
   PAGE MESSAGE
   ========================================================= */

function showPageMessage(text) {

    const list =
        getElement(
            "challengeList"
        );


    if (!list) {

        return;

    }


    list.innerHTML = `

        <div
            style="
                grid-column:1/-1;
                padding:22px;
                border:1px solid rgba(229,9,20,.18);
                border-radius:14px;
                background:#0d0d0d;
                color:#777;
                font-size:10px;
            "
        >

            ${escapeHtml(text)}

        </div>

    `;

}


/* =========================================================
   LOGOUT
   ========================================================= */

function bindLogout() {

    const logout =
        document.querySelector(
            '.sidebar-item[data-section="logout"]'
        );


    if (!logout) {

        return;

    }


    logout.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            const token =
                sessionToken();


            try {

                if (token) {

                    await fetch(
                        "/api/workshop/logout",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    session_token:
                                        token

                                })

                        }
                    );

                }

            } catch (error) {

                console.warn(
                    "Logout request failed:",
                    error
                );

            } finally {

                /*
                 * Clear user session.
                 */

                sessionStorage.removeItem(
                    "user_session_token"
                );


                sessionStorage.removeItem(
                    "workshop_session_token"
                );


                sessionStorage.removeItem(
                    "user_event"
                );


                sessionStorage.removeItem(
                    "workshop_event"
                );


                sessionStorage.removeItem(
                    "user_domain"
                );


                window.location.href =
                    "/";

            }

        }
    );

}