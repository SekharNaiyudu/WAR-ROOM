/* =========================================================
   WAR ROOM — ADMIN APPROVAL NOTIFICATIONS
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       LOAD PENDING REGISTRATION COUNT
       ===================================================== */

    async function loadPendingNotifications() {

        try {

            const response =
                await fetch(
                    "/api/admin/notifications/registrations?time=" +
                    Date.now(),
                    {
                        method:
                            "GET",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store"
                    }
                );


            if (!response.ok) {

                return;

            }


            const data =
                await response
                    .json()
                    .catch(
                        function() {

                            return {};

                        }
                    );


            const count =
                Number(
                    data.pending_count ||
                    0
                );


            /*
               Dashboard notification
               buttons.
            */

            const buttons =
                document.querySelectorAll(
                    ".header-icon-button"
                );


            if (!buttons.length) {

                return;

            }


            /*
               First header icon is
               notification bell.
            */

            const notificationButton =
                buttons[0];


            notificationButton.style.position =
                "relative";


            notificationButton.title =
                count

                    ? `${count} pending registration${
                        count === 1
                            ? ""
                            : "s"
                      }`

                    : "No pending registrations";


            /* =================================================
               FIND EXISTING BADGE
               ================================================= */

            let badge =
                notificationButton.querySelector(
                    ".approval-notification-badge"
                );


            /* =================================================
               CREATE BADGE
               ================================================= */

            if (
                count > 0 &&
                !badge
            ) {

                badge =
                    document.createElement(
                        "span"
                    );


                badge.className =
                    "approval-notification-badge";


                badge.style.position =
                    "absolute";

                badge.style.top =
                    "-4px";

                badge.style.right =
                    "-4px";

                badge.style.minWidth =
                    "18px";

                badge.style.height =
                    "18px";

                badge.style.padding =
                    "0 4px";

                badge.style.borderRadius =
                    "999px";

                badge.style.background =
                    "#e50914";

                badge.style.color =
                    "#ffffff";

                badge.style.display =
                    "flex";

                badge.style.alignItems =
                    "center";

                badge.style.justifyContent =
                    "center";

                badge.style.fontSize =
                    "9px";

                badge.style.fontWeight =
                    "800";

                badge.style.lineHeight =
                    "1";

                badge.style.pointerEvents =
                    "none";

                badge.style.zIndex =
                    "100";


                notificationButton.appendChild(
                    badge
                );

            }


            /* =================================================
               UPDATE BADGE
               ================================================= */

            if (
                count > 0 &&
                badge
            ) {

                badge.textContent =
                    count > 99
                        ? "99+"
                        : String(count);

            }


            /* =================================================
               REMOVE BADGE WHEN ZERO
               ================================================= */

            if (
                count === 0 &&
                badge
            ) {

                badge.remove();

            }


            /* =================================================
               OPEN ACCOUNT MANAGEMENT
               ================================================= */

            notificationButton.onclick =
                function() {

                    window.location.href =
                        "/admin/accounts";

                };


        }
        catch (error) {

            console.error(
                "ADMIN APPROVAL NOTIFICATION ERROR:",
                error
            );

        }

    }


    /* =====================================================
       DOM READY
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function() {

            loadPendingNotifications();


            /*
               Refresh notification count
               every 5 seconds.
            */

            setInterval(
                function() {

                    loadPendingNotifications();

                },
                5000
            );

        }
    );


})();