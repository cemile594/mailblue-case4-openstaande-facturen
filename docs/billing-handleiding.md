# Handleiding Billing: vervallen facturen in Asana

*Eén A4. Voor iedereen in het Billing-team die met het Asana-project "Billing – Openstaande facturen" werkt.*

## Wat is dit?
Vervalt een factuur in MoneyBird (betaaltermijn verstreken, nog niet betaald), dan doet de automation twee dingen:
1. Er komt **één Asana-taak per klant** in de sectie **Nieuw**. Heeft de klant meer vervallen facturen, dan blijft het één taak.
2. De klant krijgt in MailBlue de tag **`billing-dunning-actief`**. Daarmee start de **dunning-flow van Marketing**: herinneringsmails met het bedrag en een betaallink.

## Wat staat er in de taak?
- **Naam**: `Vervallen factuur – <klant> – <bedrag> (<aantal> facturen)`. Die wordt automatisch bijgewerkt.
- **Beschrijving**: de klant, het e-mailadres, het abonnement, alle vervallen facturen (bedrag, vervaldatum, dagen te laat, betaallink) en wat de automation al heeft gedaan.
- **Comments**: alles wat er daarna gebeurt, zoals een nieuwe vervallen factuur, een deelbetaling of een opzegging. De automation zet ze er zelf onder.
- **Deadline**: 2 werkdagen na aanmaken.

## Wat doe jij?
| Situatie | Wat je doet |
|---|---|
| Nieuwe taak | Zet hem in **In behandeling** zodra je ermee bezig bent. Kijk bij grote bedragen of een lange relatie of een belletje beter werkt dan alleen de mails |
| Afspraak gemaakt (bijv. betalen in termijnen) | Zet de taak in **Betalingsafspraak** en schrijf de afspraak in een comment. *Let op: de mails lopen door; zie "pauzeren" hieronder* |
| Klant zegt "ik heb al betaald" | Controleer de betaling in MoneyBird. Staat hij er (nog) niet, dan is de bank-sync misschien nog niet binnen |
| Factuur klopt niet | Maak een **creditfactuur** in MoneyBird en verreken hem met de originele factuur |
| Klant betaalt niet, gaat naar incasso | Zet de factuur in MoneyBird op **oninbaar** |
| Taak met **"E-mail: ONTBREEKT"** | De klant krijgt géén mails, want er is geen e-mailadres. Volg handmatig op en vul het e-mailadres aan in MoneyBird. Daarna start de mailflow vanzelf |
| Comment **"Actie Billing: creditfactuur … is nog niet verrekend"** | Verreken de creditfactuur met de originele factuur in MoneyBird |
| Comment **"LET OP: de klant heeft het abonnement opgezegd"** | De vordering blijft staan en de mails gaan door (met aangepaste tekst). Controleer of de laatste factuur terecht is. Zo niet: crediteren |

## Hoe stopt de dunning?
**Altijd via MoneyBird, nooit via Asana of MailBlue.** Betaling geregistreerd, creditfactuur verrekend of factuur op oninbaar: binnen een paar seconden gebeurt dan het volgende:
- de tag gaat eraf in MailBlue en de klant krijgt geen mails meer, ook niet als hij midden in de flow zat;
- de Asana-taak krijgt een comment met de reden, gaat naar **Afgerond** en wordt afgevinkt.

Een taak handmatig afvinken of de tag in MailBlue weghalen stopt de dunning **niet**. De automation zet de tag bij de volgende update terug, want MoneyBird zegt nog steeds dat er een vervallen factuur is.

**Pauzeren** (betalingsregeling, geschil) zit nog niet in de automation. Vraag het tot die tijd aan de automation-developer (zie [beheer](beheer.md)).

## Waar vind ik de geschiedenis?
- De comments onder de Asana-taak.
- In MailBlue: de **notities** op het contact en het veld **Dunning – status** (actief / betaald / gecrediteerd / oninbaar).
- Elke ochtend om 07:00 het **dagrapport in #billing**: hoeveel klanten in dunning, het totaalbedrag, en of er iets is rechtgezet.
- Heeft een klant al eerder een dunning-ronde gehad? Dan linkt de nieuwe taak naar de vorige.
