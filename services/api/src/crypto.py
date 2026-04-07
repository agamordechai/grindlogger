"""Symmetric encryption for sensitive tokens stored in the database.

Uses Fernet (AES-128-CBC + HMAC-SHA256) from the cryptography library.
The encryption key is read from the TOKEN_ENCRYPTION_KEY environment variable.
Generate a key with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import os

from cryptography.fernet import Fernet, InvalidToken

_KEY = os.environ.get("TOKEN_ENCRYPTION_KEY", "")


def _get_fernet() -> Fernet:
    if not _KEY:
        raise RuntimeError(
            "TOKEN_ENCRYPTION_KEY environment variable is not set. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(_KEY.encode())


def encrypt_token(plaintext: str) -> str:
    """Encrypt a plaintext string and return a URL-safe base64 encoded ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a URL-safe base64 encoded ciphertext and return the plaintext string.

    Raises:
        RuntimeError: If decryption fails (wrong key or corrupted data).
    """
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as e:
        raise RuntimeError("Failed to decrypt token — encryption key may have changed") from e
