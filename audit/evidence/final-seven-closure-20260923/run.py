"""Sequential bounded command receipts for the seven selected originals."""
import datetime
import hashlib
import json
import os
import pathlib
import shlex
import subprocess
import sys

ROOT = pathlib.Path(".")
MISSION = pathlib.Path("validation/brand-v2-editorial/source-recovery-20260906/closure-final-seven-integration-20260923")
receipt = MISSION / "command-receipts.json"
data = json.loads(receipt.read_text()) if receipt.exists() else {"commands": []}
number = len(data["commands"]) + 1
log = MISSION / f"{number:03d}-command.log"
command = sys.argv[1:]
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open("x") as stream:
    result = subprocess.run(
        command, cwd=ROOT, env={**os.environ, "NODE_DISABLE_COMPILE_CACHE": "1"},
        stdout=stream, stderr=subprocess.STDOUT, check=False,
    )
ended = datetime.datetime.now(datetime.timezone.utc).isoformat()
raw = log.read_bytes()
entry = {
    "command": shlex.join(command), "cwd": str(ROOT),
    "environment": {"NODE_DISABLE_COMPILE_CACHE": "1"},
    "startedAt": started, "endedAt": ended, "exitCode": result.returncode,
    "logPath": str(log), "logBytes": len(raw), "logSha256": hashlib.sha256(raw).hexdigest(),
}
data["commands"].append(entry)
receipt.write_text(json.dumps(data, indent=2) + "\n")
print(json.dumps(entry, indent=2))
print("\n".join(log.read_text(errors="replace").splitlines()[-65:]))
sys.exit(result.returncode)
