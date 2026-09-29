# VidyaSetu
## AI-Enabled Scholarship & Fellowship Management System

![Smart India Hackathon](https://img.shields.io/badge/SIH-2026-blue)
![Status](https://img.shields.io/badge/Status-Prototype-orange)
![Backend](https://img.shields.io/badge/Backend-FastAPI-green)
![Frontend](https://img.shields.io/badge/Frontend-React-blue)
![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)
![AI](https://img.shields.io/badge/AI-OCR%20%7C%20ML-purple)

---

## 📌 About the Project

**VidyaSetu** is an AI-enabled Scholarship and Fellowship Management System designed for the **Ministry of Tribal Affairs (MoTA)**.

The platform aims to digitize and streamline the complete scholarship and fellowship lifecycle — from applicant registration and application submission to eligibility verification, document scrutiny, deficiency handling, selection, communication, and post-selection management.

The system provides a **common platform with scheme-specific workflows**, allowing different scholarship and fellowship schemes to maintain their own eligibility criteria, required documents, deadlines, and selection processes.

---

## 🎯 Problem Statement

### Smart India Hackathon 2026

**Problem Statement ID:** 26239

**Title:**  
AI-Enabled Scholarship and Fellowship Management System for Scheduled Tribes

**Organization:**  
Ministry of Tribal Affairs

**Category:**  
Software

**Theme:**  
Smart Education

---

## ❗ Existing Problems

The existing scholarship and fellowship administration process can involve:

- Repeated submission of the same documents.
- Manual document verification and scrutiny.
- Long processing and verification cycles.
- Incomplete or incorrect applications.
- Repeated correspondence between applicants and officials.
- Difficulty in tracking application status.
- Limited real-time monitoring for administrators.
- Different eligibility rules and documentation requirements for different schemes.
- Manual effort in generating reports and monitoring scheme performance.

---

## 💡 Proposed Solution

VidyaSetu provides a centralized digital platform that combines:

- Applicant registration and profile management.
- Reusable document repository.
- Scheme-specific application workflows.
- AI-assisted document processing.
- Automated eligibility checking.
- Deficiency detection and resubmission.
- Application status tracking.
- Administrator dashboards.
- Analytics and reporting.
- Human-in-the-loop verification.

### Core Concept

> **One Applicant Profile + Reusable Documents + Scheme-Specific Rules + AI-Assisted Verification + Human Oversight**

---

## 🚀 Key Features

### 👨‍🎓 Applicant Module

- Secure applicant registration and login.
- Centralized applicant profile.
- Apply for available scholarship/fellowship schemes.
- Upload and manage documents.
- Reuse previously uploaded documents.
- View application status.
- Receive deficiency notifications.
- Resubmit corrected documents.
- Track application progress.

---

### 📄 Smart Document Management

The system provides a centralized document repository where applicants can store their documents.

Instead of repeatedly uploading the same documents, the system can reuse previously submitted documents where applicable.

Example documents:

- Caste Certificate
- Income Certificate
- Mark Sheets
- Degree/Admission Documents
- Identity Documents
- Research/Academic Documents
- Other scheme-specific documents

---

### 🤖 AI-Assisted Verification

AI/OCR technologies can assist in:

- Extracting information from documents.
- Identifying document types.
- Checking document completeness.
- Detecting missing information.
- Identifying inconsistencies.
- Flagging applications requiring additional verification.

> AI assists officials; final verification and decision-making remain under authorized human control.

---

### ✅ Eligibility Verification

The system uses configurable scheme-specific rules to check applicant eligibility.

Example:

```text
Applicant Data
      ↓
Scheme Selection
      ↓
Eligibility Rules
      ↓
Automated Validation
      ↓
Eligible / Deficiency / Requires Review
