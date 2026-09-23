from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Depends,
    Cookie,
    Response
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pydantic import BaseModel

from pathlib import Path
from urllib.parse import quote

import json
import copy
import shutil
import sqlite3
import hashlib
import secrets
import hmac
import os
import re
import socket
from email.utils import parseaddr

from datetime import datetime, timezone
from dotenv import load_dotenv

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:
    psycopg = None
    dict_row = None

load_dotenv()


# =========================================================
# PERSISTENT DATABASE COMPATIBILITY LAYER
# =========================================================
# On Vercel, all user/event data must live in Neon PostgreSQL.
# Local development keeps using SQLite. This wrapper preserves
# the existing SQL-heavy WAR ROOM code while adapting the small
# SQLite differences used by the project (placeholders,
# AUTOINCREMENT, PRAGMA, and lastrowid).
# =========================================================

PERSISTENT_DATABASE_URL = (
    os.environ.get("DATABASE_URL", "").strip()
    or
    os.environ.get("POSTGRES_URL", "").strip()
)

USE_PERSISTENT_DATABASE = bool(PERSISTENT_DATABASE_URL)


if psycopg is not None:
    DB_INTEGRITY_ERRORS = (
        sqlite3.IntegrityError,
        psycopg.errors.UniqueViolation,
        psycopg.errors.ForeignKeyViolation,
        psycopg.errors.CheckViolation,
    )
else:
    DB_INTEGRITY_ERRORS = (sqlite3.IntegrityError,)


class PersistentCursor:

    def __init__(self, cursor):
        self._cursor = cursor
        self.lastrowid = None

    @staticmethod
    def _adapt_sql(sql):
        sql = str(sql)

        if sql.strip().upper().startswith("PRAGMA"):
            return None

        # Existing WAR ROOM SQL uses SQLite ? placeholders.
        # psycopg uses %s.
        sql = sql.replace("?", "%s")

        # PostgreSQL uses SERIAL/BIGSERIAL instead of SQLite
        # AUTOINCREMENT primary keys.
        sql = re.sub(
            r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
            "BIGSERIAL PRIMARY KEY",
            sql,
            flags=re.IGNORECASE,
        )

        return sql

    def execute(self, sql, params=None):
        adapted = self._adapt_sql(sql)

        if adapted is None:
            self.lastrowid = None
            return self

        self._cursor.execute(adapted, params)
        self.lastrowid = None

        # The current project reads lastrowid only after INSERTs into
        # users and hackathon_teams. Recover the generated PostgreSQL
        # sequence value without changing the surrounding application.
        match = re.search(
            r"INSERT\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)",
            adapted,
            flags=re.IGNORECASE,
        )

        if match:
            table_name = match.group(1)
            try:
                self._cursor.execute(
                    "SELECT currval(pg_get_serial_sequence(%s, %s)) AS id",
                    (table_name, "id"),
                )
                row = self._cursor.fetchone()
                if row:
                    try:
                        self.lastrowid = row["id"]
                    except Exception:
                        self.lastrowid = row[0]
            except Exception:
                self.lastrowid = None

        return self

    def executemany(self, sql, params_seq):
        adapted = self._adapt_sql(sql)
        if adapted is None:
            return self
        self._cursor.executemany(adapted, params_seq)
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def __getattr__(self, name):
        return getattr(self._cursor, name)


class PersistentConnection:

    def __init__(self, connection):
        self._connection = connection

    def cursor(self):
        return PersistentCursor(
            self._connection.cursor()
        )

    def execute(self, sql, params=None):
        cursor = self.cursor()
        cursor.execute(sql, params)
        return cursor

    def commit(self):
        return self._connection.commit()

    def rollback(self):
        return self._connection.rollback()

    def close(self):
        return self._connection.close()

    def __getattr__(self, name):
        return getattr(self._connection, name)


def connect_persistent_database():
    if psycopg is None:
        raise RuntimeError(
            "PostgreSQL support is not installed. "
            "Add psycopg[binary] to requirements.txt."
        )

    return PersistentConnection(
        psycopg.connect(
            PERSISTENT_DATABASE_URL,
            row_factory=dict_row,
        )
    )



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


# =========================================================
# VERCEL / LOCAL RUNTIME STORAGE
# =========================================================
# Vercel deployment files under /var/task are read-only.
# Local development continues to use the project directory.
# Runtime-created data/toolkits use /tmp on Vercel.
# =========================================================

IS_VERCEL = bool(
    os.environ.get("VERCEL")
)

if IS_VERCEL:
    RUNTIME_DIR = (
        Path("/tmp") /
        "war-room"
    )
else:
    RUNTIME_DIR = BASE_DIR


DATA_DIR = (
    RUNTIME_DIR /
    "data"
)

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
    RUNTIME_DIR /
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
# CREATE / INITIALIZE RUNTIME DIRECTORIES
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
# COPY BUNDLED RUNTIME DATA ON VERCEL
# =========================================================
# The deployment filesystem is read-only. If bundled local
# data/toolkits exist in the repository, copy them once into
# the writable /tmp runtime area so existing read/download
# functionality continues to work after deployment.
# =========================================================

if IS_VERCEL:

    bundled_data_dir = (
        BASE_DIR /
        "data"
    )

    if bundled_data_dir.exists():

        for bundled_file in bundled_data_dir.iterdir():

            if bundled_file.is_file():

                target_file = (
                    DATA_DIR /
                    bundled_file.name
                )

                if not target_file.exists():

                    try:

                        shutil.copy2(
                            bundled_file,
                            target_file
                        )

                    except Exception:
                        pass


    bundled_toolkit_dir = (
        BASE_DIR /
        "toolkits"
    )

    if bundled_toolkit_dir.exists():

        for source_dir in bundled_toolkit_dir.rglob("*"):

            if source_dir.is_dir():

                relative_dir = (
                    source_dir.relative_to(
                        bundled_toolkit_dir
                    )
                )

                target_dir = (
                    TOOLKIT_DIR /
                    relative_dir
                )

                target_dir.mkdir(
                    parents=True,
                    exist_ok=True
                )

            elif source_dir.is_file():

                relative_file = (
                    source_dir.relative_to(
                        bundled_toolkit_dir
                    )
                )

                target_file = (
                    TOOLKIT_DIR /
                    relative_file
                )

                if not target_file.exists():

                    try:

                        target_file.parent.mkdir(
                            parents=True,
                            exist_ok=True
                        )

                        shutil.copy2(
                            source_dir,
                            target_file
                        )

                    except Exception:
                        pass


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
# REGISTRATION SECURITY VALIDATION HELPERS
# =========================================================
# These checks are performed on the backend.
# No verification email or OTP is sent to the user.
# Email validation checks syntax and whether the domain
# has mail/DNS capability.

EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)

INDIAN_PHONE_PATTERN = re.compile(
    r"^[6-9][0-9]{9}$"
)

DISPOSABLE_EMAIL_DOMAINS = {
    "10minutemail.com",
    "10minutemail.net",
    "guerrillamail.com",
    "mailinator.com",
    "tempmail.com",
    "temp-mail.org",
    "throwawaymail.com",
    "yopmail.com",
}


def validate_email_syntax(email: str) -> bool:
    """Validate the basic structure of an email address."""

    if not email:
        return False

    if len(email) > 254:
        return False

    parsed_name, parsed_address = parseaddr(email)

    if parsed_address != email:
        return False

    if not EMAIL_PATTERN.fullmatch(email):
        return False

    local_part, _, domain = email.rpartition("@")

    if not local_part or not domain:
        return False

    if len(local_part) > 64:
        return False

    return True


def validate_email_mail_domain(email: str) -> tuple[bool, str]:
    """
    Validate email syntax and verify that its domain has
    mail/DNS capability.

    This does NOT send an email to the supplied address.
    """

    if not validate_email_syntax(email):
        return False, "Enter a valid email address."

    domain = email.rsplit("@", 1)[1].lower().rstrip(".")

    if domain in DISPOSABLE_EMAIL_DOMAINS:
        return False, "Disposable email addresses are not allowed."

    # If dnspython is available, prefer an MX lookup.
    # MX records are the correct DNS mechanism for checking
    # whether a domain advertises mail servers.
    try:
        import dns.resolver

        answers = dns.resolver.resolve(
            domain,
            "MX",
            lifetime=3
        )

        for answer in answers:
            if str(answer.exchange).strip():
                return True, ""

    except ImportError:
        # Fall back to normal DNS resolution below when
        # dnspython is not installed.
        pass

    except Exception:
        # Some environments block MX queries. Fall back to
        # checking whether the domain itself resolves.
        pass

    try:
        socket.getaddrinfo(
            domain,
            None,
            type=socket.SOCK_STREAM
        )

        return True, ""

    except (socket.gaierror, OSError):
        return False, (
            "Enter a valid working email address. "
            "The email domain could not be reached."
        )

    except Exception:
        return False, (
            "Enter a valid working email address."
        )


def validate_indian_phone(phone: str) -> bool:
    """Validate a 10-digit Indian mobile number."""

    if not phone:
        return False

    return bool(
        INDIAN_PHONE_PATTERN.fullmatch(phone)
    )


def validate_password_policy(password: str) -> tuple[bool, str]:
    """
    Enforce the WAR ROOM registration password policy.
    """

    if not password:
        return False, "Password is required."

    if len(password) < 8:
        return False, (
            "Password must contain at least 8 characters."
        )

    if len(password) > 128:
        return False, (
            "Password must not exceed 128 characters."
        )

    if not re.search(r"[A-Z]", password):
        return False, (
            "Password must contain at least one uppercase letter."
        )

    if not re.search(r"[a-z]", password):
        return False, (
            "Password must contain at least one lowercase letter."
        )

    if not re.search(r"[0-9]", password):
        return False, (
            "Password must contain at least one number."
        )

    if not re.search(r"[^A-Za-z0-9]", password):
        return False, (
            "Password must contain at least one special character."
        )

    return True, ""


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

    # Vercel/Neon: persistent database for users, registrations,
    # sessions, CTF submissions, points and leaderboard data.
    if USE_PERSISTENT_DATABASE:
        return connect_persistent_database()

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
# On Vercel this creates the same WAR ROOM user/event tables in
# Neon PostgreSQL. Local runs continue to use SQLite.
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


    # =====================================================
    # ADMIN SESSIONS
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_sessions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            username TEXT NOT NULL,

            session_token TEXT NOT NULL UNIQUE,

            created_at TEXT NOT NULL

        )
        """
    )


    # =====================================================
    # ADMIN CREDENTIALS
    # =====================================================

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS admin_credentials (

            id INTEGER PRIMARY KEY CHECK (id = 1),

            username TEXT NOT NULL UNIQUE,

            password_hash TEXT NOT NULL,

            updated_at TEXT NOT NULL

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
# INITIALIZE ADMIN CREDENTIALS
# =========================================================

def get_persistent_admin_database_url():

    return PERSISTENT_DATABASE_URL


def use_persistent_admin_database():

    return bool(
        get_persistent_admin_database_url()
    )


def get_admin_database_connection():

    database_url = get_persistent_admin_database_url()

    if database_url:

        if psycopg is None:

            raise HTTPException(
                status_code=500,
                detail=(
                    "PostgreSQL support is not installed. "
                    "Add psycopg[binary] to requirements.txt."
                )
            )

        return psycopg.connect(
            database_url,
            row_factory=dict_row
        )

    return get_user_db()


def initialize_persistent_admin_database():

    if not use_persistent_admin_database():

        return

    connection = get_admin_database_connection()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS war_room_admin_credentials (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS war_room_admin_sessions (
                id BIGSERIAL PRIMARY KEY,
                username TEXT NOT NULL,
                session_token TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL
            )
            """
        )

        connection.commit()

    finally:

        connection.close()


def initialize_admin_credentials():

    initialize_persistent_admin_database()

    connection = get_admin_database_connection()

    persistent = use_persistent_admin_database()

    try:

        cursor = connection.cursor()

        credentials_table = (
            "war_room_admin_credentials"
            if persistent
            else "admin_credentials"
        )

        cursor.execute(
            f"""
            SELECT id
            FROM {credentials_table}
            WHERE id = 1
            LIMIT 1
            """
        )

        existing = cursor.fetchone()

        if existing:

            return

        username = os.environ.get(
            "WAR_ROOM_ADMIN_USERNAME",
            ""
        ).strip()

        password = os.environ.get(
            "WAR_ROOM_ADMIN_PASSWORD",
            ""
        )

        if not username or not password:

            return

        now = datetime.now(
            timezone.utc
        ).isoformat()

        placeholder = "%s" if persistent else "?"

        cursor.execute(
            f"""
            INSERT INTO {credentials_table}
                (
                    id,
                    username,
                    password_hash,
                    updated_at
                )
            VALUES
                (1, {placeholder}, {placeholder}, {placeholder})
            """,
            (
                username,
                hash_password(password),
                now
            )
        )

        connection.commit()

    finally:

        connection.close()


initialize_admin_credentials()


# =========================================================
# PERSISTENT SYSTEM STATE
# =========================================================
# On Vercel, Admin ON/OFF settings are stored in Neon PostgreSQL.
# Local development continues to use war_room_state.json.
# =========================================================

def save_state(
    state
):

    if USE_PERSISTENT_DATABASE:

        connection = get_user_db()

        try:

            cursor = connection.cursor()

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS war_room_system_state (
                    id INTEGER PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

            cursor.execute(
                """
                INSERT INTO war_room_system_state
                    (id, state_json, updated_at)
                VALUES
                    (1, ?, ?)
                ON CONFLICT (id)
                DO UPDATE SET
                    state_json = EXCLUDED.state_json,
                    updated_at = EXCLUDED.updated_at
                """,
                (
                    json.dumps(state),
                    datetime.now(timezone.utc).isoformat()
                )
            )

            connection.commit()

        finally:

            connection.close()

        return

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


def load_state():

    if USE_PERSISTENT_DATABASE:

        connection = get_user_db()

        try:

            cursor = connection.cursor()

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS war_room_system_state (
                    id INTEGER PRIMARY KEY,
                    state_json TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

            cursor.execute(
                """
                SELECT state_json
                FROM war_room_system_state
                WHERE id = 1
                LIMIT 1
                """
            )

            row = cursor.fetchone()

            if row:

                try:
                    state = json.loads(
                        row["state_json"]
                    )

                except Exception:
                    state = copy.deepcopy(
                        DEFAULT_STATE
                    )

            else:

                state = copy.deepcopy(
                    DEFAULT_STATE
                )

                cursor.execute(
                    """
                    INSERT INTO war_room_system_state
                        (id, state_json, updated_at)
                    VALUES
                        (1, ?, ?)
                    """,
                    (
                        json.dumps(state),
                        datetime.now(
                            timezone.utc
                        ).isoformat()
                    )
                )

                connection.commit()

        finally:

            connection.close()

    else:

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
# PUBLIC HTML FILES
# =========================================================
# Explicitly expose the complete frontend/public directory.
# Vercel's Python runtime can promote StaticFiles directories
# to its CDN and keep the source directory available to the
# function. This also makes index.html discoverable at "/".
# Existing API/page routes declared below remain unchanged
# because FastAPI evaluates routes in declaration order.
# =========================================================

app.mount(
    "/_public",
    StaticFiles(
        directory=PUBLIC_DIR,
        html=True
    ),
    name="public-files"
)


# =========================================================
# HOME PAGE
# =========================================================

@app.get("/")
async def home():

    index_file = (
        PUBLIC_DIR /
        "index.html"
    )

    if not index_file.exists():

        raise HTTPException(
            status_code=500,
            detail=(
                "frontend/public/index.html is missing "
                "from the deployment."
            )
        )

    return FileResponse(
        index_file
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
# USER LEADERBOARD PAGE
# =========================================================

@app.get("/user/leaderboard")
async def user_leaderboard_page():

    file_path = (
        PUBLIC_DIR /
        "user-leaderboard.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "user-leaderboard.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )


@app.get("/user-leaderboard.html")
async def old_user_leaderboard_page():

    file_path = (
        PUBLIC_DIR /
        "user-leaderboard.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "user-leaderboard.html not found "
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
# ADMIN USERNAME CHANGE MODEL
# =========================================================

class AdminUsernameChange(BaseModel):

    current_username: str

    new_username: str

    confirm_username: str


# =========================================================
# ADMIN PASSWORD CHANGE MODEL
# =========================================================

class AdminPasswordChange(BaseModel):

    current_password: str

    new_password: str

    confirm_password: str


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


    # =====================================================
    # EMAIL SECURITY VALIDATION
    # =====================================================

    email_is_valid, email_error = (
        validate_email_mail_domain(
            email
        )
    )

    if not email_is_valid:

        raise HTTPException(
            status_code=400,
            detail=email_error
        )


    # =====================================================
    # PHONE SECURITY VALIDATION
    # =====================================================

    if not phone:

        raise HTTPException(
            status_code=400,
            detail="Phone number is required."
        )

    if not validate_indian_phone(phone):

        raise HTTPException(
            status_code=400,
            detail=(
                "Enter a valid 10-digit Indian "
                "mobile number starting with 6, 7, 8, or 9."
            )
        )


    # =====================================================
    # PASSWORD SECURITY POLICY
    # =====================================================

    password_is_valid, password_error = (
        validate_password_policy(
            password
        )
    )

    if not password_is_valid:

        raise HTTPException(
            status_code=400,
            detail=password_error
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
                    'pending',
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
                    "Registration submitted successfully for "
                    f"{domain.upper()} Workshop. "
                    "Please wait for administrator approval."
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


    except DB_INTEGRITY_ERRORS:

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


        # =================================================
        # ADMIN APPROVAL
        # =================================================

        user_status = str(
            user["status"] or ""
        ).strip().lower()


        if user_status == "pending":

            raise HTTPException(
                status_code=403,
                detail=(
                    "Your account is pending administrator approval."
                )
            )


        if user_status == "rejected":

            raise HTTPException(
                status_code=403,
                detail=(
                    "Your account registration was rejected by the administrator."
                )
            )


        if user_status not in (
            "approved",
            "active",
            "registered"
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "Your account is not approved for login."
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


        # =================================================
        # LEADERBOARD ACCOUNT RECORD
        # Create on first successful approved login.
        # Existing record is reused so points are preserved.
        # =================================================

        get_account_data(
            "user",
            user["id"],
            "workshop",
            domain
        )


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
    # EMAIL SECURITY VALIDATION
    # =====================================================

    email_is_valid, email_error = (
        validate_email_mail_domain(
            email
        )
    )

    if not email_is_valid:

        raise HTTPException(
            status_code=400,
            detail=email_error
        )


    # =====================================================
    # PASSWORD SECURITY POLICY
    # =====================================================

    password_is_valid, password_error = (
        validate_password_policy(
            password
        )
    )

    if not password_is_valid:

        raise HTTPException(
            status_code=400,
            detail=password_error
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
                    'pending',
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
                    "Registration submitted successfully for "
                    f"{domain.upper()}. "
                    "Please wait for administrator approval."
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
                    "pending",

                "registered_at":
                    created_at

            }

        }


    except HTTPException:

        connection.rollback()

        raise


    except DB_INTEGRITY_ERRORS:

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
        # ADMIN APPROVAL
        # =================================================

        team_status = str(
            team["status"] or ""
        ).strip().lower()


        if team_status == "pending":

            raise HTTPException(
                status_code=403,
                detail=(
                    "Your Hackathon registration is pending administrator approval."
                )
            )


        if team_status == "rejected":

            raise HTTPException(
                status_code=403,
                detail=(
                    "Your Hackathon registration was rejected by the administrator."
                )
            )


        if team_status not in (
            "approved",
            "active"
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "Your Hackathon team is not approved for login."
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
        # LEADERBOARD ACCOUNT RECORD
        # Create on first successful approved login.
        # Existing record is reused so points are preserved.
        # =================================================

        get_account_data(
            "team",
            team["id"],
            "hackathon",
            domain
        )


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
        update.data is not None
        and "points" in update.data
    ):

        raise HTTPException(
            status_code=403,
            detail="Points can only be updated by the server."
        )

    row = update_account_data(
        "user",
        user["id"],
        "workshop",
        user["domain"],
        None,
        update.data
    )

    return {

        "success":
            True,

        "account_data":
            serialize_account_data(row)

    }



# =========================================================
# USER LEADERBOARD API
# =========================================================

@app.get("/api/user/leaderboard")
async def get_user_leaderboard(
    event: str,
    domain: str,
    session_token: str
):

    event = (
        str(event or "")
        .strip()
        .lower()
    )

    domain = (
        str(domain or "")
        .strip()
        .lower()
    )

    session_token = (
        str(session_token or "")
        .strip()
    )


    # =====================================================
    # BASIC VALIDATION
    # =====================================================

    if event not in {
        "workshop",
        "hackathon"
    }:

        raise HTTPException(
            status_code=400,
            detail="Invalid event."
        )


    if not session_token:

        raise HTTPException(
            status_code=401,
            detail="User session is required."
        )


    # =====================================================
    # DOMAIN VALIDATION
    # =====================================================

    if event == "workshop":

        if domain not in WORKSHOP_DOMAINS:

            raise HTTPException(
                status_code=400,
                detail="Invalid Workshop domain."
            )

    else:

        if domain not in HACKATHON_DOMAINS:

            raise HTTPException(
                status_code=400,
                detail="Invalid Hackathon domain."
            )


    # =====================================================
    # LEADERBOARD VISIBILITY
    # =====================================================

    state = load_state()

    leaderboard_state = (
        state.get(
            "leaderboard",
            {}
        )
        .get(
            event,
            False
        )
    )

    if not leaderboard_state:

        raise HTTPException(
            status_code=403,
            detail=(
                f"{event.capitalize()} leaderboard "
                "is currently disabled."
            )
        )


    # Recalculate any legacy VAPT CTF scores before reading
    # account_data so the leaderboard cannot show stale 10-point
    # VAPT totals.
    repair_existing_vapt_ctf_scores()

    connection = get_user_db()

    try:

        cursor = connection.cursor()


        # =================================================
        # WORKSHOP
        # =================================================

        if event == "workshop":

            # ---------------------------------------------
            # VERIFY SESSION AND ACTUAL USER DOMAIN
            # ---------------------------------------------

            cursor.execute(
                """
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    wr.domain,
                    wr.status

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

            current_user = cursor.fetchone()


            if not current_user:

                raise HTTPException(
                    status_code=401,
                    detail=(
                        "Invalid or expired user session."
                    )
                )


            actual_domain = (
                str(
                    current_user["domain"] or ""
                )
                .strip()
                .lower()
            )


            # NEVER trust a domain supplied by
            # the browser if it differs from
            # the authenticated registration.

            if actual_domain != domain:

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "The requested leaderboard domain "
                        "does not match your logged-in domain."
                    )
                )


            user_status = (
                str(
                    current_user["status"] or ""
                )
                .strip()
                .lower()
            )


            if user_status != "approved":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Your account is not approved "
                        "for leaderboard access."
                    )
                )


            # ---------------------------------------------
            # APPROVED WORKSHOP PARTICIPANTS ONLY
            # ---------------------------------------------

            cursor.execute(
                """
                SELECT
                    u.id AS account_id,
                    u.name AS account_name,
                    wr.domain AS domain,
                    COALESCE(
                        ad.points,
                        0
                    ) AS points

                FROM users u

                INNER JOIN workshop_registrations wr
                    ON wr.user_id = u.id

                LEFT JOIN account_data ad
                    ON ad.account_type = 'user'
                    AND ad.account_id = u.id
                    AND ad.event_type = 'workshop'
                    AND ad.domain = wr.domain

                WHERE wr.domain = ?
                  AND wr.status = 'approved'

                ORDER BY
                    points DESC,
                    LOWER(u.name) ASC,
                    u.id ASC
                """,
                (
                    domain,
                )
            )

            rows = cursor.fetchall()


        # =================================================
        # HACKATHON
        # =================================================

        else:

            # ---------------------------------------------
            # VERIFY SESSION AND ACTUAL TEAM DOMAIN
            # ---------------------------------------------

            cursor.execute(
                """
                SELECT
                    ht.id,
                    ht.team_name,
                    ht.domain,
                    ht.status

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

            current_team = cursor.fetchone()


            if not current_team:

                raise HTTPException(
                    status_code=401,
                    detail=(
                        "Invalid or expired Hackathon session."
                    )
                )


            actual_domain = (
                str(
                    current_team["domain"] or ""
                )
                .strip()
                .lower()
            )


            if actual_domain != domain:

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "The requested leaderboard domain "
                        "does not match your logged-in Hackathon domain."
                    )
                )


            team_status = (
                str(
                    current_team["status"] or ""
                )
                .strip()
                .lower()
            )


            if team_status != "approved":

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Your Hackathon team is not approved "
                        "for leaderboard access."
                    )
                )


            # ---------------------------------------------
            # APPROVED HACKATHON TEAMS ONLY
            # ---------------------------------------------

            cursor.execute(
                """
                SELECT
                    ht.id AS account_id,
                    ht.team_name AS account_name,
                    ht.domain AS domain,
                    COALESCE(
                        ad.points,
                        0
                    ) AS points

                FROM hackathon_teams ht

                LEFT JOIN account_data ad
                    ON ad.account_type = 'team'
                    AND ad.account_id = ht.id
                    AND ad.event_type = 'hackathon'
                    AND ad.domain = ht.domain

                WHERE ht.domain = ?
                  AND ht.status = 'approved'

                ORDER BY
                    points DESC,
                    LOWER(ht.team_name) ASC,
                    ht.id ASC
                """,
                (
                    domain,
                )
            )

            rows = cursor.fetchall()


        # =================================================
        # BUILD RESPONSE
        # =================================================

        leaderboard_rows = []


        for index, row in enumerate(
            rows,
            start=1
        ):

            leaderboard_rows.append(
                {
                    "rank":
                        index,

                    "id":
                        row["account_id"],

                    "name":
                        row["account_name"],

                    "domain":
                        row["domain"],

                    "points":
                        int(
                            row["points"] or 0
                        )
                }
            )


        top_score = (
            leaderboard_rows[0]["points"]
            if leaderboard_rows
            else 0
        )


        return {

            "success":
                True,

            "event":
                event,

            "domain":
                domain,

            "total":
                len(
                    leaderboard_rows
                ),

            "top_score":
                top_score,

            "rows":
                leaderboard_rows

        }


    finally:

        connection.close()



# =========================================================
# ADMIN AUTHENTICATION
# =========================================================

ADMIN_SESSION_COOKIE = (
    "war_room_admin_session"
)

ADMIN_SESSION_MAX_AGE = (
    60 * 60 * 8
)


def create_admin_session(
    username: str
):

    session_token = (
        secrets.token_urlsafe(32)
    )

    created_at = (
        datetime.now(
            timezone.utc
        ).isoformat()
    )

    if use_persistent_admin_database():

        connection = get_admin_database_connection()

        try:

            cursor = connection.cursor()

            cursor.execute(
                """
                INSERT INTO war_room_admin_sessions
                    (
                        username,
                        session_token,
                        created_at
                    )
                VALUES
                    (%s, %s, %s)
                """,
                (
                    username,
                    session_token,
                    created_at
                )
            )

            connection.commit()

            return session_token

        finally:

            connection.close()

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO admin_sessions
                (
                    username,
                    session_token,
                    created_at
                )
            VALUES
                (?, ?, ?)
            """,
            (
                username,
                session_token,
                created_at
            )
        )

        connection.commit()

        return session_token

    finally:

        connection.close()


def get_admin_username(
    session_token: str | None
):

    if not session_token:

        return None

    if use_persistent_admin_database():

        connection = get_admin_database_connection()

        try:

            cursor = connection.cursor()

            cursor.execute(
                """
                SELECT username
                FROM war_room_admin_sessions
                WHERE session_token = %s
                LIMIT 1
                """,
                (session_token,)
            )

            row = cursor.fetchone()

            if not row:

                return None

            return row["username"]

        finally:

            connection.close()

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT username
            FROM admin_sessions
            WHERE session_token = ?
            LIMIT 1
            """,
            (session_token,)
        )

        row = cursor.fetchone()

        if not row:

            return None

        return row["username"]

    finally:

        connection.close()


def require_admin(
    session_token: str | None = Cookie(
        default=None,
        alias=ADMIN_SESSION_COOKIE
    )
):

    username = get_admin_username(
        session_token
    )

    if not username:

        raise HTTPException(
            status_code=401,
            detail=(
                "Administrator authentication required."
            )
        )

    return username


# =========================================================
# =========================================================
# ADMIN LEADERBOARD API
# =========================================================

@app.get("/api/admin/leaderboard")
async def get_admin_leaderboard(
    admin_username: str = Depends(require_admin),
    event: str | None = None,
    domain: str | None = None
):

    event = (
        str(event or "")
        .strip()
        .lower()
    )

    domain = (
        str(domain or "")
        .strip()
        .lower()
    )

    if event not in ("", "workshop", "hackathon"):

        raise HTTPException(
            status_code=400,
            detail="Invalid event."
        )

    if event == "workshop" and domain and domain not in WORKSHOP_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid Workshop domain."
        )

    if event == "hackathon" and domain and domain not in HACKATHON_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid Hackathon domain."
        )

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        rows = []

        # =====================================================
        # WORKSHOP USERS
        # =====================================================

        if event in ("", "workshop"):

            params = []
            where = ["wr.status = 'approved'"]

            if domain:
                where.append("wr.domain = ?")
                params.append(domain)

            cursor.execute(
                f"""
                SELECT
                    u.id AS account_id,
                    u.name AS account_name,
                    wr.domain AS domain,
                    COALESCE(ad.points, 0) AS points
                FROM users u
                INNER JOIN workshop_registrations wr
                    ON wr.user_id = u.id
                LEFT JOIN account_data ad
                    ON ad.account_type = 'user'
                    AND ad.account_id = u.id
                    AND ad.event_type = 'workshop'
                    AND ad.domain = wr.domain
                WHERE {" AND ".join(where)}
                ORDER BY
                    points DESC,
                    LOWER(u.name) ASC,
                    u.id ASC
                """,
                tuple(params)
            )

            for row in cursor.fetchall():

                rows.append({
                    "account_type": "user",
                    "id": row["account_id"],
                    "name": row["account_name"],
                    "domain": row["domain"],
                    "event": "workshop",
                    "points": int(row["points"] or 0)
                })

        # =====================================================
        # HACKATHON TEAMS
        # =====================================================

        if event in ("", "hackathon"):

            params = []
            where = ["ht.status = 'approved'"]

            if domain:
                where.append("ht.domain = ?")
                params.append(domain)

            cursor.execute(
                f"""
                SELECT
                    ht.id AS account_id,
                    ht.team_name AS account_name,
                    ht.domain AS domain,
                    COALESCE(ad.points, 0) AS points
                FROM hackathon_teams ht
                LEFT JOIN account_data ad
                    ON ad.account_type = 'team'
                    AND ad.account_id = ht.id
                    AND ad.event_type = 'hackathon'
                    AND ad.domain = ht.domain
                WHERE {" AND ".join(where)}
                ORDER BY
                    points DESC,
                    LOWER(ht.team_name) ASC,
                    ht.id ASC
                """,
                tuple(params)
            )

            for row in cursor.fetchall():

                rows.append({
                    "account_type": "team",
                    "id": row["account_id"],
                    "name": row["account_name"],
                    "domain": row["domain"],
                    "event": "hackathon",
                    "points": int(row["points"] or 0)
                })

        # =====================================================
        # SORT + RANK
        # =====================================================

        rows.sort(
            key=lambda row: (
                -int(row["points"]),
                str(row["name"]).lower(),
                str(row["event"]),
                str(row["domain"]),
                int(row["id"])
            )
        )

        for index, row in enumerate(rows, start=1):
            row["rank"] = index

        return {
            "success": True,
            "event": event or "all",
            "domain": domain or "all",
            "total": len(rows),
            "top_score": rows[0]["points"] if rows else 0,
            "rows": rows
        }

    finally:

        connection.close()


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
        update.data is not None
        and "points" in update.data
    ):

        raise HTTPException(
            status_code=403,
            detail="Points can only be updated by the server."
        )

    row = update_account_data(
        "team",
        team["id"],
        "hackathon",
        team["domain"],
        None,
        update.data
    )

    return {

        "success":
            True,

        "account_data":
            serialize_account_data(row)

    }


# ADMIN CREDENTIAL CONFIGURATION
# =========================================================

def get_admin_credentials():

    persistent = use_persistent_admin_database()

    connection = get_admin_database_connection()

    try:

        cursor = connection.cursor()

        table_name = (
            "war_room_admin_credentials"
            if persistent
            else "admin_credentials"
        )

        cursor.execute(
            f"""
            SELECT
                username,
                password_hash
            FROM {table_name}
            WHERE id = 1
            LIMIT 1
            """
        )

        row = cursor.fetchone()

        if row:

            return (
                row["username"],
                row["password_hash"]
            )

    finally:

        connection.close()

    username = os.environ.get(
        "WAR_ROOM_ADMIN_USERNAME",
        ""
    ).strip()

    password = os.environ.get(
        "WAR_ROOM_ADMIN_PASSWORD",
        ""
    )

    if not username or not password:

        raise HTTPException(
            status_code=500,
            detail=(
                "Administrator credentials are not configured on the server."
            )
        )

    return (
        username,
        hash_password(password)
    )


# =========================================================
# ADMIN LOGIN API
# =========================================================

@app.post("/api/admin/login")
async def admin_login_api(
    credentials: AdminLogin,
    response: Response
):

    ADMIN_USERNAME, ADMIN_PASSWORD_HASH = get_admin_credentials()


    if (
        credentials.username == ADMIN_USERNAME
        and
        verify_password(
            credentials.password,
            ADMIN_PASSWORD_HASH
        )
    ):

        session_token = create_admin_session(
            credentials.username
        )

        response.set_cookie(
            key=ADMIN_SESSION_COOKIE,
            value=session_token,
            max_age=ADMIN_SESSION_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=IS_VERCEL,
            path="/"
        )

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
# ADMIN LOGOUT API
# =========================================================

@app.post("/api/admin/logout")
async def admin_logout(
    response: Response,
    session_token: str | None = Cookie(
        default=None,
        alias=ADMIN_SESSION_COOKIE
    )
):

    if session_token:

        connection = get_admin_database_connection()

        try:

            cursor = connection.cursor()

            if use_persistent_admin_database():

                cursor.execute(
                    """
                    DELETE FROM war_room_admin_sessions
                    WHERE session_token = %s
                    """,
                    (session_token,)
                )

            else:

                cursor.execute(
                    """
                    DELETE FROM admin_sessions
                    WHERE session_token = ?
                    """,
                    (session_token,)
                )

            connection.commit()

        finally:

            connection.close()

    response.delete_cookie(
        key=ADMIN_SESSION_COOKIE,
        path="/"
    )

    return {

        "success":
            True,

        "message":
            "Admin logout successful."

    }


# =========================================================
# ADMIN SETTINGS — CURRENT ACCOUNT
# =========================================================

@app.get("/api/admin/settings")
async def get_admin_settings(
    admin_username: str = Depends(require_admin)
):

    return {

        "success": True,

        "username": admin_username

    }


# =========================================================
# ADMIN SETTINGS — CHANGE USERNAME
# =========================================================

@app.post("/api/admin/settings/username")
async def change_admin_username(
    update: AdminUsernameChange,
    response: Response,
    session_token: str | None = Cookie(
        default=None,
        alias=ADMIN_SESSION_COOKIE
    ),
    admin_username: str = Depends(require_admin)
):

    current_username = (
        update.current_username.strip()
    )

    new_username = (
        update.new_username.strip()
    )

    confirm_username = (
        update.confirm_username.strip()
    )

    if not current_username:

        raise HTTPException(
            status_code=400,
            detail="Current username is required."
        )

    if not new_username:

        raise HTTPException(
            status_code=400,
            detail="New username is required."
        )

    if len(new_username) < 3:

        raise HTTPException(
            status_code=400,
            detail="New username must contain at least 3 characters."
        )

    if new_username != confirm_username:

        raise HTTPException(
            status_code=400,
            detail="New username and confirmation do not match."
        )

    if current_username != admin_username:

        raise HTTPException(
            status_code=401,
            detail="Current username is incorrect."
        )

    if new_username == admin_username:

        raise HTTPException(
            status_code=400,
            detail="New username must be different from the current username."
        )

    persistent = use_persistent_admin_database()

    connection = get_admin_database_connection()

    try:

        cursor = connection.cursor()

        credentials_table = (
            "war_room_admin_credentials"
            if persistent
            else "admin_credentials"
        )

        cursor.execute(
            f"""
            SELECT id
            FROM {credentials_table}
            WHERE id = 1
            LIMIT 1
            """
        )

        row = cursor.fetchone()

        if not row:

            raise HTTPException(
                status_code=500,
                detail="Administrator credentials are not initialized."
            )

        now = datetime.now(
            timezone.utc
        ).isoformat()

        placeholder = "%s" if persistent else "?"

        cursor.execute(
            f"""
            UPDATE {credentials_table}
            SET username = {placeholder},
                updated_at = {placeholder}
            WHERE id = 1
            """,
            (
                new_username,
                now
            )
        )

        if persistent:

            cursor.execute(
                """
                UPDATE war_room_admin_sessions
                SET username = %s
                WHERE username = %s
                """,
                (
                    new_username,
                    admin_username
                )
            )

        else:

            cursor.execute(
                """
                UPDATE admin_sessions
                SET username = ?
                WHERE username = ?
                """,
                (
                    new_username,
                    admin_username
                )
            )

        connection.commit()

        return {

            "success": True,

            "message": "Administrator username changed successfully.",

            "username": new_username

        }

    finally:

        connection.close()



# =========================================================
# ADMIN SETTINGS — CHANGE PASSWORD
# =========================================================

@app.post("/api/admin/settings/password")
async def change_admin_password(
    update: AdminPasswordChange,
    admin_username: str = Depends(require_admin)
):

    current_password = update.current_password
    new_password = update.new_password
    confirm_password = update.confirm_password

    if not current_password:

        raise HTTPException(
            status_code=400,
            detail="Current password is required."
        )

    if len(new_password) < 6:

        raise HTTPException(
            status_code=400,
            detail="New password must contain at least 6 characters."
        )

    if new_password != confirm_password:

        raise HTTPException(
            status_code=400,
            detail="New password and confirmation do not match."
        )

    persistent = use_persistent_admin_database()

    connection = get_admin_database_connection()

    try:

        cursor = connection.cursor()

        credentials_table = (
            "war_room_admin_credentials"
            if persistent
            else "admin_credentials"
        )

        cursor.execute(
            f"""
            SELECT username, password_hash
            FROM {credentials_table}
            WHERE id = 1
            LIMIT 1
            """
        )

        row = cursor.fetchone()

        if not row:

            raise HTTPException(
                status_code=500,
                detail="Administrator credentials are not initialized."
            )

        if row["username"] != admin_username:

            raise HTTPException(
                status_code=401,
                detail="Administrator session is no longer valid."
            )

        if not verify_password(
            current_password,
            row["password_hash"]
        ):

            raise HTTPException(
                status_code=401,
                detail="Current password is incorrect."
            )

        if verify_password(
            new_password,
            row["password_hash"]
        ):

            raise HTTPException(
                status_code=400,
                detail="New password must be different from the current password."
            )

        now = datetime.now(
            timezone.utc
        ).isoformat()

        placeholder = "%s" if persistent else "?"

        cursor.execute(
            f"""
            UPDATE {credentials_table}
            SET password_hash = {placeholder},
                updated_at = {placeholder}
            WHERE id = 1
            """,
            (
                hash_password(new_password),
                now
            )
        )

        connection.commit()

        return {

            "success": True,

            "message": "Administrator password changed successfully."

        }

    finally:

        connection.close()



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
    domain: str,
    admin_username: str = Depends(require_admin)
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
                "registered",
                "approved"
            )

        )


        pending = sum(

            1

            for account in accounts

            if str(
                account.get("status", "")
            ).lower()
            == "pending"

        )


        rejected = sum(

            1

            for account in accounts

            if str(
                account.get("status", "")
            ).lower()
            == "rejected"

        )


        inactive = (
            pending +
            rejected
        )


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

            "approved":
                active,

            "pending":
                pending,

            "rejected":
                rejected,

            "inactive":
                inactive,

            "accounts":
                accounts

        }


    finally:

        connection.close()


# =========================================================
# ADMIN — REGISTRATION APPROVAL STATUS MODEL
# =========================================================

class AccountApprovalStatusUpdate(BaseModel):

    status: str


# =========================================================
# ADMIN — UPDATE ACCOUNT APPROVAL STATUS
# =========================================================

@app.patch(
    "/api/admin/accounts/{event_type}/{domain}/{account_id}/status"
)
async def update_admin_account_status(
    event_type: str,
    domain: str,
    account_id: int,
    update: AccountApprovalStatusUpdate,
    admin_username: str = Depends(require_admin)
):

    event_type = event_type.strip().lower()
    domain = domain.strip().lower()
    status = str(update.status or "").strip().lower()


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


    if status not in (
        "pending",
        "approved",
        "rejected"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid account status. "
                "Use pending, approved, or rejected."
            )
        )


    connection = get_user_db()

    try:

        cursor = connection.cursor()


        if event_type == "workshop":

            cursor.execute(
                """
                SELECT
                    id,
                    user_id
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
                raise HTTPException(
                    status_code=404,
                    detail="Account registration not found."
                )


            cursor.execute(
                """
                UPDATE workshop_registrations
                SET status = ?
                WHERE id = ?
                  AND domain = ?
                """,
                (
                    status,
                    account_id,
                    domain
                )
            )


            if status != "approved":

                cursor.execute(
                    """
                    DELETE FROM user_sessions
                    WHERE user_id = ?
                    """,
                    (
                        registration["user_id"],
                    )
                )


        else:

            cursor.execute(
                """
                SELECT
                    id
                FROM hackathon_teams
                WHERE id = ?
                  AND domain = ?
                LIMIT 1
                """,
                (
                    account_id,
                    domain
                )
            )

            team = cursor.fetchone()


            if not team:
                raise HTTPException(
                    status_code=404,
                    detail="Hackathon team not found."
                )


            cursor.execute(
                """
                UPDATE hackathon_teams
                SET status = ?
                WHERE id = ?
                  AND domain = ?
                """,
                (
                    status,
                    account_id,
                    domain
                )
            )


            if status != "approved":

                cursor.execute(
                    """
                    DELETE FROM hackathon_sessions
                    WHERE team_id = ?
                    """,
                    (
                        team["id"],
                    )
                )


        connection.commit()


        return {
            "success": True,
            "message": (
                "Account approved successfully."
                if status == "approved"
                else
                "Account rejected successfully."
                if status == "rejected"
                else
                "Account moved to pending status."
            ),
            "event": event_type,
            "domain": domain,
            "account_id": account_id,
            "status": status
        }


    except HTTPException:

        connection.rollback()
        raise


    except Exception as error:

        connection.rollback()

        print(
            "ADMIN ACCOUNT STATUS ERROR:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to update account status."
        )


    finally:

        connection.close()


# =========================================================
# ADMIN — PENDING REGISTRATION NOTIFICATIONS
# =========================================================

@app.get(
    "/api/admin/notifications/registrations"
)
async def get_admin_registration_notifications(
    admin_username: str = Depends(require_admin)
):

    connection = get_user_db()

    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            SELECT
                'workshop' AS event_type,
                wr.domain AS domain,
                wr.id AS account_id,
                u.name AS display_name,
                u.email AS email,
                wr.registered_at AS registered_at
            FROM workshop_registrations wr
            INNER JOIN users u
                ON u.id = wr.user_id
            WHERE wr.status = 'pending'
            ORDER BY wr.registered_at DESC
            """
        )

        workshop_rows = cursor.fetchall()


        cursor.execute(
            """
            SELECT
                'hackathon' AS event_type,
                ht.domain AS domain,
                ht.id AS account_id,
                ht.team_name AS display_name,
                ht.team_lead_email AS email,
                ht.registered_at AS registered_at
            FROM hackathon_teams ht
            WHERE ht.status = 'pending'
            ORDER BY ht.registered_at DESC
            """
        )

        hackathon_rows = cursor.fetchall()


        notifications = []


        for row in workshop_rows:

            notifications.append({
                "event":
                    row["event_type"],
                "domain":
                    row["domain"],
                "account_id":
                    row["account_id"],
                "name":
                    row["display_name"],
                "email":
                    row["email"],
                "registered_at":
                    row["registered_at"]
            })


        for row in hackathon_rows:

            notifications.append({
                "event":
                    row["event_type"],
                "domain":
                    row["domain"],
                "account_id":
                    row["account_id"],
                "name":
                    row["display_name"],
                "email":
                    row["email"],
                "registered_at":
                    row["registered_at"]
            })


        notifications.sort(
            key=lambda item:
                item.get(
                    "registered_at",
                    ""
                ),
            reverse=True
        )


        return {
            "success": True,
            "pending_count":
                len(notifications),
            "notifications":
                notifications[:20]
        }


    finally:

        connection.close()


# =========================================================
# DELETE ONE ACCOUNT
# COMPLETE ACCOUNT DELETION
# =========================================================

@app.delete(
    "/api/admin/accounts/{event_type}/{domain}/{account_id}"
)
async def delete_admin_account(
    event_type: str,
    domain: str,
    account_id: int,
    admin_username: str = Depends(require_admin)
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
            # GET USER ID FROM THE SELECTED REGISTRATION
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
            # DELETE ALL PERSISTENT ACCOUNT DATA FOR USER
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM account_data
                WHERE account_type = 'user'
                  AND account_id = ?
                """,
                (
                    user_id,
                )
            )


            # -------------------------------------------------
            # DELETE ALL USER SESSIONS
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM user_sessions
                WHERE user_id = ?
                """,
                (
                    user_id,
                )
            )


            # -------------------------------------------------
            # DELETE ALL WORKSHOP REGISTRATIONS
            # FOR THIS USER
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM workshop_registrations
                WHERE user_id = ?
                """,
                (
                    user_id,
                )
            )


            # -------------------------------------------------
            # DELETE ACTUAL USER ACCOUNT
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM users
                WHERE id = ?
                """,
                (
                    user_id,
                )
            )


            deleted_count = cursor.rowcount


        # =================================================
        # HACKATHON DELETE
        # =================================================

        else:

            # -------------------------------------------------
            # VERIFY TEAM EXISTS FOR THIS DOMAIN
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT id
                FROM hackathon_teams
                WHERE id = ?
                  AND domain = ?
                LIMIT 1
                """,
                (
                    account_id,
                    domain
                )
            )

            team = cursor.fetchone()


            if not team:

                connection.rollback()

                raise HTTPException(
                    status_code=404,
                    detail="Account not found."
                )


            team_id = team["id"]


            # -------------------------------------------------
            # DELETE ALL PERSISTENT ACCOUNT DATA FOR TEAM
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM account_data
                WHERE account_type = 'team'
                  AND account_id = ?
                """,
                (
                    team_id,
                )
            )


            # -------------------------------------------------
            # DELETE ALL TEAM SESSIONS
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM hackathon_sessions
                WHERE team_id = ?
                """,
                (
                    team_id,
                )
            )


            # -------------------------------------------------
            # DELETE ACTUAL HACKATHON TEAM ACCOUNT
            # -------------------------------------------------

            cursor.execute(
                """
                DELETE FROM hackathon_teams
                WHERE id = ?
                  AND domain = ?
                """,
                (
                    team_id,
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


    except HTTPException:

        connection.rollback()

        raise


    except Exception as error:

        connection.rollback()

        print(
            "ADMIN ACCOUNT DELETE ERROR:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to delete account."
        )


    finally:

        connection.close()


# =========================================================
# DELETE ALL ACCOUNTS
# COMPLETE ACCOUNT DELETION
# CURRENT EVENT + CURRENT DOMAIN ONLY
# =========================================================

@app.delete(
    "/api/admin/accounts/{event_type}/{domain}"
)
async def delete_all_admin_accounts(
    event_type: str,
    domain: str,
    admin_username: str = Depends(require_admin)
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
            # GET ALL USER IDS FOR THIS EVENT + DOMAIN
            # BEFORE DELETING REGISTRATIONS
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT DISTINCT user_id
                FROM workshop_registrations
                WHERE domain = ?
                """,
                (
                    domain,
                )
            )

            user_rows = cursor.fetchall()


            user_ids = [
                row["user_id"]
                for row in user_rows
                if row["user_id"] is not None
            ]


            if user_ids:

                placeholders = ",".join(
                    "?"
                    for _ in user_ids
                )


                # -------------------------------------------------
                # DELETE ALL PERSISTENT ACCOUNT DATA
                # FOR THESE USERS
                # -------------------------------------------------

                cursor.execute(
                    f"""
                    DELETE FROM account_data
                    WHERE account_type = 'user'
                      AND account_id IN (
                          {placeholders}
                      )
                    """,
                    tuple(
                        user_ids
                    )
                )


                # -------------------------------------------------
                # DELETE ALL USER SESSIONS
                # -------------------------------------------------

                cursor.execute(
                    f"""
                    DELETE FROM user_sessions
                    WHERE user_id IN (
                        {placeholders}
                    )
                    """,
                    tuple(
                        user_ids
                    )
                )


                # -------------------------------------------------
                # DELETE ALL WORKSHOP REGISTRATIONS
                # FOR THESE USERS
                # -------------------------------------------------

                cursor.execute(
                    f"""
                    DELETE FROM workshop_registrations
                    WHERE user_id IN (
                        {placeholders}
                    )
                    """,
                    tuple(
                        user_ids
                    )
                )


                # -------------------------------------------------
                # DELETE ACTUAL USER ACCOUNTS
                # -------------------------------------------------

                cursor.execute(
                    f"""
                    DELETE FROM users
                    WHERE id IN (
                        {placeholders}
                    )
                    """,
                    tuple(
                        user_ids
                    )
                )


            deleted_count = len(
                user_ids
            )


        # =================================================
        # HACKATHON
        # =================================================

        else:

            # -------------------------------------------------
            # GET ALL TEAM IDS FOR THIS EVENT + DOMAIN
            # -------------------------------------------------

            cursor.execute(
                """
                SELECT id
                FROM hackathon_teams
                WHERE domain = ?
                """,
                (
                    domain,
                )
            )

            team_rows = cursor.fetchall()


            team_ids = [
                row["id"]
                for row in team_rows
                if row["id"] is not None
            ]


            if team_ids:

                placeholders = ",".join(
                    "?"
                    for _ in team_ids
                )


                # -------------------------------------------------
                # DELETE ALL PERSISTENT ACCOUNT DATA
                # -------------------------------------------------

                cursor.execute(
                    f"""
                    DELETE FROM account_data
                    WHERE account_type = 'team'
                      AND account_id IN (
                          {placeholders}
                      )
                    """,
                    tuple(
                        team_ids
                    )
                )


                # -------------------------------------------------
                # DELETE ALL HACKATHON SESSIONS
                # -------------------------------------------------

                cursor.execute(
                    f"""
                    DELETE FROM hackathon_sessions
                    WHERE team_id IN (
                        {placeholders}
                    )
                    """,
                    tuple(
                        team_ids
                    )
                )


                # -------------------------------------------------
                # DELETE ACTUAL HACKATHON TEAM ACCOUNTS
                # -------------------------------------------------

                cursor.execute(
                    f"""
                    DELETE FROM hackathon_teams
                    WHERE id IN (
                        {placeholders}
                    )
                    """,
                    tuple(
                        team_ids
                    )
                )


            deleted_count = len(
                team_ids
            )


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


    except HTTPException:

        connection.rollback()

        raise


    except Exception as error:

        connection.rollback()

        print(
            "ADMIN BULK ACCOUNT DELETE ERROR:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to delete accounts."
        )


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
# ADMIN SETTINGS PAGE
# =========================================================

@app.get("/admin/settings")
async def admin_settings_page():

    file_path = (
        PUBLIC_DIR /
        "settings.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "settings.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
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
    update: StateUpdate,
    admin_username: str = Depends(require_admin)
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
    file: UploadFile = File(...),
    admin_username: str = Depends(require_admin)
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
# AUTHENTICATED USER WORKSHOP TOOLKIT LIST
# =========================================================

@app.get("/api/user/toolkit")
async def get_current_user_toolkit(
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

    directory = get_toolkit_directory(
        "workshop",
        user["domain"]
    )

    files = []

    for file in directory.iterdir():

        if file.is_file() and file.suffix.lower() == ".zip":

            files.append({

                "filename": file.name,

                "download_url": (
                    "/api/user/toolkit/download/"
                    f"{quote(file.name)}"
                    "?session_token="
                    f"{quote(session_token)}"
                )

            })

    files.sort(
        key=lambda value: value["filename"].lower()
    )

    return {
        "success": True,
        "event": "workshop",
        "domain": user["domain"],
        "files": files
    }


# =========================================================
# AUTHENTICATED USER WORKSHOP TOOLKIT DOWNLOAD
# =========================================================

@app.get("/api/user/toolkit/download/{filename}")
async def download_current_user_toolkit(
    filename: str,
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

    directory = get_toolkit_directory(
        "workshop",
        user["domain"]
    )

    safe_filename = Path(filename).name

    if (
        not safe_filename
        or safe_filename != filename
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid toolkit filename."
        )

    file_path = directory / safe_filename

    if (
        not file_path.exists()
        or not file_path.is_file()
        or file_path.suffix.lower() != ".zip"
    ):

        raise HTTPException(
            status_code=404,
            detail="Toolkit file not found."
        )

    return FileResponse(
        file_path,
        filename=safe_filename,
        media_type="application/zip"
    )


# =========================================================
# AUTHENTICATED USER HACKATHON TOOLKIT LIST
# =========================================================

@app.get("/api/hackathon/toolkit")
async def get_current_hackathon_toolkit(
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

    directory = get_toolkit_directory(
        "hackathon",
        team["domain"]
    )

    files = []

    for file in directory.iterdir():

        if file.is_file() and file.suffix.lower() == ".zip":

            files.append({

                "filename": file.name,

                "download_url": (
                    "/api/hackathon/toolkit/download/"
                    f"{quote(file.name)}"
                    "?session_token="
                    f"{quote(session_token)}"
                )

            })

    files.sort(
        key=lambda value: value["filename"].lower()
    )

    return {
        "success": True,
        "event": "hackathon",
        "domain": team["domain"],
        "files": files
    }


# =========================================================
# AUTHENTICATED USER HACKATHON TOOLKIT DOWNLOAD
# =========================================================

@app.get("/api/hackathon/toolkit/download/{filename}")
async def download_current_hackathon_toolkit(
    filename: str,
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

    directory = get_toolkit_directory(
        "hackathon",
        team["domain"]
    )

    safe_filename = Path(filename).name

    if (
        not safe_filename
        or safe_filename != filename
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid toolkit filename."
        )

    file_path = directory / safe_filename

    if (
        not file_path.exists()
        or not file_path.is_file()
        or file_path.suffix.lower() != ".zip"
    ):

        raise HTTPException(
            status_code=404,
            detail="Toolkit file not found."
        )

    return FileResponse(
        file_path,
        filename=safe_filename,
        media_type="application/zip"
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
    filename: str,
    admin_username: str = Depends(require_admin)
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

BASE_DIR = Path(__file__).resolve().parent


@app.get("/admin/ctf")
async def admin_ctf():
    ctf_file = BASE_DIR / "frontend" / "public" / "ctf.html"
    return FileResponse(ctf_file)

# =========================================================
# CTF ANSWER KEY MANAGEMENT
# =========================================================
# Additive CTF backend feature.
# Existing WAR ROOM routes and functionality are preserved.
# =========================================================

CTF_CHALLENGE_COUNTS = {

    # WORKSHOP / CEH categories
    "steganography":
        20,

    "wireshark":
        7,

    "event-logs":
        10,

    # WORKSHOP / VAPT categories
    # Each VAPT category intentionally contains one flag.
    "test-cases":
        1,

    "url-redirection":
        1,

    "broken-link-hijack":
        1,

    "file-upload":
        1,

    "error-bypass":
        1
}


CTF_VAPT_CATEGORIES = {

    "test-cases",

    "url-redirection",

    "broken-link-hijack",

    "file-upload",

    "error-bypass"
}


CTF_CEH_CATEGORIES = {

    "steganography",

    "wireshark",

    "event-logs"
}



CTF_VALID_EVENTS = {

    "workshop",

    "hackathon"

}


CTF_VALID_DOMAINS = {

    "ceh",

    "vapt",

    "soc",

    "digital-forensics"

}


CTF_VALID_CATEGORIES = {

    "steganography",

    "wireshark",

    "event-logs",

    "test-cases",

    "url-redirection",

    "broken-link-hijack",

    "file-upload",

    "error-bypass"

}



def ensure_ctf_answer_key_table():

    connection = get_user_db()

    try:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ctf_answer_keys (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                event TEXT NOT NULL,

                domain TEXT NOT NULL,

                category TEXT NOT NULL,

                challenge_number INTEGER NOT NULL,

                answer_key TEXT NOT NULL,

                created_at TEXT NOT NULL,

                updated_at TEXT NOT NULL,

                UNIQUE (
                    event,
                    domain,
                    category,
                    challenge_number
                )

            )
            """
        )

        connection.commit()

    finally:

        connection.close()


ensure_ctf_answer_key_table()


class CTFAnswerKeyRequest(BaseModel):

    event: str

    domain: str

    category: str

    challenge_number: int

    answer_key: str


def validate_ctf_key_request(
    event: str,
    domain: str,
    category: str,
    challenge_number: int,
    answer_key: str
):

    event = (
        str(event or "")
        .strip()
        .lower()
    )

    domain = (
        str(domain or "")
        .strip()
        .lower()
    )

    category = (
        str(category or "")
        .strip()
        .lower()
    )

    answer_key = (
        str(answer_key or "")
        .strip()
    )

    if event not in CTF_VALID_EVENTS:

        raise HTTPException(
            status_code=400,
            detail="Invalid CTF event."
        )


    if domain not in CTF_VALID_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid CTF domain."
        )


    if category not in CTF_VALID_CATEGORIES:

        raise HTTPException(
            status_code=400,
            detail="Invalid CTF category."
        )


    # Workshop / VAPT has its own five one-flag categories.
    # Workshop / CEH keeps the existing three category structure.
    if event == "workshop":

        if domain == "vapt" and category not in CTF_VAPT_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail="Invalid VAPT CTF category."
            )

        if domain == "ceh" and category not in CTF_CEH_CATEGORIES:
            raise HTTPException(
                status_code=400,
                detail="Invalid CEH CTF category."
            )


    if not answer_key:

        raise HTTPException(
            status_code=400,
            detail="Answer key is required."
        )


    maximum = CTF_CHALLENGE_COUNTS.get(
        category,
        0
    )


    if maximum <= 0:

        raise HTTPException(
            status_code=400,
            detail=(
                "No challenges are configured "
                "for this category."
            )
        )


    if (
        challenge_number < 1
        or challenge_number > maximum
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid challenge number."
            )
        )


    return (
        event,
        domain,
        category,
        challenge_number,
        answer_key
    )


@app.get(
    "/api/admin/ctf/challenge-keys"
)
async def get_ctf_answer_keys(
    event: str | None = None,
    domain: str | None = None,
    category: str | None = None,
    admin_username: str = Depends(
        require_admin
    )
):

    ensure_ctf_answer_key_table()


    event = (
        str(event or "")
        .strip()
        .lower()
    )

    domain = (
        str(domain or "")
        .strip()
        .lower()
    )

    category = (
        str(category or "")
        .strip()
        .lower()
    )


    if event not in CTF_VALID_EVENTS:

        raise HTTPException(
            status_code=400,
            detail="Invalid CTF event."
        )


    if domain not in CTF_VALID_DOMAINS:

        raise HTTPException(
            status_code=400,
            detail="Invalid CTF domain."
        )


    if category not in CTF_VALID_CATEGORIES:

        raise HTTPException(
            status_code=400,
            detail="Invalid CTF category."
        )


    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT

                challenge_number,

                answer_key,

                created_at,

                updated_at

            FROM ctf_answer_keys

            WHERE event = ?

              AND domain = ?

              AND category = ?

            ORDER BY challenge_number ASC
            """,
            (
                event,
                domain,
                category
            )
        )


        rows = cursor.fetchall()


        keys = {

            str(row["challenge_number"]):
                row["answer_key"]

            for row in rows

        }


        return {

            "success":
                True,

            "event":
                event,

            "domain":
                domain,

            "category":
                category,

            "keys":
                keys,

            "count":
                len(keys)

        }

    finally:

        connection.close()


@app.post(
    "/api/admin/ctf/challenge-key"
)
async def save_ctf_answer_key(
    request: CTFAnswerKeyRequest,
    admin_username: str = Depends(
        require_admin
    )
):

    (
        event,
        domain,
        category,
        challenge_number,
        answer_key
    ) = validate_ctf_key_request(

        request.event,

        request.domain,

        request.category,

        request.challenge_number,

        request.answer_key

    )


    ensure_ctf_answer_key_table()


    now = datetime.now(
        timezone.utc
    ).isoformat()


    connection = get_user_db()

    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            INSERT INTO ctf_answer_keys (

                event,

                domain,

                category,

                challenge_number,

                answer_key,

                created_at,

                updated_at

            )

            VALUES (

                ?,

                ?,

                ?,

                ?,

                ?,

                ?,

                ?

            )

            ON CONFLICT (
                event,
                domain,
                category,
                challenge_number
            )

            DO UPDATE SET

                answer_key =
                    excluded.answer_key,

                updated_at =
                    excluded.updated_at
            """,
            (
                event,

                domain,

                category,

                challenge_number,

                answer_key,

                now,

                now

            )
        )


        connection.commit()


        return {

            "success":
                True,

            "message":
                "Answer key saved successfully.",

            "event":
                event,

            "domain":
                domain,

            "category":
                category,

            "challenge_number":
                challenge_number

        }

    except sqlite3.Error as error:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to save CTF answer key: "
                + str(error)
            )
        )

    finally:

        connection.close()


@app.delete(
    "/api/admin/ctf/challenge-key"
)
async def delete_ctf_answer_key(
    event: str,
    domain: str,
    category: str,
    challenge_number: int,
    admin_username: str = Depends(
        require_admin
    )
):

    (
        event,
        domain,
        category,
        challenge_number,
        _
    ) = validate_ctf_key_request(

        event,

        domain,

        category,

        challenge_number,

        "delete"

    )


    ensure_ctf_answer_key_table()


    connection = get_user_db()

    try:

        cursor = connection.cursor()


        cursor.execute(
            """
            DELETE FROM ctf_answer_keys

            WHERE event = ?

              AND domain = ?

              AND category = ?

              AND challenge_number = ?
            """,
            (
                event,

                domain,

                category,

                challenge_number

            )
        )


        if cursor.rowcount == 0:

            connection.rollback()

            raise HTTPException(
                status_code=404,
                detail=(
                    "CTF answer key not found."
                )
            )


        connection.commit()


        return {

            "success":
                True,

            "message":
                "Answer key deleted successfully.",

            "event":
                event,

            "domain":
                domain,

            "category":
                category,

            "challenge_number":
                challenge_number

        }

    finally:

        connection.close()

# =========================================================
# USER CTF — WORKSHOP DOMAIN BASED
# =========================================================
# Existing WAR ROOM routes and functionality are preserved.
# User CTF is available for Workshop users.
# The user's registered Workshop domain decides which CTF
# categories are shown and which answer keys can be submitted.
# Answer keys are never exposed to the browser.
# =========================================================

USER_CTF_EVENT = "workshop"

# Workshop / CEH keeps the existing 37-challenge structure.
# Workshop / VAPT contains five categories with one flag each.
USER_CTF_CHALLENGE_COUNTS = {

    # CEH
    "steganography": 20,
    "wireshark": 7,
    "event-logs": 10,

    # VAPT
    "test-cases": 1,
    "url-redirection": 1,
    "broken-link-hijack": 1,
    "file-upload": 1,
    "error-bypass": 1
}


USER_CTF_DOMAIN_CATEGORIES = {

    "ceh": [
        "steganography",
        "wireshark",
        "event-logs"
    ],

    "vapt": [
        "test-cases",
        "url-redirection",
        "broken-link-hijack",
        "file-upload",
        "error-bypass"
    ],

    # These domains are intentionally kept empty until their
    # CTF categories are configured.
    "soc": [],
    "forensics": [],
    "digital-forensics": []
}


USER_CTF_CATEGORY_NAMES = {

    "steganography": "STEGANOGRAPHY",
    "wireshark": "WIRESHARK",
    "event-logs": "EVENT LOGS",

    "test-cases": "TEST CASES",
    "url-redirection": "URL REDIRECTION",
    "broken-link-hijack": "BROKEN LINK HIJACK",
    "file-upload": "FILE UPLOAD",
    "error-bypass": "ERROR BYPASS"
}


# =========================================================
# USER CTF SCORING
# =========================================================
# CEH keeps the existing 10-point score per solved challenge.
# VAPT uses a fixed score for each category.
#
# IMPORTANT:
# - Scoring is decided only by the backend.
# - The browser cannot choose or change the score.
# - A solved challenge awards points only once per user.
# =========================================================

USER_CTF_POINTS_PER_CHALLENGE = 10

USER_CTF_VAPT_POINTS = {
    "test-cases": 50,
    "url-redirection": 40,
    "broken-link-hijack": 40,
    "file-upload": 40,
    "error-bypass": 30
}


def get_user_ctf_points(
    domain: str,
    category: str
) -> int:
    """
    Return the server-side score for a correctly solved CTF
    challenge.

    CEH:
        10 points per challenge.

    VAPT:
        Test Cases       = 50
        URL Redirection  = 40
        Broken Link Hijack = 40
        File Upload      = 40
        Error Bypass     = 30
    """

    domain = str(
        domain or ""
    ).strip().lower()

    category = str(
        category or ""
    ).strip().lower()

    if domain == "vapt":
        return int(
            USER_CTF_VAPT_POINTS.get(
                category,
                0
            )
        )

    if domain == "ceh":
        return int(
            USER_CTF_POINTS_PER_CHALLENGE
        )

    return 0


class UserCTFSubmitRequest(BaseModel):

    event: str = "workshop"

    domain: str = "ceh"

    category: str

    challenge_number: int | None = None

    # Accept the frontend's existing field name as well.
    challenge: int | None = None

    answer: str

    session_token: str | None = None



def get_user_ctf_categories(domain: str):

    domain = str(
        domain or ""
    ).strip().lower()

    return list(
        USER_CTF_DOMAIN_CATEGORIES.get(
            domain,
            []
        )
    )



def get_user_ctf_challenge_counts(domain: str):

    categories = get_user_ctf_categories(
        domain
    )

    return {
        category:
            USER_CTF_CHALLENGE_COUNTS.get(
                category,
                0
            )
        for category in categories
    }



def ensure_user_ctf_submission_table():

    connection = get_user_db()

    try:

        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS ctf_user_submissions (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                user_id INTEGER NOT NULL,

                event TEXT NOT NULL,

                domain TEXT NOT NULL,

                category TEXT NOT NULL,

                challenge_number INTEGER NOT NULL,

                answer TEXT NOT NULL,

                correct INTEGER NOT NULL DEFAULT 0,

                points_awarded INTEGER NOT NULL DEFAULT 0,

                solved_at TEXT,

                last_attempt_at TEXT NOT NULL,

                UNIQUE (
                    user_id,
                    event,
                    domain,
                    category,
                    challenge_number
                )

            )
            """
        )

        connection.commit()

    finally:

        connection.close()


ensure_user_ctf_submission_table()



# =========================================================
# REPAIR EXISTING VAPT CTF SCORES
# =========================================================
# Older VAPT solves may already contain the old generic 10-point
# score. Correct only the VAPT CTF portion and preserve any other
# non-CTF points stored in the user's account.
# =========================================================

def repair_existing_vapt_ctf_scores():

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                user_id,
                event,
                domain,
                category,
                challenge_number,
                points_awarded
            FROM ctf_user_submissions
            WHERE domain = 'vapt'
              AND correct = 1
            """
        )

        rows = cursor.fetchall()

        if not rows:
            return

        old_totals = {}
        corrected_totals = {}

        for row in rows:

            user_id = int(row["user_id"])
            event = str(row["event"] or "").strip().lower()
            domain = str(row["domain"] or "").strip().lower()
            category = str(row["category"] or "").strip().lower()
            challenge_number = int(row["challenge_number"] or 0)

            account_key = (user_id, event, domain)

            old_points = int(row["points_awarded"] or 0)
            new_points = get_user_ctf_points(domain, category)

            old_totals[account_key] = (
                old_totals.get(account_key, 0) + old_points
            )

            corrected_totals[account_key] = (
                corrected_totals.get(account_key, 0) + new_points
            )

            if old_points != new_points:

                cursor.execute(
                    """
                    UPDATE ctf_user_submissions
                    SET points_awarded = ?
                    WHERE user_id = ?
                      AND event = ?
                      AND domain = ?
                      AND category = ?
                      AND challenge_number = ?
                    """,
                    (
                        new_points,
                        user_id,
                        event,
                        domain,
                        category,
                        challenge_number
                    )
                )

        # Synchronize account_data with the corrected VAPT CTF total.
        # Any points that were not part of the old VAPT CTF total are
        # preserved as non-CTF account points.
        for account_key, new_ctf_total in corrected_totals.items():

            user_id, event, domain = account_key

            cursor.execute(
                """
                SELECT points
                FROM account_data
                WHERE account_type = 'user'
                  AND account_id = ?
                  AND event_type = ?
                  AND domain = ?
                LIMIT 1
                """,
                (user_id, event, domain)
            )

            account_row = cursor.fetchone()

            if not account_row:
                continue

            current_total = int(account_row["points"] or 0)
            old_ctf_total = old_totals.get(account_key, 0)

            non_ctf_total = max(
                0,
                current_total - old_ctf_total
            )

            corrected_account_total = (
                non_ctf_total + new_ctf_total
            )

            if corrected_account_total != current_total:

                cursor.execute(
                    """
                    UPDATE account_data
                    SET points = ?,
                        updated_at = ?
                    WHERE account_type = 'user'
                      AND account_id = ?
                      AND event_type = ?
                      AND domain = ?
                    """,
                    (
                        corrected_account_total,
                        datetime.now(timezone.utc).isoformat(),
                        user_id,
                        event,
                        domain
                    )
                )

        connection.commit()

    except sqlite3.Error:

        connection.rollback()

    finally:

        connection.close()


repair_existing_vapt_ctf_scores()


def validate_user_ctf_request(
    event: str,
    domain: str,
    category: str,
    challenge_number: int
):

    event = str(
        event or ""
    ).strip().lower()

    domain = str(
        domain or ""
    ).strip().lower()

    category = str(
        category or ""
    ).strip().lower()

    if event != USER_CTF_EVENT:

        raise HTTPException(
            status_code=400,
            detail="User CTF is available for Workshop only."
        )

    if domain not in USER_CTF_DOMAIN_CATEGORIES:

        raise HTTPException(
            status_code=403,
            detail="Invalid Workshop CTF domain."
        )

    allowed_categories = get_user_ctf_categories(
        domain
    )

    if category not in allowed_categories:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid CTF category for "
                + domain.upper()
                + " Workshop users."
            )
        )

    maximum = USER_CTF_CHALLENGE_COUNTS.get(
        category,
        0
    )

    if (
        challenge_number < 1
        or challenge_number > maximum
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid challenge number."
        )

    return (
        event,
        domain,
        category,
        challenge_number
    )


# =========================================================
# USER CTF PAGE
# =========================================================

@app.get("/user/ctf")
async def user_ctf_page():

    file_path = (
        PUBLIC_DIR /
        "userctf.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "userctf.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )


@app.get("/user/ctf.html")
async def user_ctf_html_page():

    file_path = (
        PUBLIC_DIR /
        "userctf.html"
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "userctf.html not found "
                "inside frontend/public."
            )
        )

    return FileResponse(
        file_path
    )


# =========================================================
# USER CTF PROGRESS
# =========================================================

@app.get("/api/user/ctf/progress")
async def get_user_ctf_progress(
    session_token: str
):

    session_token = str(
        session_token or ""
    ).strip()

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

    actual_domain = str(
        user["domain"] or ""
    ).strip().lower()

    categories = get_user_ctf_categories(
        actual_domain
    )

    challenge_counts = get_user_ctf_challenge_counts(
        actual_domain
    )

    # A Workshop domain without configured CTF categories is
    # still a valid login, but it has no available CTF yet.
    if actual_domain not in USER_CTF_DOMAIN_CATEGORIES:

        return {
            "success": True,
            "event": USER_CTF_EVENT,
            "domain": actual_domain,
            "available": False,
            "categories": [],
            "challenge_counts": {},
            "solved": {},
            "solved_count": 0,
            "points": 0
        }

    ensure_user_ctf_submission_table()

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        if categories:

            placeholders = ",".join(
                "?" for _ in categories
            )

            cursor.execute(
                f"""
                SELECT
                    category,
                    challenge_number,
                    correct,
                    points_awarded,
                    solved_at
                FROM ctf_user_submissions
                WHERE user_id = ?
                  AND event = ?
                  AND domain = ?
                  AND correct = 1
                  AND category IN ({placeholders})
                ORDER BY category, challenge_number
                """,
                (
                    user["id"],
                    USER_CTF_EVENT,
                    actual_domain,
                    *categories
                )
            )

        else:

            rows = []

            return {
                "success": True,
                "event": USER_CTF_EVENT,
                "domain": actual_domain,
                "available": False,
                "categories": [],
                "challenge_counts": {},
                "solved": {},
                "solved_count": 0,
                "points": 0
            }

        rows = cursor.fetchall()

        solved = {}

        total_points = 0

        for row in rows:

            challenge_key = (
                f"{row['category']}-"
                f"{row['challenge_number']}"
            )

            current_score = get_user_ctf_points(
                actual_domain,
                row["category"]
            )

            solved[challenge_key] = {
                "category": row["category"],
                "challenge_number": row["challenge_number"],
                "solved_at": row["solved_at"],
                "points": current_score
            }

            total_points += current_score

        return {
            "success": True,
            "event": USER_CTF_EVENT,
            "domain": actual_domain,
            "available": True,
            "categories": categories,
            "category_names": {
                category:
                    USER_CTF_CATEGORY_NAMES.get(
                        category,
                        category.upper()
                    )
                for category in categories
            },
            "challenge_counts": challenge_counts,
            "points_per_category": {
                category:
                    get_user_ctf_points(
                        actual_domain,
                        category
                    )
                for category in categories
            },
            "solved": solved,
            "solved_count": len(solved),
            "points": total_points
        }

    finally:

        connection.close()


# =========================================================
# USER CTF PROGRESS - POST COMPATIBILITY
# =========================================================
# The user CTF frontend may request progress with POST.
# Keep the existing GET endpoint and also accept POST so the
# frontend never receives 405 Method Not Allowed.
# =========================================================

class UserCTFProgressRequest(BaseModel):

    session_token: str | None = None


@app.post("/api/user/ctf/progress")
async def post_user_ctf_progress(
    request: UserCTFProgressRequest | None = None,
    session_token: str = ""
):

    token = str(
        (request.session_token if request else "")
        or session_token
        or ""
    ).strip()

    return await get_user_ctf_progress(
        token
    )


# =========================================================
# USER CTF ANSWER SUBMISSION
# =========================================================

@app.post("/api/user/ctf/submit")
async def submit_user_ctf_answer(
    request: UserCTFSubmitRequest
):

    session_token = str(
        request.session_token or ""
    ).strip()

    challenge_number = (
        request.challenge_number
        if request.challenge_number is not None
        else request.challenge
    )

    if not session_token:

        raise HTTPException(
            status_code=401,
            detail="User session is required."
        )

    if challenge_number is None:

        raise HTTPException(
            status_code=400,
            detail="Challenge number is required."
        )

    try:

        challenge_number = int(
            challenge_number
        )

    except (TypeError, ValueError):

        raise HTTPException(
            status_code=400,
            detail="Invalid challenge number."
        )

    answer = str(
        request.answer or ""
    ).strip()

    if not answer:

        raise HTTPException(
            status_code=400,
            detail="Answer is required."
        )

    user = get_current_workshop_user(
        session_token
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired user session."
        )

    # IMPORTANT:
    # Never trust the domain sent by the browser.
    # Always use the domain stored in the authenticated
    # Workshop registration.
    actual_domain = str(
        user["domain"] or ""
    ).strip().lower()

    (
        event,
        domain,
        category,
        challenge_number
    ) = validate_user_ctf_request(
        request.event,
        actual_domain,
        request.category,
        challenge_number
    )

    ensure_ctf_answer_key_table()
    ensure_user_ctf_submission_table()

    connection = get_user_db()

    try:

        cursor = connection.cursor()

        now = datetime.now(
            timezone.utc
        ).isoformat()

        # -----------------------------------------------
        # GET THE SERVER-SIDE ANSWER KEY
        # -----------------------------------------------

        cursor.execute(
            """
            SELECT
                answer_key
            FROM ctf_answer_keys
            WHERE event = ?
              AND domain = ?
              AND category = ?
              AND challenge_number = ?
            LIMIT 1
            """,
            (
                event,
                domain,
                category,
                challenge_number
            )
        )

        key_row = cursor.fetchone()

        if not key_row:

            raise HTTPException(
                status_code=404,
                detail=(
                    "This challenge has not been configured "
                    "by the administrator yet."
                )
            )

        answer_key = str(
            key_row["answer_key"] or ""
        ).strip()

        # -----------------------------------------------
        # CHECK EXISTING SUBMISSION
        # -----------------------------------------------

        cursor.execute(
            """
            SELECT
                correct,
                points_awarded,
                solved_at
            FROM ctf_user_submissions
            WHERE user_id = ?
              AND event = ?
              AND domain = ?
              AND category = ?
              AND challenge_number = ?
            LIMIT 1
            """,
            (
                user["id"],
                event,
                domain,
                category,
                challenge_number
            )
        )

        existing = cursor.fetchone()

        if existing and int(
            existing["correct"] or 0
        ) == 1:

            return {
                "success": True,
                "correct": True,
                "already_solved": True,
                "message": "Challenge already solved.",
                "points_awarded": 0
            }

        # -----------------------------------------------
        # CHECK ANSWER
        # -----------------------------------------------

        is_correct = hmac.compare_digest(
            answer,
            answer_key
        )

        if not is_correct:

            cursor.execute(
                """
                INSERT INTO ctf_user_submissions (
                    user_id,
                    event,
                    domain,
                    category,
                    challenge_number,
                    answer,
                    correct,
                    points_awarded,
                    solved_at,
                    last_attempt_at
                )
                VALUES (?, ?, ?, ?, ?, ?, 0, 0, NULL, ?)
                ON CONFLICT (
                    user_id,
                    event,
                    domain,
                    category,
                    challenge_number
                )
                DO UPDATE SET
                    answer = excluded.answer,
                    correct = 0,
                    points_awarded = 0,
                    solved_at = NULL,
                    last_attempt_at = excluded.last_attempt_at
                """,
                (
                    user["id"],
                    event,
                    domain,
                    category,
                    challenge_number,
                    answer,
                    now
                )
            )

            connection.commit()

            return {
                "success": True,
                "correct": False,
                "already_solved": False,
                "message": "Incorrect answer. Try again.",
                "points_awarded": 0
            }

        # -----------------------------------------------
        # CORRECT ANSWER
        # -----------------------------------------------

        solved_at = now

        points_awarded = get_user_ctf_points(
            domain,
            category
        )

        if points_awarded <= 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No score is configured for this CTF category."
                )
            )

        cursor.execute(
            """
            INSERT INTO ctf_user_submissions (
                user_id,
                event,
                domain,
                category,
                challenge_number,
                answer,
                correct,
                points_awarded,
                solved_at,
                last_attempt_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            ON CONFLICT (
                user_id,
                event,
                domain,
                category,
                challenge_number
            )
            DO UPDATE SET
                answer = excluded.answer,
                correct = 1,
                points_awarded = excluded.points_awarded,
                solved_at = excluded.solved_at,
                last_attempt_at = excluded.last_attempt_at
            """,
            (
                user["id"],
                event,
                domain,
                category,
                challenge_number,
                answer,
                points_awarded,
                solved_at,
                now
            )
        )

        # -----------------------------------------------
        # UPDATE USER POINTS
        # -----------------------------------------------
        # Recalculate the complete CTF total from the saved
        # submissions using the current server-side scoring map.
        # This prevents legacy 10-point VAPT records from making
        # the aggregate leaderboard score incorrect.

        cursor.execute(
            """
            SELECT
                category,
                points_awarded
            FROM ctf_user_submissions
            WHERE user_id = ?
              AND event = ?
              AND domain = ?
              AND correct = 1
            """,
            (
                user["id"],
                event,
                domain
            )
        )

        ctf_rows = cursor.fetchall()

        stored_ctf_total = sum(
            int(row["points_awarded"] or 0)
            for row in ctf_rows
        )

        corrected_ctf_total = sum(
            get_user_ctf_points(
                domain,
                str(row["category"] or "").strip().lower()
            )
            for row in ctf_rows
        )

        cursor.execute(
            """
            SELECT
                points
            FROM account_data
            WHERE account_type = ?
              AND account_id = ?
              AND event_type = ?
              AND domain = ?
            LIMIT 1
            """,
            (
                "user",
                user["id"],
                event,
                domain
            )
        )

        account_row = cursor.fetchone()

        if account_row:

            current_points = int(
                account_row["points"] or 0
            )

            non_ctf_points = max(
                0,
                current_points - stored_ctf_total
            )

            corrected_total = (
                non_ctf_points + corrected_ctf_total
            )

            cursor.execute(
                """
                UPDATE account_data
                SET
                    points = ?,
                    updated_at = ?
                WHERE account_type = ?
                  AND account_id = ?
                  AND event_type = ?
                  AND domain = ?
                """,
                (
                    corrected_total,
                    now,
                    "user",
                    user["id"],
                    event,
                    domain
                )
            )

        else:

            cursor.execute(
                """
                INSERT INTO account_data (
                    account_type,
                    account_id,
                    event_type,
                    domain,
                    points,
                    data_json,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, '{}', ?, ?)
                """,
                (
                    "user",
                    user["id"],
                    event,
                    domain,
                    corrected_ctf_total,
                    now,
                    now
                )
            )


        connection.commit()

        return {
            "success": True,
            "correct": True,
            "already_solved": False,
            "message": "Correct answer. Challenge solved.",
            "points_awarded": points_awarded
        }

    except HTTPException:

        connection.rollback()
        raise

    except sqlite3.Error as error:

        connection.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to save CTF submission: "
                + str(error)
            )
        )

    finally:

        connection.close()

