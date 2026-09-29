import os
import re

import pytesseract

from PIL import Image
from pypdf import PdfReader


# --------------------------------------------------
# TESSERACT CONFIGURATION
# --------------------------------------------------

TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


# --------------------------------------------------
# IMAGE OCR
# --------------------------------------------------

def extract_text_from_image(file_path: str) -> str:

    image = Image.open(file_path)

    text = pytesseract.image_to_string(image)

    return text


# --------------------------------------------------
# PDF TEXT EXTRACTION
# --------------------------------------------------

def extract_text_from_pdf(file_path: str) -> str:

    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text


# --------------------------------------------------
# GENERAL TEXT EXTRACTION
# --------------------------------------------------

def extract_text(file_path: str) -> str:

    extension = (
        os.path.splitext(file_path)[1]
        .lower()
    )

    if extension in [".jpg", ".jpeg", ".png"]:

        return extract_text_from_image(
            file_path
        )

    if extension == ".pdf":

        return extract_text_from_pdf(
            file_path
        )

    return ""


# --------------------------------------------------
# BASIC DOCUMENT ANALYSIS
# --------------------------------------------------

def analyze_document(
    text: str,
    document_type: str
):

    text_lower = text.lower()

    result = {
        "document_type": document_type,
        "verified": False,
        "confidence": 0,
        "issues": [],
        "extracted": {}
    }


    # ---------------------------------------------
    # ST CERTIFICATE
    # ---------------------------------------------

    if document_type == "ST_CERTIFICATE":

        if (
            "scheduled tribe" in text_lower
            or "scheduled tribes" in text_lower
            or "tribe" in text_lower
        ):

            result["extracted"]["category"] = "ST"

            result["confidence"] = 95

        else:

            result["issues"].append(
                "ST category could not be detected"
            )


    # ---------------------------------------------
    # MARKSHEET
    # ---------------------------------------------

    elif document_type == "MARKSHEET":

        percentage_pattern = (
            r"(\d{2}(?:\.\d{1,2})?)\s*%"
        )

        match = re.search(
            percentage_pattern,
            text
        )

        if match:

            percentage = float(
                match.group(1)
            )

            result["extracted"][
                "percentage"
            ] = percentage

            result["confidence"] = 92

        else:

            result["issues"].append(
                "Percentage could not be detected"
            )


    # ---------------------------------------------
    # INCOME CERTIFICATE
    # ---------------------------------------------

    elif document_type == "INCOME_CERTIFICATE":

        income_pattern = (
            r"(?:income|annual income)"
            r".{0,40}?"
            r"([\d,]+)"
        )

        match = re.search(
            income_pattern,
            text_lower
        )

        if match:

            result["extracted"][
                "income"
            ] = match.group(1)

            result["confidence"] = 90

        else:

            result["issues"].append(
                "Income amount could not be detected"
            )


    # ---------------------------------------------
    # GENERAL DOCUMENT
    # ---------------------------------------------

    else:

        if len(text.strip()) > 30:

            result["confidence"] = 85

        else:

            result["issues"].append(
                "Document text could not be read"
            )


    # ---------------------------------------------
    # FINAL STATUS
    # ---------------------------------------------

    if not result["issues"]:

        result["verified"] = True


    return result