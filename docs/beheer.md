# Beheer: factuur-automation (case 4)

*Voor de automation-developer, of wie het overneemt.*

## Wat draait er
| Workflow | Trigger | Rol |
|---|---|---|
| C4-10 Factuur-events ontvangen | Webhook `POST /webhook/moneybird-events` (geregistreerd in MoneyBird) | Controleren, ontdubbelen, vastleggen, doorgeven |
| C4-11 Klant herberekenen | Sub-workflow (aangeroepen door 10 en 12) | Alle regels + acties in MailBlue en Asana |
| C4-12 Dagelijkse controle | Elke dag 07:00 + `POST /webhook/c4-dagcontrole` | Vangnet + dagrapport in #billing |
| C4-13 Foutafhandeling | Error workflow van 10/11/12 | Alert in #billing-alerts. **Moet actief zijn** |

Opslag: `c4_dunning_cases` (één rij per klant: status, Asana-taak, MailBlue-contact, facturen) en `c4_event_log` (één rij per webhook: status received/processed/ignored, actie, reden).

## Alerts en wat je doet
| Melding | Betekenis | Actie |
|---|---|---|
| **#billing-alerts: "Factuur-automation mislukt"** | Een workflow is gecrasht, bijv. MailBlue of Asana onbereikbaar na 3 pogingen | Open de execution-link. Niets is verloren: het event staat op *received*. Na het oplossen: start C4-12 handmatig (`POST /webhook/c4-dagcontrole`), of wacht tot 07:00. Opnieuw draaien maakt niets dubbel |
| **#billing-alerts: "… geen e-mailadres in MoneyBird"** | Klant kan niet in de mailflow | Billing volgt op via de Asana-taak (zie handleiding) |
| **#billing dagrapport met correcties** | Er is een webhook gemist en die is nu rechtgezet | Bij af en toe één: niets. Komt het vaak voor, check dan de webhook in MoneyBird (`GET /webhooks` toont de laatste HTTP-status en body per push) |
| **Geen dagrapport om 07:00** | C4-12 of n8n draait niet | Check n8n. In productie: een dead man's switch op dit rapport |

## Veelvoorkomende vragen
- **"Waarom zit klant X in de flow?"** Zoek de klant in `c4_dunning_cases` (reden, facturen) en `c4_event_log` (welke webhooks). Of open de Asana-taak: de beschrijving en comments vertellen het hele verhaal.
- **"Klant X heeft betaald maar krijgt nog mails."** Check in MoneyBird of de betaling geregistreerd is. Zo ja: kijk in het event-log of de `paid`-webhook binnenkwam. Zo niet: start C4-12. Check in MailBlue of de goal "tag bestaat niet meer" nog in de automation staat.
- **Een klant opnieuw laten berekenen**: `POST /webhook/c4-dagcontrole` herberekent iedereen. Dat is veilig, want C4-11 doet "niets" als er niets veranderd is.

## Regels aanpassen
- **Drempelbedrag, deadline, ID's**: de **Config**-node in C4-11. Gaat in overleg met Billing (eigenaar van de regels).
- **Wanneer iets in of uit dunning gaat**: de Code-node **"Gewenste stand bepalen"** in C4-11, met commentaar per regel. Draai na een wijziging de scenario's: `python3 scripts/run_demo.py --reset`.
- **Tag of veldnamen**: niet zonder Marketing. Dit is het contract ([marketing-contract.md](marketing-contract.md)).
- Werk via Git + n8n-as-code (`n8nac push`), zodat de geschiedenis bewaard blijft.

## Eigenaarschap
| Wat | Eigenaar |
|---|---|
| Regels (wanneer dunning, drempel, stoppen) | Billing |
| Inhoud, timing en toon van de dunning-flow | Marketing |
| Contract tag + velden + goal | Billing + Marketing samen |
| Workflows, credentials, monitoring | Automation-developer |
