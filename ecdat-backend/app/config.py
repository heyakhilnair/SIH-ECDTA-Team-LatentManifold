from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ecdat:password@localhost:5432/ecdat_db"
    redis_url: str = "redis://localhost:6379/0"
    clerk_secret_key: str = ""
    environment: str = "development"
    supabase_project_url: str = ""
    supabase_access_token: str = ""
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
