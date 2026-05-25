import os
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()
DATA_DIR = Path(os.environ.get("PROGRAMMARR_DATA", Path(__file__).parent.parent.parent))
LOGS_DIR = DATA_DIR / "logs"


@router.get("/logs")
def list_logs():
    LOGS_DIR.mkdir(exist_ok=True)
    logs = []
    for f in sorted(LOGS_DIR.glob("*.log"), key=lambda x: x.stat().st_mtime, reverse=True)[:20]:
        s = f.stat()
        logs.append({"name": f.name, "size": s.st_size, "modified": s.st_mtime})
    return logs


@router.get("/logs/{name}")
def get_log(name: str):
    if "/" in name or "\\" in name or ".." in name:
        raise HTTPException(400, "Invalid name")
    p = LOGS_DIR / name
    if not p.exists():
        raise HTTPException(404, "Not found")
    return {"name": name, "content": p.read_text(encoding="utf-8")}
