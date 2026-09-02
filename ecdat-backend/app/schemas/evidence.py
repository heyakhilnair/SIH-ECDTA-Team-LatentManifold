from pydantic import BaseModel
from typing import Optional, Any, Dict

class Evidence(BaseModel):
    source_type: str
    file_path: str
    line_number: int
    raw_match: str
    context_lines: str
    detector: str
    confidence: float
    raw_metadata: Dict[str, Any] = {}
