#!/usr/bin/env python3
"""Demo case 4: speelt de scenario's af tegen de lokale n8n en laat daarna de stand zien.

  python3 scripts/run_demo.py --reset          # alles terug naar de beginstand en dan scenario 01-16
  python3 scripts/run_demo.py --reset --tot 05 # alleen t/m scenario 05
  python3 scripts/run_demo.py --alleen 10      # één scenario
  python3 scripts/run_demo.py --check          # alleen de stand tonen (AC, Asana, dossiers, event-log, Slack-mock)

Reset = ActiveCampaign (tag/velden/notities demo-contacten) + Asana (taken in het project) + Data Tables (POST c4-setup).
Elk scenario is een JSON-bestand in scenarios/. Velden die met _ beginnen zijn uitleg/sturing:
  _endpoint: "sim" (standaard, de MoneyBird-simulator), "webhook" (rechtstreeks een MoneyBird-payload) of "dagcontrole"
  _headers:  extra headers (bijv. Idempotency-Key) · _verwacht: wat je zou moeten zien
Alleen standaardbibliotheek.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
N8N = os.environ.get("N8N_URL", "http://127.0.0.1:5690")
PAUZE = float(os.environ.get("PAUZE", "8"))  # verwerking loopt na de 200 nog door (MoneyBird, AC, Asana)
ENDPOINTS = {"sim": "/webhook/c4-moneybird-sim", "webhook": "/webhook/moneybird-events", "dagcontrole": "/webhook/c4-dagcontrole"}


def post(path, body, headers=None):
    req = urllib.request.Request(N8N + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


def get(path):
    with urllib.request.urlopen(N8N + path, timeout=60) as r:
        return json.loads(r.read())


def script(name, *args):
    subprocess.run([sys.executable, str(ROOT / "scripts" / name), *args], check=True,
                   stdout=subprocess.DEVNULL if "--check" not in args else None)


def reset():
    print("↺ Reset ActiveCampaign (tag, dunning-velden en case-4-notities van de demo-contacten)")
    script("setup_activecampaign.py", "--reset")
    print("↺ Reset Asana (taken in het Billing-project)")
    script("setup_asana.py", "--reset")
    print("↺ Reset Data Tables (mock-MoneyBird, dossiers, event-log, Slack-mock)")
    print("  ", post("/webhook/c4-setup", {})[1])


def run(path):
    sc = json.loads(path.read_text())
    endpoint = sc.get("_endpoint", "sim")
    body = {k: v for k, v in sc.items() if not k.startswith("_")}
    print(f"\n▶ {path.stem}\n  verwacht: {sc.get('_verwacht', '-')}")
    status, antwoord = post(ENDPOINTS[endpoint], body, sc.get("_headers"))
    try:
        a = json.loads(antwoord)
        if endpoint == "sim":
            antwoord = f"{a.get('melding')} → {a.get('webhook')} → C4-10: {[x.get('status') for x in a.get('antwoorden_c4_10', [])]}"
        elif endpoint == "dagcontrole":
            antwoord = a.get("text", antwoord)
    except (ValueError, AttributeError):
        pass
    print(f"  [HTTP {status}] {antwoord}")
    time.sleep(PAUZE)


def check():
    script("setup_activecampaign.py", "--check")
    script("setup_asana.py", "--check")
    st = get("/webhook/c4-status")
    print("\nDossiers (c4_dunning_cases)")
    for d in st["dossiers"]:
        print(f"- {d['klant']:<26} {d['status']:<8} € {float(d['openstaand_bedrag'] or 0):>7.2f}  rondes={d['rondes']}  {str(d['reden'])[:90]}")
    print("\nEvent-log (c4_event_log)")
    for e in sorted(st["event_log"], key=lambda x: x["id"]):
        print(f"  {e['id']:>2} {e['action']:<45} {e['status']:<10} {e['actie'] or '-':<15} {str(e['reden'])[:70]}")
    print("\nSlack-mock (c4_slack_messages)")
    for m in st["slack"]:
        print(f"  {m['channel']:<15} {m['severity']:<8} {m['text'].splitlines()[0][:110]}")


def main():
    sys.stdout.reconfigure(line_buffering=True)  # volgorde gelijk houden met de output van de subscripts
    args = sys.argv[1:]
    if "--check" in args and len(args) == 1:
        check()
        return
    if "--reset" in args:
        reset()
    files = sorted((ROOT / "scenarios").glob("*.json"))
    if "--alleen" in args:
        nr = args[args.index("--alleen") + 1]
        files = [f for f in files if f.name.startswith(nr)]
    if "--tot" in args:
        nr = args[args.index("--tot") + 1]
        files = [f for f in files if f.name[:2] <= nr]
    for f in files:
        run(f)
    print("\n══ Stand na de demo ══")
    check()


if __name__ == "__main__":
    main()
