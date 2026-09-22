/* =========================================================
   WAR ROOM — ADMIN SETTINGS
   SETTINGS.JS
   ========================================================= */


/* =========================================================
   SHOW MESSAGE
   ========================================================= */

function showMessage(
    message,
    type = "error"
) {

    const element =
        document.getElementById(
            "settingsMessage"
        );


    if (!element) {

        return;

    }


    element.textContent =
        message || "";


    element.className =
        `settings-message show ${type}`;

}


/* =========================================================
   CLEAR MESSAGE
   ========================================================= */

function clearMessage() {

    const element =
        document.getElementById(
            "settingsMessage"
        );


    if (!element) {

        return;

    }


    element.textContent =
        "";


    element.className =
        "settings-message";

}


/* =========================================================
   READ JSON RESPONSE
   ========================================================= */

async function readJson(
    response
) {

    return response
        .json()
        .catch(
            () => ({})
        );

}


/* =========================================================
   LOAD CURRENT ADMIN SETTINGS
   ========================================================= */

async function loadAdminSettings() {

    try {

        const response =
            await fetch(
                "/api/admin/settings",
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
            await readJson(
                response
            );


        if (
            !response.ok
        ) {

            throw new Error(
                data.detail ||
                "Unable to load administrator settings."
            );

        }


        const username =
            String(
                data.username ||
                ""
            ).trim();


        const currentUsername =
            document.getElementById(
                "currentUsername"
            );


        const display =
            document.getElementById(
                "adminUsernameDisplay"
            );


        if (
            currentUsername
        ) {

            currentUsername.value =
                username;

        }


        if (
            display &&
            username
        ) {

            display.textContent =
                username.toUpperCase();

        }

    }

    catch (error) {

        if (
            error &&
            error.message
        ) {

            showMessage(
                error.message,
                "error"
            );

        }

    }

}


/* =========================================================
   USERNAME CHANGE
   ========================================================= */

function setupUsernameForm() {

    const form =
        document.getElementById(
            "usernameForm"
        );


    const button =
        document.getElementById(
            "changeUsernameButton"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearMessage();


            const currentUsername =
                document.getElementById(
                    "currentUsername"
                )?.value
                    .trim() ||
                "";


            const newUsername =
                document.getElementById(
                    "newUsername"
                )?.value
                    .trim() ||
                "";


            const confirmUsername =
                document.getElementById(
                    "confirmUsername"
                )?.value
                    .trim() ||
                "";


            /* =================================================
               VALIDATION
               ================================================= */

            if (
                !currentUsername ||
                !newUsername ||
                !confirmUsername
            ) {

                showMessage(
                    "Please fill all username fields."
                );

                return;

            }


            if (
                newUsername.length < 3
            ) {

                showMessage(
                    "New username must contain at least 3 characters."
                );

                return;

            }


            if (
                newUsername !==
                confirmUsername
            ) {

                showMessage(
                    "New username and confirmation do not match."
                );

                return;

            }


            if (
                button
            ) {

                button.disabled =
                    true;

            }


            try {

                const response =
                    await fetch(
                        "/api/admin/settings/username",
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

                                    current_username:
                                        currentUsername,

                                    new_username:
                                        newUsername,

                                    confirm_username:
                                        confirmUsername

                                })

                        }
                    );


                const data =
                    await readJson(
                        response
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.detail ||
                        "Unable to change username."
                    );

                }


                const current =
                    document.getElementById(
                        "currentUsername"
                    );


                const display =
                    document.getElementById(
                        "adminUsernameDisplay"
                    );


                if (
                    current
                ) {

                    current.value =
                        newUsername;

                }


                if (
                    display
                ) {

                    display.textContent =
                        newUsername.toUpperCase();

                }


                const newUsernameInput =
                    document.getElementById(
                        "newUsername"
                    );


                const confirmUsernameInput =
                    document.getElementById(
                        "confirmUsername"
                    );


                if (
                    newUsernameInput
                ) {

                    newUsernameInput.value =
                        "";

                }


                if (
                    confirmUsernameInput
                ) {

                    confirmUsernameInput.value =
                        "";

                }


                showMessage(
                    data.message ||
                    "Administrator username changed successfully.",
                    "success"
                );

            }

            catch (error) {

                showMessage(
                    error.message ||
                    "Unable to change username."
                );

            }

            finally {

                if (
                    button
                ) {

                    button.disabled =
                        false;

                }

            }

        }
    );

}


/* =========================================================
   PASSWORD CHANGE
   ========================================================= */

function setupPasswordForm() {

    const form =
        document.getElementById(
            "passwordForm"
        );


    const button =
        document.getElementById(
            "changePasswordButton"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            clearMessage();


            const currentPassword =
                document.getElementById(
                    "currentPassword"
                )?.value ||
                "";


            const newPassword =
                document.getElementById(
                    "newPassword"
                )?.value ||
                "";


            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                )?.value ||
                "";


            /* =================================================
               VALIDATION
               ================================================= */

            if (
                !currentPassword ||
                !newPassword ||
                !confirmPassword
            ) {

                showMessage(
                    "Please fill all password fields."
                );

                return;

            }


            if (
                newPassword.length < 6
            ) {

                showMessage(
                    "New password must contain at least 6 characters."
                );

                return;

            }


            if (
                newPassword !==
                confirmPassword
            ) {

                showMessage(
                    "New password and confirmation do not match."
                );

                return;

            }


            if (
                button
            ) {

                button.disabled =
                    true;

            }


            try {

                const response =
                    await fetch(
                        "/api/admin/settings/password",
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

                                    current_password:
                                        currentPassword,

                                    new_password:
                                        newPassword,

                                    confirm_password:
                                        confirmPassword

                                })

                        }
                    );


                const data =
                    await readJson(
                        response
                    );


                if (
                    !response.ok
                ) {

                    throw new Error(
                        data.detail ||
                        "Unable to change password."
                    );

                }


                form.reset();


                showMessage(
                    data.message ||
                    "Administrator password changed successfully.",
                    "success"
                );

            }

            catch (error) {

                showMessage(
                    error.message ||
                    "Unable to change password."
                );

            }

            finally {

                if (
                    button
                ) {

                    button.disabled =
                        false;

                }

            }

        }
    );

}


/* =========================================================
   ADMIN LOGOUT
   ========================================================= */

function setupLogout() {

    const button =
        document.getElementById(
            "logoutButton"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        async function () {

            button.disabled =
                true;


            try {

                await fetch(
                    "/api/admin/logout",
                    {
                        method:
                            "POST",

                        credentials:
                            "same-origin",

                        cache:
                            "no-store"
                    }
                );

            }

            catch (error) {

                console.error(
                    "ADMIN LOGOUT ERROR:",
                    error
                );

            }

            finally {

                window.location.replace(
                    "/admin"
                );

            }

        }
    );

}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        setupUsernameForm();

        setupPasswordForm();

        setupLogout();

        await loadAdminSettings();

    }
);