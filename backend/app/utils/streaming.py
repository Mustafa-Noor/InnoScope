"""Utilities for Server-Sent Events (SSE) streaming."""

import json
from typing import Any, Dict


def format_sse(data: Dict[str, Any], event: str = "message") -> str:
    """Format data as Server-Sent Event.
    
    Args:
        data: Dictionary to send as JSON
        event: Event type (default: "message")
    
    Returns:
        Formatted SSE string
    """
    msg = f"event: {event}\n"
    msg += f"data: {json.dumps(data)}\n\n"
    return msg


def format_status(message: str, progress: int = None, stage: str = None) -> str:
    """Format a status update as SSE.
    
    Args:
        message: Status message to display
        progress: Optional progress percentage (0-100)
        stage: Optional stage identifier
    
    Returns:
        Formatted SSE status event
    """
    data = {"message": message}
    if progress is not None:
        data["progress"] = progress
    if stage is not None:
        data["stage"] = stage
    return format_sse(data, event="status")


def format_error(error: str) -> str:
    """Format an error as SSE.
    
    Args:
        error: Error message
    
    Returns:
        Formatted SSE error event
    """
    return format_sse({"error": error}, event="error")


def format_complete(result: Dict[str, Any]) -> str:
    """Format completion event as SSE.
    
    Args:
        result: Final result data
    
    Returns:
        Formatted SSE complete event
    """
    return format_sse(result, event="complete")
