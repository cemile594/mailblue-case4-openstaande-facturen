#!/usr/bin/env python3
"""Exporteert de n8n-workflows (bron: workflows/local/C4-*.workflow.ts) naar n8n-JSON in ../export/.
Vervangt de accountspecifieke ActiveCampaign-URL door een placeholder. Credentials zitten nooit in een
export (alleen een naam/id-verwijzing)."""
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "workflows" / "local"
OUT = ROOT / "export"
OUT.mkdir(exist_ok=True)
for ts in sorted(SRC.glob("C4-*.workflow.ts")):
    target = OUT / ts.name.replace(".workflow.ts", ".json")
    subprocess.run(["n8nac", "convert", str(ts), "-o", str(target), "--force"], check=True,
                   capture_output=True, env={**os.environ, "N8NAC_TELEMETRY_DISABLED": "1"})
    wf = json.loads(target.read_text())
    for n in wf.get("nodes", []):
        js = n.get("parameters", {}).get("jsCode")
        if js:
            n["parameters"]["jsCode"] = re.sub(r"https://[a-z0-9-]+\.api-us1\.com", "https://<jouw-account>.api-us1.com", js)
    target.write_text(json.dumps(wf, indent=2, ensure_ascii=False) + "\n")
    print("✔", target.relative_to(ROOT))
