# Contract met Marketing: tag en velden voor de dunning-flow

*Wat de automation levert, wat de dunning-flow daarmee doet, en wat je niet moet veranderen.*

## Wat de automation levert
**Tag `billing-dunning-actief`**
- Wordt **gezet** zodra een klant een vervallen factuur heeft in MoneyBird (één keer, ook bij meerdere facturen).
- Wordt **verwijderd** zodra er niets meer te innen valt: betaald, gecrediteerd, oninbaar of verwijderd.
- Staat de tag er al, dan zet de automation hem niet opnieuw. De flow herstart dus niet bij een tweede factuur.

**Contactvelden**: worden gevuld *voordat* de tag wordt gezet, dus de eerste mail klopt meteen.

| Veld | Personalisatietag | Voorbeeld |
|---|---|---|
| Dunning – status | `%DUNNING_STATUS%` | actief · betaald · gecrediteerd · oninbaar |
| Dunning – openstaand bedrag | `%DUNNING_BEDRAG%` | € 118,00 |
| Dunning – aantal facturen | `%DUNNING_AANTAL%` | 2 |
| Dunning – factuurnummers | `%DUNNING_FACTUREN%` | 2026-0501, 2026-0567 |
| Dunning – oudste vervaldatum | `%DUNNING_VERVALDATUM%` | 2026-10-15 (datumveld) |
| Dunning – betaallink | `%DUNNING_BETAALLINK%` | link naar de online factuur |
| Dunning – abonnement opgezegd | `%DUNNING_OPGEZEGD%` | ja / nee |
| MoneyBird contact-ID | `%MONEYBIRD_CONTACT_ID%` | koppelsleutel, niet in mails gebruiken |

Bij een deelbetaling of een nieuwe vervallen factuur worden bedrag en facturen bijgewerkt. De volgende mail in de flow heeft dus het actuele bedrag. Bij het stoppen worden bedrag, facturen en betaallink leeggemaakt.

## Wat de dunning-flow nodig heeft (eenmalige aanpassing)
De flow bestaat al. Het enige dat moet kloppen:

1. **Trigger**: *Tag is toegevoegd* → `billing-dunning-actief`, met **"Runs: multiple times"**. Een klant kan na een betaling later opnieuw een vervallen factuur hebben.
2. **Goal "Betaald of opgelost"**: voorwaarde *Contact heeft tag `billing-dunning-actief` **niet***. Kies *"Contacts can enter this goal from anywhere in the automation"* en *"If the contact does not meet this goal: wait until conditions are met"*, met daarna *Einde automation*. Zodra de automation de tag weghaalt, springt de klant hiernaartoe, ook midden in een wachtstap.
3. **Vóór elke mail een check** *"Heeft tag `billing-dunning-actief`?"* (Ja → mail, Nee → einde). Dit is een extra zekerheid naast de goal.
4. **Tekst**:
   - Gebruik `%DUNNING_BEDRAG%`, `%DUNNING_FACTUREN%` en `%DUNNING_BETAALLINK%` in plaats van vaste bedragen.
   - Zet in elke mail: *"Heb je in de tussentijd al betaald? Dan kun je deze mail negeren."* Een betaling kan via de bank een dag later in MoneyBird staan.
   - Maak een aparte tekst voor `%DUNNING_OPGEZEGD%` = *ja*: geen "je account wordt gepauzeerd" naar iemand die al heeft opgezegd. Dat kan met een If/Else op het veld.
5. **Mailtype**: stuur dunning-mails als **transactionele mail**. Een klant die zich heeft afgemeld voor marketing, moet een betalingsherinnering nog steeds ontvangen.

Voorbeeld van de opbouw (demo-versie in de trial):
```
Trigger: tag billing-dunning-actief toegevoegd (multiple times)
 → [tag nog aanwezig?] → mail 1 "Vriendelijke herinnering" (bedrag, facturen, betaallink)
 → wacht 7 dagen
 → [tag nog aanwezig?] → If opgezegd = ja → mail 2b "Laatste openstaande factuur"
                         else          → mail 2  "Tweede herinnering"
 → wacht 7 dagen
 → [tag nog aanwezig?] → mail 3 "Laatste herinnering" (vóór incasso / 14-dagenbrief)
Goal (overal vandaan): tag billing-dunning-actief bestaat niet meer → einde
```

## Niet veranderen zonder overleg met Billing/automation
- De **naam van de tag**: de automation zet en verwijdert hem op naam/ID.
- De **velden** (naam of personalisatietag). Toevoegen mag; hernoemen of verwijderen breekt de koppeling.
- **De tag handmatig zetten of weghalen** heeft geen zin: de automation zet hem bij de volgende update terug, op basis van MoneyBird. Moet een klant uit de flow (geschil, betalingsregeling), loop dan via Billing.
