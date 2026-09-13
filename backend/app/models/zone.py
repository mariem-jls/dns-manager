from dataclasses import dataclass

@dataclass
class Zone:
    name: str
    type: str = "master"
    file: str | None = None
    serial: int = 1
    description: str | None = None
