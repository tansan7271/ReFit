from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Persona Fit API"
    DEBUG: bool = False

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_NAME: str = "persona_fit"

    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60             # 1 hour (refresh token으로 재발급)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # FCM (Firebase Cloud Messaging)
    FIREBASE_CREDENTIALS_PATH: str = "firebase-credentials.json"
    FIREBASE_PROJECT_ID: str = ""

    # Google Gemini
    GEMINI_API_KEY: str = ""

    # OpenWeather
    OPENWEATHER_API_KEY: str = ""

    class Config:
        env_file = ".env"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )


settings = Settings()
