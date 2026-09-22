/* =========================================================
   WAR ROOM
   COMMON THEMED MODAL SYSTEM
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
       ===================================================== */

    let modalElement = null;

    let resolveCurrent = null;


    /* =====================================================
       CREATE MODAL
       ===================================================== */

    function createModal() {

        if (modalElement) {
            return modalElement;
        }


        const modal =
            document.createElement("div");


        modal.id =
            "warRoomDialog";


        modal.className =
            "warroom-dialog-overlay";


        modal.innerHTML = `

            <div
                class="warroom-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="warroomDialogTitle"
            >

                <div class="warroom-dialog-header">

                    <div class="warroom-dialog-icon">
                        !
                    </div>

                    <div class="warroom-dialog-title-wrap">

                        <div
                            id="warroomDialogTitle"
                            class="warroom-dialog-title"
                        >
                            WAR ROOM
                        </div>

                        <div
                            id="warroomDialogType"
                            class="warroom-dialog-type"
                        >
                            SYSTEM MESSAGE
                        </div>

                    </div>

                </div>


                <div
                    id="warroomDialogMessage"
                    class="warroom-dialog-message"
                >
                </div>


                <div
                    id="warroomDialogActions"
                    class="warroom-dialog-actions"
                >

                    <button
                        type="button"
                        id="warroomDialogCancel"
                        class="warroom-dialog-btn warroom-dialog-btn-cancel"
                    >
                        CANCEL
                    </button>


                    <button
                        type="button"
                        id="warroomDialogConfirm"
                        class="warroom-dialog-btn warroom-dialog-btn-confirm"
                    >
                        OK
                    </button>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );


        modalElement =
            modal;


        setupModalEvents();


        return modal;

    }


    /* =====================================================
       MODAL EVENTS
       ===================================================== */

    function setupModalEvents() {

        if (!modalElement) {
            return;
        }


        const cancelButton =
            document.getElementById(
                "warroomDialogCancel"
            );


        const confirmButton =
            document.getElementById(
                "warroomDialogConfirm"
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                function () {

                    closeModal(false);

                }
            );

        }


        if (confirmButton) {

            confirmButton.addEventListener(
                "click",
                function () {

                    closeModal(true);

                }
            );

        }


        modalElement.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modalElement
                ) {

                    const type =
                        modalElement.dataset.type
                        || "alert";


                    /*
                       Alert:
                       Outside click does nothing.

                       Confirm:
                       Outside click means CANCEL.
                    */

                    if (
                        type ===
                        "confirm"
                    ) {

                        closeModal(false);

                    }

                }

            }
        );

    }


    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    function closeModal(
        result
    ) {

        if (!modalElement) {
            return;
        }


        modalElement.classList.remove(
            "show"
        );


        document.body.classList.remove(
            "warroom-dialog-open"
        );


        const resolver =
            resolveCurrent;


        resolveCurrent =
            null;


        if (resolver) {

            resolver(
                result
            );

        }

    }


    /* =====================================================
       OPEN MODAL
       ===================================================== */

    function openModal(
        options
    ) {

        return new Promise(
            function (resolve) {

                const modal =
                    createModal();


                resolveCurrent =
                    resolve;


                const titleElement =
                    document.getElementById(
                        "warroomDialogTitle"
                    );


                const typeElement =
                    document.getElementById(
                        "warroomDialogType"
                    );


                const messageElement =
                    document.getElementById(
                        "warroomDialogMessage"
                    );


                const cancelButton =
                    document.getElementById(
                        "warroomDialogCancel"
                    );


                const confirmButton =
                    document.getElementById(
                        "warroomDialogConfirm"
                    );


                const type =
                    options.type
                    ||
                    "alert";


                const title =
                    options.title
                    ||
                    "WAR ROOM";


                const message =
                    options.message
                    ||
                    "";


                const confirmText =
                    options.confirmText
                    ||
                    "OK";


                const cancelText =
                    options.cancelText
                    ||
                    "CANCEL";


                modal.dataset.type =
                    type;


                modal.dataset.variant =
                    options.variant
                    ||
                    "warning";


                /* =========================================
                   TITLE
                   ========================================= */

                if (titleElement) {

                    titleElement.textContent =
                        title;

                }


                /* =========================================
                   TYPE
                   ========================================= */

                if (typeElement) {

                    if (
                        type ===
                        "confirm"
                    ) {

                        typeElement.textContent =
                            "CONFIRM ACTION";

                    }

                    else {

                        typeElement.textContent =
                            "SYSTEM MESSAGE";

                    }

                }


                /* =========================================
                   MESSAGE
                   ========================================= */

                if (messageElement) {

                    messageElement.textContent =
                        message;

                }


                /* =========================================
                   BUTTONS
                   ========================================= */

                if (cancelButton) {

                    cancelButton.textContent =
                        cancelText;


                    cancelButton.style.display =
                        type === "confirm"
                            ? "inline-flex"
                            : "none";

                }


                if (confirmButton) {

                    confirmButton.textContent =
                        confirmText;

                }


                /* =========================================
                   VARIANT
                   ========================================= */

                modal.classList.remove(
                    "success",
                    "error",
                    "warning",
                    "info"
                );


                modal.classList.add(
                    options.variant
                    ||
                    "warning"
                );


                /* =========================================
                   SHOW
                   ========================================= */

                document.body.classList.add(
                    "warroom-dialog-open"
                );


                requestAnimationFrame(
                    function () {

                        modal.classList.add(
                            "show"
                        );


                        if (confirmButton) {

                            confirmButton.focus();

                        }

                    }
                );

            }
        );

    }


    /* =====================================================
       WAR ROOM ALERT
       ===================================================== */

    window.WarRoomAlert =
        function (
            message,
            options = {}
        ) {

            return openModal({

                type:
                    "alert",

                title:
                    options.title
                    ||
                    "WAR ROOM",

                message:
                    message,

                confirmText:
                    options.confirmText
                    ||
                    "OK",

                variant:
                    options.variant
                    ||
                    "warning"

            });

        };


    /* =====================================================
       WAR ROOM CONFIRM
       ===================================================== */

    window.WarRoomConfirm =
        function (
            message,
            options = {}
        ) {

            return openModal({

                type:
                    "confirm",

                title:
                    options.title
                    ||
                    "CONFIRM ACTION",

                message:
                    message,

                confirmText:
                    options.confirmText
                    ||
                    "CONFIRM",

                cancelText:
                    options.cancelText
                    ||
                    "CANCEL",

                variant:
                    options.variant
                    ||
                    "warning"

            });

        };


    /* =====================================================
       SUCCESS
       ===================================================== */

    window.WarRoomSuccess =
        function (
            message,
            title = "SUCCESS"
        ) {

            return WarRoomAlert(
                message,
                {

                    title:
                        title,

                    variant:
                        "success"

                }
            );

        };


    /* =====================================================
       ERROR
       ===================================================== */

    window.WarRoomError =
        function (
            message,
            title = "ERROR"
        ) {

            return WarRoomAlert(
                message,
                {

                    title:
                        title,

                    variant:
                        "error"

                }
            );

        };


    /* =====================================================
       WARNING
       ===================================================== */

    window.WarRoomWarning =
        function (
            message,
            title = "WARNING"
        ) {

            return WarRoomAlert(
                message,
                {

                    title:
                        title,

                    variant:
                        "warning"

                }
            );

        };


    /* =====================================================
       INFO
       ===================================================== */

    window.WarRoomInfo =
        function (
            message,
            title = "INFORMATION"
        ) {

            return WarRoomAlert(
                message,
                {

                    title:
                        title,

                    variant:
                        "info"

                }
            );

        };


    /* =====================================================
       ESC KEY
       ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {

                return;

            }


            if (
                !modalElement
                ||
                !modalElement.classList.contains(
                    "show"
                )
            ) {

                return;

            }


            const type =
                modalElement.dataset.type
                ||
                "alert";


            /*
               ESC closes alert.
               ESC cancels confirmation.
            */

            closeModal(
                type === "confirm"
                    ? false
                    : true
            );

        }
    );


    /* =====================================================
       GLOBAL HELPERS
       ===================================================== */

    window.WarRoomDialog = {

        alert:
            window.WarRoomAlert,

        confirm:
            window.WarRoomConfirm,

        success:
            window.WarRoomSuccess,

        error:
            window.WarRoomError,

        warning:
            window.WarRoomWarning,

        info:
            window.WarRoomInfo

    };


})();