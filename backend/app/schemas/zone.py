from pydantic import BaseModel, Field

class ZoneCreate(BaseModel):
    name: str = Field(...)
    type: str = Field(default="master")
    description: str | None = None

class ZoneRead(ZoneCreate):
    file: str | None = None
    serial: int = 1
