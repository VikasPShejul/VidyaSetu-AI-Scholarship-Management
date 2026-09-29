from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "APPLICANT"

class ApplicationCreate(BaseModel):
    email: EmailStr
    name: str
    dob: str
    category: str
    university: str
    programme: str
    percentage: float