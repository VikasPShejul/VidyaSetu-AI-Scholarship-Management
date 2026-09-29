const API_BASE =
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000";

const TOKEN_KEY = "tribal_scholar_token";


// ==================================================
// TOKEN HELPERS
// ==================================================

export function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
}

export function clearAuthToken() {
    localStorage.removeItem(TOKEN_KEY);
}


// ==================================================
// COMMON REQUEST HANDLER
// ==================================================

async function request(path, options = {}) {

    const {
        headers = {},
        ...rest
    } = options;

    const token = getAuthToken();

    const requestHeaders = {
        ...headers
    };

    // Don't manually set Content-Type for FormData.
    // Browser must generate the multipart boundary.
    if (
        rest.body &&
        !(rest.body instanceof FormData) &&
        !requestHeaders["Content-Type"]
    ) {
        requestHeaders["Content-Type"] =
            "application/json";
    }

    if (token) {
        requestHeaders.Authorization =
            `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}${path}`,
        {
            ...rest,
            headers: requestHeaders
        }
    );

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        const message =
            data?.detail ||
            data?.message ||
            `Request failed with status ${response.status}`;

        throw new Error(message);
    }

    return data;
}


// ==================================================
// AUTHENTICATION
// ==================================================

export async function login(email, password) {

    const data = await request(
        "/api/auth/login",
        {
            method: "POST",
            body: JSON.stringify({
                email: email.trim(),
                password
            })
        }
    );

    if (data?.access_token) {
        setAuthToken(data.access_token);
    }

    return data;
}


export async function register(
    name,
    email,
    password,
    role = "APPLICANT"
) {

    return request(
        "/api/auth/register",
        {
            method: "POST",
            body: JSON.stringify({
                name: name.trim(),
                email: email.trim(),
                password,
                role
            })
        }
    );
}


export function logout() {
    clearAuthToken();
}


// ==================================================
// APPLICATIONS
// ==================================================

export async function getApplication(
    applicationId
) {
    return request(
        `/api/applications/${encodeURIComponent(applicationId)}`
    );
}


export async function getApplicationsFields(
    applicationId
) {
    return request(
        `/api/applications/${encodeURIComponent(applicationId)}/fields`
    );
}


export async function createApplication(
    email,
    schemeCode,
    fields
) {

    return request(
        "/api/applications",
        {
            method: "POST",
            body: JSON.stringify({
                email: email.trim(),
                scheme_code: schemeCode.trim().toUpperCase(),
                fields
            })
        }
    );
}


// ==================================================
// DOCUMENTS
// ==================================================

export async function getDocuments(
    applicationId
) {

    return request(
        `/api/applications/${encodeURIComponent(applicationId)}/documents`
    );
}


export async function getUserDocuments(
    userId
) {

    return request(
        `/api/users/${encodeURIComponent(userId)}/documents`
    );
}


export async function uploadDocument(
    applicationId,
    documentType,
    file
) {

    if (!file) {
        throw new Error("Please select a file");
    }

    const allowedTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg"
    ];

    if (!allowedTypes.includes(file.type)) {
        throw new Error(
            "Only PDF, PNG and JPG files are allowed"
        );
    }

    const MAX_SIZE = 10 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
        throw new Error(
            "File size must be less than 10 MB"
        );
    }

    const formData = new FormData();

    formData.append(
        "document_type",
        documentType
    );

    formData.append(
        "file",
        file
    );

    return request(
        `/api/applications/${encodeURIComponent(applicationId)}/documents`,
        {
            method: "POST",
            body: formData
        }
    );
}


// ==================================================
// ELIGIBILITY
// ==================================================

export async function getEligibility(
    applicationId
) {

    return request(
        `/api/applications/${encodeURIComponent(applicationId)}/eligibility`
    );
}


// ==================================================
// ADMIN
// ==================================================

export async function getAdminStats() {
    return request(
        "/api/admin/stats"
    );
}


export async function getAdminApplications() {
    return request(
        "/api/admin/applications"
    );
}


export async function approveApplication(
    applicationId
) {

    return request(
        `/api/admin/applications/${encodeURIComponent(applicationId)}/approve`,
        {
            method: "POST"
        }
    );
}


export async function requestCorrection(
    applicationId
) {

    return request(
        `/api/admin/applications/${encodeURIComponent(applicationId)}/request-correction`,
        {
            method: "POST"
        }
    );
}


// ==================================================
// SCHOLARSHIPS
// ==================================================

export async function getScholarships() {

    return request(
        "/api/scholarships"
    );
}


export async function getAdminScholarships() {

    return request(
        "/api/admin/scholarships"
    );
}


export async function createScholarship(
    scholarship
) {

    return request(
        "/api/admin/scholarships",
        {
            method: "POST",
            body: JSON.stringify({
                name: scholarship.name.trim(),
                code: scholarship.code
                    .trim()
                    .toUpperCase(),
                amount: Number(
                    scholarship.amount || 0
                ),
                deadline: scholarship.deadline,
                eligibility:
                    scholarship.eligibility.trim(),
                description:
                    scholarship.description.trim(),
                status:
                    scholarship.status || "ACTIVE",
                form_template:
                    scholarship.form_template ||
                    "GENERAL"
            })
        }
    );
}


// ==================================================
// SCHEME FORMS
// ==================================================

export async function getSchemeForm(
    schemeCode
) {

    const code = String(schemeCode || "")
        .trim()
        .toUpperCase();

    return request(
        `/api/schemes/${encodeURIComponent(code)}/form`
    );
}