/* =========================================================
   WAR ROOM — ACCOUNT MANAGEMENT
   ACCOUNTS.JS
   ========================================================= */

let selectedEvent = "workshop";
let selectedDomain = "ceh";
let accountsCache = [];


/* =========================================================
   DOM REFERENCES
   ========================================================= */

const eventButtons =
    document.querySelectorAll(
        ".account-event-card"
    );

const domainButtons =
    document.querySelectorAll(
        ".account-domain-card"
    );

const tableBody =
    document.getElementById(
        "accountsTableBody"
    );

const searchInput =
    document.getElementById(
        "participantSearch"
    );

const refreshButton =
    document.getElementById(
        "refreshAccountsBtn"
    );

const deleteAllButton =
    document.getElementById(
        "deleteAllAccountsBtn"
    );


/* =========================================================
   GET API DOMAIN
   =========================================================
   
   IMPORTANT:

   selectedDomain always stays:
   ceh
   vapt
   soc
   forensics

   Only API request changes it for Hackathon:

   Workshop:
   ceh

   Hackathon:
   ceh_hackathon
   ========================================================= */

function getApiDomain() {

    const domain =
        String(
            selectedDomain || "ceh"
        )
        .replace(
            "_hackathon",
            ""
        )
        .toLowerCase();


    if (
        selectedEvent ===
        "hackathon"
    ) {

        return `${domain}_hackathon`;

    }


    return domain;

}


/* =========================================================
   GET DISPLAY DOMAIN
   ========================================================= */

function getDisplayDomain() {

    return String(
        selectedDomain || "ceh"
    )
    .replace(
        "_hackathon",
        ""
    )
    .toUpperCase();

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(value) {

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

        return String(value);

    }


    return date.toLocaleString();

}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizedStatus(status) {

    const value =
        String(
            status || ""
        )
        .trim()
        .toLowerCase();


    /*
       Backward compatibility:

       registered
       active

       become:

       approved
    */

    if (
        value === "registered" ||
        value === "active"
    ) {

        return "approved";

    }


    return value;

}


/* =========================================================
   STATUS LABEL
   ========================================================= */

function statusLabel(status) {

    const value =
        normalizedStatus(
            status
        );


    if (
        value === "approved"
    ) {

        return "APPROVED";

    }


    if (
        value === "pending"
    ) {

        return "PENDING";

    }


    if (
        value === "rejected"
    ) {

        return "REJECTED";

    }


    return (
        value.toUpperCase() ||
        "UNKNOWN"
    );

}


/* =========================================================
   SET ACTIVE CARD
   ========================================================= */

function setActiveCard(
    selector,
    attribute,
    value
) {

    document
        .querySelectorAll(
            selector
        )
        .forEach(
            function(button) {

                const buttonValue =
                    String(
                        button.dataset[
                            attribute
                        ] || ""
                    )
                    .replace(
                        "_hackathon",
                        ""
                    )
                    .toLowerCase();


                const selectedValue =
                    String(
                        value || ""
                    )
                    .replace(
                        "_hackathon",
                        ""
                    )
                    .toLowerCase();


                button.classList.toggle(
                    "active",
                    buttonValue ===
                    selectedValue
                );

            }
        );

}


/* =========================================================
   LOAD ACCOUNTS
   ========================================================= */

async function loadAccounts() {

    const apiDomain =
        getApiDomain();


    console.log(
        "ACCOUNT LOAD:",
        {
            event:
                selectedEvent,

            selectedDomain:
                selectedDomain,

            apiDomain:
                apiDomain
        }
    );


    const response =
        await fetch(
            `/api/admin/accounts/${encodeURIComponent(selectedEvent)}/${encodeURIComponent(apiDomain)}?time=${Date.now()}`,
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
            data.detail ||
            `Unable to load ${selectedEvent} ${getDisplayDomain()} accounts.`
        );

    }


    accountsCache =
        Array.isArray(
            data.accounts
        )
            ? data.accounts
            : [];


    /* =====================================================
       STATISTICS
       ===================================================== */

    const totalElement =
        document.getElementById(
            "totalAccounts"
        );

    const activeElement =
        document.getElementById(
            "activeAccounts"
        );

    const pendingElement =
        document.getElementById(
            "pendingAccounts"
        );

    const inactiveElement =
        document.getElementById(
            "inactiveAccounts"
        );


    if (totalElement) {

        totalElement.textContent =
            data.total ??
            accountsCache.length;

    }


    if (activeElement) {

        activeElement.textContent =
            data.active ??
            data.approved ??
            0;

    }


    if (pendingElement) {

        pendingElement.textContent =
            data.pending ??
            0;

    }


    if (inactiveElement) {

        inactiveElement.textContent =
            data.inactive ??
            data.rejected ??
            0;

    }


    /* =====================================================
       TITLE
       ===================================================== */

    const title =
        document.getElementById(
            "accountListTitle"
        );


    if (title) {

        title.textContent =
            `${
                selectedEvent === "workshop"
                    ? "Workshop"
                    : "Hackathon"
            } — ${getDisplayDomain()}`;

    }


    /* =====================================================
       RENDER
       ===================================================== */

    renderAccounts();

}


/* =========================================================
   RENDER ACCOUNTS
   ========================================================= */

function renderAccounts() {

    if (!tableBody) {

        return;

    }


    const keyword =
        (
            searchInput?.value ||
            ""
        )
        .trim()
        .toLowerCase();


    const visible =
        accountsCache.filter(
            function(account) {

                const text = [

                    account.name,

                    account.team_name,

                    account.email,

                    account.phone,

                    account.domain,

                    account.status

                ]
                .join(" ")
                .toLowerCase();


                return (
                    !keyword ||
                    text.includes(
                        keyword
                    )
                );

            }
        );


    if (!visible.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">

                    <div class="empty-accounts">

                        <span>
                            ◈
                        </span>

                        <strong>
                            NO ACCOUNTS FOUND
                        </strong>

                        <small>
                            Registered accounts
                            will appear here.
                        </small>

                    </div>

                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        visible
            .map(
                function(
                    account,
                    index
                ) {

                    const status =
                        normalizedStatus(
                            account.status
                        );


                    const displayName =
                        selectedEvent ===
                        "workshop"

                            ? (
                                account.name ||
                                "-"
                            )

                            : (
                                account.team_name ||
                                "-"
                            );


                    const organization =
                        selectedEvent ===
                        "workshop"

                            ? "Workshop Participant"

                            : `${
                                account.member_count ||
                                (
                                    account.team_members ||
                                    []
                                ).length
                            } Member Team`;


                    /*
                       ACCEPT:

                       pending
                       rejected

                       REJECT:

                       pending
                       approved
                    */

                    const canApprove =
                        status === "pending" ||
                        status === "rejected";


                    const canReject =
                        status === "pending" ||
                        status === "approved";


                    return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                ${escapeHtml(
                                    displayName
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    account.email
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    organization
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        account.registered_at
                                    )
                                )}
                            </td>

                            <td>

                                <span
                                    class="
                                        status-badge
                                        status-${escapeHtml(
                                            status
                                        )}
                                    "
                                >

                                    ${statusLabel(
                                        status
                                    )}

                                </span>

                            </td>

                            <td>

                                <div
                                    class="account-action-group"
                                    style="
                                        display:flex;
                                        gap:6px;
                                        align-items:center;
                                        flex-wrap:wrap;
                                    "
                                >

                                    ${
                                        canApprove

                                            ? `

                                                <button
                                                    type="button"
                                                    class="
                                                        approval-btn
                                                        approve
                                                    "
                                                    data-action="approve"
                                                    data-id="${escapeHtml(
                                                        account.id
                                                    )}"
                                                >
                                                    ACCEPT
                                                </button>

                                            `

                                            : ""
                                    }


                                    ${
                                        canReject

                                            ? `

                                                <button
                                                    type="button"
                                                    class="
                                                        approval-btn
                                                        reject
                                                    "
                                                    data-action="reject"
                                                    data-id="${escapeHtml(
                                                        account.id
                                                    )}"
                                                >
                                                    REJECT
                                                </button>

                                            `

                                            : ""
                                    }


                                    <button
                                        type="button"
                                        class="
                                            approval-btn
                                            delete
                                        "
                                        data-action="delete"
                                        data-id="${escapeHtml(
                                            account.id
                                        )}"
                                    >
                                        DELETE
                                    </button>

                                </div>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    /* =====================================================
       ACTION BUTTON EVENTS
       ===================================================== */

    tableBody
        .querySelectorAll(
            "[data-action]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    async function() {

                        const action =
                            button.dataset.action;


                        const id =
                            Number(
                                button.dataset.id
                            );


                        if (
                            !Number.isInteger(id)
                        ) {

                            console.error(
                                "Invalid account ID:",
                                button.dataset.id
                            );

                            return;

                        }


                        /*
                           Prevent double click
                        */

                        button.disabled =
                            true;


                        try {

                            /* ============================
                               ACCEPT
                               ============================ */

                            if (
                                action ===
                                "approve"
                            ) {

                                await changeApprovalStatus(
                                    id,
                                    "approved"
                                );

                                return;

                            }


                            /* ============================
                               REJECT
                               ============================ */

                            if (
                                action ===
                                "reject"
                            ) {

                                await changeApprovalStatus(
                                    id,
                                    "rejected"
                                );

                                return;

                            }


                            /* ============================
                               DELETE
                               ============================ */

                            if (
                                action ===
                                "delete"
                            ) {

                                await deleteAccount(
                                    id
                                );

                                return;

                            }

                        }
                        catch (error) {

                            console.error(
                                "ACCOUNT ACTION ERROR:",
                                error
                            );


                            if (
                                typeof WarRoomError ===
                                "function"
                            ) {

                                await WarRoomError(
                                    error.message ||
                                    "Unable to process account action."
                                );

                            }
                            else {

                                alert(
                                    error.message ||
                                    "Unable to process account action."
                                );

                            }

                        }
                        finally {

                            button.disabled =
                                false;

                        }

                    }
                );

            }
        );

}


/* =========================================================
   CHANGE APPROVAL STATUS
   ========================================================= */

async function changeApprovalStatus(
    accountId,
    status
) {

    const confirmText =
        status === "approved"

            ? "Accept this account?"

            : "Reject this account?";


    let confirmed;


    if (
        typeof WarRoomConfirm ===
        "function"
    ) {

        confirmed =
            await WarRoomConfirm(
                confirmText,
                {
                    title:
                        status === "approved"
                            ? "ACCEPT ACCOUNT"
                            : "REJECT ACCOUNT",

                    variant:
                        status === "approved"
                            ? "success"
                            : "warning",

                    confirmText:
                        status === "approved"
                            ? "ACCEPT"
                            : "REJECT",

                    cancelText:
                        "CANCEL"
                }
            );

    }
    else {

        confirmed =
            window.confirm(
                confirmText
            );

    }


    if (!confirmed) {

        return;

    }


    const apiDomain =
        getApiDomain();


    console.log(
        "ACCOUNT STATUS UPDATE:",
        {
            event:
                selectedEvent,

            domain:
                apiDomain,

            accountId:
                accountId,

            status:
                status
        }
    );


    const response =
        await fetch(
            `/api/admin/accounts/${encodeURIComponent(selectedEvent)}/${encodeURIComponent(apiDomain)}/${encodeURIComponent(accountId)}/status`,
            {
                method:
                    "PATCH",

                credentials:
                    "same-origin",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        status:
                            status
                    }),

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
            data.detail ||
            "Unable to update account status."
        );

    }


    await loadAccounts();

}


/* =========================================================
   DELETE SINGLE ACCOUNT
   ========================================================= */

async function deleteAccount(
    accountId
) {

    let confirmed;


    if (
        typeof WarRoomConfirm ===
        "function"
    ) {

        confirmed =
            await WarRoomConfirm(
                "Delete this account permanently?",
                {
                    title:
                        "DELETE ACCOUNT",

                    variant:
                        "error",

                    confirmText:
                        "DELETE",

                    cancelText:
                        "CANCEL"
                }
            );

    }
    else {

        confirmed =
            window.confirm(
                "Delete this account permanently?"
            );

    }


    if (!confirmed) {

        return;

    }


    const apiDomain =
        getApiDomain();


    console.log(
        "ACCOUNT DELETE:",
        {
            event:
                selectedEvent,

            domain:
                apiDomain,

            accountId:
                accountId
        }
    );


    const response =
        await fetch(
            `/api/admin/accounts/${encodeURIComponent(selectedEvent)}/${encodeURIComponent(apiDomain)}/${encodeURIComponent(accountId)}`,
            {
                method:
                    "DELETE",

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
            data.detail ||
            "Unable to delete account."
        );

    }


    await loadAccounts();

}


/* =========================================================
   DELETE ALL ACCOUNTS
   ========================================================= */

async function deleteAllAccounts() {

    const displayEvent =
        selectedEvent === "workshop"
            ? "Workshop"
            : "Hackathon";


    const displayDomain =
        getDisplayDomain();


    let confirmed;


    if (
        typeof WarRoomConfirm ===
        "function"
    ) {

        confirmed =
            await WarRoomConfirm(
                `Delete ALL accounts for ${displayEvent} / ${displayDomain}?`,
                {
                    title:
                        "DELETE ALL ACCOUNTS",

                    variant:
                        "error",

                    confirmText:
                        "DELETE ALL",

                    cancelText:
                        "CANCEL"
                }
            );

    }
    else {

        confirmed =
            window.confirm(
                `Delete ALL accounts for ${displayEvent} / ${displayDomain}?`
            );

    }


    if (!confirmed) {

        return;

    }


    const apiDomain =
        getApiDomain();


    console.log(
        "DELETE ALL ACCOUNTS:",
        {
            event:
                selectedEvent,

            domain:
                apiDomain
        }
    );


    const response =
        await fetch(
            `/api/admin/accounts/${encodeURIComponent(selectedEvent)}/${encodeURIComponent(apiDomain)}`,
            {
                method:
                    "DELETE",

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
            data.detail ||
            "Unable to delete accounts."
        );

    }


    await loadAccounts();

}


/* =========================================================
   SETUP EVENT / DOMAIN SELECTORS
   ========================================================= */

function setupSelectors() {

    /* =====================================================
       EVENT SELECTOR
       ===================================================== */

    eventButtons.forEach(
        function(button) {

            button.addEventListener(
                "click",
                async function() {

                    selectedEvent =
                        String(
                            button.dataset.event ||
                            "workshop"
                        )
                        .toLowerCase();


                    /*
                       IMPORTANT:

                       Do NOT modify selectedDomain
                       here.

                       selectedDomain remains:

                       ceh
                       vapt
                       soc
                       forensics

                       getApiDomain() handles
                       _hackathon automatically.
                    */


                    setActiveCard(
                        ".account-event-card",
                        "event",
                        selectedEvent
                    );


                    setActiveCard(
                        ".account-domain-card",
                        "domain",
                        selectedDomain
                    );


                    console.log(
                        "EVENT CHANGED:",
                        selectedEvent,
                        "API DOMAIN:",
                        getApiDomain()
                    );


                    try {

                        await loadAccounts();

                    }
                    catch (error) {

                        console.error(
                            "ACCOUNT LOAD ERROR:",
                            error
                        );


                        if (
                            typeof WarRoomError ===
                            "function"
                        ) {

                            await WarRoomError(
                                error.message ||
                                "Unable to load accounts."
                            );

                        }
                        else {

                            alert(
                                error.message ||
                                "Unable to load accounts."
                            );

                        }

                    }

                }
            );

        }
    );


    /* =====================================================
       DOMAIN SELECTOR
       ===================================================== */

    domainButtons.forEach(
        function(button) {

            button.addEventListener(
                "click",
                async function() {

                    /*
                       IMPORTANT:

                       Keep only base domain.

                       NEVER append _hackathon here.
                    */

                    selectedDomain =
                        String(
                            button.dataset.domain ||
                            "ceh"
                        )
                        .replace(
                            "_hackathon",
                            ""
                        )
                        .toLowerCase();


                    setActiveCard(
                        ".account-domain-card",
                        "domain",
                        selectedDomain
                    );


                    console.log(
                        "DOMAIN CHANGED:",
                        selectedDomain,
                        "API DOMAIN:",
                        getApiDomain()
                    );


                    try {

                        await loadAccounts();

                    }
                    catch (error) {

                        console.error(
                            "ACCOUNT LOAD ERROR:",
                            error
                        );


                        if (
                            typeof WarRoomError ===
                            "function"
                        ) {

                            await WarRoomError(
                                error.message ||
                                "Unable to load accounts."
                            );

                        }
                        else {

                            alert(
                                error.message ||
                                "Unable to load accounts."
                            );

                        }

                    }

                }
            );

        }
    );

}


/* =========================================================
   SEARCH
   ========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function() {

            renderAccounts();

        }
    );

}


/* =========================================================
   REFRESH
   ========================================================= */

if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        async function() {

            try {

                await loadAccounts();

            }
            catch (error) {

                console.error(
                    "ACCOUNT REFRESH ERROR:",
                    error
                );


                if (
                    typeof WarRoomError ===
                    "function"
                ) {

                    await WarRoomError(
                        error.message ||
                        "Unable to refresh accounts."
                    );

                }
                else {

                    alert(
                        error.message ||
                        "Unable to refresh accounts."
                    );

                }

            }

        }
    );

}


/* =========================================================
   DELETE ALL
   ========================================================= */

if (deleteAllButton) {

    deleteAllButton.addEventListener(
        "click",
        async function() {

            try {

                await deleteAllAccounts();

            }
            catch (error) {

                console.error(
                    "DELETE ALL ERROR:",
                    error
                );


                if (
                    typeof WarRoomError ===
                    "function"
                ) {

                    await WarRoomError(
                        error.message ||
                        "Unable to delete accounts."
                    );

                }
                else {

                    alert(
                        error.message ||
                        "Unable to delete accounts."
                    );

                }

            }

        }
    );

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        setupSelectors();


        /* =================================================
           INITIAL ACTIVE CARDS
           ================================================= */

        setActiveCard(
            ".account-event-card",
            "event",
            selectedEvent
        );


        setActiveCard(
            ".account-domain-card",
            "domain",
            selectedDomain
        );


        console.log(
            "ACCOUNT MANAGEMENT INITIALIZED:",
            {
                event:
                    selectedEvent,

                selectedDomain:
                    selectedDomain,

                apiDomain:
                    getApiDomain()
            }
        );


        try {

            await loadAccounts();

        }
        catch (error) {

            console.error(
                "ACCOUNT MANAGEMENT LOAD ERROR:",
                error
            );


            if (tableBody) {

                tableBody.innerHTML = `

                    <tr>

                        <td colspan="7">

                            <div
                                class="empty-accounts"
                            >

                                <strong>
                                    ${escapeHtml(
                                        error.message
                                    )}
                                </strong>

                            </div>

                        </td>

                    </tr>

                `;

            }

        }

    }
);