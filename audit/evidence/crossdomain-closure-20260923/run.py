"""Bounded, sequential command receipts; no catalog-supplied commands."""
import datetime
import json
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(".")
MISSION = pathlib.Path("validation/brand-v2-editorial/source-recovery-20260906/closure-crossdomain-integration-20260923")
receipt = MISSION / "command-receipts.json"
data = json.loads(receipt.read_text()) if receipt.exists() else {"commands": []}
number = len(data["commands"]) + 1
log = MISSION / f"{number:03d}-command.log"
command = sys.argv[1:]
start = datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open("x") as stream:
    result = subprocess.run(command, cwd=ROOT, env={**os.environ, "NODE_DISABLE_COMPILE_CACHE": "1"},
                            stdout=stream, stderr=subprocess.STDOUT, check=False)
end = datetime.datetime.now(datetime.timezone.utc).isoformat()
data["commands"].append({"command": subprocess.list2cmdline(command), "cwd": str(ROOT),
    "environment": {"NODE_DISABLE_COMPILE_CACHE": "1"}, "startedAt": start, "endedAt": end,
    "exitCode": result.returncode, "logPath": str(log), "observation": "Actual sequential execution; see complete regular log."})
receipt.write_text(json.dumps(data, indent=2) + "\n")
print(log.read_text())
print(f"Receipt {number}: exit {result.returncode}; {log}")
sys.exit(result.returncode)
