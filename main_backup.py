from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pydantic import BaseModel

from pathlib import Path

import json
import copy
import shutil
import sqlite3
import hashlib
import secrets
import hmac

from datetime import datetime, timezone


# =========================================================
# WAR ROOM FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="WAR ROOM",
    description="SynthoQuest Cybersecurity Event Platform",
    version="1.0.0"
)


# =========================================================
# PROJECT PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

FRONTEND_DIR = BASE_DIR / "frontend"

PUBLIC_DIR = FRONTEND_DIR / "public"
CSS_DIR = FRONTEND_DIR / "css"
JS_DIR = FRONTEND_DIR / "js"
ASSETS_DIR = FRONTEND_DIR / "assets"

DATA_DIR = BASE_DIR / "data"

DATA_FILE = (
    DATA_DIR /
    "war_room_state.json"
)

USER_DATABASE = (
    DATA_DIR /
    "war_room_users.db"
)


# =========================================================
# TOOLKIT DIRECTORIES
# =========================================================

TOOLKIT_DIR = (
    BASE_DIR /
    "toolkits"
)

WORKSHOP_TOOLKIT_DIR = (
    TOOLKIT_DIR /
    "workshop"
)

HACKATHON_TOOLKIT_DIR = (
    TOOLKIT_DIR /
    "hackathon"
)


# =========================================================
# CREATE DIRECTORIES
# =========================================================

DATA_DIR.mkdir(
    parents=True,
    exist_ok=True
)

TOOLKIT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

WORKSHOP_TOOLKIT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

HACKATHON_TOOLKIT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# =========================================================
# DOMAIN CONFIGURATION
# =========================================================

WORKSHOP_DOMAINS = {

    "ceh",

    "vapt",

    "soc",

    "forensics"
}


HACKATHON_DOMAINS = {

    "ceh_hackathon",

    "vapt_hackathon",

    "soc_hackathon",

    "forensics_hackathon"
}


# =========================================================
# DEFAULT SYSTEM STATE
# =========================================================

DEFAULT_STATE = {

    "home": {

        # MAIN EVENTS
        "workshop": True,

        "hackathon": True,


        # WORKSHOP DOMAINS
        "workshop_ceh": True,

        "workshop_vapt": True,

        "workshop_soc": True,

        "workshop_forensics": True,


        # HACKATHON DOMAINS
        "ceh_hackathon": True,

        "vapt_hackathon": True,

        "soc_hackathon": True,

        "forensics_hackathon": True

    },


    "workshop": {

        "event": True,

        "ceh": True,

        "vapt": True,

        "soc": True,

        "forensics": True

    },


    "hackathon": {

        "event": True,

        "ceh_hackathon": True,

        "vapt_hackathon": True,

        "soc_hackathon": True,

        "forensics_hackathon": True

    },


    "leaderboard": {

        "workshop": True,

        "hackathon": True

    }

}


# =========================================================
# PASSWORD HASHING
# =========================================================

def hash_password(
    password: str
):

    salt = secrets.token_bytes(
        16
    )

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        200000
    )

    return (
        salt.hex()
        + ":"
        + password_hash.hex()
    )


# =========================================================
# VERIFY PASSWORD
# =========================================================

def verify_password(
    password: str,
    stored_password: str
):

    try:

        salt_hex, hash_hex = (
            stored_password.split(":")
        )

        salt = bytes.fromhex(
            salt_hex
        )

        expected_hash = bytes.fromhex(
            hash_hex
        )

        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            200000
        )

        return hmac.compare_digest(
            actual_hash,
            expected_hash
        )

    except Exception:

        return False


# =========================================================
# USER DATABASE CONNECTION
# =========================================================

def get_user_db():

    connection = sqlite3.connect(
        USER_DATABASE
    )

    connection.row_factory = sqlite3.Row

    connection.execute(
        "PRAGMA foreign_keys = ON"
    )

    return connection


# =========================================================
# INITIALIZE USER DATABASE
# =========================================================

def initialize_user_database():

    connection = get_user_db()

    cursor = connection.cursor()


    # =====================================================
    # USERS TABLE
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            email TEXT NOT NULL UNIQUE,

            phone TEXT NOT NULL,

            password_hash TEXT NOT NULL,

            created_at TEXT NOT NULL

        )
        """
    )


    # =====================================================
    # WORKSHOP REGISTRATIONS
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS workshop_registrations (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            domain TEXT NOT NULL,

            status TEXT NOT NULL
                DEFAULT 'registered',

            registered_at TEXT NOT NULL,

            UNIQUE(
                user_id,
                domain
            ),

            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE

        )
        """
    )


    # =====================================================
    # HACKATHON TEAMS
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS hackathon_teams (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            team_name TEXT NOT NULL,

            member_count INTEGER NOT NULL,

            team_members TEXT NOT NULL,

            team_lead_email TEXT NOT NULL,

            password_hash TEXT NOT NULL,

            domain TEXT NOT NULL,

            status TEXT NOT NULL
                DEFAULT 'active',

            registered_at TEXT NOT NULL,

            UNIQUE(
                team_name,
                domain
            )

        )
        """
    )


    # =====================================================
    # USER SESSIONS
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_sessions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            session_token TEXT NOT NULL UNIQUE,

            created_at TEXT NOT NULL,

            FOREIGN KEY(user_id)
                REFERENCES users(id)
                ON DELETE CASCADE

        )
        """
    )


    # =====================================================
    # HACKATHON SESSIONS
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS hackathon_sessions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            team_id INTEGER NOT NULL,

            session_token TEXT NOT NULL UNIQUE,

            created_at TEXT NOT NULL

        )
        """
    )


    # =====================================================
    # PERSISTENT ACCOUNT DATA
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS account_data (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            account_type TEXT NOT NULL,

            account_id INTEGER NOT NULL,

            event_type TEXT NOT NULL,

            domain TEXT NOT NULL,

            points INTEGER NOT NULL
                DEFAULT 0,

            data_json TEXT NOT NULL
                DEFAULT '{}',

            created_at TEXT NOT NULL,

            updated_at TEXT NOT NULL,

            UNIQUE(
                account_type,
                account_id,
                event_type,
                domain
            )

        )
        """
    )


    connection.commit()

    connection.close()


# =========================================================
# INITIALIZE DATABASE
# =========================================================

initialize_user_database()


# =========================================================
# SAVE STATE
# =========================================================

def save_state(
    state
):

    with open(
        DATA_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            state,
            file,
            indent=4
        )


# =========================================================
# LOAD STATE
# =========================================================

def load_state():

    if not DATA_FILE.exists():

        state = copy.deepcopy(
            DEFAULT_STATE
        )

        save_state(
            state
        )

        return state


    try:

        with open(
            DATA_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            state = json.load(
                file
            )

    except Exception:

        state = copy.deepcopy(
            DEFAULT_STATE
        )

        save_state(
            state
        )

        return state


    changed = False


    # =====================================================
    # HOME SAFETY
    # =====================================================

    if "home" not in state:

        state["home"] = copy.deepcopy(
            DEFAULT_STATE["home"]
        )

        changed = True

    else:

        for key, value in DEFAULT_STATE[
            "home"
        ].items():

            if key not in state["home"]:

                state["home"][key] = value

                changed = True


    # =====================================================
    # WORKSHOP SAFETY
    # =====================================================

    if "workshop" not in state:

        state["workshop"] = copy.deepcopy(
            DEFAULT_STATE["workshop"]
        )

        changed = True

    else:

        for key, value in DEFAULT_STATE[
            "workshop"
        ].items():

            if key not in state["workshop"]:

                state["workshop"][key] = value

                changed = True


    # =====================================================
    # HACKATHON SAFETY
    # =====================================================

    if "hackathon" not in state:

        state["hackathon"] = copy.deepcopy(
            DEFAULT_STATE["hackathon"]
        )

        changed = True

    else:

        for key, value in DEFAULT_STATE[
            "hackathon"
        ].items():

            if key not in state["hackathon"]:

                state["hackathon"][key] = value

                changed = True


    # =====================================================
    # LEADERBOARD SAFETY
    # =====================================================

    if "leaderboard" not in state:

        state["leaderboard"] = copy.deepcopy(
            DEFAULT_STATE["leaderboard"]
        )

        changed = True

    else:

        for key, value in DEFAULT_STATE[
            "leaderboard"
        ].items():

            if key not in state["leaderboard"]:

                state["leaderboard"][key] = value

                changed = True


    # =====================================================
    # HOME = SINGLE SOURCE OF TRUTH
    # =====================================================

    home = state["home"]


    # =====================================================
    # SYNC WORKSHOP
    # =====================================================

    state["workshop"]["event"] = (
        home["workshop"]
    )

    state["workshop"]["ceh"] = (
        home["workshop_ceh"]
    )

    state["workshop"]["vapt"] = (
        home["workshop_vapt"]
    )

    state["workshop"]["soc"] = (
        home["workshop_soc"]
    )

    state["workshop"]["forensics"] = (
        home["workshop_forensics"]
    )


    # =====================================================
    # SYNC HACKATHON
    # =====================================================

    state["hackathon"]["event"] = (
        home["hackathon"]
    )

    state["hackathon"][
        "ceh_hackathon"
    ] = (
        home["ceh_hackathon"]
    )

    state["hackathon"][
        "vapt_hackathon"
    ] = (
        home["vapt_hackathon"]
    )

    state["hackathon"][
        "soc_hackathon"
    ] = (
        home["soc_hackathon"]
    )

    state["hackathon"][
        "forensics_hackathon"
    ] = (
        home["forensics_hackathon"]
    )


    if changed:

        save_state(
            state
        )


    return state


# =========================================================
# STATIC FILES
# =========================================================

app.mount(
    "/css",
    StaticFiles(
        directory=CSS_DIR
    ),
    name="css"
)

app.mount(
    "/js",
    StaticFiles(
        directory=JS_DIR
    ),
    name="js"
)

app.mount(
    "/assets",
    StaticFiles(
        directory=ASSETS_DIR
    ),
    name="assets"
)


# =========================================================
# HOME PAGE
# =========================================================

@app.get("/")
async def home():

    return FileResponse(
        PUBLIC_DIR /
        "index.html"
    )


# =========================================================
# ADMIN LOGIN PAGE
# =========================================================

@app.get("/admin")
async def admin_login():

    return FileResponse(
        PUBLIC_DIR /
        "admin.html"
    )


@app.get("/admin.html")
async def old_admin_login():

    return FileResponse(
        PUBLIC_DIR /
        "admin.html"
    )


# =========================================================
# USER WORKSHOP LOGIN PAGE
# =========================================================

@app.get("/user-login")
async def user_login_page():

    file_path = (
        PUBLIC_DIR /
        "user-login.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "user-login.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )


@app.get("/user-login.html")
async def old_user_login_page():

    file_path = (
        PUBLIC_DIR /
        "user-login.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "user-login.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )

# =========================================================
# USER HACKATHON LOGIN PAGE
# =========================================================

@app.get("/user-hackathon")
async def user_hackathon_page():

    file_path = (
        PUBLIC_DIR /
        "user-hackathon.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "user-hackathon.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )


@app.get("/user-hackathon.html")
async def old_user_hackathon_page():

    file_path = (
        PUBLIC_DIR /
        "user-hackathon.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "user-hackathon.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )


# =========================================================
# ADMIN LOGIN MODEL
# =========================================================

class AdminLogin(BaseModel):

    username: str

    password: str


# =========================================================
# WORKSHOP REGISTRATION MODEL
# =========================================================

class WorkshopRegister(BaseModel):

    name: str

    email: str

    phone: str

    password: str

    confirm_password: str

    domain: str


# =========================================================
# WORKSHOP LOGIN MODEL
# =========================================================

class WorkshopLogin(BaseModel):

    email: str

    password: str

    domain: str


# =========================================================
# WORKSHOP LOGOUT MODEL
# =========================================================

class WorkshopLogout(BaseModel):

    session_token: str


# =========================================================
# HACKATHON REGISTRATION MODEL
# =========================================================

class HackathonRegister(BaseModel):

    team_name: str

    # Canonical field used by the database/backend.
    team_members_count: int | None = None

    # Backward-compatible field accepted from older frontend code.
    member_count: int | None = None

    team_members: list[str]

    # Canonical field used by the database/backend.
    email: str | None = None

    # Backward-compatible field accepted from the current frontend.
    team_lead_email: str | None = None

    password: str

    confirm_password: str

    domain: str


# =========================================================
# HACKATHON LOGIN MODEL
# =========================================================

class HackathonLogin(BaseModel):

    team_name: str

    password: str

    domain: str


# =========================================================
# HACKATHON LOGOUT MODEL
# =========================================================

class HackathonLogout(BaseModel):

    session_token: str


class AccountDataUpdate(BaseModel):

    points: int | None = None

    data: dict | None = None


# =========================================================
# HACKATHON STATUS MODEL
# =========================================================

class HackathonStatusUpdate(BaseModel):

    status: str


# =========================================================
# WORKSHOP USER REGISTRATION
# =========================================================

@app.post("/api/workshop/register")
async def workshop_register(
    registration: WorkshopRegister
):

    name = (
        registration.name
        .strip()
    )

    email = (
        registration.email
        .strip()
        .lower()
    )

    phone = (
        registration.phone
        .strip()
    )

    password = (
        registration.password
    )

    confirm_password = (
        registration.confirm_password
    )

    domain = (
        registration.domain
        .strip()
        .lower()
    )


    # =====================================================
    # DOMAIN VALIDATION
    # =====================================================

    if domain not in WORKSHOP_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid Workshop domain."
        )


    # =====================================================
    # CHECK STATE
    # =====================================================

    state = load_state()


    if not state["workshop"].get(
        domain,
        False
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                f"{domain.upper()} Workshop "
                "registration is currently disabled."
            )
        )


    # =====================================================
    # INPUT VALIDATION
    # =====================================================

    if not name:

        raise HTTPException(
            status_code=400,
            detail="Name is required."
        )


    if (
        not email
        or "@"
        not in email
    ):

        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address."
        )


    if not phone:

        raise HTTPException(
            status_code=400,
            detail="Phone number is required."
        )


    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain "
                "at least 6 characters."
            )
        )


    if password != confirm_password:

        raise HTTPException(
            status_code=400,
            detail="Passwords do not match."
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        # =================================================
        # CHECK EXISTING EMAIL
        # =================================================

        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email = ?
            """,
            (
                email,
            )
        )


        existing_user = (
            cursor.fetchone()
        )


        if existing_user:

            raise HTTPException(
                status_code=409,
                detail=(
                    "An account with this email "
                    "already exists. Please login."
                )
            )


        created_at = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )


        # =================================================
        # CREATE USER
        # =================================================

        cursor.execute(
            """
            INSERT INTO users
                (
                    name,
                    email,
                    phone,
                    password_hash,
                    created_at
                )
            VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
            """,
            (
                name,
                email,
                phone,
                hash_password(
                    password
                ),
                created_at
            )
        )


        user_id = (
            cursor.lastrowid
        )


        # =================================================
        # CREATE WORKSHOP REGISTRATION
        # =================================================

        cursor.execute(
            """
            INSERT INTO workshop_registrations
                (
                    user_id,
                    domain,
                    status,
                    registered_at
                )
            VALUES
                (
                    ?,
                    ?,
                    'registered',
                    ?
                )
            """,
            (
                user_id,
                domain,
                created_at
            )
        )


        connection.commit()


        return {

            "success":
                True,

            "message":
                (
                    "Registration successful for "
                    f"{domain.upper()} Workshop."
                ),

            "user": {

                "id":
                    user_id,

                "name":
                    name,

                "email":
                    email,

                "phone":
                    phone,

                "domain":
                    domain

            }

        }


    except HTTPException:

        connection.rollback()

        raise


    except sqlite3.IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "This email is already registered."
            )
        )


    finally:

        connection.close()


# =========================================================
# WORKSHOP USER LOGIN
# =========================================================

@app.post("/api/workshop/login")
async def workshop_login(
    credentials: WorkshopLogin
):

    email = (
        credentials.email
        .strip()
        .lower()
    )

    password = (
        credentials.password
    )

    domain = (
        credentials.domain
        .strip()
        .lower()
    )


    # =====================================================
    # DOMAIN VALIDATION
    # =====================================================

    if domain not in WORKSHOP_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid Workshop domain."
        )


    state = load_state()


    if not state["workshop"].get(
        domain,
        False
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                f"{domain.upper()} Workshop "
                "is currently disabled."
            )
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT
                u.id,
                u.name,
                u.email,
                u.phone,
                u.password_hash,
                wr.status,
                wr.registered_at
            FROM users u

            INNER JOIN workshop_registrations wr
                ON wr.user_id = u.id

            WHERE u.email = ?
              AND wr.domain = ?
            """,
            (
                email,
                domain
            )
        )


        user = cursor.fetchone()


        if (
            not user
            or not verify_password(
                password,
                user["password_hash"]
            )
        ):

            raise HTTPException(
                status_code=401,
                detail=(
                    "Invalid email or password."
                )
            )


        session_token = (
            secrets.token_urlsafe(32)
        )


        cursor.execute(
            """
            INSERT INTO user_sessions
                (
                    user_id,
                    session_token,
                    created_at
                )
            VALUES
                (
                    ?,
                    ?,
                    ?
                )
            """,
            (
                user["id"],
                session_token,
                datetime.now(
                    timezone.utc
                ).isoformat()
            )
        )


        connection.commit()


        return {

            "success":
                True,

            "message":
                (
                    "Login successful for "
                    f"{domain.upper()} Workshop."
                ),

            "session_token":
                session_token,

            "redirect_url":
                "/user/dashboard",

            "user": {

                "id":
                    user["id"],

                "name":
                    user["name"],

                "email":
                    user["email"],

                "phone":
                    user["phone"],

                "domain":
                    domain,

                "status":
                    user["status"],

                "registered_at":
                    user["registered_at"]

            }

        }


    finally:

        connection.close()


# =========================================================
# WORKSHOP LOGOUT
# =========================================================

@app.post("/api/workshop/logout")
async def workshop_logout(
    logout: WorkshopLogout
):

    connection = get_user_db()


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            DELETE FROM user_sessions
            WHERE session_token = ?
            """,
            (
                logout.session_token,
            )
        )


        connection.commit()


        return {

            "success":
                True,

            "message":
                "Logout successful."

        }


    finally:

        connection.close()

# =========================================================
# CURRENT USER SESSION
# =========================================================

def get_current_workshop_user(
    session_token: str
):

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                u.id,
                u.name,
                u.email,
                u.phone,
                wr.domain,
                wr.status,
                wr.registered_at
            FROM user_sessions us

            INNER JOIN users u
                ON u.id = us.user_id

            INNER JOIN workshop_registrations wr
                ON wr.user_id = u.id

            WHERE us.session_token = ?

            LIMIT 1
            """,
            (
                session_token,
            )
        )

        user = cursor.fetchone()

        return user

    finally:

        connection.close()


# =========================================================
# CURRENT USER API
# =========================================================

@app.get("/api/user/me")
async def get_current_user(
    session_token: str
):

    if not session_token:

        raise HTTPException(
            status_code=401,
            detail="User session is required."
        )


    user = get_current_workshop_user(
        session_token
    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired user session."
        )


    return {

        "success":
            True,

        "user": {

            "id":
                user["id"],

            "name":
                user["name"],

            "email":
                user["email"],

            "phone":
                user["phone"],

            "event":
                "workshop",

            "domain":
                user["domain"],

            "status":
                user["status"],

            "registered_at":
                user["registered_at"]

        }

    }
# =========================================================
# HACKATHON USER REGISTRATION
# =========================================================

@app.post("/api/hackathon/register")
async def hackathon_register(
    registration: HackathonRegister
):

    team_name = (
        registration.team_name
        .strip()
    )

    # Accept both current and legacy frontend field names.
    team_members_count = (
        registration.team_members_count
        if registration.team_members_count is not None
        else registration.member_count
    )

    team_members = [
        str(member).strip()
        for member in registration.team_members
        if member is not None
        and str(member).strip()
    ]

    email_value = (
        registration.email
        if registration.email is not None
        else registration.team_lead_email
    )

    email = (
        email_value.strip().lower()
        if email_value
        else ""
    )

    password = (
        registration.password
    )

    confirm_password = (
        registration.confirm_password
    )

    domain = (
        registration.domain
        .strip()
        .lower()
    )


    # =====================================================
    # DOMAIN VALIDATION
    # =====================================================

    if domain not in HACKATHON_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid Hackathon domain."
        )


    # =====================================================
    # CHECK HACKATHON STATE
    # =====================================================

    state = load_state()


    if not state["hackathon"].get(
        domain,
        False
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                f"{domain.upper()} Hackathon "
                "registration is currently disabled."
            )
        )


    # =====================================================
    # TEAM NAME
    # =====================================================

    if not team_name:

        raise HTTPException(
            status_code=400,
            detail="Team name is required."
        )


    # =====================================================
    # MEMBER COUNT
    # =====================================================

    if team_members_count is None:

        raise HTTPException(
            status_code=400,
            detail=(
                "Team member count is required."
            )
        )


    if team_members_count < 1:

        raise HTTPException(
            status_code=400,
            detail=(
                "At least one team member "
                "is required."
            )
        )


    if team_members_count > 10:

        raise HTTPException(
            status_code=400,
            detail=(
                "Maximum 10 team members "
                "are allowed."
            )
        )


    if (
        len(team_members)
        != team_members_count
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Team member count does not "
                "match the entered team members."
            )
        )


    # =====================================================
    # EMAIL
    # =====================================================

    if (
        not email
        or "@"
        not in email
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Enter a valid email address."
            )
        )


    # =====================================================
    # PASSWORD
    # =====================================================

    if len(password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain "
                "at least 6 characters."
            )
        )


    if password != confirm_password:

        raise HTTPException(
            status_code=400,
            detail=(
                "Passwords do not match."
            )
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        # =================================================
        # CHECK TEAM
        # =================================================

        cursor.execute(
            """
            SELECT id
            FROM hackathon_teams
            WHERE team_name = ?
              AND domain = ?
            """,
            (
                team_name,
                domain
            )
        )


        existing_team = (
            cursor.fetchone()
        )


        if existing_team:

            raise HTTPException(
                status_code=409,
                detail=(
                    "This team is already registered "
                    f"for {domain.upper()}."
                )
            )


        # =================================================
        # CHECK EMAIL
        # =================================================

        cursor.execute(
            """
            SELECT id
            FROM hackathon_teams
            WHERE team_lead_email = ?
              AND domain = ?
            """,
            (
                email,
                domain
            )
        )


        existing_email = (
            cursor.fetchone()
        )


        if existing_email:

            raise HTTPException(
                status_code=409,
                detail=(
                    "This email is already registered "
                    f"for {domain.upper()}."
                )
            )


        # =================================================
        # DATE
        # =================================================

        created_at = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )


        # =================================================
        # TEAM MEMBERS JSON
        # =================================================

        members_json = json.dumps(
            team_members
        )


        # =================================================
        # INSERT TEAM
        # =================================================

        cursor.execute(
            """
            INSERT INTO hackathon_teams
                (
                    team_name,
                    member_count,
                    team_members,
                    team_lead_email,
                    password_hash,
                    domain,
                    status,
                    registered_at
                )
            VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    'active',
                    ?
                )
            """,
            (
                team_name,
                team_members_count,
                members_json,
                email,
                hash_password(
                    password
                ),
                domain,
                created_at
            )
        )


        team_id = (
            cursor.lastrowid
        )


        connection.commit()


        return {

            "success":
                True,

            "message":
                (
                    "Registration successful for "
                    f"{domain.upper()}."
                ),

            "team_id":
                team_id,

            "team": {

                "id":
                    team_id,

                "team_name":
                    team_name,

                "team_members_count":
                    team_members_count,

                "team_members":
                    team_members,

                "email":
                    email,

                "domain":
                    domain,

                "status":
                    "active",

                "registered_at":
                    created_at

            }

        }


    except HTTPException:

        connection.rollback()

        raise


    except sqlite3.IntegrityError:

        connection.rollback()

        raise HTTPException(
            status_code=409,
            detail=(
                "Team name or email is already "
                "registered for this Hackathon."
            )
        )


    finally:

        connection.close()


# =========================================================
# HACKATHON USER LOGIN
# =========================================================

@app.post("/api/hackathon/login")
async def hackathon_login(
    credentials: HackathonLogin
):

    team_name = (
        credentials.team_name
        .strip()
    )

    password = (
        credentials.password
    )

    domain = (
        credentials.domain
        .strip()
        .lower()
    )


    # =====================================================
    # DOMAIN
    # =====================================================

    if domain not in HACKATHON_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid Hackathon domain."
        )


    # =====================================================
    # STATE
    # =====================================================

    state = load_state()


    if not state["hackathon"].get(
        domain,
        False
    ):

        raise HTTPException(
            status_code=403,
            detail=(
                f"{domain.upper()} Hackathon "
                "is currently disabled."
            )
        )


    # =====================================================
    # VALIDATION
    # =====================================================

    if not team_name:

        raise HTTPException(
            status_code=400,
            detail="Team name is required."
        )


    if not password:

        raise HTTPException(
            status_code=400,
            detail="Password is required."
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        # =================================================
        # FIND TEAM
        # =================================================

        cursor.execute(
            """
            SELECT
                id,
                team_name,
                member_count AS team_members_count,
                team_members,
                team_lead_email AS email,
                password_hash,
                domain,
                status,
                registered_at

            FROM hackathon_teams

            WHERE team_name = ?
              AND domain = ?
            """,
            (
                team_name,
                domain
            )
        )


        team = cursor.fetchone()


        # =================================================
        # VERIFY PASSWORD
        # =================================================

        if (
            not team
            or not verify_password(
                password,
                team["password_hash"]
            )
        ):

            raise HTTPException(
                status_code=401,
                detail=(
                    "Invalid team name or password."
                )
            )


        # =================================================
        # STATUS
        # =================================================

        if team["status"] != "active":

            raise HTTPException(
                status_code=403,
                detail=(
                    "This Hackathon team is "
                    "currently inactive."
                )
            )


        # =================================================
        # SESSION
        # =================================================

        session_token = (
            secrets.token_urlsafe(32)
        )

        created_at = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )


        cursor.execute(
            """
            INSERT INTO hackathon_sessions
                (
                    team_id,
                    session_token,
                    created_at
                )
            VALUES
                (
                    ?,
                    ?,
                    ?
                )
            """,
            (
                team["id"],
                session_token,
                created_at
            )
        )


        connection.commit()


        # =================================================
        # TEAM MEMBERS
        # =================================================

        try:

            members = json.loads(
                team["team_members"]
            )

        except Exception:

            members = []


        return {

            "success":
                True,

            "message":
                (
                    "Login successful for "
                    f"{domain.upper()}."
                ),

            "session_token":
                session_token,

            "team_id":
                team["id"],

            "redirect_url": "/user/dashboard",

            "team": {

                "id":
                    team["id"],

                "team_name":
                    team["team_name"],

                "team_members_count":
                    team["team_members_count"],

                "team_members":
                    members,

                "email":
                    team["email"],

                "domain":
                    team["domain"],

                "status":
                    team["status"],

                "registered_at":
                    team["registered_at"]

            }

        }


    finally:

        connection.close()


# =========================================================
# HACKATHON LOGOUT
# =========================================================

@app.post("/api/hackathon/logout")
async def hackathon_logout(
    logout: HackathonLogout
):

    connection = get_user_db()


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            DELETE FROM hackathon_sessions
            WHERE session_token = ?
            """,
            (
                logout.session_token,
            )
        )


        connection.commit()


        return {

            "success":
                True,

            "message":
                "Logout successful."

        }


    finally:

        connection.close()

# =========================================================
# CURRENT HACKATHON USER SESSION
# =========================================================

def get_current_hackathon_user(
    session_token: str
):

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                ht.id,
                ht.team_name,
                ht.member_count,
                ht.team_members,
                ht.team_lead_email,
                ht.domain,
                ht.status,
                ht.registered_at
            FROM hackathon_sessions hs

            INNER JOIN hackathon_teams ht
                ON ht.id = hs.team_id

            WHERE hs.session_token = ?

            LIMIT 1
            """,
            (
                session_token,
            )
        )

        team = cursor.fetchone()

        return team

    finally:

        connection.close()


# =========================================================
# CURRENT HACKATHON USER API
# =========================================================

@app.get("/api/hackathon/me")
async def get_current_hackathon_user_api(
    session_token: str
):

    if not session_token:

        raise HTTPException(
            status_code=401,
            detail="Hackathon session is required."
        )


    team = get_current_hackathon_user(
        session_token
    )


    if not team:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Hackathon session."
        )


    try:

        members = json.loads(
            team["team_members"]
        )

    except Exception:

        members = []


    return {

        "success":
            True,

        "team": {

            "id":
                team["id"],

            "team_name":
                team["team_name"],

            "team_members_count":
                team["member_count"],

            "team_members":
                members,

            "email":
                team["team_lead_email"],

            "event":
                "hackathon",

            "domain":
                team["domain"],

            "status":
                team["status"],

            "registered_at":
                team["registered_at"]

        }

    }

# =========================================================
# PERSISTENT ACCOUNT DATA HELPERS
# =========================================================

def get_account_data(
    account_type: str,
    account_id: int,
    event_type: str,
    domain: str
):

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                account_type,
                account_id,
                event_type,
                domain,
                points,
                data_json,
                created_at,
                updated_at
            FROM account_data
            WHERE account_type = ?
              AND account_id = ?
              AND event_type = ?
              AND domain = ?
            LIMIT 1
            """,
            (
                account_type,
                account_id,
                event_type,
                domain
            )
        )

        row = cursor.fetchone()

        if row:
            return row

        now = datetime.now(
            timezone.utc
        ).isoformat()

        cursor.execute(
            """
            INSERT INTO account_data
            (
                account_type,
                account_id,
                event_type,
                domain,
                points,
                data_json,
                created_at,
                updated_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                0,
                '{}',
                ?,
                ?
            )
            """,
            (
                account_type,
                account_id,
                event_type,
                domain,
                now,
                now
            )
        )

        connection.commit()

        cursor.execute(
            """
            SELECT
                id,
                account_type,
                account_id,
                event_type,
                domain,
                points,
                data_json,
                created_at,
                updated_at
            FROM account_data
            WHERE account_type = ?
              AND account_id = ?
              AND event_type = ?
              AND domain = ?
            LIMIT 1
            """,
            (
                account_type,
                account_id,
                event_type,
                domain
            )
        )

        return cursor.fetchone()

    finally:

        connection.close()


def update_account_data(
    account_type: str,
    account_id: int,
    event_type: str,
    domain: str,
    points: int | None = None,
    data: dict | None = None
):

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                points,
                data_json
            FROM account_data
            WHERE account_type = ?
              AND account_id = ?
              AND event_type = ?
              AND domain = ?
            LIMIT 1
            """,
            (
                account_type,
                account_id,
                event_type,
                domain
            )
        )

        existing = cursor.fetchone()

        now = datetime.now(
            timezone.utc
        ).isoformat()

        if existing:

            current_points = int(
                existing["points"] or 0
            )

            try:

                current_data = json.loads(
                    existing["data_json"] or "{}"
                )

            except Exception:

                current_data = {}

            new_points = (
                current_points
                if points is None
                else int(points)
            )

            new_data = (
                current_data
                if data is None
                else data
            )

            cursor.execute(
                """
                UPDATE account_data
                SET
                    points = ?,
                    data_json = ?,
                    updated_at = ?
                WHERE account_type = ?
                  AND account_id = ?
                  AND event_type = ?
                  AND domain = ?
                """,
                (
                    new_points,
                    json.dumps(new_data),
                    now,
                    account_type,
                    account_id,
                    event_type,
                    domain
                )
            )

        else:

            new_points = (
                0
                if points is None
                else int(points)
            )

            new_data = (
                {}
                if data is None
                else data
            )

            cursor.execute(
                """
                INSERT INTO account_data
                (
                    account_type,
                    account_id,
                    event_type,
                    domain,
                    points,
                    data_json,
                    created_at,
                    updated_at
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
                """,
                (
                    account_type,
                    account_id,
                    event_type,
                    domain,
                    new_points,
                    json.dumps(new_data),
                    now,
                    now
                )
            )

        connection.commit()

        cursor.execute(
            """
            SELECT
                id,
                account_type,
                account_id,
                event_type,
                domain,
                points,
                data_json,
                created_at,
                updated_at
            FROM account_data
            WHERE account_type = ?
              AND account_id = ?
              AND event_type = ?
              AND domain = ?
            LIMIT 1
            """,
            (
                account_type,
                account_id,
                event_type,
                domain
            )
        )

        return cursor.fetchone()

    finally:

        connection.close()


def serialize_account_data(
    row
):

    if not row:
        return None

    try:

        data = json.loads(
            row["data_json"] or "{}"
        )

    except Exception:

        data = {}

    return {

        "id":
            row["id"],

        "account_type":
            row["account_type"],

        "account_id":
            row["account_id"],

        "event":
            row["event_type"],

        "domain":
            row["domain"],

        "points":
            row["points"],

        "data":
            data,

        "created_at":
            row["created_at"],

        "updated_at":
            row["updated_at"]

    }


# =========================================================
# CURRENT WORKSHOP USER DATA
# =========================================================

@app.get("/api/user/data")
async def get_current_user_data(
    session_token: str
):

    user = get_current_workshop_user(
        session_token
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired user session."
        )

    row = get_account_data(
        "user",
        user["id"],
        "workshop",
        user["domain"]
    )

    return {

        "success":
            True,

        "user": {

            "id":
                user["id"],

            "name":
                user["name"],

            "email":
                user["email"],

            "event":
                "workshop",

            "domain":
                user["domain"]

        },

        "account_data":
            serialize_account_data(row)

    }


# =========================================================
# UPDATE CURRENT WORKSHOP USER DATA
# =========================================================

@app.put("/api/user/data")
async def update_current_user_data(
    update: AccountDataUpdate,
    session_token: str
):

    user = get_current_workshop_user(
        session_token
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired user session."
        )

    if (
        update.points is not None
        and update.points < 0
    ):

        raise HTTPException(
            status_code=400,
            detail="Points cannot be negative."
        )

    row = update_account_data(
        "user",
        user["id"],
        "workshop",
        user["domain"],
        update.points,
        update.data
    )

    return {

        "success":
            True,

        "account_data":
            serialize_account_data(row)

    }


# =========================================================
# CURRENT HACKATHON TEAM DATA
# =========================================================

@app.get("/api/hackathon/data")
async def get_current_hackathon_data(
    session_token: str
):

    team = get_current_hackathon_user(
        session_token
    )

    if not team:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Hackathon session."
        )

    row = get_account_data(
        "team",
        team["id"],
        "hackathon",
        team["domain"]
    )

    return {

        "success":
            True,

        "team": {

            "id":
                team["id"],

            "team_name":
                team["team_name"],

            "email":
                team["team_lead_email"],

            "event":
                "hackathon",

            "domain":
                team["domain"]

        },

        "account_data":
            serialize_account_data(row)

    }


# =========================================================
# UPDATE CURRENT HACKATHON TEAM DATA
# =========================================================

@app.put("/api/hackathon/data")
async def update_current_hackathon_data(
    update: AccountDataUpdate,
    session_token: str
):

    team = get_current_hackathon_user(
        session_token
    )

    if not team:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired Hackathon session."
        )

    if (
        update.points is not None
        and update.points < 0
    ):

        raise HTTPException(
            status_code=400,
            detail="Points cannot be negative."
        )

    row = update_account_data(
        "team",
        team["id"],
        "hackathon",
        team["domain"],
        update.points,
        update.data
    )

    return {

        "success":
            True,

        "account_data":
            serialize_account_data(row)

    }


# =========================================================
# ADMIN LOGIN API
# =========================================================

@app.post("/api/admin/login")
async def admin_login_api(
    credentials: AdminLogin
):

    ADMIN_USERNAME = (
        "synthoquest"
    )

    ADMIN_PASSWORD = (
        "synthoquest"
    )


    if (
        credentials.username
        == ADMIN_USERNAME
        and
        credentials.password
        == ADMIN_PASSWORD
    ):

        return {

            "success":
                True,

            "message":
                "Admin authentication successful.",

            "username":
                credentials.username

        }


    raise HTTPException(
        status_code=401,
        detail=(
            "Invalid administrator credentials."
        )
    )

# =========================================================
# ADMIN — ACCOUNT MANAGEMENT
# WORKSHOP + HACKATHON
# =========================================================


ACCOUNT_EVENT_DOMAINS = {

    "workshop": {
        "ceh",
        "vapt",
        "soc",
        "forensics"
    },

    "hackathon": {
        "ceh_hackathon",
        "vapt_hackathon",
        "soc_hackathon",
        "forensics_hackathon"
    }

}


# =========================================================
# GET ACCOUNT MANAGEMENT DATA
# =========================================================

@app.get(
    "/api/admin/accounts/{event_type}/{domain}"
)
async def get_admin_accounts(
    event_type: str,
    domain: str
):

    event_type = (
        event_type
        .strip()
        .lower()
    )

    domain = (
        domain
        .strip()
        .lower()
    )


    # =====================================================
    # VALIDATION
    # =====================================================

    if event_type not in ACCOUNT_EVENT_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid event type."
        )


    if domain not in ACCOUNT_EVENT_DOMAINS[event_type]:

        raise HTTPException(
            status_code=400,
            detail="Invalid domain."
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        # =================================================
        # WORKSHOP
        # =================================================

        if event_type == "workshop":

            cursor.execute(
                """
                SELECT

                    wr.id AS registration_id,

                    u.id AS user_id,

                    u.name,

                    u.email,

                    u.phone,

                    wr.domain,

                    wr.status,

                    wr.registered_at

                FROM workshop_registrations wr

                INNER JOIN users u

                    ON u.id = wr.user_id

                WHERE wr.domain = ?

                ORDER BY
                    wr.registered_at DESC
                """,
                (
                    domain,
                )
            )


            rows = cursor.fetchall()


            accounts = []


            for row in rows:

                accounts.append({

                    "id":
                        row["registration_id"],

                    "user_id":
                        row["user_id"],

                    "name":
                        row["name"],

                    "email":
                        row["email"],

                    "phone":
                        row["phone"],

                    "domain":
                        row["domain"],

                    "status":
                        row["status"],

                    "registered_at":
                        row["registered_at"]

                })


        # =================================================
        # HACKATHON
        # =================================================

        else:

            cursor.execute(
                """
                SELECT

                    id,

                    team_name,

                    member_count,

                    team_members,

                    team_lead_email,

                    domain,

                    status,

                    registered_at

                FROM hackathon_teams

                WHERE domain = ?

                ORDER BY
                    registered_at DESC
                """,
                (
                    domain,
                )
            )


            rows = cursor.fetchall()


            accounts = []


            for row in rows:

                try:

                    members = json.loads(
                        row["team_members"]
                    )

                except Exception:

                    members = []


                accounts.append({

                    "id":
                        row["id"],

                    "team_name":
                        row["team_name"],

                    "member_count":
                        row["member_count"],

                    "team_members":
                        members,

                    "email":
                        row["team_lead_email"],

                    "domain":
                        row["domain"],

                    "status":
                        row["status"],

                    "registered_at":
                        row["registered_at"]

                })


        # =================================================
        # COUNTS
        # =================================================

        total = len(accounts)


        active = sum(

            1

            for account in accounts

            if str(
                account.get("status", "")
            ).lower()

            in (
                "active",
                "registered"
            )

        )


        inactive = total - active


        return {

            "success":
                True,

            "event":
                event_type,

            "domain":
                domain,

            "total":
                total,

            "active":
                active,

            "inactive":
                inactive,

            "accounts":
                accounts

        }


    finally:

        connection.close()


# =========================================================
# DELETE ONE ACCOUNT
# =========================================================

@app.delete(
    "/api/admin/accounts/{event_type}/{domain}/{account_id}"
)
async def delete_admin_account(
    event_type: str,
    domain: str,
    account_id: int
):

    event_type = (
        event_type
        .strip()
        .lower()
    )

    domain = (
        domain
        .strip()
        .lower()
    )


    # =====================================================
    # VALIDATION
    # =====================================================

    if event_type not in ACCOUNT_EVENT_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid event type."
        )


    if domain not in ACCOUNT_EVENT_DOMAINS[event_type]:

        raise HTTPException(
            status_code=400,
            detail="Invalid domain."
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        # =================================================
        # WORKSHOP DELETE
        # =================================================

        if event_type == "workshop":

            # -------------------------------------------------
            # GET USER ID BEFORE DELETING REGISTRATION
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT user_id
                FROM workshop_registrations
                WHERE id = ?
                  AND domain = ?
                LIMIT 1
                """,
                (
                    account_id,
                    domain
                )
            )

            registration = cursor.fetchone()

            if not registration:
                connection.rollback()

                raise HTTPException(
                    status_code=404,
                    detail="Account not found."
                )

            user_id = registration["user_id"]


            # -------------------------------------------------
            # DELETE PERSISTENT ACCOUNT DATA
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM account_data
                WHERE account_type = 'user'
                  AND account_id = ?
                  AND event_type = 'workshop'
                  AND domain = ?
                """,
                (
                    user_id,
                    domain
                )
            )


            # -------------------------------------------------
            # DELETE WORKSHOP REGISTRATION
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM workshop_registrations

                WHERE id = ?

                  AND domain = ?
                """,
                (
                    account_id,
                    domain
                )
            )


            deleted_count = cursor.rowcount


        # =================================================
        # HACKATHON DELETE
        # =================================================

        else:

            # -------------------------------------------------
            # DELETE PERSISTENT ACCOUNT DATA
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM account_data
                WHERE account_type = 'team'
                  AND account_id = ?
                  AND event_type = 'hackathon'
                  AND domain = ?
                """,
                (
                    account_id,
                    domain
                )
            )


            # -------------------------------------------------
            # DELETE HACKATHON TEAM
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM hackathon_teams

                WHERE id = ?

                  AND domain = ?
                """,
                (
                    account_id,
                    domain
                )
            )


            deleted_count = cursor.rowcount


        if deleted_count == 0:

            connection.rollback()

            raise HTTPException(
                status_code=404,
                detail="Account not found."
            )


        connection.commit()


        return {

            "success":
                True,

            "message":
                "Account deleted successfully.",

            "deleted_id":
                account_id,

            "event":
                event_type,

            "domain":
                domain

        }


    finally:

        connection.close()


# =========================================================
# DELETE ALL ACCOUNTS
# CURRENT EVENT + CURRENT DOMAIN ONLY
# =========================================================

@app.delete(
    "/api/admin/accounts/{event_type}/{domain}"
)
async def delete_all_admin_accounts(
    event_type: str,
    domain: str
):

    event_type = (
        event_type
        .strip()
        .lower()
    )

    domain = (
        domain
        .strip()
        .lower()
    )


    # =====================================================
    # VALIDATION
    # =====================================================

    if event_type not in ACCOUNT_EVENT_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid event type."
        )


    if domain not in ACCOUNT_EVENT_DOMAINS[event_type]:

        raise HTTPException(
            status_code=400,
            detail="Invalid domain."
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        # =================================================
        # WORKSHOP
        # =================================================

        if event_type == "workshop":

            # -------------------------------------------------
            # DELETE PERSISTENT DATA FOR ALL MATCHING USERS
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM account_data
                WHERE account_type = 'user'
                  AND event_type = 'workshop'
                  AND domain = ?
                  AND account_id IN (
                      SELECT user_id
                      FROM workshop_registrations
                      WHERE domain = ?
                  )
                """,
                (
                    domain,
                    domain
                )
            )


            # -------------------------------------------------
            # DELETE ALL WORKSHOP REGISTRATIONS
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM workshop_registrations

                WHERE domain = ?
                """,
                (
                    domain,
                )
            )


        # =================================================
        # HACKATHON
        # =================================================

        else:

            # -------------------------------------------------
            # DELETE PERSISTENT DATA FOR ALL MATCHING TEAMS
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM account_data
                WHERE account_type = 'team'
                  AND event_type = 'hackathon'
                  AND domain = ?
                  AND account_id IN (
                      SELECT id
                      FROM hackathon_teams
                      WHERE domain = ?
                  )
                """,
                (
                    domain,
                    domain
                )
            )


            # -------------------------------------------------
            # DELETE ALL HACKATHON TEAMS
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM hackathon_teams

                WHERE domain = ?
                """,
                (
                    domain,
                )
            )


        deleted_count = cursor.rowcount


        connection.commit()


        return {

            "success":
                True,

            "message":
                (
                    f"{deleted_count} account(s) "
                    "deleted successfully."
                ),

            "deleted_count":
                deleted_count,

            "event":
                event_type,

            "domain":
                domain

        }


    finally:

        connection.close()


# =========================================================
# ADMIN DASHBOARD
# =========================================================

@app.get("/admin/dashboard")
async def admin_dashboard_page():

    return FileResponse(
        PUBLIC_DIR /
        "dashboard.html"
    )


@app.get("/admin-dashboard")
async def admin_dashboard():

    return FileResponse(
        PUBLIC_DIR /
        "dashboard.html"
    )


@app.get("/admin-dashboard.html")
async def old_admin_dashboard():

    return FileResponse(
        PUBLIC_DIR /
        "dashboard.html"
    )


# =========================================================
# WORKSHOP ADMIN PAGE
# =========================================================

@app.get("/admin/workshop")
async def admin_workshop_page():

    return FileResponse(
        PUBLIC_DIR /
        "workshop.html"
    )


@app.get("/admin/workshop.html")
async def old_admin_workshop_page():

    return FileResponse(
        PUBLIC_DIR /
        "workshop.html"
    )


@app.get("/workshop")
async def workshop_page():

    return FileResponse(
        PUBLIC_DIR /
        "workshop.html"
    )


@app.get("/workshop.html")
async def old_workshop_page():

    return FileResponse(
        PUBLIC_DIR /
        "workshop.html"
    )


# =========================================================
# HACKATHON ADMIN PAGE
# =========================================================

@app.get("/admin/hackathon")
async def admin_hackathon_page():

    return FileResponse(
        PUBLIC_DIR /
        "hackathon.html"
    )


@app.get("/admin/hackathon.html")
async def old_admin_hackathon_page():

    return FileResponse(
        PUBLIC_DIR /
        "hackathon.html"
    )


# =========================================================
# LEADERBOARD PAGE
# =========================================================

@app.get("/admin/leaderboard")
async def admin_leaderboard_page():

    return FileResponse(
        PUBLIC_DIR /
        "leaderboard.html"
    )


@app.get("/admin/leaderboard.html")
async def old_admin_leaderboard_page():

    return FileResponse(
        PUBLIC_DIR /
        "leaderboard.html"
    )

from fastapi.responses import FileResponse


@app.get("/admin/accounts")
async def admin_accounts():
    return FileResponse(
        PUBLIC_DIR /"accounts.html"
    )

# =========================================================
# GET SYSTEM STATE
# =========================================================

@app.get("/api/system/state")
async def get_system_state():

    return load_state()


# =========================================================
# STATE UPDATE MODEL
# =========================================================

class StateUpdate(BaseModel):

    section: str

    item: str

    enabled: bool


# =========================================================
# UPDATE SYSTEM STATE
# =========================================================

@app.post("/api/system/state")
async def update_system_state(
    update: StateUpdate
):

    state = load_state()

    section = update.section

    item = update.item

    enabled = bool(
        update.enabled
    )


    # =====================================================
    # HOME
    # =====================================================

    if section == "home":

        valid_home_items = {

            "workshop",

            "hackathon",

            "workshop_ceh",

            "workshop_vapt",

            "workshop_soc",

            "workshop_forensics",

            "ceh_hackathon",

            "vapt_hackathon",

            "soc_hackathon",

            "forensics_hackathon"

        }
        
        # =====================================================
        # HOME CONTROL ALIASES
        # =====================================================

        home_aliases = {

            "workshop_event": "workshop",

            "workshopEvent": "workshop",

            "hackathon_event": "hackathon",

            "hackathonEvent": "hackathon"

        }


        item = home_aliases.get(
            item,
            item
        )

        if item not in valid_home_items:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid home control."
                )
            )


        state["home"][
            item
        ] = enabled


        # =================================================
        # WORKSHOP
        # =================================================

        if item == "workshop":

            state["workshop"][
                "event"
            ] = enabled


        elif item == "workshop_ceh":

            state["workshop"][
                "ceh"
            ] = enabled


        elif item == "workshop_vapt":

            state["workshop"][
                "vapt"
            ] = enabled


        elif item == "workshop_soc":

            state["workshop"][
                "soc"
            ] = enabled


        elif item == "workshop_forensics":

            state["workshop"][
                "forensics"
            ] = enabled


        # =================================================
        # HACKATHON
        # =================================================

        elif item == "hackathon":

            state["hackathon"][
                "event"
            ] = enabled


        elif item == "ceh_hackathon":

            state["hackathon"][
                "ceh_hackathon"
            ] = enabled


        elif item == "vapt_hackathon":

            state["hackathon"][
                "vapt_hackathon"
            ] = enabled


        elif item == "soc_hackathon":

            state["hackathon"][
                "soc_hackathon"
            ] = enabled


        elif item == "forensics_hackathon":

            state["hackathon"][
                "forensics_hackathon"
            ] = enabled


    # =====================================================
    # WORKSHOP COMPATIBILITY
    # =====================================================

    elif section == "workshop":

        if item not in WORKSHOP_DOMAINS:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid Workshop domain."
                )
            )


        state["workshop"][
            item
        ] = enabled


        home_key = (
            "workshop_"
            + item
        )


        state["home"][
            home_key
        ] = enabled


    # =====================================================
    # HACKATHON COMPATIBILITY
    # =====================================================

    elif section == "hackathon":

        if item not in HACKATHON_DOMAINS:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid Hackathon domain."
                )
            )


        state["hackathon"][
            item
        ] = enabled


        state["home"][
            item
        ] = enabled


    # =====================================================
    # LEADERBOARD
    # =====================================================

    elif section == "leaderboard":

        if item not in [
            "workshop",
            "hackathon"
        ]:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid leaderboard control."
                )
            )


        state["leaderboard"][
            item
        ] = enabled


    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid section."
            )
        )


    save_state(
        state
    )


    return {

        "success":
            True,

        "section":
            section,

        "item":
            item,

        "enabled":
            enabled,

        "state":
            state

    }


# =========================================================
# GET TOOLKIT DIRECTORY
# =========================================================

def get_toolkit_directory(
    event_type: str,
    item: str
):

    # =====================================================
    # WORKSHOP
    # =====================================================

    if event_type == "workshop":

        if item not in WORKSHOP_DOMAINS:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid Workshop domain."
                )
            )


        directory = (
            WORKSHOP_TOOLKIT_DIR /
            item
        )


    # =====================================================
    # HACKATHON
    # =====================================================

    elif event_type == "hackathon":

        if item not in HACKATHON_DOMAINS:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid Hackathon domain."
                )
            )


        directory = (
            HACKATHON_TOOLKIT_DIR /
            item
        )


    else:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid event type."
            )
        )


    directory.mkdir(
        parents=True,
        exist_ok=True
    )


    return directory


# =========================================================
# TOOLKIT UPLOAD
# =========================================================

@app.post("/api/toolkit/upload")
async def upload_toolkit(
    event_type: str,
    item: str,
    file: UploadFile = File(...)
):

    directory = get_toolkit_directory(
        event_type,
        item
    )


    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail=(
                "No file selected."
            )
        )


    safe_filename = Path(
        file.filename
    ).name


    if not safe_filename:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid filename."
            )
        )


    if not safe_filename.lower().endswith(
        ".zip"
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Only ZIP toolkit files "
                "are allowed."
            )
        )


    destination = (
        directory /
        safe_filename
    )


    try:

        with open(
            destination,
            "wb"
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer
            )


    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Toolkit upload failed: "
                f"{error}"
            )
        )


    finally:

        await file.close()


    return {

        "success":
            True,

        "message":
            "Toolkit uploaded successfully.",

        "event":
            event_type,

        "item":
            item,

        "filename":
            safe_filename,

        "download_url":
            (
                "/api/toolkit/download/"
                f"{event_type}/"
                f"{item}/"
                f"{safe_filename}"
            )

    }


# =========================================================
# LIST TOOLKITS
# =========================================================

@app.get(
    "/api/toolkit/{event_type}/{item}"
)
async def list_toolkit(
    event_type: str,
    item: str
):

    directory = get_toolkit_directory(
        event_type,
        item
    )


    files = []


    for file in directory.iterdir():

        if file.is_file():

            files.append({

                "filename":
                    file.name,

                "download_url":
                    (
                        "/api/toolkit/download/"
                        f"{event_type}/"
                        f"{item}/"
                        f"{file.name}"
                    )

            })


    files.sort(
        key=lambda value:
            value["filename"].lower()
    )


    return {

        "success":
            True,

        "event":
            event_type,

        "item":
            item,

        "files":
            files

    }


# =========================================================
# DOWNLOAD TOOLKIT
# =========================================================

@app.get(
    "/api/toolkit/download/"
    "{event_type}/{item}/{filename}"
)
async def download_toolkit(
    event_type: str,
    item: str,
    filename: str
):

    directory = get_toolkit_directory(
        event_type,
        item
    )


    safe_filename = Path(
        filename
    ).name


    file_path = (
        directory /
        safe_filename
    )


    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Toolkit file not found."
            )
        )


    if not file_path.is_file():

        raise HTTPException(
            status_code=404,
            detail=(
                "Toolkit file not found."
            )
        )


    return FileResponse(
        file_path,
        filename=safe_filename
    )


# =========================================================
# DELETE TOOLKIT
# =========================================================

@app.delete(
    "/api/toolkit/"
    "{event_type}/{item}/{filename}"
)
async def delete_toolkit(
    event_type: str,
    item: str,
    filename: str
):

    directory = get_toolkit_directory(
        event_type,
        item
    )


    safe_filename = Path(
        filename
    ).name


    if not safe_filename:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid filename."
            )
        )


    file_path = (
        directory /
        safe_filename
    )


    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Toolkit file not found."
            )
        )


    if not file_path.is_file():

        raise HTTPException(
            status_code=404,
            detail=(
                "Toolkit file not found."
            )
        )


    try:

        file_path.unlink()

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Toolkit delete failed: "
                f"{error}"
            )
        )


    return {

        "success":
            True,

        "message":
            "Toolkit deleted successfully.",

        "event":
            event_type,

        "item":
            item,

        "filename":
            safe_filename

    }


# =========================================================
# WORKSHOP DOMAIN STATUS
# =========================================================

@app.get(
    "/api/workshop/{domain}/status"
)
async def workshop_domain_status(
    domain: str
):

    domain = (
        domain
        .strip()
        .lower()
    )


    if domain not in WORKSHOP_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Workshop domain."
            )
        )


    state = load_state()


    return {

        "success":
            True,

        "domain":
            domain,

        "enabled":
            state["workshop"][
                domain
            ]

    }


# =========================================================
# ALL WORKSHOP STATUS
# =========================================================

@app.get(
    "/api/workshop/status"
)
async def workshop_status():

    state = load_state()


    return {

        "success":
            True,

        "event":
            state["workshop"][
                "event"
            ],

        "domains": {

            "ceh":
                state["workshop"][
                    "ceh"
                ],

            "vapt":
                state["workshop"][
                    "vapt"
                ],

            "soc":
                state["workshop"][
                    "soc"
                ],

            "forensics":
                state["workshop"][
                    "forensics"
                ]

        }

    }


# =========================================================
# WORKSHOP PARTICIPANTS
# =========================================================

@app.get(
    "/api/workshop/{domain}/participants"
)
async def get_workshop_participants(
    domain: str
):

    domain = (
        domain
        .strip()
        .lower()
    )


    if domain not in WORKSHOP_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Workshop domain."
            )
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT

                u.id,

                u.name,

                u.email,

                u.phone,

                wr.status,

                wr.registered_at

            FROM workshop_registrations wr

            INNER JOIN users u
                ON u.id = wr.user_id

            WHERE wr.domain = ?

            ORDER BY
                wr.registered_at DESC
            """,
            (
                domain,
            )
        )


        rows = cursor.fetchall()


        participants = []


        for row in rows:

            participants.append({

                "id":
                    row["id"],

                "name":
                    row["name"],

                "email":
                    row["email"],

                "phone":
                    row["phone"],

                "status":
                    row["status"],

                "registered_at":
                    row["registered_at"]

            })


        return {

            "success":
                True,

            "domain":
                domain,

            "total":
                len(participants),

            "participants":
                participants

        }


    finally:

        connection.close()


# =========================================================
# WORKSHOP TOOLKIT SUMMARY
# =========================================================

@app.get(
    "/api/workshop/toolkits"
)
async def workshop_toolkit_summary():

    result = {}


    for domain in WORKSHOP_DOMAINS:

        directory = (
            WORKSHOP_TOOLKIT_DIR /
            domain
        )


        directory.mkdir(
            parents=True,
            exist_ok=True
        )


        result[domain] = []


        for file in directory.iterdir():

            if file.is_file():

                result[domain].append({

                    "filename":
                        file.name,

                    "download_url":
                        (
                            "/api/toolkit/download/"
                            f"workshop/"
                            f"{domain}/"
                            f"{file.name}"
                        )

                })


        result[domain].sort(
            key=lambda value:
                value["filename"].lower()
        )


    return {

        "success":
            True,

        "toolkits":
            result

    }


# =========================================================
# HACKATHON PARTICIPANTS
# =========================================================

@app.get(
    "/api/hackathon/{domain}/participants"
)
async def get_hackathon_participants(
    domain: str
):

    domain = (
        domain
        .strip()
        .lower()
    )


    if domain not in HACKATHON_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Hackathon domain."
            )
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT

                id,

                team_name,

                member_count AS team_members_count,

                team_members,

                team_lead_email AS email,

                domain,

                status,

                registered_at

            FROM hackathon_teams

            WHERE domain = ?

            ORDER BY
                registered_at DESC
            """,
            (
                domain,
            )
        )


        rows = cursor.fetchall()


        participants = []


        for row in rows:

            try:

                members = json.loads(
                    row["team_members"]
                )

            except Exception:

                members = []


            participants.append({

                "id":
                    row["id"],

                "team_name":
                    row["team_name"],

                "email":
                    row["email"],

                "team_members_count":
                    row[
                        "team_members_count"
                    ],

                "team_members":
                    members,

                "registered_at":
                    row[
                        "registered_at"
                    ],

                "status":
                    row["status"]

            })


        return {

            "success":
                True,

            "domain":
                domain,

            "total":
                len(participants),

            "participants":
                participants

        }


    finally:

        connection.close()


# =========================================================
# HACKATHON SUMMARY
# =========================================================

@app.get(
    "/api/hackathon/{domain}/summary"
)
async def get_hackathon_summary(
    domain: str
):

    domain = (
        domain
        .strip()
        .lower()
    )


    if domain not in HACKATHON_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Hackathon domain."
            )
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT

                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN status = 'active'
                        THEN 1
                        ELSE 0
                    END
                ) AS active,

                SUM(
                    CASE
                        WHEN status = 'completed'
                        THEN 1
                        ELSE 0
                    END
                ) AS completed,

                SUM(
                    CASE
                        WHEN status = 'inactive'
                        THEN 1
                        ELSE 0
                    END
                ) AS inactive

            FROM hackathon_teams

            WHERE domain = ?
            """,
            (
                domain,
            )
        )


        row = cursor.fetchone()


        return {

            "success":
                True,

            "domain":
                domain,

            "total":
                row["total"]
                or 0,

            "active":
                row["active"]
                or 0,

            "completed":
                row["completed"]
                or 0,

            "inactive":
                row["inactive"]
                or 0

        }


    finally:

        connection.close()


# =========================================================
# UPDATE HACKATHON TEAM STATUS
# =========================================================

@app.patch(
    "/api/hackathon/"
    "{domain}/participants/"
    "{team_id}/status"
)
async def update_hackathon_participant_status(
    domain: str,
    team_id: int,
    update: HackathonStatusUpdate
):

    domain = (
        domain
        .strip()
        .lower()
    )

    status = (
        update.status
        .strip()
        .lower()
    )


    if domain not in HACKATHON_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid Hackathon domain."
            )
        )


    allowed_statuses = {

        "active",

        "inactive",

        "completed"

    }


    if status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid status. "
                "Use active, inactive "
                "or completed."
            )
        )


    connection = get_user_db()


    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            UPDATE hackathon_teams

            SET status = ?

            WHERE id = ?

              AND domain = ?
            """,
            (
                status,
                team_id,
                domain
            )
        )


        if cursor.rowcount == 0:

            connection.rollback()

            raise HTTPException(
                status_code=404,
                detail=(
                    "Hackathon team not found."
                )
            )


        connection.commit()


        return {

            "success":
                True,

            "message":
                (
                    "Team status updated "
                    "successfully."
                ),

            "team_id":
                team_id,

            "domain":
                domain,

            "status":
                status

        }


    finally:

        connection.close()


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get(
    "/api/health"
)
async def health():

    return {

        "status":
            "online",

        "application":
            "WAR ROOM",

        "message":
            "WAR ROOM API is running"

    }


# =========================================================
# USER DASHBOARD
# =========================================================

@app.get("/user/dashboard")
async def user_dashboard_page():

    file_path = (
        PUBLIC_DIR /
        "user_dashboard.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "user_dashboard.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )