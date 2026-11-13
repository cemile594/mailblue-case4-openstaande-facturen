#!/usr/bin/env python3
"""Zet de ActiveCampaign (MailBlue) trial klaar voor case 4 — idempotent.

  python3 setup_activecampaign.py            # tag, contactvelden (met personalisatietags), demo-contacten
  python3 setup_activecampaign.py --reset    # tag los + dunning-velden leeg + case-4-notities weg bij de demo-contacten
  python3 setup_activecampaign.py --check    # per demo-contact: tag ja/nee, veldwaarden, aantal notities

Leest AC_API_URL en AC_API_KEY uit ../.env (nooit uit argumenten, nooit printen).
Schrijft de ID's (geen secrets) naar ../mock-data/activecampaign_ids.json; die gaan in de Config-node van C4-11.
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
CONTACTS = json.loads((ROOT / "mock-data" / "moneybird_contacts.json").read_text())
IDS_PATH = ROOT / "mock-data" / "activecampaign_ids.json"

TAG = "billing-dunning-actief"
TAG_DESC = ("Case 4: zet de dunning-flow van Marketing aan. Wordt gezet en verwijderd door n8n "
            "(C4-11 Klant herberekenen). Niet handmatig zetten of hernoemen.")
# key -> (titel, perstag, type). De perstag is wat Marketing in de mails gebruikt: %DUNNING_BEDRAG%
FIELDS = {
    "status":       ("Dunning – status", "DUNNING_STATUS", "text"),
    "bedrag":       ("Dunning – openstaand bedrag", "DUNNING_BEDRAG", "text"),
    "aantal":       ("Dunning – aantal facturen", "DUNNING_AANTAL", "text"),
    "facturen":     ("Dunning – factuurnummers", "DUNNING_FACTUREN", "text"),
    "vervaldatum":  ("Dunning – oudste vervaldatum", "DUNNING_VERVALDATUM", "date"),
    "betaallink":   ("Dunning – betaallink", "DUNNING_BETAALLINK", "text"),
    "opgezegd":     ("Dunning – abonnement opgezegd", "DUNNING_OPGEZEGD", "text"),
    "mb_contact":   ("MoneyBird contact-ID", "MONEYBIRD_CONTACT_ID", "text"),
}
FIELD_DESC = "Case 4: gevuld door n8n (C4-11). Bron van waarheid is MoneyBird; niet handmatig aanpassen."
NOTE_MARKER = "[case 4]"


def load_env():
    env = {}
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    url, key = env.get("AC_API_URL", "").rstrip("/"), env.get("AC_API_KEY", "")
    if not url or not key:
        sys.exit("AC_API_URL / AC_API_KEY ontbreken in .env")
    return url, key


BASE, KEY = load_env()


def api(method, path, body=None, params=None):
    url = BASE + "/api/3/" + path.lstrip("/")
    if params:
        url += "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
                                 headers={"Api-Token": KEY, "Content-Type": "application/json",
                                          "Accept": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 3:  # AC rate limit: 5 req/s
                time.sleep(1.5)
                continue
            detail = e.read().decode(errors="replace")[:400]
            raise SystemExit(f"AC {method} {path} -> HTTP {e.code}: {detail}")


def ensure_tag():
    found = [t for t in api("GET", "tags", params={"search": TAG}).get("tags", []) if t["tag"] == TAG]
    if found:
        return found[0]["id"]
    return api("POST", "tags", {"tag": {"tag": TAG, "tagType": "contact", "description": TAG_DESC}})["tag"]["id"]


def ensure_fields():
    existing = {}
    offset = 0
    while True:
        page = api("GET", "fields", params={"limit": 100, "offset": offset}).get("fields", [])
        for f in page:
            existing[f.get("perstag", "").upper()] = f["id"]
        if len(page) < 100:
            break
        offset += 100
    ids = {}
    for key, (title, perstag, ftype) in FIELDS.items():
        if perstag in existing:
            ids[key] = existing[perstag]
            continue
        f = api("POST", "fields", {"field": {"type": ftype, "title": title, "descript": FIELD_DESC,
                                              "perstag": perstag, "isrequired": 0, "visible": 1}})["field"]
        api("POST", "fieldRels", {"fieldRel": {"field": f["id"], "relid": 0}})  # beschikbaar voor alle lijsten
        ids[key] = f["id"]
        print(f"  veld aangemaakt: {title} (%{perstag}%) -> {f['id']}")
    return ids


def contact_id_by_email(email):
    cs = api("GET", "contacts", params={"email": email}).get("contacts", [])
    return cs[0]["id"] if cs else None


def demo_contacts():
    """Bestaande MailBlue-klanten: alleen de demo-klanten met een e-mailadres (Kapsalon Knip heeft er bewust geen)."""
    return [c for c in CONTACTS if c["email"]]


def sync_contacts(field_ids):
    for c in demo_contacts():
        api("POST", "contact/sync", {"contact": {
            "email": c["email"], "firstName": c["firstname"], "lastName": c["lastname"],
            "fieldValues": [{"field": field_ids["mb_contact"], "value": c["contact_id"]}]}})


def reset(tag_id, field_ids):
    for c in demo_contacts():
        cid = contact_id_by_email(c["email"])
        if not cid:
            continue
        for ct in api("GET", f"contacts/{cid}/contactTags").get("contactTags", []):
            if str(ct["tag"]) == str(tag_id):
                api("DELETE", f"contactTags/{ct['id']}")
        api("POST", "contact/sync", {"contact": {"email": c["email"], "fieldValues": [
            {"field": fid, "value": ""} for k, fid in field_ids.items() if k != "mb_contact"]}})
        for n in api("GET", f"contacts/{cid}/notes").get("notes", []):
            if NOTE_MARKER in (n.get("note") or ""):
                api("DELETE", f"notes/{n['id']}")
        print(f"  gereset: {c['company_name']} ({c['email']})")


def check(tag_id, field_ids):
    by_id = {str(v): k for k, v in field_ids.items()}
    print(f"\nActiveCampaign — tag '{TAG}' en dunning-velden per demo-contact")
    for c in demo_contacts():
        cid = contact_id_by_email(c["email"])
        if not cid:
            print(f"- {c['company_name']}: (nog) geen contact")
            continue
        tags = [str(ct["tag"]) for ct in api("GET", f"contacts/{cid}/contactTags").get("contactTags", [])]
        vals = {by_id[str(fv["field"])]: fv["value"] for fv in api("GET", f"contacts/{cid}/fieldValues").get("fieldValues", [])
                if str(fv["field"]) in by_id}
        notes = [n for n in api("GET", f"contacts/{cid}/notes").get("notes", []) if NOTE_MARKER in (n.get("note") or "")]
        tag_txt = "JA " if str(tag_id) in tags else "nee"
        print(f"- {c['company_name']:<26} tag={tag_txt} status={vals.get('status') or '-':<13} "
              f"bedrag={vals.get('bedrag') or '-':<10} facturen={vals.get('facturen') or '-'} "
              f"opgezegd={vals.get('opgezegd') or '-'} notities={len(notes)}")


def main():
    tag_id = ensure_tag()
    field_ids = ensure_fields()
    ids = {"tag_dunning": tag_id, "fields": field_ids, "tag_naam": TAG}
    IDS_PATH.write_text(json.dumps(ids, indent=2, ensure_ascii=False) + "\n")
    if "--check" in sys.argv:
        check(tag_id, field_ids)
        return
    if "--reset" in sys.argv:
        reset(tag_id, field_ids)
    sync_contacts(field_ids)
    print(json.dumps(ids, indent=2, ensure_ascii=False))
    print(f"\nID's geschreven naar {IDS_PATH}")


if __name__ == "__main__":
    main()
