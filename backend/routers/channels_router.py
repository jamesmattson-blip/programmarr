import json
import os
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter()
DATA_DIR = Path(os.environ.get("PROGRAMMARR_DATA", Path(__file__).parent.parent.parent))


def _path() -> Path:
    return DATA_DIR / "channels.json"


def load() -> dict:
    try:
        with open(_path()) as f:
            data = json.load(f)
        if isinstance(data, list):
            return {"channels": data, "orphaned": [], "suggested_channels": []}
        return data
    except FileNotFoundError:
        return {"channels": [], "orphaned": [], "suggested_channels": []}
    except Exception as e:
        raise HTTPException(500, f"channels.json unreadable: {e}")


def save(data: dict):
    with open(_path(), "w") as f:
        json.dump(data, f, indent=2)


@router.get("/channels")
def get_channels():
    return load()


@router.put("/channels")
def replace_channels(data: dict):
    save(data)
    return {"ok": True}


@router.get("/channels/{number}")
def get_channel(number: int):
    for ch in load().get("channels", []):
        if ch.get("number") == number:
            return ch
    raise HTTPException(404, f"Channel {number} not found")


@router.put("/channels/{number}")
def update_channel(number: int, channel: dict):
    data = load()
    for i, ch in enumerate(data.get("channels", [])):
        if ch.get("number") == number:
            data["channels"][i] = channel
            save(data)
            return {"ok": True}
    raise HTTPException(404, f"Channel {number} not found")


@router.delete("/channels/{number}")
def delete_channel(number: int):
    data = load()
    before = len(data.get("channels", []))
    data["channels"] = [ch for ch in data.get("channels", []) if ch.get("number") != number]
    if len(data["channels"]) == before:
        raise HTTPException(404, f"Channel {number} not found")
    save(data)
    return {"ok": True}


@router.get("/library/titles")
def library_titles():
    csv = DATA_DIR / "plex_library.csv"
    if not csv.exists():
        return []
    titles = []
    try:
        with open(csv, encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i == 0:
                    continue
                parts = line.split(",", 1)
                if parts:
                    titles.append(parts[0].strip().strip('"'))
    except Exception:
        pass
    return titles
