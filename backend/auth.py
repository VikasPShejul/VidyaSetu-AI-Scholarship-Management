import hashlib
import secrets

from jose import jwt


SECRET_KEY = "tribal-scholar-demo-secret"

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """
    Simple password hashing for the demo.
    """

    salt = secrets.token_hex(16)

    password_hash = hashlib.sha256(
        (salt + password).encode("utf-8")
    ).hexdigest()

    return f"{salt}${password_hash}"


def verify_password(
    plain_password: str,
    stored_password: str
) -> bool:

    try:
        salt, stored_hash = stored_password.split("$", 1)

        password_hash = hashlib.sha256(
            (salt + plain_password).encode("utf-8")
        ).hexdigest()

        return password_hash == stored_hash

    except ValueError:
        return False


def create_token(
    user_id: int,
    role: str
):

    payload = {
        "user_id": user_id,
        "role": role
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )