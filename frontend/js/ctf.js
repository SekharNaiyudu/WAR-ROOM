/* =========================================================
   WAR ROOM — CTF MANAGEMENT
   Event → Domain → Category → Challenges → Answer Key / Flag
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* =====================================================
       SINGLE SOURCE OF TRUTH
       ===================================================== */

    let selectedEvent = "workshop";
    let selectedDomain = "ceh";
    let selectedCategory = "steganography";


    /* =====================================================
       CHALLENGE COUNTS
       ===================================================== */

    const challengeCounts = {

        /* CEH */

        steganography: 20,

        wireshark: 7,

        "event-logs": 10,


        /* VAPT */

        "test-cases": 1,

        "url-redirection": 1,

        "broken-link-hijack": 1,

        "file-upload": 1,

        "error-bypass": 1

    };


    /* =====================================================
       CTF DATA
       ===================================================== */

    const ctfData = {

        workshop: {

            ceh: [
                "steganography",
                "wireshark",
                "event-logs"
            ],

            vapt: [
                "test-cases",
                "url-redirection",
                "broken-link-hijack",
                "file-upload",
                "error-bypass"
            ],

            soc: [],

            "digital-forensics": []

        },


        hackathon: {

            ceh: [],

            vapt: [],

            soc: [],

            "digital-forensics": []

        }

    };


    /* =====================================================
       CATEGORY NAMES
       ===================================================== */

    const categoryNames = {

        /* CEH */

        steganography:
            "STEGANOGRAPHY",

        wireshark:
            "WIRESHARK",

        "event-logs":
            "EVENT LOGS",


        /* VAPT */

        "test-cases":
            "TEST CASES",

        "url-redirection":
            "URL REDIRECTION",

        "broken-link-hijack":
            "BROKEN LINK HIJACK",

        "file-upload":
            "FILE UPLOAD",

        "error-bypass":
            "ERROR BYPASS"

    };


    /* =====================================================
       CATEGORY DESCRIPTIONS
       ===================================================== */

    const categoryDescriptions = {

        /* CEH */

        steganography:
            "20 Challenges",

        wireshark:
            "7 Challenges",

        "event-logs":
            "10 Challenges",


        /* VAPT */

        "test-cases":
            "1 Flag",

        "url-redirection":
            "1 Flag",

        "broken-link-hijack":
            "1 Flag",

        "file-upload":
            "1 Flag",

        "error-bypass":
            "1 Flag"

    };


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    const eventCards =
        document.querySelectorAll(
            ".ctf-event-card"
        );


    const domainCards =
        document.querySelectorAll(
            ".ctf-domain-card"
        );


    const categoryGrid =
        document.querySelector(
            ".ctf-category-grid"
        );


    const challengeList =
        document.querySelector(
            ".ctf-challenge-list"
        );


    const selectedEventElement =
        document.getElementById(
            "selectedEvent"
        );


    const selectedDomainElement =
        document.getElementById(
            "selectedDomain"
        );


    const challengeCountElement =
        document.getElementById(
            "challengeCount"
        );


    const challengeSection =
        challengeList
            ? challengeList.closest(
                ".ctf-section"
            )
            : null;


    const challengeHeader =
        document.querySelector(
            ".ctf-challenges-header"
        );


    const challengeTitle =
        challengeHeader
            ? challengeHeader.querySelector(
                "h2"
            )
            : null;


    const challengeCountLabel =
        document.getElementById(
            "challengeCountLabel"
        );


    /* =====================================================
       ANSWER KEY MODAL ELEMENTS
       ===================================================== */

    const keyModal =
        document.getElementById(
            "ctfKeyModal"
        );


    const keyModalClose =
        document.getElementById(
            "ctfKeyModalClose"
        );


    const keyModalCancel =
        document.getElementById(
            "ctfKeyCancel"
        );


    const keyModalSave =
        document.getElementById(
            "ctfKeySave"
        );


    const keyInput =
        document.getElementById(
            "ctfAnswerKey"
        );


    const keyError =
        document.getElementById(
            "ctfKeyError"
        );


    const keyModalChallenge =
        document.getElementById(
            "ctfKeyModalChallenge"
        );


    const keyModalEvent =
        document.getElementById(
            "ctfKeyModalEvent"
        );


    const keyModalDomain =
        document.getElementById(
            "ctfKeyModalDomain"
        );


    const keyModalCategory =
        document.getElementById(
            "ctfKeyModalCategory"
        );


    /* =====================================================
       CURRENT EDITING CHALLENGE
       ===================================================== */

    let editingChallengeNumber = null;


    /* =====================================================
       SAVED ANSWER KEYS
       ===================================================== */

    let savedKeys = {};


    /* =====================================================
       EVENT NAME
       ===================================================== */

    function eventName(event) {

        if (event === "workshop") {

            return "WORKSHOP";

        }


        if (event === "hackathon") {

            return "HACKATHON";

        }


        return String(event || "")
            .toUpperCase();

    }


    /* =====================================================
       DOMAIN NAME
       ===================================================== */

    function domainName(domain) {

        if (
            domain ===
            "digital-forensics"
        ) {

            return "DIGITAL FORENSICS";

        }


        return String(domain || "")
            .toUpperCase();

    }


    /* =====================================================
       CHECK VAPT CATEGORY
       ===================================================== */

    function isVaptCategory(category) {

        return [

            "test-cases",

            "url-redirection",

            "broken-link-hijack",

            "file-upload",

            "error-bypass"

        ].includes(category);

    }


    /* =====================================================
       CHECK SINGLE FLAG CATEGORY
       ===================================================== */

    function isSingleFlagCategory(category) {

        return isVaptCategory(category);

    }


    /* =====================================================
       GET CURRENT CATEGORIES
       ===================================================== */

    function getCategories() {

        if (
            !ctfData[selectedEvent]
        ) {

            return [];

        }


        if (
            !ctfData[selectedEvent][
                selectedDomain
            ]
        ) {

            return [];

        }


        return ctfData[
            selectedEvent
        ][
            selectedDomain
        ];

    }


    /* =====================================================
       GET CURRENT CHALLENGE COUNT
       ===================================================== */

    function getCount() {

        if (!selectedCategory) {

            return 0;

        }


        return (
            challengeCounts[
                selectedCategory
            ] || 0
        );

    }


    /* =====================================================
       UPDATE EVENT UI
       ===================================================== */

    function updateEventUI() {

        eventCards.forEach(
            function (card) {

                const isActive =
                    card.dataset.event ===
                    selectedEvent;


                card.classList.toggle(
                    "active",
                    isActive
                );

            }
        );


        if (selectedEventElement) {

            selectedEventElement.textContent =
                eventName(
                    selectedEvent
                );

        }

    }


    /* =====================================================
       UPDATE DOMAIN UI
       ===================================================== */

    function updateDomainUI() {

        domainCards.forEach(
            function (card) {

                const isActive =
                    card.dataset.domain ===
                    selectedDomain;


                card.classList.toggle(
                    "active",
                    isActive
                );

            }
        );


        if (selectedDomainElement) {

            selectedDomainElement.textContent =
                domainName(
                    selectedDomain
                );

        }

    }


    /* =====================================================
       HIDE CHALLENGE SECTION
       ===================================================== */

    function hideChallenges() {

        if (challengeSection) {

            challengeSection.style.display =
                "none";

        }

    }


    /* =====================================================
       SHOW CHALLENGE SECTION
       ===================================================== */

    function showChallenges() {

        if (challengeSection) {

            challengeSection.style.display =
                "";

        }

    }


    /* =====================================================
       RENDER CATEGORIES
       ===================================================== */

    function renderCategories() {

        if (!categoryGrid) {

            return;

        }


        const categories =
            getCategories();


        categoryGrid.innerHTML =
            "";


        /* =================================================
           EMPTY STATE
           ================================================= */

        if (
            categories.length === 0
        ) {

            selectedCategory =
                null;


            categoryGrid.innerHTML = `

                <div class="ctf-empty-state">

                    <strong>
                        NO CATEGORIES AVAILABLE
                    </strong>

                    <small>
                        No CTF categories are configured for
                        ${eventName(selectedEvent)}
                        →
                        ${domainName(selectedDomain)}.
                    </small>

                </div>

            `;


            hideChallenges();


            return;

        }


        /* =================================================
           SELECT FIRST CATEGORY
           ================================================= */

        if (
            !selectedCategory ||
            !categories.includes(
                selectedCategory
            )
        ) {

            selectedCategory =
                categories[0];

        }


        /* =================================================
           CREATE CATEGORY CARDS
           ================================================= */

        categories.forEach(
            function (
                category,
                index
            ) {

                const card =
                    document.createElement(
                        "button"
                    );


                card.type =
                    "button";


                card.className =
                    "ctf-category-card";


                card.dataset.category =
                    category;


                if (
                    category ===
                    selectedCategory
                ) {

                    card.classList.add(
                        "active"
                    );

                }


                card.innerHTML = `

                    <div
                        class="ctf-category-number"
                    >
                        ${String(index + 1)
                            .padStart(2, "0")}
                    </div>

                    <div>

                        <strong>
                            ${
                                categoryNames[
                                    category
                                ] ||
                                category
                            }
                        </strong>

                        <small>
                            ${
                                categoryDescriptions[
                                    category
                                ] ||
                                "1 Flag"
                            }
                        </small>

                    </div>

                `;


                categoryGrid.appendChild(
                    card
                );

            }
        );


        /* =================================================
           CATEGORY CLICK
           ================================================= */

        categoryGrid
            .querySelectorAll(
                ".ctf-category-card"
            )
            .forEach(
                function (card) {

                    card.addEventListener(
                        "click",
                        function () {

                            const category =
                                card.dataset.category;


                            if (
                                !categories.includes(
                                    category
                                )
                            ) {

                                return;

                            }


                            selectedCategory =
                                category;


                            categoryGrid
                                .querySelectorAll(
                                    ".ctf-category-card"
                                )
                                .forEach(
                                    function (
                                        item
                                    ) {

                                        item.classList.toggle(
                                            "active",
                                            item ===
                                                card
                                        );

                                    }
                                );


                            /*
                             * Load answer keys
                             * for selected category.
                             */

                            loadSavedKeys();

                        }
                    );

                }
            );


        renderChallenges();

        loadSavedKeys();

    }


    /* =====================================================
       RENDER CHALLENGES / FLAGS
       ===================================================== */

    function renderChallenges() {

        if (!challengeList) {

            return;

        }


        challengeList.innerHTML =
            "";


        const categories =
            getCategories();


        /* =================================================
           NO CATEGORY
           ================================================= */

        if (
            !selectedCategory ||
            !categories.includes(
                selectedCategory
            )
        ) {

            hideChallenges();

            return;

        }


        const count =
            getCount();


        if (count <= 0) {

            hideChallenges();

            return;

        }


        showChallenges();


        /* =================================================
           TITLE
           ================================================= */

        if (challengeTitle) {

            if (
                isSingleFlagCategory(
                    selectedCategory
                )
            ) {

                challengeTitle.textContent =
                    "SUBMIT THE FLAG";

            }

            else {

                challengeTitle.textContent =
                    categoryNames[
                        selectedCategory
                    ];

            }

        }


        /* =================================================
           COUNT
           ================================================= */

        if (
            challengeCountElement
        ) {

            challengeCountElement.textContent =
                count;

        }


        if (
            challengeCountLabel
        ) {

            challengeCountLabel.textContent =
                isSingleFlagCategory(
                    selectedCategory
                )
                    ? "FLAG"
                    : "CHALLENGES";

        }


        /* =================================================
           CREATE CARDS
           ================================================= */

        for (
            let number = 1;
            number <= count;
            number++
        ) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "ctf-challenge-card";


            card.dataset.category =
                selectedCategory;


            card.dataset.challenge =
                number;


            const hasKey =
                Object.prototype.hasOwnProperty.call(
                    savedKeys,
                    String(number)
                );


            /* =================================================
               VAPT FLAG CARD
               ================================================= */

            if (
                isSingleFlagCategory(
                    selectedCategory
                )
            ) {

                card.innerHTML = `

                    <div
                        class="ctf-challenge-number"
                    >
                        01
                    </div>


                    <div
                        class="ctf-challenge-content"
                    >

                        <span>
                            ${
                                categoryNames[
                                    selectedCategory
                                ]
                            }
                        </span>


                        <h3>
                            SUBMIT THE FLAG
                        </h3>


                        <p>
                            ${
                                hasKey
                                    ? "Flag saved."
                                    : "Flag not configured yet."
                            }
                        </p>

                    </div>


                    <div
                        class="ctf-challenge-actions"
                    >

                        <button
                            type="button"
                            class="ctf-key-button${
                                hasKey
                                    ? " has-key"
                                    : ""
                            }"
                            data-challenge="1"
                        >

                            ${
                                hasKey
                                    ? "EDIT FLAG"
                                    : "ENTER FLAG"
                            }

                        </button>

                    </div>

                `;

            }


            /* =================================================
               CEH MULTIPLE CHALLENGE CARD
               ================================================= */

            else {

                card.innerHTML = `

                    <div
                        class="ctf-challenge-number"
                    >

                        ${
                            String(number)
                                .padStart(
                                    2,
                                    "0"
                                )
                        }

                    </div>


                    <div
                        class="ctf-challenge-content"
                    >

                        <span>
                            ${
                                categoryNames[
                                    selectedCategory
                                ]
                            }
                        </span>


                        <h3>
                            Challenge ${number}
                        </h3>


                        <p>
                            ${
                                hasKey
                                    ? "Answer key saved."
                                    : "Answer key not configured yet."
                            }
                        </p>

                    </div>


                    <div
                        class="ctf-challenge-actions"
                    >

                        <button
                            type="button"
                            class="ctf-key-button${
                                hasKey
                                    ? " has-key"
                                    : ""
                            }"
                            data-challenge="${number}"
                        >

                            ${
                                hasKey
                                    ? "EDIT KEY"
                                    : "ENTER KEY"
                            }

                        </button>

                    </div>

                `;

            }


            challengeList.appendChild(
                card
            );

        }


        /* =================================================
           FLAG / KEY BUTTONS
           ================================================= */

        challengeList
            .querySelectorAll(
                ".ctf-key-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const challengeNumber =
                                Number(
                                    button.dataset
                                        .challenge
                                );


                            openKeyModal(
                                challengeNumber
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       LOAD SAVED ANSWER KEYS
       ===================================================== */

    async function loadSavedKeys() {

        if (!selectedCategory) {

            savedKeys = {};

            renderChallenges();

            return;

        }


        try {

            const query =
                new URLSearchParams({

                    event:
                        selectedEvent,

                    domain:
                        selectedDomain,

                    category:
                        selectedCategory

                });


            const response =
                await fetch(

                    "/api/admin/ctf/challenge-keys?" +
                    query.toString(),

                    {

                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        headers: {

                            "Accept":
                                "application/json"

                        }

                    }

                );


            if (
                !response.ok
            ) {

                savedKeys = {};

                renderChallenges();

                return;

            }


            const data =
                await response.json();


            savedKeys =
                data.keys || {};


            renderChallenges();

        }


        catch (error) {

            console.error(
                "Failed to load CTF answer keys:",
                error
            );


            savedKeys = {};

            renderChallenges();

        }

    }


    /* =====================================================
       OPEN ANSWER KEY / FLAG MODAL
       ===================================================== */

    function openKeyModal(
        challengeNumber
    ) {

        if (!keyModal) {

            return;

        }


        /*
         * VAPT always uses challenge 1.
         */

        if (
            isSingleFlagCategory(
                selectedCategory
            )
        ) {

            challengeNumber =
                1;

        }


        editingChallengeNumber =
            challengeNumber;


        /* =================================================
           MODAL TITLE
           ================================================= */

        if (
            keyModalChallenge
        ) {

            if (
                isSingleFlagCategory(
                    selectedCategory
                )
            ) {

                keyModalChallenge.textContent =
                    "SUBMIT THE FLAG";

            }

            else {

                keyModalChallenge.textContent =
                    "Challenge " +
                    String(
                        challengeNumber
                    ).padStart(
                        2,
                        "0"
                    );

            }

        }


        /* =================================================
           EVENT
           ================================================= */

        if (keyModalEvent) {

            keyModalEvent.textContent =
                eventName(
                    selectedEvent
                );

        }


        /* =================================================
           DOMAIN
           ================================================= */

        if (keyModalDomain) {

            keyModalDomain.textContent =
                domainName(
                    selectedDomain
                );

        }


        /* =================================================
           CATEGORY
           ================================================= */

        if (keyModalCategory) {

            keyModalCategory.textContent =
                categoryNames[
                    selectedCategory
                ] || "";

        }


        /* =================================================
           INPUT
           ================================================= */

        if (keyInput) {

            keyInput.value =
                savedKeys[
                    String(
                        challengeNumber
                    )
                ] || "";


            if (
                isSingleFlagCategory(
                    selectedCategory
                )
            ) {

                keyInput.placeholder =
                    "Enter flag...";

            }

            else {

                keyInput.placeholder =
                    "Enter answer key...";

            }

        }


        /* =================================================
           CLEAR ERROR
           ================================================= */

        if (keyError) {

            keyError.textContent =
                "";

        }


        /* =================================================
           MODAL LABEL
           ================================================= */

        const modalLabel =
            keyModal.querySelector(
                ".ctf-key-modal-label"
            );


        if (modalLabel) {

            modalLabel.textContent =
                isSingleFlagCategory(
                    selectedCategory
                )
                    ? "FLAG"
                    : "ANSWER KEY";

        }


        /* =================================================
           INPUT LABEL
           ================================================= */

        const inputLabel =
            keyModal.querySelector(
                ".ctf-key-input-label"
            );


        if (inputLabel) {

            inputLabel.textContent =
                isSingleFlagCategory(
                    selectedCategory
                )
                    ? "FLAG"
                    : "ANSWER KEY";

        }


        /* =================================================
           OPEN
           ================================================= */

        keyModal.classList.add(
            "open"
        );


        keyModal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";


        setTimeout(
            function () {

                if (keyInput) {

                    keyInput.focus();

                    keyInput.select();

                }

            },
            100
        );

    }


    /* =====================================================
       CLOSE ANSWER KEY MODAL
       ===================================================== */

    function closeKeyModal() {

        if (!keyModal) {

            return;

        }


        keyModal.classList.remove(
            "open"
        );


        keyModal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";


        editingChallengeNumber =
            null;


        if (keyInput) {

            keyInput.value =
                "";

        }


        if (keyError) {

            keyError.textContent =
                "";

        }

    }


    /* =====================================================
       SAVE ANSWER KEY / FLAG
       ===================================================== */

    async function saveAnswerKey() {

        if (
            !editingChallengeNumber ||
            !selectedCategory
        ) {

            return;

        }


        const answerKey =
            keyInput
                ? keyInput.value.trim()
                : "";


        /* =================================================
           VALIDATION
           ================================================= */

        if (!answerKey) {

            if (keyError) {

                keyError.textContent =
                    isSingleFlagCategory(
                        selectedCategory
                    )
                        ? "Please enter a flag."
                        : "Please enter an answer key.";

            }


            if (keyInput) {

                keyInput.focus();

            }


            return;

        }


        if (keyError) {

            keyError.textContent =
                "";

        }


        /* =================================================
           DISABLE SAVE
           ================================================= */

        if (keyModalSave) {

            keyModalSave.disabled =
                true;


            keyModalSave.textContent =
                "SAVING...";

        }


        try {

            /*
             * VAPT category always has
             * exactly one flag.
             */

            const challengeNumber =
                isSingleFlagCategory(
                    selectedCategory
                )
                    ? 1
                    : editingChallengeNumber;


            const response =
                await fetch(

                    "/api/admin/ctf/challenge-key",

                    {

                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                event:
                                    selectedEvent,

                                domain:
                                    selectedDomain,

                                category:
                                    selectedCategory,

                                challenge_number:
                                    challengeNumber,

                                answer_key:
                                    answerKey

                            })

                    }

                );


            let data = {};


            try {

                data =
                    await response.json();

            }

            catch (
                jsonError
            ) {

                data = {};

            }


            /* =================================================
               API ERROR
               ================================================= */

            if (
                !response.ok
            ) {

                throw new Error(

                    data.detail ||
                    data.message ||
                    "Unable to save answer key."

                );

            }


            /* =================================================
               UPDATE LOCAL STATE
               ================================================= */

            savedKeys[
                String(
                    challengeNumber
                )
            ] = answerKey;


            /* =================================================
               REFRESH
               ================================================= */

            renderChallenges();


            /* =================================================
               CLOSE
               ================================================= */

            closeKeyModal();


            /* =================================================
               SUCCESS
               ================================================= */

            showSuccessMessage(

                isSingleFlagCategory(
                    selectedCategory
                )
                    ? "Flag saved successfully."
                    : "Answer key saved successfully."

            );

        }


        catch (error) {

            console.error(
                "CTF answer key save failed:",
                error
            );


            if (keyError) {

                keyError.textContent =
                    error.message ||
                    "Unable to save answer key.";

            }

        }


        finally {

            if (keyModalSave) {

                keyModalSave.disabled =
                    false;


                keyModalSave.textContent =
                    "SAVE";

            }

        }

    }


    /* =====================================================
       SUCCESS MESSAGE
       ===================================================== */

    function showSuccessMessage(
        message
    ) {

        const existing =
            document.querySelector(
                ".ctf-save-success"
            );


        if (existing) {

            existing.remove();

        }


        const notification =
            document.createElement(
                "div"
            );


        notification.className =
            "ctf-save-success";


        notification.textContent =
            message;


        notification.style.position =
            "fixed";


        notification.style.right =
            "25px";


        notification.style.bottom =
            "25px";


        notification.style.zIndex =
            "10000";


        notification.style.padding =
            "14px 20px";


        notification.style.border =
            "1px solid rgba(229, 9, 20, .5)";


        notification.style.borderRadius =
            "12px";


        notification.style.color =
            "#ffffff";


        notification.style.background =
            "#101010";


        notification.style.boxShadow =
            "0 0 25px rgba(229, 9, 20, .18)";


        notification.style.fontSize =
            "12px";


        notification.style.fontWeight =
            "700";


        document.body.appendChild(
            notification
        );


        setTimeout(
            function () {

                notification.style.opacity =
                    "0";


                notification.style.transition =
                    "opacity .25s ease";


                setTimeout(
                    function () {

                        notification.remove();

                    },
                    300
                );

            },
            1800
        );

    }


    /* =====================================================
       MODAL CLOSE BUTTON
       ===================================================== */

    if (keyModalClose) {

        keyModalClose.addEventListener(
            "click",
            function () {

                closeKeyModal();

            }
        );

    }


    /* =====================================================
       CANCEL BUTTON
       ===================================================== */

    if (keyModalCancel) {

        keyModalCancel.addEventListener(
            "click",
            function () {

                closeKeyModal();

            }
        );

    }


    /* =====================================================
       BACKDROP CLICK
       ===================================================== */

    document
        .querySelectorAll(
            "[data-close-key-modal]"
        )
        .forEach(
            function (element) {

                element.addEventListener(
                    "click",
                    function () {

                        closeKeyModal();

                    }
                );

            }
        );


    /* =====================================================
       SAVE BUTTON
       ===================================================== */

    if (keyModalSave) {

        keyModalSave.addEventListener(
            "click",
            function () {

                saveAnswerKey();

            }
        );

    }


    /* =====================================================
       INPUT KEYBOARD EVENTS
       ===================================================== */

    if (keyInput) {

        keyInput.addEventListener(
            "keydown",
            function (event) {

                /* ENTER → SAVE */

                if (
                    event.key ===
                    "Enter"
                ) {

                    event.preventDefault();

                    saveAnswerKey();

                }


                /* ESCAPE → CLOSE */

                if (
                    event.key ===
                    "Escape"
                ) {

                    event.preventDefault();

                    closeKeyModal();

                }

            }
        );

    }


    /* =====================================================
       GLOBAL ESCAPE
       ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                    "Escape" &&
                keyModal &&
                keyModal.classList.contains(
                    "open"
                )
            ) {

                closeKeyModal();

            }

        }
    );


    /* =====================================================
       EVENT CARD CLICK
       ===================================================== */

    eventCards.forEach(
        function (card) {

            card.addEventListener(
                "click",
                function () {

                    const event =
                        card.dataset.event;


                    if (!event) {

                        return;

                    }


                    selectedEvent =
                        event;


                    /*
                     * Reset domain.
                     */

                    selectedDomain =
                        "ceh";


                    /*
                     * Reset category.
                     */

                    selectedCategory =
                        null;


                    /*
                     * Clear keys.
                     */

                    savedKeys =
                        {};


                    updateEventUI();

                    updateDomainUI();

                    renderCategories();

                }
            );

        }
    );


    /* =====================================================
       DOMAIN CARD CLICK
       ===================================================== */

    domainCards.forEach(
        function (card) {

            card.addEventListener(
                "click",
                function () {

                    const domain =
                        card.dataset.domain;


                    if (!domain) {

                        return;

                    }


                    selectedDomain =
                        domain;


                    selectedCategory =
                        null;


                    savedKeys =
                        {};


                    updateDomainUI();

                    renderCategories();

                }
            );

        }
    );


    /* =====================================================
       INITIAL PAGE STATE
       ===================================================== */

    updateEventUI();

    updateDomainUI();

    renderCategories();


});