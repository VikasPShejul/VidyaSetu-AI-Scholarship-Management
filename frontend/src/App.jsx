import React, { useState } from "react";

import {
    login,
    getApplication,
    getDocuments,
    getEligibility,
    getAdminStats,
    getAdminApplications,
    approveApplication,
    requestCorrection,
    uploadDocument,
    getUserDocuments
} from "./api";

import "./App.css";

// ==================================================
// SCHEME-AWARE DEMO CONFIGURATION
// ==================================================


const DEMO_DOCUMENT_REQUIREMENTS = {
    NSFB: [
        { type: "ST_CERTIFICATE", title: "ST Certificate" },
        { type: "MARKSHEET", title: "Marksheet" },
        { type: "INCOME_CERTIFICATE", title: "Income Certificate" },
        { type: "ADMISSION_DOCUMENT", title: "Admission Document" }
    ],

    NFST: [
        {
            type: "ST_CERTIFICATE",
            title: "ST Certificate"
        },
        {
            type: "MARKSHEET",
            title: "Marksheet"
        },
        {
            type: "INCOME_CERTIFICATE",
            title: "Income Certificate"
        },
        {
            type: "ADMISSION_DOCUMENT",
            title: "Admission Document"
        }
    ],

    POST_MATRIC: [
        {
            type: "ST_CERTIFICATE",
            title: "ST Certificate"
        },
        {
            type: "MARKSHEET",
            title: "Marksheet"
        },
        {
            type: "INCOME_CERTIFICATE",
            title: "Income Certificate"
        }
    ],

    TOP_CLASS: [
        {
            type: "ST_CERTIFICATE",
            title: "ST Certificate"
        },
        {
            type: "MARKSHEET",
            title: "Marksheet"
        },
        {
            type: "INCOME_CERTIFICATE",
            title: "Income Certificate"
        },
        {
            type: "ADMISSION_DOCUMENT",
            title: "Admission Document"
        }
    ],

    GENERAL: [
        {
            type: "ST_CERTIFICATE",
            title: "ST Certificate"
        },
        {
            type: "MARKSHEET",
            title: "Marksheet"
        }
    ]
};

// ==================================================
// SCHEME-AWARE ELIGIBILITY CONFIGURATION
// ==================================================

const DEMO_ELIGIBILITY_RULES = {
    NSFB: [
        { rule: "ST Category", message: "Applicant must belong to the ST category" },
        { rule: "Programme", message: "Applicant must be enrolled in a B.Tech programme" },
        { rule: "Academic Criteria", message: "Academic score must be at least 55%" },
        { rule: "Required Documents", message: "All required documents must be verified" }
    ],

    NFST: [
        {
            rule: "ST Category",
            message: "Applicant must belong to the ST category"
        },
        {
            rule: "Programme",
            message: "Programme eligibility must be satisfied"
        },
        {
            rule: "Academic Criteria",
            message: "Minimum academic score must be satisfied"
        },
        {
            rule: "Required Documents",
            message: "All required documents must be verified"
        }
    ],

    POST_MATRIC: [
        {
            rule: "ST Category",
            message: "Applicant must belong to the ST category"
        },
        {
            rule: "Academic Criteria",
            message: "Minimum academic score must be satisfied"
        },
        {
            rule: "Income Criteria",
            message: "Annual family income must satisfy the scheme limit"
        },
        {
            rule: "Required Documents",
            message: "All required documents must be verified"
        }
    ],

    TOP_CLASS: [
        {
            rule: "ST Category",
            message: "Applicant must belong to the ST category"
        },
        {
            rule: "Academic Criteria",
            message: "Academic score must satisfy the scheme requirement"
        },
        {
            rule: "Institution Criteria",
            message: "Institution must satisfy the scheme requirement"
        },
        {
            rule: "Required Documents",
            message: "All required documents must be verified"
        }
    ],

    GENERAL: [
        {
            rule: "Category",
            message: "Applicant category must satisfy the scholarship requirement"
        },
        {
            rule: "Academic Criteria",
            message: "Academic score must satisfy the scholarship requirement"
        },
        {
            rule: "Required Documents",
            message: "All required documents must be verified"
        }
    ]
};

function getEligibilityRules(schemeCode) {
    const code = String(schemeCode || "")
        .toUpperCase()
        .trim();

    return (
        DEMO_ELIGIBILITY_RULES[code] ||
        DEMO_ELIGIBILITY_RULES.GENERAL
    );
}

// ==================================================
// CREATE SCHEME-AWARE PENDING ELIGIBILITY
// ==================================================

function createPendingEligibility(schemeCode) {
    const rules = getEligibilityRules(schemeCode);

    return {
        status: "PENDING",
        eligible: false,
        checks: rules.map((item) => ({
            rule: item.rule,
            passed: false,
            status: "PENDING",
            message: item.message
        })),
        message:
            "Eligibility evaluation is pending for this scholarship scheme."
    };
}


// ==================================================
// NORMALIZE DOCUMENT TYPE
// ==================================================

function normalizeDocumentType(type) {

    const value =
        String(type || "")
            .toUpperCase()
            .trim();

    const aliases = {
        "MARK SHEET": "MARKSHEET",
        "MARKSHEET": "MARKSHEET",

        "INCOME CERTIFICATE":
            "INCOME_CERTIFICATE",

        "ADMISSION LETTER":
            "ADMISSION_DOCUMENT",

        "ADMISSION DOCUMENT":
            "ADMISSION_DOCUMENT",

        "ST CERTIFICATE":
            "ST_CERTIFICATE"
    };

    return (
        aliases[value] ||
        value.replaceAll(" ", "_")
    );
}


// ==================================================
// GET DEMO DOCUMENT REQUIREMENTS
// ==================================================

function getDocumentRequirements(schemeCode) {

    const code =
        String(schemeCode || "")
            .toUpperCase()
            .trim();

    return (
        DEMO_DOCUMENT_REQUIREMENTS[code] ||
        DEMO_DOCUMENT_REQUIREMENTS.GENERAL
    );
}


function App() {

    // ==================================================
    // STATE
    // ==================================================

    const [page, setPage] = useState("login");

    const [email, setEmail] = useState(
        "applicant@tribalscholar.demo"
    );

    const [password, setPassword] = useState(
        "Applicant@123"
    );

    const [user, setUser] = useState(null);

    const [application, setApplication] =
        useState(null);

    const [documents, setDocuments] =
        useState([]);

    const [eligibility, setEligibility] =
        useState(null);

    const [stats, setStats] =
        useState(null);

    const [adminApplications, setAdminApplications] =
        useState([]);

    // Scholarship management state
    const [scholarships, setScholarships] = useState([]);
    const [showScholarshipForm, setShowScholarshipForm] = useState(false);
    const [scholarshipLoading, setScholarshipLoading] = useState(false);
    const [scholarshipMessage, setScholarshipMessage] = useState("");
    const [scholarshipError, setScholarshipError] = useState("");
    const [scholarshipForm, setScholarshipForm] = useState({
        name: "",
        code: "",
        amount: "",
        deadline: "",
        eligibility: "",
        description: "",
        status: "ACTIVE",
        form_template: "GENERAL"
    });

    // Admin search and filter state
    const [searchTerm, setSearchTerm] =
        useState("");

    const [statusFilter, setStatusFilter] =
        useState("ALL");

    const [eligibilityFilter, setEligibilityFilter] =
        useState("ALL");

    const [selectedApplication, setSelectedApplication] =
        useState(null);

    const [reviewDocuments, setReviewDocuments] =
        useState([]);

    const [reviewEligibility, setReviewEligibility] =
        useState(null);

    const [reviewLoading, setReviewLoading] =
        useState(false);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [showApplicationForm, setShowApplicationForm] =
        useState(false);

    const [applicationId, setApplicationId] =
        useState(null);

    const [userApplications, setUserApplications] =
        useState([]);

    const [selectedScholarship, setSelectedScholarship] =
        useState(null);

    const [schemeForm, setSchemeForm] =
        useState(null);

    const [schemeFormLoading, setSchemeFormLoading] =
        useState(false);

    const [uploading, setUploading] =
        useState(false);

    const [uploadMessage, setUploadMessage] =
        useState("");
    
    // ==================================================
    // REGISTRATION STATE
    // ==================================================

    const [registerForm, setRegisterForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [registerLoading, setRegisterLoading] =
        useState(false);

    const [registerError, setRegisterError] =
        useState("");

    const [registerSuccess, setRegisterSuccess] =
        useState("");

    const emptyApplicationForm = {};

    const [form, setForm] = useState(emptyApplicationForm);


    // ==================================================
    // LOGIN
    // ==================================================

    async function handleLogin(e) {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            const data = await login(
                email,
                password
            );

            // Clear any previous applicant data before loading the new account.
            setApplication(null);
            setDocuments([]);
            setEligibility(null);
            setApplicationId(null);
            setUserApplications([]);
            setSelectedScholarship(null);
            setSchemeForm(null);
            setSelectedApplication(null);
            setReviewDocuments([]);
            setReviewEligibility(null);
            setShowApplicationForm(false);
            setForm({});

            setUser(data.user);
            setUserApplications(data.user.applications || []);

            if (data.user.role === "ADMIN") {

                await loadAdmin();

                setPage("admin");

            } else if (data.user.role !== "ADMIN") {

                // Applicants can see all currently active scholarships.
                await loadAvailableScholarships();

                if (data.user.application_id) {
                    await loadApplicant(data.user.application_id);
                } else {
                    // Applicants can still access their reusable document vault
                    // even before they start a scholarship application.
                    setApplication(null);
                    setApplicationId(null);
                    const vault = await getUserDocuments(data.user.id);
                    setDocuments(vault.documents || []);
                }

                setPage("dashboard");
            }

        } catch (err) {

            setError(
                err.message ||
                "Login failed"
            );

        } finally {

            setLoading(false);
        }
    }


    // ==================================================
    // LOAD APPLICANT DATA
    // ==================================================

    async function loadApplicant(id = applicationId) {

        if (!id) {
            if (user?.id) {
                const vault = await getUserDocuments(user.id);
                setDocuments(vault.documents || []);
            }
            return;
        }

        // Set the selected application immediately so the UI switches
        // even if an optional eligibility/document request fails.
        setApplicationId(Number(id));
        setError("");

        try {
            const app = await getApplication(id);

            // Load documents independently. A document API problem should
            // not prevent the applicant from opening the application.
            let docs = { documents: [] };
            try {
                docs = await getDocuments(id);
            } catch (documentError) {
                console.error("Document loading error:", documentError);
            }

            const schemeCode = String(app.scheme || "")
                .toUpperCase()
                .trim();

            // Eligibility is independent from opening the application.
            // If evaluation is unavailable, show the stored status instead
            // of blocking navigation to the application.
            let eligibilityResult = {
                status: String(app.eligibility_status || "PENDING").toUpperCase(),
                eligible: String(app.eligibility_status || "").toUpperCase() === "ELIGIBLE",
                checks: createPendingEligibility(schemeCode).checks
            };

            try {
                const eligibilityData = await getEligibility(id);
                if (eligibilityData?.eligibility) {
                    eligibilityResult = eligibilityData.eligibility;
                }
            } catch (eligibilityError) {
                console.warn("Eligibility evaluation unavailable:", eligibilityError);
            }

            setApplication(app);
            setApplicationId(Number(app.id));
            setDocuments(docs.documents || []);
            setEligibility(eligibilityResult);

            setForm({
                name: app.name || "",
                dob: app.dob || "",
                category: app.category || "",
                university: app.university || "",
                programme: app.programme || "",
                percentage: app.percentage ?? ""
            });

            setShowApplicationForm(false);

            return app;

        } catch (err) {
            console.error("Applicant loading error:", err);
            setError(err.message || "Unable to load application");
            throw err;
        }
    }


    // ==================================================
    // LOAD SCHOLARSHIPS FOR APPLICANTS
    // ==================================================

    async function loadAvailableScholarships() {

        try {

            const response = await fetch(
                "http://localhost:8000/api/scholarships"
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Unable to load scholarships"
                );
            }

            setScholarships(data.scholarships || []);

        } catch (err) {

            console.error(
                "Scholarship loading error:",
                err
            );

            setScholarshipError(
                err.message ||
                "Unable to load available scholarships"
            );
        }
    }


    // ==================================================
    // LOAD ADMIN DATA
    // ==================================================

    async function loadAdmin() {

        try {

            const statistics =
                await getAdminStats();

            const applications =
                await getAdminApplications();

            const scholarshipResponse = await fetch(
                "http://localhost:8000/api/admin/scholarships"
            );
            const scholarshipData = await scholarshipResponse.json();

            if (!scholarshipResponse.ok) {
                throw new Error(
                    scholarshipData.detail ||
                    "Unable to load scholarships"
                );
            }

            setScholarships(scholarshipData.scholarships || []);

            setStats(statistics);

            setAdminApplications(
                applications.applications || []
            );

        } catch (err) {

            console.error(
                "Admin loading error:",
                err
            );

            setError(
                err.message ||
                "Unable to load admin dashboard"
            );
        }
    }


    // ==================================================
    // ADMIN SEARCH + FILTER
    // ==================================================
    
    const filteredApplications = adminApplications.filter((app) => {
        const search = searchTerm.toLowerCase().trim();
    
        const matchesSearch =
            !search ||
            String(app.application_number || "")
                .toLowerCase()
                .includes(search) ||
            String(app.name || "")
                .toLowerCase()
                .includes(search) ||
            String(app.programme || "")
                .toLowerCase()
                .includes(search) ||
            String(app.scheme || "")
                .toLowerCase()
                .includes(search) ||
            String(app.scheme_name || "")
                .toLowerCase()
                .includes(search);
    
        const matchesStatus =
            statusFilter === "ALL" ||
            String(app.status || "").toUpperCase() === statusFilter;
    
        const matchesEligibility =
            eligibilityFilter === "ALL" ||
            String(app.eligibility_status || "").toUpperCase() ===
                eligibilityFilter;
    
        return (
            matchesSearch &&
            matchesStatus &&
            matchesEligibility
        );
    });
    

    // ==================================================
    // REGISTER APPLICANT
    // ==================================================

    async function handleRegister(e) {

        e.preventDefault();

        setRegisterError("");
        setRegisterSuccess("");

        if (registerForm.password !== registerForm.confirmPassword) {
            setRegisterError("Passwords do not match");
            return;
        }

        if (registerForm.password.length < 8) {
            setRegisterError("Password must be at least 8 characters");
            return;
        }

        setRegisterLoading(true);

        try {

            const response = await fetch(
                "http://localhost:8000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: registerForm.name.trim(),
                        email: registerForm.email.trim(),
                        password: registerForm.password,
                        role: "APPLICANT"
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Registration failed"
                );
            }

            setRegisterSuccess(
                "Account created successfully. You can now sign in."
            );

            setRegisterForm({
                name: "",
                email: "",
                password: "",
                confirmPassword: ""
            });

        } catch (err) {

            setRegisterError(
                err.message ||
                "Unable to create account"
            );

        } finally {
            setRegisterLoading(false);
        }
    }


    // ==================================================
    // OPEN AN EXISTING APPLICATION
    // ==================================================

    async function openUserApplication(applicationIdToOpen) {
        const targetId = Number(applicationIdToOpen);
        if (!targetId) {
            setError("Invalid application ID");
            return;
        }

        setError("");
        setLoading(true);
        setApplicationId(targetId);

        try {
            await loadApplicant(targetId);
            setPage("dashboard");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            setError(err.message || "Unable to open application");
        } finally {
            setLoading(false);
        }
    }


    // ==================================================
    // DOCUMENT VAULT
    // ==================================================

    async function openDocumentVault() {
        if (!user?.id) return;
        setError("");
        try {
            const vault = await getUserDocuments(user.id);
            setDocuments(vault.documents || []);
            setPage("documents");
        } catch (err) {
            setError(err.message || "Unable to load document vault");
        }
    }


    // ==================================================
    // OPEN A SCHEME-SPECIFIC APPLICATION FORM
    // ==================================================

    async function openSchemeForm(scholarship) {

        setError("");
        setSchemeFormLoading(true);

        try {
            const alreadyApplied = userApplications.find(
                (item) => item.scheme === scholarship.code
            );

            if (alreadyApplied) {
                await loadApplicant(alreadyApplied.id);
                return;
            }

            const response = await fetch(
                `http://localhost:8000/api/schemes/${encodeURIComponent(scholarship.code)}/form`
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Unable to load application form");
            }

            const initialForm = {};
            (data.fields || []).forEach((field) => {
                initialForm[field.key] = "";
            });

            // Pre-fill the logged-in applicant's name.
            initialForm.name = user?.name || "";

            setSelectedScholarship(scholarship);
            setSchemeForm(data);
            setForm(initialForm);
            setShowApplicationForm(true);

        } catch (err) {
            setError(err.message || "Unable to open application form");
        } finally {
            setSchemeFormLoading(false);
        }
    }


    // ==================================================
    // CREATE APPLICATION
    // ==================================================

    async function handleApplicationSubmit(e) {

        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (!schemeForm || !selectedScholarship) {
                throw new Error("Please select a scholarship scheme first");
            }

            const response = await fetch(
                "http://localhost:8000/api/applications",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: user.email,
                        scheme_code: selectedScholarship.code,
                        fields: form
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Application submission failed");
            }

            const newApplicationId = data.application.id;
            setApplicationId(newApplicationId);

            setUserApplications((previous) => [
                {
                    id: newApplicationId,
                    application_number: data.application.application_number,
                    scheme: data.application.scheme,
                    scheme_name: data.application.scheme_name,
                    status: data.application.status,
                    eligibility_status: data.application.eligibility
                },
                ...previous
            ]);

            await loadApplicant(newApplicationId);
            setShowApplicationForm(false);
            setSelectedScholarship(null);
            setSchemeForm(null);
            setPage("dashboard");

        } catch (err) {
            setError(err.message || "Application submission failed");
        } finally {
            setLoading(false);
        }
    }

    // ==================================================
    // DOCUMENT UPLOAD
    // ==================================================

    async function handleDocumentUpload(
        documentType,
        file
    ) {
        if (!applicationId || !file) {
            return;
        }

        setUploading(true);
        setUploadMessage(
            `Analyzing ${documentType} with AI OCR...`
        );

        try {
            const result = await uploadDocument(
                applicationId,
                documentType,
                file
            );

            const status =
                result?.document?.verification_status;

            if (status === "VERIFIED") {
                setUploadMessage(
                    `✓ ${documentType} verified successfully`
                );
            } else if (status === "DEFICIENCY") {
                setUploadMessage(
                    `⚠ ${documentType} requires correction`
                );
            } else {
                setUploadMessage(
                    `${documentType} uploaded successfully`
                );
            }

            await loadApplicant(applicationId);
        } catch (err) {
            console.error(
                "Document upload failed:",
                err
            );

            setUploadMessage(
                `Error: ${
                    err.message ||
                    "Document upload failed"
                }`
            );
        } finally {
            setUploading(false);
        }
    }


    // ==================================================
    // LOAD ADMIN REVIEW DATA
    // ==================================================

    async function openApplicationReview(app) {

        setSelectedApplication(app);
        setReviewDocuments([]);
        setReviewEligibility(null);
        setReviewLoading(true);
        setError("");
        
        try {
        
            const fullApp =
                await getApplication(app.id);
        
            const docs =
                await getDocuments(app.id);
        
            // ==================================================
            // SCHEME-AWARE REVIEW ELIGIBILITY
            // ==================================================

            const reviewSchemeCode = String(
                fullApp.scheme ||
                app.scheme ||
                ""
            )
                .toUpperCase()
                .trim();

            // Every scheme is evaluated by the same scheme-aware backend engine.
            const eligibilityData = await getEligibility(app.id);
            setReviewDocuments(
                docs.documents || []
            );
        
            setReviewEligibility(
                eligibilityData.eligibility ||
                null
            );
        
        
            setSelectedApplication({
            
                ...app,
            
                ...fullApp,
            
                eligibility_status:
                    eligibilityData
                        .eligibility
                        ?.status ||
                    fullApp.eligibility_status ||
                    app.eligibility_status
            
            });
        
        
            setPage("review");
        
        } catch (err) {
        
            setError(
                err.message ||
                "Unable to load application review data"
            );
        
        } finally {
        
            setReviewLoading(false);
        }
    }


    // ==================================================
    // ADMIN APPROVAL
    // ==================================================

    async function handleApprove() {

        if (!selectedApplication) {
            return;
        }


        try {

            await approveApplication(
                selectedApplication.id
            );


            await loadAdmin();


            setSelectedApplication(
                null
            );


            setPage("admin");

        } catch (err) {

            alert(
                err.message ||
                "Approval failed"
            );
        }
    }


    // ==================================================
    // ADMIN REQUEST CORRECTION
    // ==================================================

    async function handleRequestCorrection() {

        if (!selectedApplication) {
            return;
        }


        try {

            await requestCorrection(
                selectedApplication.id
            );


            await loadAdmin();


            setSelectedApplication(
                null
            );


            setPage("admin");

        } catch (err) {

            alert(
                err.message ||
                "Unable to request correction"
            );
        }
    }


    // ==================================================
    // ADMIN SCHOLARSHIP MANAGEMENT
    // ==================================================

    async function handleScholarshipSubmit(e) {
        e.preventDefault();
        setScholarshipLoading(true);
        setScholarshipMessage("");
        setScholarshipError("");

        try {
            const response = await fetch(
                "http://localhost:8000/api/admin/scholarships",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: scholarshipForm.name.trim(),
                        code: scholarshipForm.code.trim().toUpperCase(),
                        amount: Number(scholarshipForm.amount || 0),
                        deadline: scholarshipForm.deadline,
                        eligibility: scholarshipForm.eligibility.trim(),
                        description: scholarshipForm.description.trim(),
                        status: scholarshipForm.status,
                        form_template: scholarshipForm.form_template
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    "Unable to create scholarship"
                );
            }

            setScholarships((current) => [
                data.scholarship,
                ...current
            ]);

            setScholarshipForm({
                name: "",
                code: "",
                amount: "",
                deadline: "",
                eligibility: "",
                description: "",
                status: "ACTIVE",
                form_template: "GENERAL"
            });

            setScholarshipMessage(
                "Scholarship added successfully."
            );
            setShowScholarshipForm(false);

        } catch (err) {
            setScholarshipError(
                err.message ||
                "Unable to add scholarship"
            );
        } finally {
            setScholarshipLoading(false);
        }
    }


    // ==================================================
    // LOGOUT
    // ==================================================

    function logout() {

        setUser(null);

        setApplication(null);

        setDocuments([]);

        setEligibility(null);

        setSelectedApplication(null);
        setReviewDocuments([]);
        setReviewEligibility(null);
        setApplicationId(null);
        setShowApplicationForm(false);
        setForm(emptyApplicationForm);
        setError("");

        setUploadMessage("");

        setPage("login");
    }


    // ==================================================
    // REGISTER PAGE
    // ==================================================

    if (page === "register") {

        return (

            <div className="login-page">

                <div className="login-card">

                    <div className="brand-icon">
                        TS
                    </div>

                    <h1>
                        Create Account
                    </h1>

                    <p className="subtitle">
                        Register as a Tribal Scholar applicant
                    </p>

                    <form onSubmit={handleRegister}>

                        <label>
                            Full Name
                        </label>

                        <input
                            type="text"
                            placeholder="Enter your full name"
                            value={registerForm.name}
                            onChange={(e) =>
                                setRegisterForm({
                                    ...registerForm,
                                    name: e.target.value
                                })
                            }
                            required
                        />

                        <label>
                            Email Address
                        </label>

                        <input
                            type="email"
                            placeholder="you@example.com"
                            value={registerForm.email}
                            onChange={(e) =>
                                setRegisterForm({
                                    ...registerForm,
                                    email: e.target.value
                                })
                            }
                            required
                        />

                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="Minimum 8 characters"
                            value={registerForm.password}
                            onChange={(e) =>
                                setRegisterForm({
                                    ...registerForm,
                                    password: e.target.value
                                })
                            }
                            minLength={8}
                            required
                        />

                        <label>
                            Confirm Password
                        </label>

                        <input
                            type="password"
                            placeholder="Re-enter your password"
                            value={registerForm.confirmPassword}
                            onChange={(e) =>
                                setRegisterForm({
                                    ...registerForm,
                                    confirmPassword: e.target.value
                                })
                            }
                            minLength={8}
                            required
                        />

                        {registerError && (
                            <div className="error">
                                {registerError}
                            </div>
                        )}

                        {registerSuccess && (
                            <div className="success-message">
                                {registerSuccess}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={registerLoading}
                        >
                            {registerLoading
                                ? "Creating account..."
                                : "Create Account"
                            }
                        </button>

                    </form>

                    <div className="register-footer">
                        <span>
                            Already have an account?
                        </span>

                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => {
                                setRegisterError("");
                                setRegisterSuccess("");
                                setPage("login");
                            }}
                        >
                            Sign In
                        </button>
                    </div>

                </div>

            </div>
        );
    }


    // ==================================================
    // LOGIN PAGE
    // ==================================================

    if (page === "login") {

        return (

            <div className="login-page">

                <div className="login-card">

                    <div className="brand-icon">
                        TS
                    </div>


                    <h1>
                        Tribal Scholar
                    </h1>


                    <p className="subtitle">
                        AI-Enabled Scholarship &
                        Fellowship Management
                    </p>


                    <form
                        onSubmit={handleLogin}
                    >

                        <label>
                            Email
                        </label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            required
                        />


                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                            required
                        />


                        {error && (

                            <div className="error">
                                {error}
                            </div>

                        )}


                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={loading}
                        >

                            {loading
                                ? "Signing in..."
                                : "Sign In"
                            }

                        </button>

                    </form>


                    <div className="register-footer">
                        <span>
                            New applicant?
                        </span>

                        <button
                            type="button"
                            className="link-btn"
                            onClick={() => {
                                setRegisterError("");
                                setRegisterSuccess("");
                                setPage("register");
                            }}
                        >
                            Create Account
                        </button>
                    </div>


                    <div className="demo-info">

                        <strong>
                            Demo Accounts
                        </strong>

                        <span>
                            Applicant:
                            applicant@tribalscholar.demo
                        </span>

                        <span>
                            Admin:
                            admin@tribalscholar.demo
                        </span>

                    </div>

                </div>

            </div>
        );
    }


    // ==================================================
    // ADMIN DASHBOARD
    // ==================================================

    if (page === "admin") {

        return (

            <div className="app-shell">

                <header className="topbar">

                    <div className="logo">
                        Tribal Scholar
                    </div>

                    <div className="user-area">

                        <span>
                            {user?.name || "Administrator"}
                        </span>

                        <button
                            onClick={logout}
                            className="logout-btn"
                        >
                            Logout
                        </button>

                    </div>

                </header>


                <main className="main-content">

                    <div className="page-heading">

                        <div>

                            <h1>
                                Ministry Dashboard
                            </h1>

                            <p>
                                Scholarship &
                                Fellowship Administration
                            </p>

                        </div>

                        <span className="admin-badge">
                            ADMIN
                        </span>

                    </div>


                    {/* STATISTICS */}

                    <div className="stat-grid">

                        <StatCard
                            title="Total Applications"
                            value={stats?.total || 0}
                            icon="📋"
                        />

                        <StatCard
                            title="Pending Review"
                            value={stats?.pending || 0}
                            icon="⏳"
                        />

                        <StatCard
                            title="Eligible"
                            value={stats?.eligible || 0}
                            icon="✓"
                        />

                        <StatCard
                            title="Shortlisted"
                            value={stats?.shortlisted || 0}
                            icon="★"
                        />

                    </div>


                    {/* ANALYTICS SUMMARY */}

                    <div className="analytics-grid">

                        <div className="analytics-card">

                            <div className="analytics-card-header">

                                <h3>
                                    Application Status
                                </h3>

                                <span>
                                    {stats?.total || 0} Total
                                </span>

                            </div>


                            <div className="progress-row">

                                <div className="progress-label">
                                    <span>Pending</span>
                                    <strong>
                                        {stats?.pending || 0}
                                    </strong>
                                </div>

                                <div className="progress-track">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${
                                                stats?.total
                                                    ? (
                                                        stats.pending /
                                                        stats.total
                                                    ) * 100
                                                    : 0
                                            }%`
                                        }}
                                    />

                                </div>

                            </div>


                            <div className="progress-row">

                                <div className="progress-label">
                                    <span>Eligible</span>
                                    <strong>
                                        {stats?.eligible || 0}
                                    </strong>
                                </div>

                                <div className="progress-track">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${
                                                stats?.total
                                                    ? (
                                                        stats.eligible /
                                                        stats.total
                                                    ) * 100
                                                    : 0
                                            }%`
                                        }}
                                    />

                                </div>

                            </div>


                            <div className="progress-row">

                                <div className="progress-label">
                                    <span>Shortlisted</span>
                                    <strong>
                                        {stats?.shortlisted || 0}
                                    </strong>
                                </div>

                                <div className="progress-track">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${
                                                stats?.total
                                                    ? (
                                                        stats.shortlisted /
                                                        stats.total
                                                    ) * 100
                                                    : 0
                                            }%`
                                        }}
                                    />

                                </div>

                            </div>


                            <div className="progress-row">

                                <div className="progress-label">
                                    <span>Deficiency</span>
                                    <strong>
                                        {stats?.deficient || 0}
                                    </strong>
                                </div>

                                <div className="progress-track">

                                    <div
                                        className="progress-fill"
                                        style={{
                                            width: `${
                                                stats?.total
                                                    ? (
                                                        stats.deficient /
                                                        stats.total
                                                    ) * 100
                                                    : 0
                                            }%`
                                        }}
                                    />

                                </div>

                            </div>

                        </div>


                        <div className="analytics-card">

                            <div className="analytics-card-header">

                                <h3>
                                    Eligibility Overview
                                </h3>

                            </div>

                            <div className="eligibility-circle">

                                <div>

                                    <strong>
                                        {
                                            stats?.total
                                                ? Math.round(
                                                    (
                                                        stats.eligible /
                                                        stats.total
                                                    ) * 100
                                                )
                                                : 0
                                        }%
                                    </strong>

                                    <span>
                                        Eligible
                                    </span>

                                </div>

                            </div>


                            <div className="analytics-mini-grid">

                                <div>
                                    <strong>
                                        {stats?.eligible || 0}
                                    </strong>
                                    <span>
                                        Eligible
                                    </span>
                                </div>

                                <div>
                                    <strong>
                                        {stats?.deficient || 0}
                                    </strong>
                                    <span>
                                        Deficient
                                    </span>
                                </div>

                            </div>

                        </div>

                    </div>


                    {/* SCHOLARSHIP MANAGEMENT */}

                    <div className="panel" style={{ marginBottom: "24px" }}>
                        <div className="panel-header">
                            <div>
                                <h2>Scholarship Management</h2>
                                <p>
                                    Create and manage scholarship and fellowship opportunities available in the portal.
                                </p>
                            </div>

                            <button
                                className="approve-btn"
                                onClick={() => {
                                    setScholarshipError("");
                                    setScholarshipMessage("");
                                    setShowScholarshipForm((value) => !value);
                                }}
                            >
                                {showScholarshipForm ? "✕ Close" : "+ Add Scholarship"}
                            </button>
                        </div>

                        {scholarshipMessage && (
                            <div className="success-message">
                                {scholarshipMessage}
                            </div>
                        )}

                        {scholarshipError && (
                            <div className="error-message">
                                {scholarshipError}
                            </div>
                        )}

                        {showScholarshipForm && (
                            <form
                                onSubmit={handleScholarshipSubmit}
                                style={{ marginBottom: "24px" }}
                            >
                                <div className="form-grid">
                                    <div>
                                        <label>Scholarship Name</label>
                                        <input
                                            value={scholarshipForm.name}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, name: e.target.value })}
                                            placeholder="e.g. National Fellowship for ST Students"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label>Scholarship Code</label>
                                        <input
                                            value={scholarshipForm.code}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, code: e.target.value })}
                                            placeholder="e.g. NFST-2026"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label>Award Amount (₹)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={scholarshipForm.amount}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, amount: e.target.value })}
                                            placeholder="e.g. 50000"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label>Application Deadline</label>
                                        <input
                                            type="date"
                                            value={scholarshipForm.deadline}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, deadline: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label>Status</label>
                                        <select
                                            value={scholarshipForm.status}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, status: e.target.value })}
                                        >
                                            <option value="ACTIVE">Active</option>
                                            <option value="DRAFT">Draft</option>
                                            <option value="CLOSED">Closed</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label>Application Form Type</label>
                                        <select
                                            value={scholarshipForm.form_template}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, form_template: e.target.value })}
                                        >
                                            <option value="GENERAL">General Scholarship</option>
                                            <option value="NFST">NFST / Fellowship</option>
                                            <option value="POST_MATRIC">Post-Matric Scholarship</option>
                                            <option value="TOP_CLASS">Top Class Education</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label>Eligibility Criteria</label>
                                        <input
                                            value={scholarshipForm.eligibility}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, eligibility: e.target.value })}
                                            placeholder="e.g. ST category, PhD, 55% minimum"
                                            required
                                        />
                                    </div>

                                    <div style={{ gridColumn: "1 / -1" }}>
                                        <label>Description</label>
                                        <textarea
                                            value={scholarshipForm.description}
                                            onChange={(e) => setScholarshipForm({ ...scholarshipForm, description: e.target.value })}
                                            placeholder="Describe the scholarship, purpose and benefits..."
                                            rows="4"
                                            required
                                            style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                                        />
                                    </div>
                                </div>

                                <div className="decision-buttons" style={{ marginTop: "16px" }}>
                                    <button
                                        type="submit"
                                        className="approve-btn"
                                        disabled={scholarshipLoading}
                                    >
                                        {scholarshipLoading ? "Saving..." : "✓ Publish Scholarship"}
                                    </button>
                                    <button
                                        type="button"
                                        className="secondary-btn"
                                        onClick={() => setShowScholarshipForm(false)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}

                        {scholarships.length === 0 ? (
                            <div className="empty-state">
                                No scholarships have been added yet. Click <strong>+ Add Scholarship</strong> to create one.
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Scholarship</th>
                                            <th>Code</th>
                                            <th>Amount</th>
                                            <th>Deadline</th>
                                            <th>Eligibility</th>
                                            <th>Form Type</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scholarships.map((scholarship) => (
                                            <tr key={scholarship.id}>
                                                <td>
                                                    <strong>{scholarship.name}</strong>
                                                    <div className="muted">{scholarship.description}</div>
                                                </td>
                                                <td>{scholarship.code}</td>
                                                <td>₹{Number(scholarship.amount || 0).toLocaleString("en-IN")}</td>
                                                <td>{scholarship.deadline || "-"}</td>
                                                <td>{scholarship.eligibility || "-"}</td>
                                                <td>{scholarship.form_template || "GENERAL"}</td>
                                                <td><StatusBadge status={scholarship.status || "ACTIVE"} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>


                    {/* APPLICATION TABLE */}

                    <div className="panel">

                        <div className="panel-header">

                            <div>

                                <h2>
                                    Applications
                                </h2>

                                <p>
                                    Search, filter and review
                                    submitted applications
                                </p>

                            </div>

                        </div>


                        {/* SEARCH + FILTER */}

                        <div className="application-filters">

                            <div className="search-box">

                                <span>🔍</span>

                                <input
                                    type="text"
                                    placeholder="Search by application number, name, scheme or programme..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(
                                            e.target.value
                                        )
                                    }
                                />

                            </div>


                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="ALL">
                                    All Status
                                </option>

                                <option value="PENDING">
                                    Pending
                                </option>

                                <option value="DEFICIENCY">
                                    Deficiency
                                </option>

                                <option value="SHORTLISTED">
                                    Shortlisted
                                </option>

                            </select>


                            <select
                                value={eligibilityFilter}
                                onChange={(e) =>
                                    setEligibilityFilter(
                                        e.target.value
                                    )
                                }
                            >

                                <option value="ALL">
                                    All Eligibility
                                </option>

                                <option value="ELIGIBLE">
                                    Eligible
                                </option>

                                <option value="NOT_ELIGIBLE">
                                    Not Eligible
                                </option>

                            </select>


                            <button
                                className="clear-filter-btn"
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter("ALL");
                                    setEligibilityFilter("ALL");
                                }}
                            >
                                Clear
                            </button>

                        </div>


                        <div className="filter-result-count">

                            Showing{" "}
                            <strong>
                                {filteredApplications.length}
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {adminApplications.length}
                            </strong>{" "}
                            applications

                        </div>


                        <div className="table-container">

                            <table>

                                <thead>

                                    <tr>

                                        <th>Application</th>
                                        <th>Applicant</th>
                                        <th>Scheme</th>
                                        <th>Programme</th>
                                        <th>Score</th>
                                        <th>Eligibility</th>
                                        <th>Status</th>
                                        <th>Action</th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {filteredApplications.length === 0 ? (

                                        <tr>

                                            <td
                                                colSpan="8"
                                                style={{
                                                    textAlign: "center",
                                                    padding: "40px"
                                                }}
                                            >

                                                <div className="empty-state">

                                                    <div className="empty-icon">
                                                        🔎
                                                    </div>

                                                    <strong>
                                                        No applications found
                                                    </strong>

                                                    <p>
                                                        There are no submitted applications
                                                        matching the current search or filters.
                                                    </p>

                                                </div>

                                            </td>

                                        </tr>

                                    ) : (

                                        filteredApplications.map(
                                            (app) => (

                                                <tr key={app.id}>

                                                    <td>

                                                        <strong>
                                                            {app.application_number}
                                                        </strong>

                                                        <small className="table-subtext">
                                                            {app.scheme_name || app.scheme || "—"}
                                                        </small>

                                                    </td>


                                                    <td>
                                                        <strong>
                                                            {app.name || "—"}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <div>
                                                            <strong>
                                                                {app.scheme_name || app.scheme || "—"}
                                                            </strong>
                                                        </div>

                                                        {app.scheme && (
                                                            <small className="table-subtext">
                                                                {app.scheme}
                                                            </small>
                                                        )}
                                                    </td>
                                                    
                                                    <td>
                                                        {app.programme || "—"}
                                                    </td>


                                                    <td>
                                                        {
                                                            app.percentage !==
                                                            undefined
                                                                ? `${app.percentage}%`
                                                                : "-"
                                                        }
                                                    </td>


                                                    <td>

                                                        <StatusBadge
                                                            status={
                                                                app.eligibility_status ||
                                                                "PENDING"
                                                            }
                                                        />

                                                    </td>


                                                    <td>

                                                        <StatusBadge
                                                            status={
                                                                app.status ||
                                                                "PENDING"
                                                            }
                                                        />

                                                    </td>


                                                    <td>

                                                        <button
                                                            className="small-btn"
                                                            onClick={() => {
                                                                openApplicationReview(
                                                                    app
                                                                );
                                                            }}
                                                        >
                                                            Review
                                                        </button>

                                                    </td>

                                                </tr>

                                            )
                                        )

                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </main>

            </div>
        );
    }


    // ==================================================
    // ADMIN REVIEW PAGE
    // ==================================================

    // ==================================================
    // APPLICANT DOCUMENT VAULT PAGE
    // ==================================================

    if (page === "documents") {
        return (
            <div className="app-shell">
                <header className="topbar">
                    <div className="logo">Tribal Scholar</div>
                    <div className="user-area">
                        <span>{user?.name}</span>
                        <button
                            className="back-btn"
                            onClick={() => setPage("dashboard")}
                        >
                            ← Dashboard
                        </button>
                        <button onClick={logout} className="logout-btn">
                            Logout
                        </button>
                    </div>
                </header>

                <main className="main-content">
                    <div className="page-heading">
                        <div>
                            <h1>My Document Vault</h1>
                            <p>
                                Upload personal documents once. Verified documents can be reused
                                across eligible scholarship schemes.
                            </p>
                        </div>
                        <span className="applicant-badge">{documents.length} DOCUMENTS</span>
                    </div>

                    <div className="panel">
                        <div className="panel-header">
                            <div>
                                <h2>Verified Documents</h2>
                                <p>Your documents are stored once and reused across applications.</p>
                            </div>
                        </div>

                        {documents.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📄</div>
                                <strong>No documents in your vault</strong>
                                <p>Start an application and upload the required documents. They will be saved here for future schemes.</p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                    gap: "16px"
                                }}
                            >
                                {documents.map((doc) => (
                                    <div
                                        key={doc.id}
                                        style={{
                                            border: "1px solid #e4e7ec",
                                            borderRadius: "14px",
                                            padding: "18px",
                                            background: "#fff"
                                        }}
                                    >
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                                            <div>
                                                <strong>{String(doc.document_type || "DOCUMENT").replaceAll("_", " ")}</strong>
                                                <div className="muted" style={{ marginTop: "6px" }}>{doc.filename}</div>
                                            </div>
                                            <StatusBadge status={doc.verification_status || "PENDING"} />
                                        </div>
                                        <div style={{ marginTop: "14px" }}>
                                            <div className="muted">AI verification confidence</div>
                                            <strong>{doc.confidence ?? 0}%</strong>
                                        </div>
                                        <div style={{ marginTop: "10px", color: "#067647", fontSize: "14px" }}>
                                            ✓ Reusable across eligible schemes
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="panel">
                        <h2>How reuse works</h2>
                        <p className="muted">
                            When you open another scholarship, Tribal Scholar checks this vault first.
                            Only missing or deficient documents are requested again.
                        </p>
                    </div>
                </main>
            </div>
        );
    }


    if (page === "review") {

    const selected = selectedApplication;

    // --------------------------------------------------
    // SCHEME-AWARE REVIEW CONFIGURATION
    // --------------------------------------------------

    const reviewSchemeCode =
        String(
            selected?.scheme ||
            ""
        )
            .toUpperCase()
            .trim();

    const reviewSchemeName =
        selected?.scheme_name ||
        reviewSchemeCode ||
        "Scholarship / Fellowship";

    const reviewRequiredDocuments =
        getDocumentRequirements(
            reviewSchemeCode
        );

    const requiredDocumentTypes =
        reviewRequiredDocuments.map(
            (document) => document.type
        );


    // --------------------------------------------------
    // DOCUMENT TYPE NORMALIZATION
    // --------------------------------------------------

    const normalizeReviewDocumentType = (type) => {

        const value =
            String(type || "")
                .toUpperCase()
                .trim();

        const aliases = {

            "MARK SHEET":
                "MARKSHEET",

            "INCOME CERTIFICATE":
                "INCOME_CERTIFICATE",

            "ADMISSION LETTER":
                "ADMISSION_DOCUMENT",

            "ADMISSION DOCUMENT":
                "ADMISSION_DOCUMENT",

            "ST CERTIFICATE":
                "ST_CERTIFICATE"
        };

        return (
            aliases[value] ||
            value.replaceAll(" ", "_")
        );
    };


    // --------------------------------------------------
    // VERIFIED REQUIRED DOCUMENTS
    // --------------------------------------------------

    const verifiedRequiredDocuments =
        requiredDocumentTypes.filter(
            (type) =>
                reviewDocuments.some(
                    (doc) =>
                        normalizeReviewDocumentType(
                            doc.document_type
                        ) === type &&
                        doc.verification_status ===
                            "VERIFIED"
                )
        ).length;


    const allRequiredDocumentsVerified =
        requiredDocumentTypes.length > 0 &&
        verifiedRequiredDocuments ===
            requiredDocumentTypes.length;


    // --------------------------------------------------
    // AI CONFIDENCE
    // --------------------------------------------------

    const averageConfidence =
        reviewDocuments.length
            ? Math.round(
                reviewDocuments.reduce(
                    (sum, doc) =>
                        sum +
                        Number(
                            doc.confidence || 0
                        ),
                    0
                ) /
                reviewDocuments.length
            )
            : 0;


    // --------------------------------------------------
    // ELIGIBILITY
    // --------------------------------------------------

    const eligible =
        reviewEligibility?.eligible === true ||
        selected?.eligibility_status ===
            "ELIGIBLE";


    // --------------------------------------------------
    // SCREENING CHECKS
    // --------------------------------------------------
    // Do not assume NFST-specific rules here.
    // Display whatever the backend eligibility engine
    // actually returns.

    const screeningChecks =
        reviewEligibility?.checks || [];


    const screeningRows =
        screeningChecks.map(
            (check) => ({
                label:
                    check.rule ||
                    "Eligibility Check",

                check
            })
        );


    // --------------------------------------------------
    // APPLICATION STATUS
    // --------------------------------------------------

    const reviewApplicationStatus =
        selected?.status ||
        "PENDING";


    const reviewEligibilityStatus =
        reviewEligibility?.status ||
        selected?.eligibility_status ||
        "PENDING";

        return (
            <div className="app-shell">
                <header className="topbar">
                    <div className="logo">Tribal Scholar</div>
                    <button
                        onClick={() => setPage("admin")}
                        className="back-btn"
                    >
                        ← Dashboard
                    </button>
                </header>

                <main className="main-content">
                    <div className="page-heading">
                        <div>
                            <h1>Application Review</h1>
                            <p>
                                {reviewSchemeName}
                                {" • "}
                                {selected?.application_number || "Application"}
                            </p>
                        </div>
                        <StatusBadge
                            status={
                                selected?.status ||
                                reviewEligibility?.status ||
                                "PENDING"
                            }
                        />
                    </div>

                    {reviewLoading && (
                        <div className="panel">
                            <p className="muted">
                                Loading application documents and AI eligibility results...
                            </p>
                        </div>
                    )}

                    <div className="review-grid">
                        <div className="panel">
                            <h2>Applicant Information</h2>
                            <InfoRow label="Name" value={selected?.name} />
                            <InfoRow
                                label="Category"
                                value={selected?.category}
                            />
                            <InfoRow label="Programme" value={selected?.programme} />
                            <InfoRow label="University" value={selected?.university} />
                            <InfoRow
                                label="Academic Score"
                                value={
                                    selected?.percentage !== undefined
                                        ? `${selected.percentage}%`
                                        : "-"
                                }
                            />
                            <InfoRow
                                label="Scheme"
                                value={`${reviewSchemeName} (${reviewSchemeCode})`}
                            />
                            <InfoRow
                                label="Eligibility"
                                value={
                                    reviewEligibility?.status ||
                                    selected?.eligibility_status
                                }
                            />
                        </div>

                        <div className="panel">
                            <h2>Verification Summary</h2>
                            <div className="review-status">
                                <span>AI Document Verification</span>
                                <StatusBadge
                                    status={
                                        reviewDocuments.length === 0
                                            ? "PENDING"
                                            : allRequiredDocumentsVerified
                                                ? "VERIFIED"
                                                : "DEFICIENCY"
                                    }
                                />
                            </div>
                            <div className="review-status">
                                <span>Eligibility</span>
                                <StatusBadge
                                    status={
                                        reviewEligibility?.status ||
                                        selected?.eligibility_status ||
                                        "PENDING"
                                    }
                                />
                            </div>
                            <div className="review-status">
                                <span>Application Status</span>
                                <StatusBadge status={selected?.status || "PENDING"} />
                            </div>
                            <div className="review-status">
                                <span>Required Documents</span>
                                <strong>
                                    {verifiedRequiredDocuments}
                                    {" / "}
                                    {requiredDocumentTypes.length}
                                </strong>
                            </div>
                            <div className="review-status">
                                <span>Average AI Confidence</span>
                                <strong>
                                    {reviewDocuments.length ? `${averageConfidence}%` : "Pending"}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-header">
                            <div>
                                <h2>Uploaded Documents</h2>
                                <p>
                                    AI verification results for documents submitted
                                    with this {reviewSchemeName} application.
                                </p>
                            </div>
                            <span className="ai-label">✦ AI VERIFIED</span>
                        </div>

                        <div className="documents-grid">
                            {reviewDocuments.length === 0 ? (
                                <div className="empty-state">
                                    No documents have been uploaded for this application.
                                </div>
                            ) : (
                                reviewDocuments.map((document) => (
                                    <DocumentVerificationCard
                                        key={document.id}
                                        document={document}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    <div className="panel">
                        <div className="panel-header">
                            <div>
                                <h2>AI-Assisted Screening</h2>
                                <p>
                                    Rules below are taken from the current eligibility engine response.
                                </p>
                            </div>
                            <StatusBadge
                                status={
                                    reviewEligibility?.status ||
                                    selected?.eligibility_status ||
                                    "PENDING"
                                }
                            />
                        </div>

                        {screeningRows.map(({ label, check }) => (
                            <div className="review-status" key={label}>
                                <span>
                                    <strong>{label}</strong>
                                    {check?.message && (
                                        <>
                                            <br />
                                            <small style={{ color: "#667085" }}>
                                                {check.message}
                                            </small>
                                        </>
                                    )}
                                </span>
                                <StatusBadge
                                    status={
                                        !check
                                            ? "PENDING"
                                            : String(check.status || "").toUpperCase() === "PENDING"
                                                ? "PENDING"
                                                : check.passed
                                                    ? "VERIFIED"
                                                    : "DEFICIENCY"
                                    }
                                />
                            </div>
                        ))}

                        <p className="muted">
                            AI-assisted verification supports the authorized officer. Final administrative decisions remain under human scrutiny.
                        </p>
                    </div>

                    {selected?.status === "DEFICIENCY" && (
                        <div className="deficiency-alert">
                            <strong>⚠ Correction Requested</strong>
                            <p>
                                The applicant has been asked to correct or resubmit required documentation.
                            </p>
                        </div>
                    )}

                    <div className="panel">
                        <h2>Administrative Decision</h2>
                        <p className="muted">
                            Review the AI evidence above and take the appropriate administrative action.
                        </p>

                        <div className="decision-buttons">
                            <button
                                className="approve-btn"
                                disabled={!eligible || reviewLoading}
                                onClick={handleApprove}
                            >
                                ✓ Approve for Selection
                            </button>
                            <button
                                className="secondary-btn"
                                onClick={handleRequestCorrection}
                                disabled={
                                    selected?.status === "DEFICIENCY" ||
                                    reviewLoading
                                }
                            >
                                ⚠ Request Correction
                            </button>
                        </div>

                        {!eligible && !reviewLoading && (
                            <p className="muted" style={{ marginTop: "12px" }}>
                                Approval is disabled because the current eligibility result is not ELIGIBLE.
                            </p>
                        )}
                    </div>
                </main>
            </div>
        );
    }


    // ==================================================
    // APPLICATION FORM
    // ==================================================

    if (showApplicationForm && schemeForm) {

        return (
            <div className="app-shell">
                <header className="topbar">
                    <div className="logo">Tribal Scholar</div>
                    <button
                        className="back-btn"
                        onClick={() => {
                            setShowApplicationForm(false);
                            setSelectedScholarship(null);
                            setSchemeForm(null);
                        }}
                    >
                        ← Dashboard
                    </button>
                </header>

                <main className="main-content">
                    <div className="page-heading">
                        <div>
                            <h1>{schemeForm.title}</h1>
                            <p>Complete the application for this specific scheme.</p>
                        </div>
                        <span className="applicant-badge">
                            {selectedScholarship?.code}
                        </span>
                    </div>

                    <div className="panel">
                        <h2>Scheme-Specific Application Form</h2>
                        <p className="muted" style={{ marginBottom: "20px" }}>
                            The fields below are generated from the selected scholarship scheme.
                        </p>

                        <form onSubmit={handleApplicationSubmit}>
                            <div className="form-grid">
                                {(schemeForm.fields || []).map((field) => (
                                    <div key={field.key}>
                                        <label>{field.label}</label>

                                        {field.type === "select" ? (
                                            <select
                                                value={form[field.key] || ""}
                                                onChange={(e) =>
                                                    setForm({ ...form, [field.key]: e.target.value })
                                                }
                                                required={field.required}
                                            >
                                                <option value="">Select {field.label}</option>
                                                {(field.options || []).map((option) => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                                                step={field.type === "number" ? "0.1" : undefined}
                                                min={field.key === "percentage" ? "0" : undefined}
                                                max={field.key === "percentage" ? "100" : undefined}
                                                value={form[field.key] || ""}
                                                onChange={(e) =>
                                                    setForm({ ...form, [field.key]: e.target.value })
                                                }
                                                required={field.required}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                            {error && <div className="error">{error}</div>}

                            <button
                                type="submit"
                                className="primary-btn form-submit"
                                disabled={loading}
                            >
                                {loading ? "Submitting..." : `Submit ${selectedScholarship?.code} Application`}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        );
    }


    // ==================================================
    // APPLICANT DASHBOARD
    // ==================================================
    const currentSchemeCode =
        String(
            application?.scheme ||
            selectedScholarship?.code ||
            ""
        )
            .toUpperCase()
            .trim();
    
    const currentSchemeName =
        application?.scheme_name ||
        selectedScholarship?.name ||
        "Scholarship / Fellowship";
    
    const requiredDocuments =
        getDocumentRequirements(currentSchemeCode);

    const normalizedUploadedDocuments =
        documents.map((document) => ({
            ...document,
            normalizedType: normalizeDocumentType(
                document.document_type ||
                document.type ||
                ""
            )
        }));

    const verifiedDocumentTypes = new Set(
        normalizedUploadedDocuments
            .filter(
                (document) =>
                    String(
                        document.verification_status ||
                        ""
                    ).toUpperCase() === "VERIFIED"
            )
            .map(
                (document) =>
                    document.normalizedType
            )
    );

    const verifiedRequiredDocuments =
        requiredDocuments.filter(
            (requiredDocument) =>
                verifiedDocumentTypes.has(
                    normalizeDocumentType(
                        requiredDocument.type
                    )
                )
        ).length;

    const requiredDocumentCount =
        requiredDocuments.length;

    const documentProgress =
        requiredDocumentCount > 0
            ? Math.round(
                (verifiedRequiredDocuments /
                    requiredDocumentCount) *
                    100
            )
            : 0;

    const allRequiredDocumentsVerified =
        requiredDocumentCount > 0 &&
        verifiedRequiredDocuments ===
            requiredDocumentCount;

    const requiredDocumentTypes = new Set(
        requiredDocuments.map((item) =>
            normalizeDocumentType(item.type)
        )
    );

    // Only show documents relevant to the selected scheme inside the
    // scheme page. The complete personal vault is shown separately.
    const schemeDocuments = normalizedUploadedDocuments.filter((document) =>
        requiredDocumentTypes.has(document.normalizedType)
    );

    const documentsToUpload = requiredDocuments.filter((requiredDocument) => {
        const matching = normalizedUploadedDocuments.find(
            (document) =>
                document.normalizedType ===
                normalizeDocumentType(requiredDocument.type)
        );
        const status = String(matching?.verification_status || "").toUpperCase();
        return status !== "VERIFIED";
    });
    
    
    // --------------------------------------------------
    // TIMELINE STATUS
    // --------------------------------------------------
    
    const applicationStatus =
        String(
            application?.status || ""
        )
            .toUpperCase()
            .trim();
    
    const eligibilityStatus =
        String(
            eligibility?.status ||
            application?.eligibility_status ||
            "PENDING"
        )
            .toUpperCase()
            .trim();
    
    const timelineItems = [
    
        {
            title: "Application Submitted",
            done: Boolean(application)
        },
    
        {
            title: "AI Document Verification",
            done: allRequiredDocumentsVerified
        },
    
        {
            title:
                applicationStatus === "DEFICIENCY"
                    ? "Correction / Resubmission"
                    : "Eligibility Verification",
        
            done:
                applicationStatus !== "DEFICIENCY" &&
                (
                    eligibilityStatus === "ELIGIBLE" ||
                    eligibilityStatus === "NOT_ELIGIBLE"
                )
        },
    
        {
            title:
                applicationStatus === "DEFICIENCY"
                    ? "Correction Required"
                    : "Administrative Scrutiny",
        
            done:
                applicationStatus === "SHORTLISTED"
        },
    
        {
            title: "Selection",
            done:
                applicationStatus === "SHORTLISTED"
        }
    ];
    
    
    return (
    
        <div className="app-shell">
        
            <header className="topbar">
    
                <div className="logo">
                    Tribal Scholar
                </div>
    
    
                <div className="user-area">
    
                    <span>
                        {user?.name}
                    </span>
    
    
                    <button
                        onClick={openDocumentVault}
                        className="back-btn"
                    >
                        My Documents
                    </button>

                    <button
                        onClick={logout}
                        className="logout-btn"
                    >
                        Logout
                    </button>
    
                </div>
    
            </header>
    
    
            <main className="main-content">
    
                {/* PAGE HEADER */}
    
                <div className="page-heading">
    
                    <div>
    
                        <h1>
                            Welcome back,
                            {" "}
                            {user?.name}
                        </h1>
    
                        <p>
                            Track your scholarship
                            application
                        </p>
    
                    </div>
    
    
                    <div
                        style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center"
                        }}
                    >
                    
                        <span className="applicant-badge">
                            APPLICANT
                        </span>
                    
                        {application && (
                            <span className="muted">
                                {currentSchemeCode}
                            </span>
                        )}
    
                    </div>
                    
                </div>
                    
                    
                {/* MY APPLICATIONS - KEPT SEPARATE FROM AVAILABLE SCHEMES */}
                <div className="panel" style={{ marginBottom: "24px" }}>
                    <div className="panel-header">
                        <div>
                            <h2>My Applications</h2>
                            <p>Open one application to see its scheme-specific status, documents and eligibility.</p>
                        </div>
                        <span className="applicant-badge">{userApplications.length} APPLICATIONS</span>
                    </div>

                    {userApplications.length === 0 ? (
                        <div className="empty-state" style={{ padding: "28px" }}>
                            <strong>No applications yet</strong>
                            <p>Choose a scheme from Available Schemes below to start.</p>
                        </div>
                    ) : (
                        <div style={{ display: "grid", gap: "12px" }}>
                            {userApplications.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: "16px",
                                        padding: "16px",
                                        border: applicationId === item.id ? "2px solid #2453d4" : "1px solid #e4e7ec",
                                        borderRadius: "14px",
                                        background: applicationId === item.id ? "#f5f8ff" : "#fff"
                                    }}
                                >
                                    <div>
                                        <div className="scheme-label">{item.scheme}</div>
                                        <strong>{item.scheme_name}</strong>
                                        <div className="muted" style={{ marginTop: "5px" }}>{item.application_number}</div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <StatusBadge status={item.eligibility_status || item.status || "PENDING"} />
                                        <button
                                            type="button"
                                            className="secondary-btn"
                                            onClick={(event) => {
                                                event.preventDefault();
                                                event.stopPropagation();
                                                openUserApplication(item.id);
                                            }}
                                            disabled={loading}
                                        >
                                            {applicationId === item.id ? "Opened" : "Open Application"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* MY DOCUMENT VAULT SUMMARY */}
                <div className="panel" style={{ marginBottom: "24px" }}>
                    <div className="panel-header">
                        <div>
                            <h2>My Document Vault</h2>
                            <p>Documents are uploaded once and reused across eligible schemes.</p>
                        </div>
                        <button className="secondary-btn" onClick={openDocumentVault}>
                            Manage Documents
                        </button>
                    </div>

                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        {documents.length === 0 ? (
                            <span className="muted">No personal documents uploaded yet.</span>
                        ) : (
                            documents.slice(0, 6).map((doc) => (
                                <span
                                    key={doc.id}
                                    style={{
                                        padding: "9px 12px",
                                        borderRadius: "999px",
                                        background: "#f0f7ff",
                                        color: "#2453d4",
                                        fontWeight: 600,
                                        fontSize: "13px"
                                    }}
                                >
                                    ✓ {String(doc.document_type || "DOCUMENT").replaceAll("_", " ")}
                                </span>
                            ))
                        )}
                    </div>
                </div>


                {/* AVAILABLE SCHOLARSHIPS */}
                    
                <div
                    className="panel"
                    style={{ marginBottom: "24px" }}
                >
                
                    <div className="panel-header">
                    
                        <div>
                    
                            <h2>
                                Available Scholarships & Fellowships
                            </h2>
                    
                            <p>
                                Explore active opportunities
                                published by the Ministry.
                            </p>
                    
                        </div>
                    
                        <span className="applicant-badge">
                            {scholarships.length} Available
                        </span>
                    
                    </div>
                    
                    
                    {scholarshipError && (
                    
                        <div className="error-message">
                            {scholarshipError}
                        </div>
    
                    )}
    
                
                    {scholarships.length === 0 ? (
                    
                        <div className="empty-state">
                        
                            No active scholarships are
                            available right now.
                            Please check again later.
                    
                        </div>
    
                    ) : (
                    
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: "18px"
                            }}
                        >
                        
                            {scholarships.map(
                                (scholarship) => (
                                
                                    <div
                                        key={scholarship.id}
                                        className="panel"
                                        style={{
                                            margin: 0,
                                            border:
                                                "1px solid #e4e7ec",
                                            boxShadow: "none"
                                        }}
                                    >
                                    
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent:
                                                    "space-between",
                                                alignItems:
                                                    "flex-start",
                                                gap: "12px"
                                            }}
                                        >
                                        
                                            <div>
                                        
                                                <h3
                                                    style={{
                                                        margin:
                                                            "0 0 6px"
                                                    }}
                                                >
                                                    {scholarship.name}
                                                </h3>
                                                
                                                <span
                                                    style={{
                                                        fontSize:
                                                            "12px",
                                                        color:
                                                            "#667085"
                                                    }}
                                                >
                                                    {scholarship.code}
                                                </span>
                                                
                                            </div>
                                                
                                                
                                            <span className="status-badge verified">
                                                ACTIVE
                                            </span>
                                                
                                        </div>
                                                
                                                
                                        <p
                                            style={{
                                                color: "#475467",
                                                lineHeight: 1.5
                                            }}
                                        >
                                            {scholarship.description}
                                        </p>
                                        
                                        
                                        <div
                                            style={{
                                                display: "grid",
                                                gap: "9px",
                                                marginTop: "14px"
                                            }}
                                        >
                                        
                                            <div>
                                        
                                                <strong>
                                                    💰 Award:
                                                </strong>{" "}
                                        
                                                ₹
                                                {Number(
                                                    scholarship.amount || 0
                                                ).toLocaleString(
                                                    "en-IN"
                                                )}
    
                                            </div>
                                            
                                            
                                            <div>
                                            
                                                <strong>
                                                    📅 Deadline:
                                                </strong>{" "}
                                            
                                                {scholarship.deadline ||
                                                    "Not specified"}
    
                                            </div>
                                                
                                                
                                            <div>
                                                
                                                <strong>
                                                    🎓 Eligibility:
                                                </strong>{" "}
                                                
                                                {scholarship.eligibility}
                                                
                                            </div>
                                                
                                        </div>
                                                
                                                
                                        <button
                                            className="primary-btn"
                                            style={{
                                                marginTop: "16px",
                                                width: "100%"
                                            }}
                                            onClick={() =>
                                                openSchemeForm(
                                                    scholarship
                                                )
                                            }
                                            disabled={
                                                schemeFormLoading
                                            }
                                        >
                                        
                                            {
                                                userApplications.some(
                                                    (item) =>
                                                        item.scheme ===
                                                        scholarship.code
                                                )
                                                    ? "View Application"
                                                    : "View / Apply"
                                            }
    
                                        </button>
                                        
                                    </div>
    
                                )
                            )}
    
                        </div>
    
                    )}
    
                </div>
                
                
                {/* NO APPLICATION MESSAGE */}
                
                {!application && (
                
                    <div className="panel">
                    
                        <div className="empty-state">
                
                            <div className="empty-icon">
                                🎓
                            </div>
                
                            <strong>
                                No application selected
                            </strong>
                
                            <p>
                                Choose a scholarship or
                                fellowship from the section
                                above to start your application.
                            </p>
                
                        </div>
                
                    </div>
    
                )}
    
            
                {/* APPLICATION-SPECIFIC DASHBOARD */}
            
                {application && (
                
                    <>
    
                        {/* STATISTICS */}
                
                        <div className="stat-grid">
                
                            <StatCard
                                title="Applications"
                                value={String(
                                    userApplications.length
                                )}
                                icon="📋"
                            />
    
                            
                            <StatCard
                                title="My Documents"
                                value={String(documents.length)}
                                icon="📄"
                            />
    
                            
                            <StatCard
                                title="Eligibility"
                                value={
                                    eligibilityStatus
                                }
                                icon="✓"
                            />
    
                            
                            <StatCard
                                title="AI Confidence"
                                value={
                                    documents.length > 0
                                        ? `${Math.round(
                                            documents.reduce(
                                                (sum, doc) =>
                                                    sum +
                                                    Number(
                                                        doc.confidence ||
                                                        0
                                                    ),
                                                0
                                            ) /
                                            documents.length
                                        )}%`
                                        : "Pending"
                                }
                                icon="🤖"
                            />
    
                        </div>
                            
                            
                        {/* DEFICIENCY ALERT */}
                            
                        {application.status ===
                            "DEFICIENCY" && (
                            
                            <div className="deficiency-alert">
                            
                                <div>
                            
                                    <strong>
                                        ⚠ Correction Required
                                    </strong>
                            
                                    <p>
                                        Your{" "}
                                        <strong>
                                            {currentSchemeName}
                                        </strong>{" "}
                                        application requires
                                        document correction
                                        or resubmission.
                                    </p>
                            
                                    <p>
                                        Upload the corrected
                                        document below. The
                                        system will run OCR
                                        and AI verification
                                        again.
                                    </p>
                            
                                </div>
                            
                            </div>
    
                        )}
    
                    
                        {/* APPLICATION STATUS */}
                    
                        <div className="panel">
                    
                            <div className="application-header">
                    
                                <div>
                    
                                    <span className="scheme-label">
                                        {currentSchemeCode ||
                                            "SCHOLARSHIP"}
                                    </span>
                                        
                                        
                                    <h2>
                                        {currentSchemeName}
                                    </h2>
                                        
                                        
                                    <p>
                                        {
                                            application
                                                .application_number
                                        }
                                    </p>
                                    
                                </div>
                                    
                                    
                                <StatusBadge
                                    status={
                                        application.status ===
                                        "DEFICIENCY"
                                            ? "DEFICIENCY"
                                            : (
                                                eligibilityStatus ||
                                                application.status
                                            )
                                    }
                                />
    
                            </div>
                                
                                
                            {/* SCHEME INFORMATION */}
                                
                            <div
                                className="info-row"
                                style={{
                                    marginBottom: "20px"
                                }}
                            >
                            
                                <span>
                                    Scheme Code
                                </span>
                            
                                <strong>
                                    {currentSchemeCode}
                                </strong>
                            
                            </div>
                            
                            
                            <div className="timeline">
                            
                                {timelineItems.map(
                                    (item, index) => (
                                    
                                        <TimelineItem
                                            key={`${item.title}-${index}`}
                                            title={item.title}
                                            done={item.done}
                                        />
                                    
                                    )
                                )}
    
                            </div>
                            
                        </div>
                            
                            
                        {/* REQUIRED DOCUMENT PROGRESS */}

                        <div className="panel">

                            <div className="panel-header">
                                <div>
                                    <h2>Required Documents</h2>
                                    <p>
                                        Requirements for <strong>{currentSchemeName}</strong>. Verified documents from your personal vault are automatically reused.
                                    </p>
                                </div>

                                <strong>
                                    {verifiedRequiredDocuments}/{requiredDocumentCount}
                                </strong>
                            </div>

                            <div style={{ margin: "18px 0" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        marginBottom: "8px"
                                    }}
                                >
                                    <span className="muted">
                                        {verifiedRequiredDocuments} of {requiredDocumentCount} verified
                                    </span>
                                    <strong>{documentProgress}%</strong>
                                </div>

                                <div
                                    style={{
                                        width: "100%",
                                        height: "10px",
                                        background: "#eaecf0",
                                        borderRadius: "999px",
                                        overflow: "hidden"
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${documentProgress}%`,
                                            height: "100%",
                                            background: documentProgress === 100 ? "#12b76a" : "#667085",
                                            borderRadius: "999px",
                                            transition: "width 0.3s ease"
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "grid", gap: "10px" }}>
                                {requiredDocuments.map((requiredDocument) => {
                                    const normalizedType =
                                        normalizeDocumentType(
                                            requiredDocument.type
                                        );

                                    const matchingDocument =
                                        normalizedUploadedDocuments.find(
                                            (document) =>
                                                document.normalizedType ===
                                                normalizedType
                                        );

                                    const status =
                                        String(
                                            matchingDocument?.verification_status ||
                                            ""
                                        ).toUpperCase();

                                    const verified = status === "VERIFIED";
                                    const uploaded = Boolean(matchingDocument);

                                    return (
                                        <div
                                            key={requiredDocument.type}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                gap: "16px",
                                                padding: "14px 16px",
                                                border: "1px solid #eaecf0",
                                                borderRadius: "12px",
                                                background: "#fff"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px"
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "32px",
                                                        height: "32px",
                                                        borderRadius: "50%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontWeight: 700,
                                                        background: verified
                                                            ? "#dcfae6"
                                                            : uploaded
                                                            ? "#fef0c7"
                                                            : "#f2f4f7",
                                                        color: verified
                                                            ? "#067647"
                                                            : uploaded
                                                            ? "#b54708"
                                                            : "#667085"
                                                    }}
                                                >
                                                    {verified ? "✓" : uploaded ? "!" : "○"}
                                                </div>

                                                <div>
                                                    <strong>{requiredDocument.title}</strong>
                                                    <div className="muted" style={{ marginTop: "3px" }}>
                                                        {verified
                                                            ? "Already verified in your document vault — reused for this scheme"
                                                            : uploaded
                                                            ? "In your vault — correction/reverification required"
                                                            : "Not found in your document vault — upload required"}
                                                    </div>
                                                </div>
                                            </div>

                                            {verified ? (
                                                <StatusBadge status="VERIFIED" />
                                            ) : uploaded ? (
                                                <StatusBadge status={status || "PENDING"} />
                                            ) : (
                                                <StatusBadge status="MISSING" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                        </div>


                        {/* DOCUMENT VERIFICATION */}
                            
                        <div className="panel">
                            
                            <div className="panel-header">
                            
                                <div>
                            
                                    <h2>
                                        AI Document Verification
                                    </h2>
                            
                                    <p>
                                        Automated document
                                        analysis and validation
                                        for{" "}
                                        <strong>
                                            {currentSchemeName}
                                        </strong>
                                    </p>
                            
                                </div>
                            
                            
                                <span className="ai-label">
                                    ✦ AI ASSISTED
                                </span>
                            
                            </div>
                            
                            
                            <div className="documents-grid">
                            
                                {schemeDocuments.length === 0 ? (
                                
                                    <div
                                        style={{
                                            padding: "20px",
                                            color: "#667085"
                                        }}
                                    >
                                        No documents relevant to this scheme are in your vault yet.
                                    </div>
    
                                ) : (
                                
                                    schemeDocuments.map(
                                        (document) => (
                                        
                                            <DocumentVerificationCard
                                                key={document.id}
                                                document={document}
                                            />
                                        
                                        )
                                    )
                                
                                )}
    
                            </div>
                            
                        </div>
                            
                            
                        {/* DOCUMENT UPLOAD */}
                            
                        <div className="panel">
                            
                            <div className="panel-header">
                            
                                <div>
                            
                                    <h2>
                            
                                        {application.status ===
                                        "DEFICIENCY"
                                        
                                            ? "Resubmit Corrected Documents"
                                        
                                            : "Complete Missing Documents"
                                        }
    
                                    </h2>
                                    
                                    
                                    <p>
                                    
                                        {application.status ===
                                        "DEFICIENCY"
                                        
                                            ? "Upload the corrected document. AI OCR verification will run again automatically."
                                        
                                            : `We first checked your document vault. Only documents missing or needing correction for ${currentSchemeName} are requested here.`
                                        }
    
                                    </p>
                                    
                                </div>
                                    
                                    
                                <span className="ai-label">
                                    ✦ OCR
                                </span>
                                    
                            </div>
                                    
                                    
                            {documentsToUpload.length === 0 ? (
                                <div
                                    style={{
                                        padding: "18px",
                                        borderRadius: "12px",
                                        background: "#ecfdf3",
                                        color: "#067647",
                                        fontWeight: 600
                                    }}
                                >
                                    ✓ All required documents are already verified in your document vault. No re-upload is needed.
                                </div>
                            ) : (
                                <div className="upload-grid">
                                    {documentsToUpload.map((document) => (
                                        <UploadBox
                                            key={document.type}
                                            title={document.title}
                                            type={document.type}
                                            onUpload={handleDocumentUpload}
                                            uploading={uploading}
                                        />
                                    ))}
                                </div>
                            )}
                            
                            
                            {uploadMessage && (
                            
                                <div className="upload-message">
                                    {uploadMessage}
                                </div>
    
                            )}
    
                        </div>
                        
                        
                        {/* ELIGIBILITY RESULTS */}
                        
                        {eligibility && (
                        
                            <div className="panel">
                            
                                <div className="panel-header">
                        
                                    <div>
                        
                                        <h2>
                                            {currentSchemeName}
                                            {" "}
                                            Eligibility Assessment
                                        </h2>
                        
                                        <p>
                                            AI-assisted rule
                                            evaluation for
                                            this application
                                        </p>
                        
                                    </div>
                        
                        
                                    <StatusBadge
                                        status={
                                            eligibility.status
                                        }
                                    />
    
                                </div>
                                    
                                    
                                {eligibility.checks &&
                                eligibility.checks.length > 0 ? (
                                
                                    <div>
                                    
                                        {eligibility.checks.map(
                                            (
                                                check,
                                                index
                                            ) => (
                                            
                                                <div
                                                    className="review-status"
                                                    key={index}
                                                >
                                                
                                                    <span>
                                            
                                                        {check.rule}
                                            
                                                        <br />
                                            
                                                        <small
                                                            style={{
                                                                color:
                                                                    "#667085"
                                                            }}
                                                        >
                                                            {
                                                                check.message
                                                            }
                                                        </small>
                                                        
                                                    </span>
                                                        
                                                        
                                                    <StatusBadge
                                                        status={
                                                            String(check.status || "").toUpperCase() === "PENDING"
                                                                ? "PENDING"
                                                                : check.passed
                                                                    ? "VERIFIED"
                                                                    : "DEFICIENCY"
                                                        }
                                                    />
    
                                                </div>
    
                                            )
                                        )}
    
                                    </div>
    
                                ) : (
                                
                                    <div className="empty-state">
                                    
                                        <strong>
                                            Eligibility evaluation
                                            is pending
                                        </strong>
                                
                                        <p>
                                            {
                                                eligibility.message ||
                                                `Eligibility rules for ${currentSchemeName} have not been configured in the demo yet.`
                                            }
                                        </p>
                                        
                                    </div>
    
                                )}
    
                            </div>
    
                        )}
    
                    </>
    
                )}
    
            </main>
            
        </div>
    );
    }


// ==================================================
// STAT CARD
// ==================================================

function StatCard({
    title,
    value,
    icon
}) {

    return (

        <div className="stat-card">

            <div className="stat-icon">
                {icon}
            </div>


            <div>

                <p>
                    {title}
                </p>

                <h2>
                    {value}
                </h2>

            </div>

        </div>
    );
}


// ==================================================
// STATUS BADGE
// ==================================================

function StatusBadge({
    status
}) {

    const value =
        status || "PENDING";


    return (

        <span
            className={
                `status-badge ${
                    String(value)
                        .toLowerCase()
                        .replaceAll("_", "-")
                        .replaceAll(" ", "-")
                }`
            }
        >
            {value}
        </span>
    );
}


// ==================================================
// TIMELINE ITEM
// ==================================================

function TimelineItem({
    title,
    done
}) {

    return (

        <div className="timeline-item">

            <div
                className={
                    `timeline-dot ${
                        done
                            ? "done"
                            : ""
                    }`
                }
            >
                {done ? "✓" : ""}
            </div>


            <span>
                {title}
            </span>

        </div>
    );
}


// ==================================================
// INFO ROW
// ==================================================

function InfoRow({
    label,
    value
}) {

    return (

        <div className="info-row">

            <span>
                {label}
            </span>


            <strong>
                {value || "-"}
            </strong>

        </div>
    );
}

// ============================================================
// ADVANCED AI DOCUMENT VERIFICATION CARD
// ============================================================

function DocumentVerificationCard({ document }) {

    const [expanded, setExpanded] = React.useState(false);

    const isVerified =
        document.verification_status === "VERIFIED";

    const isDeficiency =
        document.verification_status === "DEFICIENCY";

    const confidence =
        document.confidence !== undefined &&
        document.confidence !== null
            ? Number(document.confidence)
            : 0;

    const extracted =
        document.extracted || {};

    const issues =
        Array.isArray(document.issues)
            ? document.issues
            : document.remarks
                ? document.remarks
                    .split(",")
                    .map(item => item.trim())
                    .filter(Boolean)
                : [];

    const ocrPreview =
        document.ocr_preview ||
        document.ocr_text ||
        "";

    function formatDocumentType(type) {

        if (!type) {
            return "Document";
        }

        return type
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, char =>
                char.toUpperCase()
            );
    }

    return (
        <div
            className={`advanced-document-card ${
                isVerified
                    ? "document-verified"
                    : isDeficiency
                        ? "document-deficiency"
                        : ""
            }`}
        >

            {/* HEADER */}

            <div className="advanced-document-header">

                <div className="advanced-document-title">

                    <div className="advanced-document-icon">
                        📄
                    </div>

                    <div>

                        <h3>
                            {formatDocumentType(
                                document.document_type
                            )}
                        </h3>

                        <p>
                            {document.filename}
                        </p>

                    </div>

                </div>


                <StatusBadge
                    status={
                        document.verification_status
                    }
                />

            </div>


            {/* AI CONFIDENCE */}

            <div className="ai-confidence-section">

                <div className="confidence-header">

                    <span>
                        AI Verification Confidence
                    </span>

                    <strong>
                        {confidence.toFixed(0)}%
                    </strong>

                </div>


                <div className="confidence-bar">

                    <div
                        className={`confidence-fill ${
                            confidence >= 80
                                ? "confidence-high"
                                : confidence >= 60
                                    ? "confidence-medium"
                                    : "confidence-low"
                        }`}
                        style={{
                            width: `${Math.min(
                                Math.max(confidence, 0),
                                100
                            )}%`
                        }}
                    />

                </div>

            </div>


            {/* VERIFICATION MESSAGE */}

            <div
                className={`verification-message ${
                    isVerified
                        ? "verification-success"
                        : "verification-warning"
                }`}
            >

                <span className="verification-message-icon">

                    {isVerified
                        ? "✓"
                        : "⚠"}

                </span>

                <div>

                    <strong>

                        {isVerified
                            ? "Document verified successfully"
                            : "Document requires attention"}

                    </strong>

                    <p>

                        {isVerified
                            ? "AI analysis found no critical verification issues."
                            : "AI analysis detected information that requires correction or review."}

                    </p>

                </div>

            </div>


            {/* EXTRACTED INFORMATION */}

            {Object.keys(extracted).length > 0 && (

                <div className="ai-section">

                    <div className="ai-section-title">

                        <span>
                            🔍 Extracted Information
                        </span>

                    </div>


                    <div className="extracted-grid">

                        {Object.entries(extracted)
                            .filter(
                                ([, value]) =>
                                    value !== null &&
                                    value !== undefined &&
                                    String(value).trim() !== ""
                            )
                            .map(
                                ([key, value]) => (

                                    <div
                                        className="extracted-item"
                                        key={key}
                                    >

                                        <span>
                                            {key
                                                .replaceAll("_", " ")
                                                .replace(/\b\w/g, char =>
                                                    char.toUpperCase()
                                                )}
                                        </span>

                                        <strong>
                                            {String(value)}
                                        </strong>

                                    </div>

                                )
                            )}

                    </div>

                </div>

            )}


            {/* ISSUES */}

            {issues.length > 0 && (

                <div className="ai-section issue-section">

                    <div className="ai-section-title issue-title">

                        <span>
                            ⚠ Detected Issues
                        </span>

                    </div>


                    <div className="issues-list">

                        {issues.map(
                            (issue, index) => (

                                <div
                                    className="issue-item"
                                    key={index}
                                >

                                    <span>
                                        •
                                    </span>

                                    <span>
                                        {issue}
                                    </span>

                                </div>

                            )
                        )}

                    </div>

                </div>

            )}


            {/* EXPAND BUTTON */}

            {(ocrPreview || issues.length > 0) && (

                <button
                    className="document-details-btn"
                    onClick={() =>
                        setExpanded(!expanded)
                    }
                >

                    {expanded
                        ? "Hide AI Analysis"
                        : "View AI Analysis"}

                    <span>
                        {expanded
                            ? "▲"
                            : "▼"}
                    </span>

                </button>

            )}


            {/* EXPANDED AI ANALYSIS */}

            {expanded && (

                <div className="expanded-ai-analysis">

                    <div className="ai-analysis-header">

                        <span>
                            🤖 AI Analysis Details
                        </span>

                        <span className="ai-label">
                            AI ASSISTED
                        </span>

                    </div>


                    {/* OCR */}

                    {ocrPreview && (

                        <div className="ocr-section">

                            <h4>
                                📝 OCR Extracted Text
                            </h4>

                            <div className="ocr-preview">

                                {ocrPreview}

                            </div>

                        </div>

                    )}


                    {/* ANALYSIS SUMMARY */}

                    <div className="analysis-summary">

                        <h4>
                            Verification Summary
                        </h4>

                        <div className="analysis-check">

                            <span>

                                {isVerified
                                    ? "✓"
                                    : "⚠"}

                            </span>

                            <span>

                                Document type:
                                {" "}

                                <strong>
                                    {formatDocumentType(
                                        document.document_type
                                    )}
                                </strong>

                            </span>

                        </div>


                        <div className="analysis-check">

                            <span>
                                {confidence >= 70
                                    ? "✓"
                                    : "⚠"}
                            </span>

                            <span>

                                AI confidence:
                                {" "}

                                <strong>
                                    {confidence.toFixed(0)}%
                                </strong>

                            </span>

                        </div>


                        <div className="analysis-check">

                            <span>
                                {issues.length === 0
                                    ? "✓"
                                    : "⚠"}
                            </span>

                            <span>

                                Detected issues:
                                {" "}

                                <strong>
                                    {issues.length}
                                </strong>

                            </span>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}

// ==================================================
// UPLOAD BOX
// ==================================================

function UploadBox({
    title,
    type,
    onUpload,
    uploading
}) {

    return (

        <div className="upload-box">

            <div className="upload-icon">
                📄
            </div>


            <strong>
                {title}
            </strong>


            <p>
                PDF, JPG or PNG
            </p>


            <label className="upload-button">

                {uploading
                    ? "Processing..."
                    : "Choose File"
                }


                <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {

                        const file =
                            e.target.files?.[0];

                        if (file) {

                            onUpload(
                                type,
                                file
                            );
                        }


                        e.target.value = "";

                    }}
                />

            </label>

        </div>
    );
}


export default App;