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

### Demo-versie in de MailBlue-trial
In de trial staat de automation **"Dunning-flow (demo) – openstaande facturen"** (id 2). Die is gebouwd via de ActiveCampaign-MCP (AI-automationbuilder) en daarna gecontroleerd en gecorrigeerd (zie [TOELICHTING](../TOELICHTING.md), "Hoe ik AI heb ingezet"). De volledige opbouw en de mailteksten staan in [mailblue-dunning-flow.md](mailblue-dunning-flow.md). Hij staat bewust **inactief**: de demo-contacten hebben fictieve adressen, en activeren is een beslissing van Marketing.

```
Trigger: tag billing-dunning-actief toegevoegd (multiple times)
 → [heeft tag?] nee → einde
   ja → mail 1 "Vriendelijke herinnering: je factuur staat nog open"
      → wacht 7 dagen
      → [heeft tag nog?] nee → einde
        ja → [Dunning – abonnement opgezegd = ja?]
               ja  → mail 2b "Je laatste openstaande factuur bij MailBlue" → wacht 7 dagen
                     → [heeft tag nog?] ja → mail 3 · nee → goal "Betaald of opgelost"
               nee → mail 2 "Tweede herinnering: openstaande factuur" → wacht 7 dagen
                     → [heeft tag nog?] ja → mail 3 → goal "Betaald of opgelost"
mail 3 = "Laatste herinnering vóór overdracht aan incasso" (betaal binnen 14 dagen)
Goal "Betaald of opgelost" = contact heeft tag billing-dunning-actief niet meer
```
In alle mails staan `%DUNNING_BEDRAG%`, `%DUNNING_FACTUREN%` en een knop **"Nu betalen"** met `%DUNNING_BETAALLINK%` (mail 1–3 ook `%DUNNING_VERVALDATUM%`), plus de zin "Heb je in de tussentijd al betaald?". Afzender en adres zijn in de trial nog de standaardwaarden van het account. Zet die vóór activeren op het Billing-adres.

## Niet veranderen zonder overleg met Billing/automation
- De **naam van de tag**: de automation zet en verwijdert hem op naam/ID.
- De **velden** (naam of personalisatietag). Toevoegen mag; hernoemen of verwijderen breekt de koppeling.
- **De tag handmatig zetten of weghalen** heeft geen zin: de automation zet hem bij de volgende update terug, op basis van MoneyBird. Moet een klant uit de flow (geschil, betalingsregeling), loop dan via Billing.
