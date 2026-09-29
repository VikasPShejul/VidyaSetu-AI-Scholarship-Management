from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, inspect, text
from datetime import datetime

from database import engine, Base, get_db
from models import User, Scheme, Application, Document
from schemas import (
    LoginRequest,
    RegisterRequest,
    ApplicationCreate
)
from pydantic import BaseModel
import uuid
from auth import (
    hash_password,
    verify_password,
    create_token
)

import os
import re

from fastapi import UploadFile, File, Form

from ocr import extract_text, analyze_document


print("=" * 50)
print("LOADED APP FROM:")
print(__file__)
print("=" * 50)


# --------------------------------------------------
# SCHOLARSHIP MODEL
# --------------------------------------------------

class Scholarship(Base):
    __tablename__ = "scholarships"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, default=0)
    deadline = Column(String, nullable=False)
    eligibility = Column(String, nullable=False)
    status = Column(String, default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)
    form_template = Column(String, default="GENERAL")


# --------------------------------------------------
# DYNAMIC APPLICATION FIELD VALUES
# --------------------------------------------------
# Stores scheme-specific answers without changing the main
# Application table every time a new scheme gets new fields.
class ApplicationFieldValue(Base):
    __tablename__ = "application_field_values"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, nullable=False, index=True)
    field_key = Column(String, nullable=False, index=True)
    field_value = Column(Text, nullable=True)


# --------------------------------------------------
# APPLICANT DOCUMENT VAULT
# --------------------------------------------------
# Documents belong to the applicant, not to one scholarship application.
# A verified document can therefore be reused by multiple schemes.
class UserDocument(Base):
    __tablename__ = "user_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    document_type = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    ocr_text = Column(Text, nullable=True)
    verification_status = Column(String, default="PENDING")
    confidence = Column(Float, default=0)
    remarks = Column(Text, nullable=True)
    source_application_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


# Scheme-specific demo form definitions. These are UI/data-capture
# templates, not claims about official scheme rules.
FORM_TEMPLATES = {
    "NFST": {
        "title": "National Fellowship for Scheduled Tribes",
        "fields": [
            {"key": "name", "label": "Full Name", "type": "text", "required": True},
            {"key": "dob", "label": "Date of Birth", "type": "date", "required": True},
            {"key": "category", "label": "Category", "type": "select", "options": ["ST", "OTHER"], "required": True},
            {"key": "university", "label": "University / Institution", "type": "text", "required": True},
            {"key": "programme", "label": "Programme", "type": "select", "options": ["PhD", "Masters"], "required": True},
            {"key": "percentage", "label": "Academic Score (%)", "type": "number", "required": True},
            {"key": "research_area", "label": "Research Area", "type": "text", "required": True},
        ]
    },
    "NSFB_BTECH": {
        "title": "National Scholarship For B-tech students of ST category",
        "fields": [
            {"key": "name", "label": "Full Name", "type": "text", "required": True},
            {"key": "dob", "label": "Date of Birth", "type": "date", "required": True},
            {"key": "category", "label": "Category", "type": "select", "options": ["ST", "OTHER"], "required": True},
            {"key": "university", "label": "University / Institution", "type": "text", "required": True},
            {"key": "programme", "label": "Programme", "type": "select", "options": ["B.Tech"], "required": True},
            {"key": "percentage", "label": "Academic Score (%)", "type": "number", "required": True}
        ]
    },

    "POST_MATRIC": {
        "title": "Post-Matric Scholarship",
        "fields": [
            {"key": "name", "label": "Full Name", "type": "text", "required": True},
            {"key": "dob", "label": "Date of Birth", "type": "date", "required": True},
            {"key": "category", "label": "Category", "type": "select", "options": ["ST", "OTHER"], "required": True},
            {"key": "institution", "label": "College / Institution", "type": "text", "required": True},
            {"key": "course", "label": "Course / Stream", "type": "text", "required": True},
            {"key": "year", "label": "Current Year", "type": "text", "required": True},
            {"key": "percentage", "label": "Previous Academic Score (%)", "type": "number", "required": True},
            {"key": "family_income", "label": "Annual Family Income", "type": "number", "required": True},
        ]
    },
    "TOP_CLASS": {
        "title": "Top Class Education Scholarship",
        "fields": [
            {"key": "name", "label": "Full Name", "type": "text", "required": True},
            {"key": "dob", "label": "Date of Birth", "type": "date", "required": True},
            {"key": "category", "label": "Category", "type": "select", "options": ["ST", "OTHER"], "required": True},
            {"key": "institution", "label": "Institute Name", "type": "text", "required": True},
            {"key": "course", "label": "Course", "type": "text", "required": True},
            {"key": "year", "label": "Academic Year", "type": "text", "required": True},
            {"key": "percentage", "label": "Academic Score (%)", "type": "number", "required": True},
            {"key": "family_income", "label": "Annual Family Income", "type": "number", "required": True},
            {"key": "entrance_rank", "label": "Entrance Rank / Score", "type": "text", "required": False},
        ]
    },
    "GENERAL": {
        "title": "Scholarship Application",
        "fields": [
            {"key": "name", "label": "Full Name", "type": "text", "required": True},
            {"key": "dob", "label": "Date of Birth", "type": "date", "required": True},
            {"key": "category", "label": "Category", "type": "text", "required": True},
            {"key": "institution", "label": "Institution", "type": "text", "required": True},
            {"key": "course", "label": "Course / Programme", "type": "text", "required": True},
            {"key": "percentage", "label": "Academic Score (%)", "type": "number", "required": True},
        ]
    }
}

def get_form_template(code: str):
    code = (code or "").strip().upper()
    if code == "NSFB":
        return "NSFB_BTECH"
    if code in FORM_TEMPLATES:
        return code
    if "POST" in code and "MATRIC" in code:
        return "POST_MATRIC"
    if "TOP" in code and "CLASS" in code:
        return "TOP_CLASS"
    if "NFST" in code or "FELLOWSHIP" in code:
        return "NFST"
    return "GENERAL"


# --------------------------------------------------
# DATABASE
# --------------------------------------------------

Base.metadata.create_all(bind=engine)


# Migrate existing application-scoped documents into the applicant
# document vault once. This keeps the current demo data usable after
# switching to reusable applicant-owned documents.
try:
    with Session(engine) as migration_db:
        existing_vault_count = migration_db.query(UserDocument).count()
        if existing_vault_count == 0:
            legacy_rows = (
                migration_db.query(Document, Application.user_id)
                .join(Application, Document.application_id == Application.id)
                .order_by(Document.id.asc())
                .all()
            )
            seen = set()
            for legacy_document, owner_user_id in legacy_rows:
                canonical_type = str(legacy_document.document_type or "").upper().strip().replace(" ", "_")
                key = (owner_user_id, canonical_type)
                if key in seen:
                    continue
                seen.add(key)
                migration_db.add(UserDocument(
                    user_id=owner_user_id,
                    document_type=canonical_type,
                    filename=legacy_document.filename,
                    file_path=legacy_document.file_path,
                    ocr_text=legacy_document.ocr_text,
                    verification_status=legacy_document.verification_status,
                    confidence=legacy_document.confidence,
                    remarks=legacy_document.remarks,
                    source_application_id=legacy_document.application_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                ))
            migration_db.commit()
            if seen:
                print(f"Migrated {len(seen)} document(s) into applicant document vault")
except Exception as vault_migration_error:
    print("Document vault migration warning:", vault_migration_error)


# Add the new column to an existing SQLite demo database if necessary.
# create_all() does not alter an already-created table.
try:
    scholarship_columns = {column["name"] for column in inspect(engine).get_columns("scholarships")}
    if "form_template" not in scholarship_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE scholarships ADD COLUMN form_template VARCHAR DEFAULT 'GENERAL'"))
except Exception as migration_error:
    print("Scholarship form-template migration warning:", migration_error)

# Normalize the existing NSFB demo application so the newly scheme-specific
# B.Tech form and eligibility engine can evaluate the already-created demo
# record without asking the applicant to create a second application.
try:
    with Session(engine) as normalization_db:
        nsfb_apps = (
            normalization_db.query(Application)
            .join(Scheme, Application.scheme_id == Scheme.id)
            .filter(Scheme.code == "NSFB")
            .all()
        )
        for nsfb_app in nsfb_apps:
            programme_value = str(nsfb_app.programme or "").strip().lower()
            normalized = re.sub(r"[^a-z0-9]+", "", programme_value)
            if normalized not in {"btech", "bacheloroftechnology"}:
                nsfb_app.programme = "B.Tech"

            existing_programme_field = (
                normalization_db.query(ApplicationFieldValue)
                .filter(
                    ApplicationFieldValue.application_id == nsfb_app.id,
                    ApplicationFieldValue.field_key == "programme"
                )
                .first()
            )
            if existing_programme_field:
                existing_programme_field.field_value = "B.Tech"
            else:
                normalization_db.add(ApplicationFieldValue(
                    application_id=nsfb_app.id,
                    field_key="programme",
                    field_value="B.Tech"
                ))
        if nsfb_apps:
            normalization_db.commit()
            print(f"Normalized {len(nsfb_apps)} existing NSFB application(s) to B.Tech")
except Exception as nsfb_normalization_error:
    print("NSFB application normalization warning:", nsfb_normalization_error)


# --------------------------------------------------
# FASTAPI
# --------------------------------------------------

app = FastAPI(
    title="Tribal Scholar API",
    description="AI-enabled Scholarship and Fellowship Management System",
    version="1.0.0"
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# --------------------------------------------------
# ROOT
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "message": "Tribal Scholar API is running",
        "status": "success"
    }


# --------------------------------------------------
# HEALTH
# --------------------------------------------------

@app.get("/api/health")
def health():

    return {
        "status": "healthy"
    }


# --------------------------------------------------
# REGISTER
# --------------------------------------------------

@app.post("/api/auth/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )


    user = User(

        name=request.name,

        email=request.email,

        password_hash=hash_password(
            request.password
        ),

        role=request.role
    )


    db.add(user)

    db.commit()

    db.refresh(user)


    return {

        "message": "User registered successfully",

        "user": {

            "id": user.id,

            "name": user.name,

            "email": user.email,

            "role": user.role
        }
    }


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.post("/api/auth/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):

    user = (

        db.query(User)

        .filter(
            User.email == request.email
        )

        .first()
    )


    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    if not verify_password(
        request.password,
        user.password_hash
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )


    token = create_token(
        user.id,
        user.role
    )

    # Find the application belonging to this logged-in applicant.
    # This prevents every applicant from being sent to application ID 1.
    applications = (
        db.query(Application)
        .filter(Application.user_id == user.id)
        .order_by(Application.id.desc())
        .all()
    )

    return {

        "message": "Login successful",

        "access_token": token,

        "user": {

            "id": user.id,

            "name": user.name,

            "email": user.email,

            "role": user.role,

            "application_id": applications[0].id if applications else None,
            "applications": [
                {
                    "id": a.id,
                    "application_number": a.application_number,
                    "scheme": getattr(getattr(a, "scheme", None), "code", "NFST"),
                    "scheme_name": getattr(getattr(a, "scheme", None), "name", "National Fellowship for Scheduled Tribes"),
                    "status": a.status,
                    "eligibility_status": a.eligibility_status
                }
                for a in applications
            ]
        }
    }


# --------------------------------------------------
# CREATE DEMO SCHEME
# --------------------------------------------------

@app.post("/api/setup")
def setup_demo(
    db: Session = Depends(get_db)
):

    scheme = (

        db.query(Scheme)

        .filter(
            Scheme.code == "NFST"
        )

        .first()
    )


    if not scheme:

        scheme = Scheme(

            name=(
                "National Fellowship "
                "for Scheduled Tribes"
            ),

            code="NFST",

            description=(
                "Demo scheme for "
                "Scheduled Tribe students"
            )
        )

        db.add(scheme)

        db.commit()

        db.refresh(scheme)


    return {

        "message": "Demo setup completed",

        "scheme": {

            "id": scheme.id,

            "name": scheme.name,

            "code": scheme.code
        }
    }

# --------------------------------------------------
# CREATE APPLICATION
# --------------------------------------------------

@app.get("/api/schemes/{scheme_code}/form")
def get_scheme_form(scheme_code: str, db: Session = Depends(get_db)):
    code = scheme_code.strip().upper()
    scheme = db.query(Scheme).filter(Scheme.code == code).first()
    scholarship = db.query(Scholarship).filter(Scholarship.code == code).first()
    if not scheme and not scholarship:
        raise HTTPException(status_code=404, detail="Scheme not found")

    stored_template = scholarship.form_template if scholarship else None
    # NSFB is a dedicated B.Tech ST scholarship in this demo.
    # Never let an old GENERAL template override its scheme-specific form.
    if code == "NSFB":
        template_key = "NSFB_BTECH"
    else:
        template_key = (
            stored_template
            if stored_template in FORM_TEMPLATES
            and not (stored_template == "GENERAL" and code == "NFST")
            else get_form_template(code)
        )
    template = FORM_TEMPLATES[template_key]
    return {
        "scheme": {
            "id": scheme.id if scheme else None,
            "name": scheme.name if scheme else scholarship.name,
            "code": code
        },
        "template": template_key,
        "title": template["title"] if template_key != "GENERAL" else (scheme.name if scheme else scholarship.name),
        "fields": template["fields"]
    }


class DynamicApplicationCreate(BaseModel):
    email: str
    scheme_code: str
    fields: dict = {}


@app.post("/api/applications")
def create_application(
    request: DynamicApplicationCreate,
    db: Session = Depends(get_db)
):
    code = request.scheme_code.strip().upper()

    # A scholarship published by admin becomes an application scheme.
    scholarship = db.query(Scholarship).filter(Scholarship.code == code).first()
    scheme = db.query(Scheme).filter(Scheme.code == code).first()
    if not scheme:
        if scholarship:
            scheme = Scheme(
                name=scholarship.name,
                code=scholarship.code,
                description=scholarship.description
            )
        elif code == "NFST":
            scheme = Scheme(
                name="National Fellowship for Scheduled Tribes",
                code="NFST",
                description="National Fellowship for Scheduled Tribes"
            )
        else:
            raise HTTPException(status_code=404, detail="Scheme not found")
        db.add(scheme)
        db.commit()
        db.refresh(scheme)

    applicant = db.query(User).filter(User.email == request.email).first()
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant not found")

    existing = (
        db.query(Application)
        .filter(Application.user_id == applicant.id, Application.scheme_id == scheme.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail=f"You already have an application for {scheme.name}")

    template_key = get_form_template(code)
    fields_definition = FORM_TEMPLATES[template_key]["fields"]
    submitted = request.fields or {}

    missing = [
        field["label"]
        for field in fields_definition
        if field.get("required") and not str(submitted.get(field["key"], "")).strip()
    ]
    if missing:
        raise HTTPException(status_code=422, detail="Missing required fields: " + ", ".join(missing))

    # Common fields remain in Application for existing eligibility/review code.
    name = str(submitted.get("name", "")).strip()
    dob = str(submitted.get("dob", "")).strip()
    category = str(submitted.get("category", "")).strip()
    university = str(submitted.get("university", submitted.get("institution", ""))).strip()
    programme = str(submitted.get("programme", submitted.get("course", ""))).strip()
    try:
        percentage = float(submitted.get("percentage", 0) or 0)
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Academic score must be a number")

    application_number = f"{code}-2026-{str(uuid.uuid4())[:6].upper()}"
    application = Application(
        application_number=application_number,
        user_id=applicant.id,
        scheme_id=scheme.id,
        name=name,
        dob=dob,
        category=category,
        university=university,
        programme=programme,
        percentage=percentage,
        status="SUBMITTED",
        eligibility_status="PENDING"
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Store every scheme-specific field separately.
    for key, value in submitted.items():
        db.add(ApplicationFieldValue(
            application_id=application.id,
            field_key=str(key),
            field_value=str(value) if value is not None else ""
        ))
    db.commit()

    return {
        "message": "Application submitted successfully",
        "application": {
            "id": application.id,
            "application_number": application.application_number,
            "name": application.name,
            "scheme": scheme.code,
            "scheme_name": scheme.name,
            "status": application.status,
            "eligibility": application.eligibility_status
        }
    }


@app.get("/api/applications/{application_id}/fields")
def get_application_fields(application_id: int, db: Session = Depends(get_db)):
    rows = db.query(ApplicationFieldValue).filter(ApplicationFieldValue.application_id == application_id).all()
    return {"fields": {row.field_key: row.field_value for row in rows}}

# --------------------------------------------------
# DOCUMENT UPLOAD + OCR
# --------------------------------------------------

@app.post("/api/applications/{application_id}/documents")
async def upload_document(
    application_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload/update an applicant-owned document and reuse it across schemes."""

    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    user_id = application.user_id
    canonical_type = str(document_type or "").upper().strip().replace(" ", "_")
    aliases = {
        "MARK_SHEET": "MARKSHEET",
        "MARKSHEET": "MARKSHEET",
        "INCOME_CERTIFICATE": "INCOME_CERTIFICATE",
        "ADMISSION_LETTER": "ADMISSION_DOCUMENT",
        "ADMISSION_DOCUMENT": "ADMISSION_DOCUMENT",
        "ST_CERTIFICATE": "ST_CERTIFICATE"
    }
    canonical_type = aliases.get(canonical_type, canonical_type)

    existing = (
        db.query(UserDocument)
        .filter(
            UserDocument.user_id == user_id,
            UserDocument.document_type == canonical_type
        )
        .order_by(UserDocument.id.desc())
        .first()
    )

    # A verified document in the vault is reused; do not ask the applicant
    # to upload it again or run OCR a second time.
    if existing and str(existing.verification_status).upper() == "VERIFIED":
        return {
            "message": "Existing verified document reused from your document vault",
            "reused": True,
            "document": {
                "id": existing.id,
                "document_type": existing.document_type,
                "filename": existing.filename,
                "verification_status": existing.verification_status,
                "confidence": existing.confidence,
                "remarks": existing.remarks,
                "source": "DOCUMENT_VAULT"
            }
        }

    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = f"user_{user_id}_{canonical_type}_{uuid.uuid4().hex[:8]}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    try:
        extracted_text = extract_text(file_path)
    except Exception as e:
        extracted_text = ""
        print("OCR ERROR:", str(e))

    analysis = analyze_document(extracted_text, canonical_type)

    if existing:
        # Replace an old/deficient vault document with the corrected version.
        existing.filename = file.filename
        existing.file_path = file_path
        existing.ocr_text = extracted_text
        existing.verification_status = (
            "VERIFIED" if analysis["verified"] else "DEFICIENCY"
        )
        existing.confidence = analysis["confidence"]
        existing.remarks = ", ".join(analysis["issues"])
        existing.source_application_id = application_id
        existing.updated_at = datetime.utcnow()
        document = existing
        reused = False
    else:
        document = UserDocument(
            user_id=user_id,
            document_type=canonical_type,
            filename=file.filename,
            file_path=file_path,
            ocr_text=extracted_text,
            verification_status=(
                "VERIFIED" if analysis["verified"] else "DEFICIENCY"
            ),
            confidence=analysis["confidence"],
            remarks=", ".join(analysis["issues"]),
            source_application_id=application_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(document)
        reused = False

    db.commit()
    db.refresh(document)

    return {
        "message": "Document processed and saved to applicant document vault",
        "reused": reused,
        "document": {
            "id": document.id,
            "document_type": document.document_type,
            "filename": document.filename,
            "verification_status": document.verification_status,
            "confidence": document.confidence,
            "issues": analysis["issues"],
            "extracted": analysis["extracted"],
            "ocr_preview": extracted_text[:500],
            "source": "DOCUMENT_VAULT"
        }
    }


# --------------------------------------------------
# SCHEME-AWARE ELIGIBILITY ENGINE
# --------------------------------------------------
# The demo keeps scheme configuration lightweight and database-backed:
# - the selected Scholarship supplies the scheme name/code, form template
#   and human-readable eligibility description;
# - the engine derives transparent checks from those values;
# - every scheme is evaluated, not only NFST.
# These are demo rules and must not be presented as official government policy.

DOCUMENT_REQUIREMENTS_BY_TEMPLATE = {
    "NSFB_BTECH": [
        ("ST_CERTIFICATE", "ST Certificate"),
        ("MARKSHEET", "Marksheet"),
        ("INCOME_CERTIFICATE", "Income Certificate"),
        ("ADMISSION_DOCUMENT", "Admission Document")
    ],
    "NFST": [
        ("ST_CERTIFICATE", "ST Certificate"),
        ("MARKSHEET", "Marksheet"),
        ("INCOME_CERTIFICATE", "Income Certificate"),
        ("ADMISSION_DOCUMENT", "Admission Document")
    ],
    "POST_MATRIC": [
        ("ST_CERTIFICATE", "ST Certificate"),
        ("MARKSHEET", "Marksheet"),
        ("INCOME_CERTIFICATE", "Income Certificate")
    ],
    "TOP_CLASS": [
        ("ST_CERTIFICATE", "ST Certificate"),
        ("MARKSHEET", "Marksheet"),
        ("INCOME_CERTIFICATE", "Income Certificate"),
        ("ADMISSION_DOCUMENT", "Admission Document")
    ],
    "GENERAL": [
        ("ST_CERTIFICATE", "ST Certificate"),
        ("MARKSHEET", "Marksheet")
    ]
}


def _canonical_document_type(value):
    text_value = str(value or "").upper().strip().replace("-", " ")
    aliases = {
        "MARK SHEET": "MARKSHEET",
        "MARKSHEET": "MARKSHEET",
        "INCOME CERTIFICATE": "INCOME_CERTIFICATE",
        "ADMISSION LETTER": "ADMISSION_DOCUMENT",
        "ADMISSION DOCUMENT": "ADMISSION_DOCUMENT",
        "ST CERTIFICATE": "ST_CERTIFICATE"
    }
    return aliases.get(text_value, text_value.replace(" ", "_"))


def _extract_percentage_requirement(text_value):
    matches = re.findall(r"(?<!\d)(\d{2,3}(?:\.\d+)?)\s*%", text_value or "")
    if not matches:
        matches = re.findall(r"(?:minimum|min|at least|above)\s+(\d{2,3}(?:\.\d+)?)", text_value or "", flags=re.I)
    if not matches:
        return None
    try:
        return float(matches[0])
    except (TypeError, ValueError):
        return None


def _extract_income_requirement(text_value):
    if not text_value:
        return None
    # Demo-friendly parser for values such as ₹2,50,000, 250000 or 2.5 lakh.
    match = re.search(r"(?:income|family income|annual income)[^\d₹]{0,40}(?:₹\s*)?([\d,]+(?:\.\d+)?)", text_value, flags=re.I)
    if match:
        try:
            return float(match.group(1).replace(",", ""))
        except ValueError:
            pass
    lakh_match = re.search(r"(?:income|family income|annual income)[^\d]{0,40}(\d+(?:\.\d+)?)\s*lakh", text_value, flags=re.I)
    if lakh_match:
        try:
            return float(lakh_match.group(1)) * 100000
        except ValueError:
            pass
    return None


def _scheme_rules(application, scholarship):
    code = str(getattr(scholarship, "code", "") or "").upper().strip()
    template = str(getattr(scholarship, "form_template", "GENERAL") or "GENERAL").upper().strip()
    # NSFB is a dedicated B.Tech ST scheme. Existing scholarship rows may
    # still contain GENERAL from before the scheme-specific form was added.
    if code == "NSFB":
        template = "NSFB_BTECH"
    elif template not in DOCUMENT_REQUIREMENTS_BY_TEMPLATE:
        template = get_form_template(code)
    if template not in DOCUMENT_REQUIREMENTS_BY_TEMPLATE:
        template = "GENERAL"

    combined = " ".join([
        str(getattr(scholarship, "name", "") or ""),
        str(getattr(scholarship, "description", "") or ""),
        str(getattr(scholarship, "eligibility", "") or ""),
        code
    ]).lower()

    rules = []

    # Tribal-category rule is included when the scheme explicitly refers
    # to ST or is one of the known tribal templates.
    if "st" in combined or template in {"NFST", "POST_MATRIC", "TOP_CLASS"}:
        rules.append({
            "rule": "ST Category",
            "message": "Applicant category must be ST",
            "type": "category"
        })

    # Programme rule is useful for scheme names such as B.Tech scholarship.
    if any(token in combined for token in ["b-tech", "btech", "b.tech"]):
        rules.append({
            "rule": "Programme",
            "message": "Applicant must be enrolled in a B.Tech programme",
            "type": "programme",
            "expected": "btech"
        })
    elif template == "NFST":
        rules.append({
            "rule": "Programme",
            "message": "Programme must satisfy the fellowship requirement",
            "type": "programme",
            "expected": "phd"
        })

    eligibility_text = str(getattr(scholarship, "eligibility", "") or "")
    minimum_percentage = _extract_percentage_requirement(eligibility_text)
    if minimum_percentage is not None:
        rules.append({
            "rule": "Academic Criteria",
            "message": f"Academic score must be at least {minimum_percentage:g}%",
            "type": "percentage",
            "minimum": minimum_percentage
        })

    if "income" in combined:
        income_limit = _extract_income_requirement(eligibility_text)
        rules.append({
            "rule": "Income Criteria",
            "message": (
                f"Annual family income must be at or below ₹{income_limit:,.0f}"
                if income_limit is not None
                else "Annual family income must satisfy the scheme requirement"
            ),
            "type": "income",
            "maximum": income_limit
        })

    required_documents = list(DOCUMENT_REQUIREMENTS_BY_TEMPLATE[template])
    if "income" in combined and not any(doc[0] == "INCOME_CERTIFICATE" for doc in required_documents):
        required_documents.append(("INCOME_CERTIFICATE", "Income Certificate"))
    if "admission" in combined and not any(doc[0] == "ADMISSION_DOCUMENT" for doc in required_documents):
        required_documents.append(("ADMISSION_DOCUMENT", "Admission Document"))

    rules.append({
        "rule": "Required Documents",
        "message": "All required documents must be verified",
        "type": "documents",
        "required_documents": required_documents
    })

    return rules, template


def check_scheme_eligibility(application, documents, scholarship, field_rows=None):
    rules, template = _scheme_rules(application, scholarship)

    normalized_documents = {
        _canonical_document_type(getattr(document, "document_type", "")): document
        for document in documents
    }
    field_rows = field_rows or []
    field_values = {
        str(getattr(row, "field_key", "")): str(getattr(row, "field_value", "") or "")
        for row in field_rows
    }

    checks = []
    for rule in rules:
        rule_type = rule["type"]
        passed = False
        message = rule["message"]

        if rule_type == "category":
            passed = str(getattr(application, "category", "") or "").strip().upper() == "ST"
        elif rule_type == "programme":
            programme = str(
                getattr(application, "programme", "")
                or field_values.get("programme", "")
                or field_values.get("course", "")
            ).strip().lower()
            normalized_programme = re.sub(r"[^a-z0-9]+", "", programme)
            if rule.get("expected") == "btech":
                passed = normalized_programme in {
                    "btech",
                    "bacheloroftechnology"
                } or "bacheloroftechnology" in normalized_programme
            else:
                passed = "phd" in normalized_programme
        elif rule_type == "percentage":
            try:
                passed = float(getattr(application, "percentage", 0) or 0) >= rule["minimum"]
            except (TypeError, ValueError):
                passed = False
        elif rule_type == "income":
            raw_income = field_values.get("family_income", "")
            try:
                income = float(raw_income.replace(",", "").replace("₹", "").strip())
                passed = rule.get("maximum") is None or income <= rule["maximum"]
            except (TypeError, ValueError):
                passed = False
        elif rule_type == "documents":
            required = rule["required_documents"]
            missing = []
            for doc_type, title in required:
                document = normalized_documents.get(doc_type)
                if not document or str(getattr(document, "verification_status", "")).upper() != "VERIFIED":
                    missing.append(title)
            passed = len(missing) == 0
            if missing:
                message = "Missing or unverified: " + ", ".join(missing)

        checks.append({
            "rule": rule["rule"],
            "passed": passed,
            "status": "VERIFIED" if passed else "DEFICIENCY",
            "message": message
        })

    eligible = bool(checks) and all(check["passed"] for check in checks)
    return {
        "eligible": eligible,
        "status": "ELIGIBLE" if eligible else "DEFICIENCY",
        "scheme_code": str(getattr(scholarship, "code", "") or "").upper(),
        "scheme_name": getattr(scholarship, "name", None),
        "form_template": template,
        "checks": checks,
        "message": (
            "All configured eligibility checks passed."
            if eligible
            else "One or more configured eligibility checks require correction or are not satisfied."
        )
    }


# --------------------------------------------------
# ELIGIBILITY CHECK
# --------------------------------------------------

@app.get("/api/applications/{application_id}/eligibility")
def evaluate_application(
    application_id: int,
    db: Session = Depends(get_db)
):

    # ---------------------------------------------
    # FIND APPLICATION
    # ---------------------------------------------

    application = (
        db.query(Application)
        .filter(
            Application.id == application_id
        )
        .first()
    )

    if not application:

        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )


    # ---------------------------------------------
    # GET DOCUMENTS
    # ---------------------------------------------

    documents = (
        db.query(UserDocument)
        .filter(
            UserDocument.user_id == application.user_id
        )
        .all()
    )


    # ---------------------------------------------
    # FIND THE APPLICATION'S SCHEME
    # ---------------------------------------------

    scheme = (
        db.query(Scheme)
        .filter(Scheme.id == application.scheme_id)
        .first()
    )
    scheme_code = getattr(scheme, "code", None) or "NFST"

    scholarship = (
        db.query(Scholarship)
        .filter(Scholarship.code == scheme_code)
        .first()
    )

    # Keep legacy NFST applications evaluable even if the scholarship
    # row was created before the dynamic scholarship feature existed.
    if not scholarship and scheme_code == "NFST":
        scholarship = db.query(Scholarship).filter(Scholarship.code == "NFST").first()

    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship configuration not found for this application")

    # ---------------------------------------------
    # RUN SCHEME-AWARE ELIGIBILITY ENGINE
    # ---------------------------------------------

    field_rows = (
        db.query(ApplicationFieldValue)
        .filter(ApplicationFieldValue.application_id == application.id)
        .all()
    )

    result = check_scheme_eligibility(
        application,
        documents,
        scholarship,
        field_rows
    )

    # ---------------------------------------------
    # UPDATE DATABASE
    # ---------------------------------------------

    application.eligibility_status = result["status"]
    application.status = result["status"]

    db.commit()


    return {
        "application_number":
            application.application_number,

        "eligibility":
            result
    }

@app.delete("/api/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    document = (
        db.query(UserDocument)
        .filter(UserDocument.id == document_id)
        .first()
    )

    if document:
        db.delete(document)
        db.commit()
        return {"message": "Document removed from document vault"}

    legacy = db.query(Document).filter(Document.id == document_id).first()
    if not legacy:
        raise HTTPException(status_code=404, detail="Document not found")

    db.delete(legacy)
    db.commit()
    return {"message": "Legacy document deleted successfully"}

    # --------------------------------------------------
# GET APPLICATION
# --------------------------------------------------

@app.get("/api/applications/{application_id}")
def get_application(
    application_id: int,
    db: Session = Depends(get_db)
):

    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    return {
        "id": application.id,
        "application_number": application.application_number,
        "name": application.name,
        "dob": application.dob,
        "category": application.category,
        "university": application.university,
        "programme": application.programme,
        "percentage": application.percentage,
        "status": application.status,
        "eligibility_status": application.eligibility_status,
        "scheme": getattr(getattr(application, "scheme", None), "code", "NFST"),
        "scheme_name": getattr(getattr(application, "scheme", None), "name", "National Fellowship for Scheduled Tribes")
    }


# --------------------------------------------------
# GET APPLICATION DOCUMENTS
# --------------------------------------------------

@app.get("/api/applications/{application_id}/documents")
def get_documents(
    application_id: int,
    db: Session = Depends(get_db)
):
    """Return the applicant's reusable document vault for a selected application."""

    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    documents = (
        db.query(UserDocument)
        .filter(UserDocument.user_id == application.user_id)
        .order_by(UserDocument.document_type.asc(), UserDocument.id.desc())
        .all()
    )

    return {
        "documents": [
            {
                "id": document.id,
                "document_type": document.document_type,
                "filename": document.filename,
                "verification_status": document.verification_status,
                "confidence": document.confidence,
                "remarks": document.remarks,
                "source": "DOCUMENT_VAULT",
                "source_application_id": document.source_application_id
            }
            for document in documents
        ]
    }


@app.get("/api/users/{user_id}/documents")
def get_user_documents(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Return all reusable documents owned by an applicant."""
    documents = (
        db.query(UserDocument)
        .filter(UserDocument.user_id == user_id)
        .order_by(UserDocument.document_type.asc(), UserDocument.id.desc())
        .all()
    )

    return {
        "documents": [
            {
                "id": document.id,
                "document_type": document.document_type,
                "filename": document.filename,
                "verification_status": document.verification_status,
                "confidence": document.confidence,
                "remarks": document.remarks,
                "source": "DOCUMENT_VAULT",
                "source_application_id": document.source_application_id
            }
            for document in documents
        ]
    }


# --------------------------------------------------
# ADMIN - SCHOLARSHIP MANAGEMENT
# --------------------------------------------------

class ScholarshipCreate(BaseModel):
    name: str
    code: str
    description: str
    amount: float = 0
    deadline: str
    eligibility: str
    status: str = "ACTIVE"
    form_template: str = "GENERAL"


@app.get("/api/admin/scholarships")
def admin_scholarships(
    db: Session = Depends(get_db)
):
    scholarships = (
        db.query(Scholarship)
        .order_by(Scholarship.id.desc())
        .all()
    )

    return {
        "scholarships": [
            {
                "id": scholarship.id,
                "name": scholarship.name,
                "code": scholarship.code,
                "form_template": (scholarship.form_template or get_form_template(scholarship.code)),
                "description": scholarship.description,
                "amount": scholarship.amount,
                "deadline": scholarship.deadline,
                "eligibility": scholarship.eligibility,
                "status": scholarship.status,
                "created_at": scholarship.created_at.isoformat() if scholarship.created_at else None
            }
            for scholarship in scholarships
        ]
    }


# --------------------------------------------------
# PUBLIC - ACTIVE SCHOLARSHIPS FOR APPLICANTS
# --------------------------------------------------

@app.get("/api/scholarships")
def available_scholarships(
    db: Session = Depends(get_db)
):
    scholarships = (
        db.query(Scholarship)
        .filter(Scholarship.status == "ACTIVE")
        .order_by(Scholarship.id.desc())
        .all()
    )

    return {
        "scholarships": [
            {
                "id": scholarship.id,
                "name": scholarship.name,
                "code": scholarship.code,
                "form_template": (scholarship.form_template or get_form_template(scholarship.code)),
                "description": scholarship.description,
                "amount": scholarship.amount,
                "deadline": scholarship.deadline,
                "eligibility": scholarship.eligibility,
                "status": scholarship.status,
                "created_at": scholarship.created_at.isoformat() if scholarship.created_at else None
            }
            for scholarship in scholarships
        ]
    }


@app.post("/api/admin/scholarships")
def create_scholarship(
    request: ScholarshipCreate,
    db: Session = Depends(get_db)
):
    code = request.code.strip().upper()

    if not request.name.strip():
        raise HTTPException(status_code=400, detail="Scholarship name is required")

    if not code:
        raise HTTPException(status_code=400, detail="Scholarship code is required")

    existing = (
        db.query(Scholarship)
        .filter(Scholarship.code == code)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Scholarship code already exists"
        )

    if request.status not in ["ACTIVE", "DRAFT", "CLOSED"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid scholarship status"
        )

    if request.form_template not in FORM_TEMPLATES:
        raise HTTPException(status_code=400, detail="Invalid application form template")

    scholarship = Scholarship(
        name=request.name.strip(),
        code=code,
        description=request.description.strip(),
        amount=request.amount,
        deadline=request.deadline,
        eligibility=request.eligibility.strip(),
        status=request.status,
        form_template=request.form_template
    )

    db.add(scholarship)
    db.commit()
    db.refresh(scholarship)

    # Every published scholarship is also an application scheme.
    scheme = db.query(Scheme).filter(Scheme.code == code).first()
    if not scheme:
        scheme = Scheme(
            name=scholarship.name,
            code=scholarship.code,
            description=scholarship.description
        )
        db.add(scheme)
        db.commit()

    return {
        "message": "Scholarship created successfully",
        "scholarship": {
            "id": scholarship.id,
            "name": scholarship.name,
            "code": scholarship.code,
            "description": scholarship.description,
            "amount": scholarship.amount,
            "deadline": scholarship.deadline,
            "eligibility": scholarship.eligibility,
            "status": scholarship.status,
            "created_at": scholarship.created_at.isoformat() if scholarship.created_at else None
        }
    }


# --------------------------------------------------
# ADMIN - ALL APPLICATIONS
# --------------------------------------------------

@app.get("/api/admin/applications")
def admin_applications(
    db: Session = Depends(get_db)
):

    applications = (
        db.query(Application)
        .order_by(Application.id.desc())
        .all()
    )

    return {
        "applications": [
            {
                "id": application.id,
                "application_number":
                    application.application_number,
                "name": application.name,
                "scheme": getattr(getattr(application, "scheme", None), "code", "NFST"),
                "programme": application.programme,
                "percentage": application.percentage,
                "status": application.status,
                "eligibility_status":
                    application.eligibility_status,
                "category": application.category,
                "university": application.university,
                "dob": application.dob,
                "user_id": application.user_id,
                "scheme_id": application.scheme_id
            }
            for application in applications
        ]
    }


# --------------------------------------------------
# ADMIN DASHBOARD STATISTICS
# --------------------------------------------------

@app.get("/api/admin/stats")
def admin_stats(
    db: Session = Depends(get_db)
):

    applications = (
        db.query(Application)
        .all()
    )

    total = len(applications)

    eligible = sum(
        1
        for a in applications
        if a.eligibility_status == "ELIGIBLE"
    )

    deficient = sum(
        1
        for a in applications
        if a.status == "DEFICIENCY"
    )

    shortlisted = sum(
        1
        for a in applications
        if a.status == "SHORTLISTED"
    )

    # Anything not yet marked DEFICIENCY or SHORTLISTED is still
    # awaiting administrative review. This is calculated from the
    # database, so the dashboard changes automatically as applications
    # are submitted or reviewed.
    pending = sum(
        1
        for a in applications
        if a.status not in ["DEFICIENCY", "SHORTLISTED"]
    )

    return {
        "total": total,
        "pending": pending,
        "eligible": eligible,
        "deficient": deficient,
        "shortlisted": shortlisted
    }


# --------------------------------------------------
# ADMIN APPROVE APPLICATION
# --------------------------------------------------

@app.post("/api/admin/applications/{application_id}/approve")
def approve_application(
    application_id: int,
    db: Session = Depends(get_db)
):

    application = (
        db.query(Application)
        .filter(
            Application.id == application_id
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    if application.eligibility_status != "ELIGIBLE":
        raise HTTPException(
            status_code=400,
            detail="Application is not eligible"
        )

    application.status = "SHORTLISTED"

    db.commit()

    return {
        "message": "Application shortlisted successfully",
        "application_number":
            application.application_number,
        "status": application.status
    }

# --------------------------------------------------
# Request Correction API
# --------------------------------------------------

@app.post("/api/admin/applications/{application_id}/request-correction")
def request_correction(application_id: int, db: Session = Depends(get_db)):
    application = (
        db.query(Application)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found"
        )

    application.status = "DEFICIENCY"

    db.commit()
    db.refresh(application)

    return {
        "message": "Correction requested successfully",
        "application": {
            "id": application.id,
            "application_number": application.application_number,
            "status": application.status
        }
    }