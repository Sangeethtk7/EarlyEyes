"""
Pydantic v2 schemas for the Child endpoints.
"""
import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ChildCreateRequest(BaseModel):
    """Payload to register a new child profile."""

    name: str
    date_of_birth: date
    gender: Optional[str] = None
    notes: Optional[str] = None


class ChildResponse(BaseModel):
    """Serialised representation of a child profile."""

    id: uuid.UUID
    parent_id: uuid.UUID
    name: str
    date_of_birth: date
    gender: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
