/* =========================================================
   WAR ROOM
   WORKSHOP MANAGEMENT
   WORKSHOP.JS
   ========================================================= */


/* =========================================================
   CURRENT DOMAIN
   ========================================================= */

let selectedDomain = "ceh";


/* =========================================================
   DOMAIN INFORMATION
   ========================================================= */

const domainInfo = {

    ceh: {
        name: "CEH",
        title: "CEH Workshop"
    },

    vapt: {
        name: "VAPT",
        title: "VAPT Workshop"
    },

    soc: {
        name: "SOC",
        title: "SOC Workshop"
    },

    forensics: {
        name: "DIGITAL FORENSICS",
        title: "Digital Forensics Workshop"
    }

};


/* =========================================================
   PARTICIPANTS CACHE
   ========================================================= */

let participantsData = [];


/* =========================================================
   NAVIGATION
   ========================================================= */

function goToPage(url) {

    window.location.href = url;

}


/* =========================================================
   SELECT DOMAIN
   ========================================================= */

function selectDomain(domain) {

    if (!domainInfo[domain]) {
        return;
    }


    selectedDomain = domain;


    /* -----------------------------------------------------
       ACTIVE DOMAIN CARD
       ----------------------------------------------------- */

    document
        .querySelectorAll(".workshop-domain-card")
        .forEach(function (card) {

            card.classList.toggle(
                "active",
                card.dataset.domain === domain
            );

        });


    /* -----------------------------------------------------
       SELECTED DOMAIN TEXT
       ----------------------------------------------------- */

    const selectedDomainText =
        document.getElementById(
            "selectedDomainText"
        );


    if (selectedDomainText) {

        selectedDomainText.textContent =
            domainInfo[domain].name;

    }


    /* -----------------------------------------------------
       DOMAIN TITLE
       ----------------------------------------------------- */

    const domainTitle =
        document.getElementById(
            "domainTitle"
        );


    if (domainTitle) {

        domainTitle.textContent =
            domainInfo[domain].title;

    }


    /* -----------------------------------------------------
       PARTICIPANT TITLE
       ----------------------------------------------------- */

    const participantsTitle =
        document.getElementById(
            "participantsTitle"
        );


    if (participantsTitle) {

        participantsTitle.textContent =
            domainInfo[domain].title +
            " — Registered Participants";

    }


    /* -----------------------------------------------------
       LOAD TOOLKITS
       ----------------------------------------------------- */

    loadToolkits();


    /* -----------------------------------------------------
       LOAD PARTICIPANTS
       ----------------------------------------------------- */

    loadParticipants();

}


/* =========================================================
   ZIP VALIDATION
   ========================================================= */

function isZipFile(file) {

    if (!file) {
        return false;
    }


    return (
        file.name &&
        file.name
            .toLowerCase()
            .endsWith(".zip")
    );

}


/* =========================================================
   FILE INPUT
   ========================================================= */

function setupFileInput() {

    const browseButton =
        document.getElementById(
            "browseButton"
        );


    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    if (!browseButton || !fileInput) {
        return;
    }


    browseButton.addEventListener(
        "click",
        function () {

            fileInput.click();

        }
    );

}


/* =========================================================
   DRAG AND DROP
   ========================================================= */

function setupDropZone() {

    const dropZone =
        document.getElementById(
            "dropZone"
        );


    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    const fileName =
        document.getElementById(
            "selectedFileName"
        );


    if (!dropZone || !fileInput) {
        return;
    }


    /* -----------------------------------------------------
       DRAG ENTER / OVER
       ----------------------------------------------------- */

    [
        "dragenter",
        "dragover"
    ].forEach(function (eventName) {

        dropZone.addEventListener(
            eventName,
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                dropZone.classList.add(
                    "dragging"
                );

            }
        );

    });


    /* -----------------------------------------------------
       DRAG LEAVE / DROP
       ----------------------------------------------------- */

    [
        "dragleave",
        "drop"
    ].forEach(function (eventName) {

        dropZone.addEventListener(
            eventName,
            function (event) {

                event.preventDefault();
                event.stopPropagation();


                dropZone.classList.remove(
                    "dragging"
                );

            }
        );

    });


    /* -----------------------------------------------------
       DROP FILE
       ----------------------------------------------------- */

    dropZone.addEventListener(
        "drop",
        function (event) {

            const files =
                event.dataTransfer.files;


            if (!files || !files.length) {
                return;
            }


            const file =
                files[0];


            if (!isZipFile(file)) {

                WarRoomAlert(
                    "Only ZIP files are allowed."
                );

                return;
            }


            try {

                const dataTransfer =
                    new DataTransfer();


                dataTransfer.items.add(
                    file
                );


                fileInput.files =
                    dataTransfer.files;


                if (fileName) {

                    fileName.textContent =
                        file.name;

                }


                confirmAndUpload();


            } catch (error) {

                console.error(
                    "DROP FILE ERROR:",
                    error
                );


                WarRoomAlert(
                    "Unable to process the dropped file."
                );

            }

        }
    );

}


/* =========================================================
   UPLOAD TOOLKIT
   ========================================================= */


/* =========================================================
   R2 UPLOAD PROGRESS
   ========================================================= */

let toolkitUploadProgressElement = null;

function formatToolkitUploadBytes(bytes) {

    const value = Number(bytes || 0);

    if (value < 1024) {
        return value + " B";
    }

    if (value < 1024 * 1024) {
        return (value / 1024).toFixed(1) + " KB";
    }

    if (value < 1024 * 1024 * 1024) {
        return (value / (1024 * 1024)).toFixed(1) + " MB";
    }

    return (value / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}


function showToolkitUploadProgress(fileName) {

    hideToolkitUploadProgress();

    const overlay =
        document.createElement("div");

    overlay.id =
        "warRoomToolkitUploadProgress";

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(0, 0, 0, 0.78);
        backdrop-filter: blur(8px);
    `;

    const card =
        document.createElement("div");

    card.style.cssText = `
        width: min(560px, 92vw);
        padding: 28px;
        border: 1px solid rgba(255, 40, 40, 0.65);
        border-radius: 18px;
        background: #111;
        box-shadow: 0 0 40px rgba(255, 0, 0, 0.22);
        color: #fff;
        font-family: Arial, sans-serif;
    `;

    card.innerHTML = `
        <div style="
            font-size:12px;
            letter-spacing:2px;
            color:#ff5555;
            font-weight:700;
            margin-bottom:8px;
        ">
            WAR ROOM
        </div>

        <div style="
            font-size:20px;
            font-weight:800;
            margin-bottom:8px;
        ">
            Uploading Toolkit
        </div>

        <div id="warRoomToolkitUploadFileName" style="
            font-size:13px;
            color:#bdbdbd;
            word-break:break-all;
            margin-bottom:20px;
        "></div>

        <div style="
            width:100%;
            height:14px;
            border-radius:999px;
            overflow:hidden;
            background:#2a2a2a;
            border:1px solid #3a3a3a;
        ">
            <div id="warRoomToolkitUploadBar" style="
                width:0%;
                height:100%;
                border-radius:999px;
                background:linear-gradient(90deg,#e50914,#ff4b4b);
                transition:width .15s linear;
            "></div>
        </div>

        <div id="warRoomToolkitUploadPercent" style="
            margin-top:14px;
            font-size:28px;
            font-weight:800;
        ">
            0%
        </div>

        <div id="warRoomToolkitUploadDetails" style="
            margin-top:5px;
            font-size:13px;
            color:#aaa;
        ">
            0 B / 0 B
        </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const nameElement =
        document.getElementById(
            "warRoomToolkitUploadFileName"
        );

    if (nameElement) {
        nameElement.textContent =
            fileName || "Toolkit.zip";
    }

    toolkitUploadProgressElement =
        overlay;
}


function updateToolkitUploadProgress(
    loaded,
    total
) {

    const overlay =
        toolkitUploadProgressElement ||
        document.getElementById(
            "warRoomToolkitUploadProgress"
        );

    if (!overlay) {
        return;
    }

    const safeTotal =
        Number(total || 0);

    const safeLoaded =
        Number(loaded || 0);

    const percent =
        safeTotal > 0
            ? Math.min(
                100,
                Math.max(
                    0,
                    (safeLoaded / safeTotal) * 100
                )
            )
            : 0;

    const bar =
        document.getElementById(
            "warRoomToolkitUploadBar"
        );

    const percentElement =
        document.getElementById(
            "warRoomToolkitUploadPercent"
        );

    const details =
        document.getElementById(
            "warRoomToolkitUploadDetails"
        );

    if (bar) {
        bar.style.width =
            percent.toFixed(1) + "%";
    }

    if (percentElement) {
        percentElement.textContent =
            Math.round(percent) + "%";
    }

    if (details) {
        details.textContent =
            formatToolkitUploadBytes(
                safeLoaded
            ) +
            " / " +
            formatToolkitUploadBytes(
                safeTotal
            );
    }
}


function hideToolkitUploadProgress() {

    const overlay =
        toolkitUploadProgressElement ||
        document.getElementById(
            "warRoomToolkitUploadProgress"
        );

    if (overlay) {
        overlay.remove();
    }

    toolkitUploadProgressElement =
        null;
}


function uploadFileToR2WithProgress(
    presignedUrl,
    file,
    onProgress
) {

    return new Promise(
        function(resolve, reject) {

            const xhr =
                new XMLHttpRequest();

            xhr.open(
                "PUT",
                presignedUrl,
                true
            );

            xhr.setRequestHeader(
                "Content-Type",
                "application/zip"
            );

            xhr.upload.addEventListener(
                "progress",
                function(event) {

                    if (
                        event.lengthComputable &&
                        typeof onProgress === "function"
                    ) {

                        onProgress(
                            event.loaded,
                            event.total
                        );

                    }

                }
            );

            xhr.addEventListener(
                "load",
                function() {

                    if (
                        xhr.status >= 200 &&
                        xhr.status < 300
                    ) {

                        resolve({
                            ok: true,
                            status: xhr.status,
                            responseText:
                                xhr.responseText || ""
                        });

                        return;
                    }

                    reject(
                        new Error(
                            xhr.responseText ||
                            (
                                "Cloudflare R2 upload failed " +
                                "(HTTP " +
                                xhr.status +
                                "). Check the R2 bucket CORS policy and try again."
                            )
                        )
                    );

                }
            );

            xhr.addEventListener(
                "error",
                function() {

                    reject(
                        new Error(
                            "Network error while uploading to Cloudflare R2. Check the R2 bucket CORS policy and your internet connection."
                        )
                    );

                }
            );

            xhr.addEventListener(
                "abort",
                function() {

                    reject(
                        new Error(
                            "Toolkit upload was cancelled."
                        )
                    );

                }
            );

            xhr.addEventListener(
                "timeout",
                function() {

                    reject(
                        new Error(
                            "Toolkit upload timed out. Please try again."
                        )
                    );

                }
            );

            xhr.send(file);

        }
    );
}


async function uploadToolkit() {

    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    if (!fileInput) {

        console.error(
            "Toolkit file input not found."
        );

        return false;

    }


    const file =
        fileInput.files &&
        fileInput.files[0];


    /* -----------------------------------------------------
       FILE CHECK
       ----------------------------------------------------- */

    if (!file) {

        WarRoomAlert(
            "Please select a ZIP toolkit."
        );

        return false;

    }


    if (!isZipFile(file)) {

        WarRoomAlert(
            "Only ZIP files are allowed."
        );

        fileInput.value = "";

        return false;

    }


    /*
     * IMPORTANT:
     * Do NOT send the ZIP through FastAPI/Vercel Functions.
     * Vercel Functions have a request-body limit. This flow
     * asks the server for a short-lived Blob PUT URL and then
     * uploads the file directly from the browser to Vercel Blob.
     */

    try {

        console.log(
            "===================================="
        );

        console.log(
            "UPLOADING WORKSHOP TOOLKIT DIRECTLY TO R2"
        );

        console.log(
            "DOMAIN:",
            selectedDomain
        );

        console.log(
            "FILE:",
            file.name
        );

        console.log(
            "SIZE:",
            file.size
        );

        console.log(
            "===================================="
        );


        /* -------------------------------------------------
           1. GET SHORT-LIVED SIGNED PUT URL
           ------------------------------------------------- */

        const presignResponse =
            await fetch(
                "/api/toolkit/r2-presign",
                {
                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        event_type:
                            "workshop",

                        item:
                            selectedDomain,

                        filename:
                            file.name,

                        content_type:
                            file.type ||
                            "application/zip",

                        size:
                            file.size

                    })

                }
            );


        let presignData = {};

        try {

            presignData =
                await presignResponse.json();

        } catch (error) {

            presignData = {};

        }


        if (!presignResponse.ok) {

            throw new Error(
                presignData.detail ||
                presignData.message ||
                "Unable to prepare toolkit upload."
            );

        }


        if (
            !presignData.presigned_url ||
            !presignData.pathname
        ) {

            throw new Error(
                "The server did not return a valid R2 upload URL."
            );

        }


        /* -------------------------------------------------
           2. DIRECT BROWSER -> CLOUDFLARE R2 UPLOAD
           ------------------------------------------------- */

        showToolkitUploadProgress(file.name);

        updateToolkitUploadProgress(
            0,
            file.size
        );

        let r2UploadResponse;

        try {

            r2UploadResponse =
                await uploadFileToR2WithProgress(
                    presignData.presigned_url,
                    file,
                    function(
                        loaded,
                        total
                    ) {

                        updateToolkitUploadProgress(
                            loaded,
                            total
                        );

                    }
                );

        } catch (uploadError) {

            hideToolkitUploadProgress();

            throw uploadError;

        }


        /* -------------------------------------------------
           3. SAVE ONLY METADATA IN NEON
           ------------------------------------------------- */

        const completeResponse =
            await fetch(
                "/api/toolkit/r2-complete",
                {
                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        event_type:
                            "workshop",

                        item:
                            selectedDomain,

                        filename:
                            presignData.filename ||
                            file.name,

                        pathname:
                            presignData.pathname,

                        blob_url:
                            presignData.blob_url,

                        download_url:
                            presignData.download_url,

                        content_type:
                            file.type ||
                            "application/zip"

                    })

                }
            );


        let completeData = {};

        try {

            completeData =
                await completeResponse.json();

        } catch (error) {

            completeData = {};

        }


        if (!completeResponse.ok) {

            throw new Error(
                completeData.detail ||
                completeData.message ||
                "Toolkit was uploaded but its metadata could not be saved."
            );

        }


        hideToolkitUploadProgress();

        console.log(
            "WORKSHOP TOOLKIT UPLOADED:",
            completeData
        );


        WarRoomAlert(
            domainInfo[selectedDomain].name +
            " toolkit uploaded successfully."
        );


        /* -------------------------------------------------
           RESET FILE INPUT
           ------------------------------------------------- */

        fileInput.value = "";


        const selectedFileName =
            document.getElementById(
                "selectedFileName"
            );


        if (selectedFileName) {

            selectedFileName.textContent =
                "No file selected";

        }


        /* -------------------------------------------------
           REFRESH LIST
           ------------------------------------------------- */

        await loadToolkits();


        return true;


    } catch (error) {

        hideToolkitUploadProgress();

        console.error(
            "TOOLKIT UPLOAD ERROR:",
            error
        );


        WarRoomAlert(
            error.message ||
            "Toolkit upload failed."
        );


        return false;

    }

}

/* =========================================================
   CONFIRM UPLOAD
   ========================================================= */

async function confirmAndUpload() {

    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    if (!fileInput) {
        return;
    }


    const file =
        fileInput.files &&
        fileInput.files[0];


    if (!file) {
        return;
    }


    /* -----------------------------------------------------
       ZIP CHECK
       ----------------------------------------------------- */

    if (!isZipFile(file)) {

        WarRoomAlert(
            "Only ZIP files are allowed."
        );

        fileInput.value = "";

        return;
    }


    /* -----------------------------------------------------
       CONFIRMATION
       ----------------------------------------------------- */

    const confirmed =
        await WarRoomConfirm(
            "Upload " +
            file.name +
            " to " +
            domainInfo[selectedDomain].name +
            " Workshop?"
        );


    if (!confirmed) {

        fileInput.value = "";


        const selectedFileName =
            document.getElementById(
                "selectedFileName"
            );


        if (selectedFileName) {

            selectedFileName.textContent =
                "No file selected";

        }


        return;
    }


    await uploadToolkit();

}


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


    /* -----------------------------------------------------
       LOADING STATE
       ----------------------------------------------------- */

    list.innerHTML = `
        <div class="empty-toolkit">
            Loading toolkit files...
        </div>
    `;


    try {

        const response =
            await fetch(
                "/api/toolkit/workshop/" +
                encodeURIComponent(
                    selectedDomain
                ) +
                "?time=" +
                Date.now(),
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        /* -------------------------------------------------
           READ RESPONSE
           ------------------------------------------------- */

        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            data = null;

        }


        /* -------------------------------------------------
           API ERROR
           ------------------------------------------------- */

        if (!response.ok) {

            throw new Error(
                data &&
                data.detail
                    ? data.detail
                    : "Unable to load toolkit files."
            );

        }


        /* -------------------------------------------------
           FILE ARRAY
           ------------------------------------------------- */

        const files =
            data &&
            Array.isArray(data.files)
                ? data.files
                : [];


        /* -------------------------------------------------
           UPDATE TOOLKIT COUNT
           ------------------------------------------------- */

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


        /* -------------------------------------------------
           EMPTY
           ------------------------------------------------- */

        if (!files.length) {

            list.innerHTML = `
                <div class="empty-toolkit">
                    No toolkit uploaded yet.
                </div>
            `;

            return;
        }


        /* -------------------------------------------------
           CLEAR LIST
           ------------------------------------------------- */

        list.innerHTML = "";


        /* -------------------------------------------------
           RENDER FILES
           ------------------------------------------------- */

        files.forEach(
            function (file) {

                const filename =
                    file.filename ||
                    "Toolkit.zip";


                const row =
                    document.createElement(
                        "div"
                    );


                row.className =
                    "toolkit-file";


                const info =
                    document.createElement(
                        "div"
                    );


                info.className =
                    "toolkit-file-info";


                const filenameElement =
                    document.createElement(
                        "strong"
                    );


                filenameElement.textContent =
                    filename;


                const domainElement =
                    document.createElement(
                        "small"
                    );


                domainElement.textContent =
                    domainInfo[
                        selectedDomain
                    ].name;


                info.appendChild(
                    filenameElement
                );


                info.appendChild(
                    domainElement
                );


                const actions =
                    document.createElement(
                        "div"
                    );


                actions.className =
                    "toolkit-file-actions";


                const download =
                    document.createElement(
                        "a"
                    );


                download.className =
                    "toolkit-file-download";


                download.href =
                    file.download_url ||
                    (
                        "/api/toolkit/download/" +
                        "workshop/" +
                        encodeURIComponent(
                            selectedDomain
                        ) +
                        "/" +
                        encodeURIComponent(
                            filename
                        )
                    );


                download.setAttribute(
                    "download",
                    ""
                );


                download.textContent =
                    "DOWNLOAD";


                const deleteButton =
                    document.createElement(
                        "button"
                    );


                deleteButton.type =
                    "button";


                deleteButton.className =
                    "toolkit-file-delete";


                deleteButton.textContent =
                    "DELETE";


                deleteButton.addEventListener(
                    "click",
                    function () {

                        deleteToolkit(
                            filename
                        );

                    }
                );


                actions.appendChild(
                    download
                );


                actions.appendChild(
                    deleteButton
                );


                row.appendChild(
                    info
                );


                row.appendChild(
                    actions
                );


                list.appendChild(
                    row
                );

            }
        );


    } catch (error) {

        console.error(
            "TOOLKIT LOAD ERROR:",
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
   DELETE TOOLKIT
   ========================================================= */

async function deleteToolkit(filename) {

    if (!filename) {

        WarRoomAlert(
            "Invalid toolkit file."
        );

        return;
    }


    const confirmed =
        await WarRoomConfirm(
            "Are you sure you want to delete\n\n" +
            filename +
            "?"
        );


    if (!confirmed) {
        return;
    }


    try {

        console.log(
            "===================================="
        );

        console.log(
            "DELETING WORKSHOP TOOLKIT"
        );

        console.log(
            "DOMAIN:",
            selectedDomain
        );

        console.log(
            "FILE:",
            filename
        );

        console.log(
            "===================================="
        );


        const response =
            await fetch(
                "/api/toolkit/workshop/" +
                encodeURIComponent(selectedDomain) +
                "/" +
                encodeURIComponent(filename),
                {
                    method: "DELETE",
                    credentials: "include",
                    cache: "no-store"
                }
            );


        let result = null;


        try {

            result =
                await response.json();

        } catch (error) {

            result = null;

        }


        if (!response.ok) {

            throw new Error(
                result &&
                result.detail
                    ? result.detail
                    : "Toolkit delete failed."
            );

        }


        console.log(
            "TOOLKIT DELETED:",
            result
        );


        WarRoomAlert(
            filename +
            " deleted successfully."
        );


        await loadToolkits();


    } catch (error) {

        console.error(
            "TOOLKIT DELETE ERROR:",
            error
        );


        WarRoomAlert(
            error.message ||
            "Unable to delete toolkit."
        );

    }

}


/* =========================================================
   DOMAIN CARDS
   ========================================================= */

function setupDomainCards() {

    document
        .querySelectorAll(
            ".workshop-domain-card"
        )
        .forEach(function (card) {

            card.addEventListener(
                "click",
                function () {

                    selectDomain(
                        card.dataset.domain
                    );

                }
            );

        });

}


/* =========================================================
   UPLOAD BUTTONS
   ========================================================= */

function setupUploadButtons() {

    const uploadButton =
        document.getElementById(
            "uploadFromDomain"
        );


    const fileInput =
        document.getElementById(
            "toolkitFile"
        );


    if (!fileInput) {
        return;
    }


    /* -----------------------------------------------------
       DOMAIN UPLOAD BUTTON
       ----------------------------------------------------- */

    if (uploadButton) {

        uploadButton.addEventListener(
            "click",
            function () {

                fileInput.click();

            }
        );

    }


    /* -----------------------------------------------------
       FILE SELECT
       ----------------------------------------------------- */

    fileInput.addEventListener(
        "change",
        async function () {

            const file =
                fileInput.files &&
                fileInput.files[0];


            if (!file) {
                return;
            }


            if (!isZipFile(file)) {

                WarRoomAlert(
                    "Only ZIP files are allowed."
                );

                fileInput.value = "";

                return;
            }


            const selectedFileName =
                document.getElementById(
                    "selectedFileName"
                );


            if (selectedFileName) {

                selectedFileName.textContent =
                    file.name;

            }


            await confirmAndUpload();

        }
    );

}


/* =========================================================
   REFRESH TOOLKIT
   ========================================================= */

function setupRefresh() {

    const refreshButton =
        document.getElementById(
            "refreshToolkit"
        );


    if (!refreshButton) {
        return;
    }


    refreshButton.addEventListener(
        "click",
        async function () {

            await loadToolkits();

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
        function () {

            window.location.href =
                "/admin";

        }
    );

}


/* =========================================================
   PARTICIPANT SEARCH
   ========================================================= */

function setupSearch() {

    const search =
        document.getElementById(
            "participantSearch"
        );


    const tableSearch =
        document.getElementById(
            "tableSearch"
        );


    if (!search || !tableSearch) {
        return;
    }


    search.addEventListener(
        "input",
        function () {

            tableSearch.value =
                search.value;


            tableSearch.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true
                    }
                )
            );

        }
    );

}


/* =========================================================
   PARTICIPANT TABLE BODY
   ========================================================= */

function getParticipantTableBody() {

    /* -----------------------------------------------------
       TRY COMMON IDS
       ----------------------------------------------------- */

    const possibleIds = [

        "participantsTableBody",

        "participantTableBody",

        "participantsBody",

        "participantTable"

    ];


    for (
        let i = 0;
        i < possibleIds.length;
        i++
    ) {

        const element =
            document.getElementById(
                possibleIds[i]
            );


        if (element) {
            return element;
        }

    }


    /* -----------------------------------------------------
       TRY TABLE TBODY
       ----------------------------------------------------- */

    const tbody =
        document.querySelector(
            "#participantsTable tbody"
        );


    if (tbody) {
        return tbody;
    }


    const genericTbody =
        document.querySelector(
            ".participants-table tbody"
        );


    if (genericTbody) {
        return genericTbody;
    }


    return null;

}


/* =========================================================
   UPDATE PARTICIPANT COUNTERS
   ========================================================= */

function updateParticipantCounters(
    participants
) {

    const total =
        participants.length;


    /* -----------------------------------------------------
       ACTIVE
       ----------------------------------------------------- */

    const active =
        participants.filter(
            function (participant) {

                const status =
                    String(
                        participant.status || ""
                    ).toLowerCase();


                return (
                    status === "active" ||
                    status === "registered"
                );

            }
        ).length;


    /* -----------------------------------------------------
       COMPLETED
       ----------------------------------------------------- */

    const completed =
        participants.filter(
            function (participant) {

                return (
                    String(
                        participant.status || ""
                    ).toLowerCase()
                    ===
                    "completed"
                );

            }
        ).length;


    /* -----------------------------------------------------
       INACTIVE
       ----------------------------------------------------- */

    const inactive =
        participants.filter(
            function (participant) {

                const status =
                    String(
                        participant.status || ""
                    ).toLowerCase();


                return (
                    status === "inactive" ||
                    status === "disabled"
                );

            }
        ).length;


    /* -----------------------------------------------------
       UPDATE ELEMENT HELPER
       ----------------------------------------------------- */

    function updateElement(
        ids,
        value
    ) {

        for (
            let i = 0;
            i < ids.length;
            i++
        ) {

            const element =
                document.getElementById(
                    ids[i]
                );


            if (element) {

                element.textContent =
                    value;

                return;

            }

        }

    }


    /* -----------------------------------------------------
       TOTAL
       ----------------------------------------------------- */

    updateElement(
        [
            "totalRegistered",
            "totalParticipants",
            "registeredCount"
        ],
        total
    );


    /* -----------------------------------------------------
       ACTIVE
       ----------------------------------------------------- */

    updateElement(
        [
            "activeParticipants",
            "activeCount",
            "participantActiveCount"
        ],
        active
    );


    /* -----------------------------------------------------
       COMPLETED
       ----------------------------------------------------- */

    updateElement(
        [
            "completedParticipants",
            "completedCount",
            "participantCompletedCount"
        ],
        completed
    );


    /* -----------------------------------------------------
       INACTIVE
       ----------------------------------------------------- */

    updateElement(
        [
            "inactiveParticipants",
            "inactiveCount",
            "participantInactiveCount"
        ],
        inactive
    );

}


/* =========================================================
   FORMAT REGISTERED DATE
   ========================================================= */

function formatRegisteredDate(
    dateValue
) {

    if (!dateValue) {
        return "—";
    }


    const date =
        new Date(dateValue);


    if (Number.isNaN(
        date.getTime()
    )) {

        return dateValue;

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
   STATUS CLASS
   ========================================================= */

function getStatusClass(status) {

    const normalized =
        String(
            status || "registered"
        )
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );


    return (
        "status-" +
        normalized
    );

}


/* =========================================================
   RENDER PARTICIPANTS
   ========================================================= */

function renderParticipants(
    participants
) {

    const tbody =
        getParticipantTableBody();


    if (!tbody) {

        console.warn(
            "Participant table body not found in HTML."
        );

        return;

    }


    tbody.innerHTML = "";


    /* -----------------------------------------------------
       EMPTY
       ----------------------------------------------------- */

    if (!participants.length) {

        const row =
            document.createElement(
                "tr"
            );


        const cell =
            document.createElement(
                "td"
            );


        cell.colSpan = 7;


        cell.textContent =
            "No registered participants yet.";


        cell.style.textAlign =
            "center";


        cell.style.padding =
            "40px 20px";


        cell.style.color =
            "#666";


        row.appendChild(
            cell
        );


        tbody.appendChild(
            row
        );


        return;

    }


    /* -----------------------------------------------------
       PARTICIPANT ROWS
       ----------------------------------------------------- */

    participants.forEach(
        function (
            participant,
            index
        ) {

            const row =
                document.createElement(
                    "tr"
                );


            /* ---------------------------------------------
               # 
               --------------------------------------------- */

            const numberCell =
                document.createElement(
                    "td"
                );


            numberCell.textContent =
                index + 1;


            /* ---------------------------------------------
               NAME
               --------------------------------------------- */

            const nameCell =
                document.createElement(
                    "td"
                );


            nameCell.textContent =
                participant.name ||
                "—";


            /* ---------------------------------------------
               EMAIL
               --------------------------------------------- */

            const emailCell =
                document.createElement(
                    "td"
                );


            emailCell.textContent =
                participant.email ||
                "—";


            /* ---------------------------------------------
               PHONE
               --------------------------------------------- */

            const phoneCell =
                document.createElement(
                    "td"
                );


            phoneCell.textContent =
                participant.phone ||
                "—";


            /* ---------------------------------------------
               REGISTERED DATE
               --------------------------------------------- */

            const dateCell =
                document.createElement(
                    "td"
                );


            dateCell.textContent =
                formatRegisteredDate(
                    participant.registered_at
                );


            /* ---------------------------------------------
               STATUS
               --------------------------------------------- */

            const statusCell =
                document.createElement(
                    "td"
                );


            const statusBadge =
                document.createElement(
                    "span"
                );


            const status =
                participant.status ||
                "registered";


            statusBadge.className =
                "participant-status " +
                getStatusClass(
                    status
                );


            statusBadge.textContent =
                String(status)
                    .toUpperCase();


            statusCell.appendChild(
                statusBadge
            );


            /* ---------------------------------------------
               ACTION
               --------------------------------------------- */

            const actionCell =
                document.createElement(
                    "td"
                );


            const actionButton =
                document.createElement(
                    "button"
                );


            actionButton.type =
                "button";


            actionButton.className =
                "participant-action";


            actionButton.textContent =
                "VIEW";


            actionButton.addEventListener(
                "click",
                function () {

                    showParticipantDetails(
                        participant
                    );

                }
            );


            actionCell.appendChild(
                actionButton
            );


            /* ---------------------------------------------
               ADD CELLS
               --------------------------------------------- */

            row.appendChild(
                numberCell
            );


            row.appendChild(
                nameCell
            );


            row.appendChild(
                emailCell
            );


            row.appendChild(
                phoneCell
            );


            row.appendChild(
                dateCell
            );


            row.appendChild(
                statusCell
            );


            row.appendChild(
                actionCell
            );


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   SHOW PARTICIPANT DETAILS
   ========================================================= */

function showParticipantDetails(
    participant
) {

    const message =
        "Participant Details\n\n" +

        "Name: " +
        (participant.name || "—") +

        "\nEmail: " +
        (participant.email || "—") +

        "\nPhone: " +
        (participant.phone || "—") +

        "\nStatus: " +
        (participant.status || "—") +

        "\nRegistered On: " +
        formatRegisteredDate(
            participant.registered_at
        );


    WarRoomAlert(
        message
    );

}


/* =========================================================
   PARTICIPANT TABLE SEARCH
   ========================================================= */

function setupParticipantTableSearch() {

    const search =
        document.getElementById(
            "tableSearch"
        );


    if (!search) {
        return;
    }


    search.addEventListener(
        "input",
        function () {

            const keyword =
                search.value
                    .trim()
                    .toLowerCase();


            const filtered =
                participantsData.filter(
                    function (
                        participant
                    ) {

                        const name =
                            String(
                                participant.name || ""
                            )
                            .toLowerCase();


                        const email =
                            String(
                                participant.email || ""
                            )
                            .toLowerCase();


                        const phone =
                            String(
                                participant.phone || ""
                            )
                            .toLowerCase();


                        const status =
                            String(
                                participant.status || ""
                            )
                            .toLowerCase();


                        return (
                            name.includes(keyword) ||
                            email.includes(keyword) ||
                            phone.includes(keyword) ||
                            status.includes(keyword)
                        );

                    }
                );


            renderParticipants(
                filtered
            );

        }
    );

}


/* =========================================================
   LOAD PARTICIPANTS
   ========================================================= */

async function loadParticipants() {

    const tbody =
        getParticipantTableBody();


    /* -----------------------------------------------------
       SHOW LOADING
       ----------------------------------------------------- */

    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:40px 20px;
                        color:#666;
                    "
                >
                    Loading registered participants...
                </td>
            </tr>
        `;

    }


    try {

        console.log(
            "===================================="
        );

        console.log(
            "LOADING WORKSHOP PARTICIPANTS"
        );

        console.log(
            "DOMAIN:",
            selectedDomain
        );

        console.log(
            "===================================="
        );


        /* -------------------------------------------------
           API REQUEST
           ------------------------------------------------- */

        const response =
            await fetch(
                "/api/admin/accounts/workshop/" +
                encodeURIComponent(
                    selectedDomain
                ) +
                "?time=" +
                Date.now(),
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store"
                }
            );


        /* -------------------------------------------------
           READ RESPONSE
           ------------------------------------------------- */

        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            data = null;

        }


        /* -------------------------------------------------
           API ERROR
           ------------------------------------------------- */

        if (!response.ok) {

            throw new Error(
                data &&
                data.detail
                    ? data.detail
                    : "Unable to load participants."
            );

        }


        /* -------------------------------------------------
           PARTICIPANT ARRAY
           ------------------------------------------------- */

        participantsData =
            data &&
            Array.isArray(
                data.accounts
            )
                ? data.accounts
                : [];


        console.log(
            "PARTICIPANTS RESPONSE:",
            data
        );


        console.log(
            "TOTAL PARTICIPANTS:",
            participantsData.length
        );


        /* -------------------------------------------------
           UPDATE COUNTERS
           ------------------------------------------------- */

        updateParticipantCounters(
            participantsData
        );


        /* -------------------------------------------------
           RENDER TABLE
           ------------------------------------------------- */

        renderParticipants(
            participantsData
        );


    } catch (error) {

        console.error(
            "PARTICIPANTS LOAD ERROR:",
            error
        );


        participantsData = [];


        updateParticipantCounters(
            []
        );


        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        style="
                            text-align:center;
                            padding:40px 20px;
                            color:#ff6971;
                        "
                    >
                        Unable to load registered participants.
                    </td>
                </tr>
            `;

        }

    }

}


/* =========================================================
   PARTICIPANT REFRESH
   ========================================================= */

function setupParticipantRefresh() {

    const refreshButtons = [

        "refreshParticipants",

        "refreshParticipantList",

        "participantRefresh"

    ];


    refreshButtons.forEach(
        function (id) {

            const button =
                document.getElementById(
                    id
                );


            if (!button) {
                return;
            }


            button.addEventListener(
                "click",
                function () {

                    loadParticipants();

                }
            );

        }
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "===================================="
        );

        console.log(
            "WAR ROOM WORKSHOP MANAGEMENT"
        );

        console.log(
            "===================================="
        );


        /* FILE INPUT */

        setupFileInput();


        /* DRAG & DROP */

        setupDropZone();


        /* DOMAIN CARDS */

        setupDomainCards();


        /* UPLOAD */

        setupUploadButtons();


        /* REFRESH TOOLKIT */

        setupRefresh();


        /* LOGOUT */

        setupLogout();


        /* TOP SEARCH */

        setupSearch();


        /* PARTICIPANT SEARCH */

        setupParticipantTableSearch();


        /* PARTICIPANT REFRESH */

        setupParticipantRefresh();


        /* INITIAL TOOLKIT LOAD */

        loadToolkits();


        /* INITIAL PARTICIPANT LOAD */

        loadParticipants();


        console.log(
            "WORKSHOP MANAGEMENT READY"
        );

    }
);

