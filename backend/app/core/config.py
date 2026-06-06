from pydantic import model_validator
from pydantic_settings import BaseSettings

DEFAULT_SECRET_KEY = "change-this-secret-key-in-production"


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
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60             # 1 hour (refresh token으로 재발급)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Google Gemini
    GEMINI_API_KEY: str = ""

    # OpenWeather
    OPENWEATHER_API_KEY: str = ""

    # CORS — 웹 브라우저 개발용 origin (RN 앱은 CORS 미적용). 쉼표 구분.
    CORS_ORIGINS: list[str] = ["http://localhost:8081", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"

    @model_validator(mode="after")
    def _validate_secret_key(self) -> "Settings":
        """프로덕션(DEBUG=False)에서 SECRET_KEY 기본값 사용 시 startup 차단."""
        if not self.DEBUG and self.SECRET_KEY == DEFAULT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY가 기본값으로 설정되어 있습니다. "
                "프로덕션 환경에서는 .env에 안전한 SECRET_KEY를 지정해야 합니다 "
                '(생성: python -c "import secrets; print(secrets.token_hex(32))").'
            )
        return self

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
