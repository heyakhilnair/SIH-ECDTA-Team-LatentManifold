from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ecdat:password@localhost:5432/ecdat_db"
    clerk_secret_key: str = ""
    environment: str = "development"
    supabase_project_url: str = ""
    supabase_access_token: str = ""
    # Comma-separated list of allowed frontend origins for CORS. No wildcard in
    # production — see docs/BACKEND_AUDIT_PHASE0-6.md #12.
    cors_origins: str = "http://localhost:3000,https://ecdta.vercel.app"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

settings = Settings()
