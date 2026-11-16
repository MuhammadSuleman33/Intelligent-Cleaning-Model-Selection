from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: EmailStr
    password: str = Field(min_length=8, max_length=4096)
    full_name: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=4096)


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    model_config = {"from_attributes": True}

    @field_validator("role", mode="before")
    @classmethod
    def role_as_str(cls, v: object) -> str:
        return getattr(v, "value", v) if v is not None else "student"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
