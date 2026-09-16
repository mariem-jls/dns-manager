from pydantic import BaseModel, Field


class ZoneCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=253)
    type: str = Field(default="master", pattern="^(master|slave)$")
    description: str | None = None


class ZoneUpdate(BaseModel):
    description: str | None = None


class ZoneRead(BaseModel):
    name: str
    type: str
    file: str | None = None
    serial: int = 1
    description: str | None = None