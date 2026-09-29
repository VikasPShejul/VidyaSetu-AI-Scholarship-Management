from models import Application, Document


# --------------------------------------------------
# REQUIRED DOCUMENTS FOR NFST DEMO
# --------------------------------------------------

REQUIRED_DOCUMENTS = {
    "ST_CERTIFICATE",
    "MARKSHEET",
    "INCOME_CERTIFICATE",
    "ADMISSION_DOCUMENT"
}


# --------------------------------------------------
# DOCUMENT TYPE NORMALIZATION
# --------------------------------------------------

def normalize_document_type(document_type: str) -> str:

    value = document_type.strip().upper()

    mapping = {
        "ST CERTIFICATE": "ST_CERTIFICATE",
        "ST_CERTIFICATE": "ST_CERTIFICATE",

        "MARKSHEET": "MARKSHEET",
        "MARK SHEET": "MARKSHEET",

        "INCOME CERTIFICATE": "INCOME_CERTIFICATE",
        "INCOME_CERTIFICATE": "INCOME_CERTIFICATE",

        "ADMISSION LETTER": "ADMISSION_DOCUMENT",
        "ADMISSION DOCUMENT": "ADMISSION_DOCUMENT",
        "ADMISSION_DOCUMENT": "ADMISSION_DOCUMENT",

        "RESEARCH PROPOSAL": "ADMISSION_DOCUMENT",

    }

    return mapping.get(value, value)


# --------------------------------------------------
# NFST ELIGIBILITY
# --------------------------------------------------

def check_eligibility(
    application: Application,
    documents: list[Document]
):

    checks = []

    # ---------------------------------------------
    # 1. ST CATEGORY
    # ---------------------------------------------

    category_passed = (
        application.category.strip().upper()
        == "ST"
    )

    checks.append({
        "rule": "ST Category",
        "passed": category_passed,
        "message": (
            "Applicant belongs to ST category"
            if category_passed
            else "Applicant is not marked as ST"
        )
    })


    # ---------------------------------------------
    # 2. PROGRAMME
    # ---------------------------------------------

    programme_passed = (
        application.programme.strip().lower()
        == "phd"
    )

    checks.append({
        "rule": "Programme",
        "passed": programme_passed,
        "message": (
            "PhD programme detected"
            if programme_passed
            else "Required programme is PhD"
        )
    })


    # ---------------------------------------------
    # 3. ACADEMIC CRITERIA
    # ---------------------------------------------

    academic_passed = (
        application.percentage >= 55
    )

    checks.append({
        "rule": "Academic Criteria",
        "passed": academic_passed,
        "message": (
            f"Academic score "
            f"{application.percentage}% satisfies requirement"
            if academic_passed
            else (
                f"Academic score "
                f"{application.percentage}% is below 55%"
            )
        )
    })


    # ---------------------------------------------
    # 4. DOCUMENT VERIFICATION
    # ---------------------------------------------

    verified_documents = set()

    for document in documents:

        if document.verification_status == "VERIFIED":

            normalized_type = normalize_document_type(
                document.document_type
            )

            verified_documents.add(
                normalized_type
            )


    missing_documents = (
        REQUIRED_DOCUMENTS
        - verified_documents
    )


    documents_passed = (
        len(missing_documents) == 0
    )


    checks.append({
        "rule": "Required Documents",
        "passed": documents_passed,
        "message": (
            "All required documents verified"
            if documents_passed
            else (
                "Missing/invalid documents: "
                + ", ".join(
                    sorted(missing_documents)
                )
            )
        )
    })


    # ---------------------------------------------
    # FINAL RESULT
    # ---------------------------------------------

    eligible = all(
        check["passed"]
        for check in checks
    )


    return {
        "eligible": eligible,

        "status": (
            "ELIGIBLE"
            if eligible
            else "INELIGIBLE"
        ),

        "checks": checks,

        "verified_documents": sorted(
            verified_documents
        ),

        "missing_documents": sorted(
            missing_documents
        )
    }