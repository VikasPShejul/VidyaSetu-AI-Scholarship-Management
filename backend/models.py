from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        default="APPLICANT"
    )

    applications = relationship(
        "Application",
        back_populates="applicant"
    )


# ============================================================
# SCHEME
# ============================================================

class Scheme(Base):
    __tablename__ = "schemes"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String,
        nullable=False
    )

    code = Column(
        String,
        unique=True,
        nullable=False
    )

    description = Column(
        String
    )

    applications = relationship(
        "Application",
        back_populates="scheme"
    )


# ============================================================
# APPLICATION
# ============================================================

class Application(Base):
    __tablename__ = "applications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    application_number = Column(
        String,
        unique=True,
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    scheme_id = Column(
        Integer,
        ForeignKey("schemes.id")
    )

    name = Column(
        String
    )

    dob = Column(
        String
    )

    category = Column(
        String
    )

    university = Column(
        String
    )

    programme = Column(
        String
    )

    percentage = Column(
        Float
    )

    status = Column(
        String,
        default="DRAFT"
    )

    eligibility_status = Column(
        String,
        default="PENDING"
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    applicant = relationship(
        "User",
        back_populates="applications"
    )

    scheme = relationship(
        "Scheme",
        back_populates="applications"
    )


# ============================================================
# DOCUMENT
# ============================================================

class Document(Base):
    __tablename__ = "documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    application_id = Column(
        Integer,
        ForeignKey("applications.id")
    )

    document_type = Column(
        String
    )

    filename = Column(
        String
    )

    file_path = Column(
        String
    )

    ocr_text = Column(
        String
    )

    verification_status = Column(
        String,
        default="PENDING"
    )

    confidence = Column(
        Float,
        default=0
    )

    remarks = Column(
        String
    )