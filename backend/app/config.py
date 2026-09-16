from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    database_url: str
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_key: str | None = None
    secret_key: str
    bind_zones_path: str = "/etc/bind/zones"
    bind_config_path: str = "/etc/bind/named.conf.local"
    rndc_command: str = "rndc"
    prometheus_url: str = "http://prometheus:9090"
    wazuh_url: str = "http://wazuh-manager:55000"

    class Config:
        env_file = ".env"

settings = Settings()
