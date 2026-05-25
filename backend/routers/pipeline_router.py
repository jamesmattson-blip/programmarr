import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

router = APIRouter()
DATA_DIR = Path(os.environ.get("PROGRAMMARR_DATA", Path(__file__).parent.parent.parent))
SCRIPTS_DIR = Path(os.environ.get("PROGRAMMARR_SCRIPTS", Path(__file__).parent.parent.parent))
LOGS_DIR = DATA_DIR / "logs"


def _env():
    env = os.environ.copy()
    env["PROGRAMMARR_DATA"] = str(DATA_DIR)
    return env


async def _stream(script: str, args: list[str], tag: str) -> AsyncGenerator[str, None]:
    LOGS_DIR.mkdir(exist_ok=True)
    cmd = [sys.executable, str(SCRIPTS_DIR / script)] + args
    log_path = LOGS_DIR / f"{tag}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

    yield f"data: {json.dumps({'type': 'start', 'cmd': ' '.join(cmd), 'log': log_path.name})}\n\n"

    lines: list[str] = []
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(DATA_DIR),
        env=_env(),
    )

    async for raw in proc.stdout:  # type: ignore[union-attr]
        line = raw.decode("utf-8", errors="replace").rstrip()
        lines.append(line)
        yield f"data: {json.dumps({'type': 'line', 'text': line})}\n\n"

    await proc.wait()

    with open(log_path, "w", encoding="utf-8") as f:
        f.write(f"# {tag} — {datetime.now().isoformat()}\n")
        f.write(f"# {' '.join(cmd)}\n\n")
        f.write("\n".join(lines))

    yield f"data: {json.dumps({'type': 'done', 'returncode': proc.returncode, 'log': log_path.name})}\n\n"


def _sse(gen: AsyncGenerator[str, None]) -> StreamingResponse:
    return StreamingResponse(
        gen,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/pipeline/export")
async def run_export():
    return _sse(_stream("export.py", [], "export"))


@router.get("/pipeline/csv")
def download_csv():
    p = DATA_DIR / "plex_library.csv"
    if not p.exists():
        raise HTTPException(404, "Run Export first")
    return FileResponse(str(p), filename="plex_library.csv", media_type="text/csv")


@router.get("/pipeline/csv/info")
def csv_info():
    p = DATA_DIR / "plex_library.csv"
    if not p.exists():
        return {"exists": False}
    stat = p.stat()
    rows, preview = 0, []
    try:
        with open(p, encoding="utf-8") as f:
            for i, line in enumerate(f):
                rows += 1
                if i < 21:
                    preview.append(line.rstrip())
    except Exception:
        pass
    return {"exists": True, "size": stat.st_size, "rows": max(0, rows - 1), "modified": stat.st_mtime, "preview": preview}


@router.get("/pipeline/prompt")
def get_prompt(target: str = "", preferences: str = ""):
    for candidate in [DATA_DIR / "PROMPT.md", SCRIPTS_DIR / "PROMPT.md"]:
        if candidate.exists():
            content = candidate.read_text(encoding="utf-8")
            if target:
                content = content.replace("{TARGET}", target)
            if preferences:
                inj = (
                    "\n## User Preferences\n\n"
                    "The user has specifically requested the following channels or themes. "
                    "Treat these as high-priority — if the library has enough content to support them, "
                    "they must appear in the output:\n\n"
                    f"{preferences}\n"
                )
                content = content.replace("## Channel Numbering Scheme", inj + "\n## Channel Numbering Scheme")
            return {"content": content}
    raise HTTPException(404, "PROMPT.md not found")


@router.post("/pipeline/validate")
async def validate(file: Optional[UploadFile] = File(None), content: Optional[str] = Form(None)):
    if file:
        raw = (await file.read()).decode("utf-8", errors="replace")
    elif content:
        raw = content
    else:
        raise HTTPException(400, "Provide file or content")

    try:
        data = json.loads(raw)
        if isinstance(data, list):
            data = {"channels": data, "orphaned": [], "suggested_channels": []}
        elif not (isinstance(data, dict) and "channels" in data):
            raise ValueError("not a channel dict")
    except Exception:
        channels = []
        for line in raw.splitlines():
            line = line.strip()
            if line.startswith("{"):
                try:
                    obj = json.loads(line)
                    if "number" in obj:
                        channels.append(obj)
                except Exception:
                    pass
        if not channels:
            return {"ok": False, "error": "No valid channel objects found"}
        data = {"channels": channels, "orphaned": [], "suggested_channels": []}

    with open(DATA_DIR / "channels.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    return {"ok": True, "count": len(data.get("channels", [])), "channels": data.get("channels", [])}


@router.post("/pipeline/no-ai")
async def run_no_ai():
    return _sse(_stream("generate_no_ai.py", [], "no_ai"))


@router.post("/pipeline/collections")
async def run_collections(
    base: str = Query("80"),
    min_items: str = Query("3"),
    condense: bool = Query(False),
):
    args = ["--apply", "--base", base, "--min-items", min_items]
    if condense:
        args.append("--condense")
    return _sse(_stream("generate_from_collections.py", args, "collections"))


@router.post("/pipeline/probe")
async def run_probe(from_channel: Optional[str] = Query(None)):
    args = ["--probe"]
    if from_channel:
        args += ["--from", from_channel]
    return _sse(_stream("create.py", args, "probe"))


@router.post("/pipeline/deploy")
async def run_deploy(from_channel: Optional[str] = Query(None)):
    args = []
    if from_channel:
        args += ["--from", from_channel]
    return _sse(_stream("create.py", args, "deploy"))


@router.post("/pipeline/images")
async def run_images():
    return _sse(_stream("fetch_images.py", ["--apply"], "images"))


@router.post("/pipeline/sync")
async def run_sync():
    return _sse(_stream("sync_plex.py", [], "sync"))
