#!/usr/bin/env python3
"""Zet Asana klaar voor case 4 — idempotent.

  python3 setup_asana.py            # project "Billing – Openstaande facturen (case 4)" + secties
  python3 setup_asana.py --reset    # alle taken in dat project verwijderen (demo opnieuw beginnen)
  python3 setup_asana.py --check    # taken per sectie, met status en comments (verificatie na de demo)

Leest ASANA_PAT uit ../.env (nooit uit argumenten, nooit printen).
Schrijft de gids (geen secrets) naar ../mock-data/asana_ids.json; die gaan in de Config-node van C4-11.
Alleen standaardbibliotheek.
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
IDS_PATH = ROOT / "mock-data" / "asana_ids.json"
PROJECT = "Billing – Openstaande facturen (case 4)"
SECTIONS = ["Nieuw", "In behandeling", "Betalingsafspraak", "Afgerond"]
PROJECT_NOTES = (
    "Taken in dit project worden automatisch aangemaakt door n8n (workflow C4-11 Klant herberekenen) "
    "zodra een klant een vervallen factuur in MoneyBird heeft. Eén taak per klant, niet per factuur.\n\n"
    "Nieuw = net aangemaakt · In behandeling = Billing is ermee bezig · Betalingsafspraak = afspraak gemaakt, "
    "wacht op betaling · Afgerond = betaald/gecrediteerd/oninbaar (de automation sluit de taak zelf af).\n\n"
    "Handleiding: docs/billing-handleiding.md in de repo."
)


def load_pat():
    env = {}
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    pat = env.get("ASANA_PAT", "")
    if not pat:
        sys.exit("ASANA_PAT ontbreekt in .env (Asana → My settings → Apps → Developer apps → Personal access token)")
    return pat


PAT = load_pat()


def api(method, path, body=None, params=None):
    url = "https://app.asana.com/api/1.0/" + path.lstrip("/")
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps({"data": body}).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json",
                                          "Accept": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
                return json.loads(raw).get("data") if raw else {}
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:
                time.sleep(2)
                continue
            detail = e.read().decode(errors="replace")[:400]
            raise SystemExit(f"Asana {method} {path} -> HTTP {e.code}: {detail}")


def main():
    me = api("GET", "users/me", params={"opt_fields": "gid,name,workspaces.name,workspaces.gid"})
    ws = me["workspaces"][0]
    projects = api("GET", "projects", params={"workspace": ws["gid"], "archived": "false", "limit": 100})
    proj = next((p for p in projects if p["name"] == PROJECT), None)
    if not proj:
        body = {"name": PROJECT, "workspace": ws["gid"], "notes": PROJECT_NOTES, "default_view": "board"}
        try:
            proj = api("POST", "projects", body)
        except SystemExit as e:  # organisatie-workspaces vereisen een team
            if "team" not in str(e):
                raise
            team = api("GET", f"organizations/{ws['gid']}/teams")[0]
            proj = api("POST", "projects", {**body, "team": team["gid"]})
        print(f"project aangemaakt: {proj['gid']}")
    sections = {s["name"]: s["gid"] for s in api("GET", f"projects/{proj['gid']}/sections")}
    for name in SECTIONS:
        if name not in sections:
            sections[name] = api("POST", f"projects/{proj['gid']}/sections", {"name": name})["gid"]
    # standaardsectie van een nieuw project ("Untitled section" / "To do") weghalen als hij leeg is
    for name, gid in list(sections.items()):
        if name not in SECTIONS and not api("GET", "tasks", params={"section": gid, "limit": 1}):
            api("DELETE", f"sections/{gid}")
            sections.pop(name)

    ids = {"workspace_gid": ws["gid"], "workspace_naam": ws["name"], "project_gid": proj["gid"],
           "sections": {n: sections[n] for n in SECTIONS}, "assignee_gid": me["gid"]}
    IDS_PATH.write_text(json.dumps(ids, indent=2, ensure_ascii=False) + "\n")

    if "--reset" in sys.argv:
        for t in api("GET", "tasks", params={"project": proj["gid"], "limit": 100}):
            api("DELETE", f"tasks/{t['gid']}")
            print(f"  taak verwijderd: {t['name']}")
    if "--check" in sys.argv:
        print(f"\nAsana — {PROJECT}")
        for name in SECTIONS:
            tasks = api("GET", "tasks", params={"section": sections[name], "limit": 100,
                                                "opt_fields": "name,completed,due_on"})
            print(f"  [{name}] {len(tasks)} taak/taken")
            for t in tasks:
                stories = api("GET", f"tasks/{t['gid']}/stories", params={"opt_fields": "type,text"})
                comments = [s["text"].splitlines()[0][:90] for s in stories if s.get("type") == "comment"]
                print(f"    - {'✔' if t['completed'] else '○'} {t['name']} (deadline {t.get('due_on')})")
                for c in comments:
                    print(f"        💬 {c}")
        return
    print(json.dumps(ids, indent=2, ensure_ascii=False))
    print(f"\nGids geschreven naar {IDS_PATH}")


if __name__ == "__main__":
    main()
