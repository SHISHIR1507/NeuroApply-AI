"""
NeuroApply AI — Custom Exception Handlers
"""

from fastapi import HTTPException, status


class CredentialsException(HTTPException):
    """Raised when authentication credentials are invalid."""

    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class NotFoundException(HTTPException):
    """Raised when a requested resource is not found."""

    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found",
        )


class ConflictException(HTTPException):
    """Raised on unique constraint violations (e.g., duplicate email)."""

    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )


class BadRequestException(HTTPException):
    """Raised on malformed or invalid request data."""

    def __init__(self, detail: str = "Bad request"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )
