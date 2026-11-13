# Toelichting case 4: end-to-end automation rond openstaande facturen

De werkende uitwerking staat in de [README](README.md). Hier staan de keuzes, langs de vier vragen uit de case.

---

## 1. Hoe ontwerp je deze automation end-to-end? Wat gebeurt waar, en waarom?

### Het principe
De makkelijkste versie is "bij webhook *late*: tag erop, taak aanmaken; bij webhook *paid*: tag eraf". Die gaat in de praktijk mis. Webhooks komen dubbel, in de verkeerde volgorde of helemaal niet. Een klant heeft drie facturen open en betaalt er één. Een creditfactuur is technisch ook een factuur. Daarom heb ik voor dit principe gekozen:

> **Het event is de aanleiding, MoneyBird is de waarheid, en per klant wordt de stand herberekend.**

Elke webhook leidt tot dezelfde stap: *haal alle facturen en het abonnement van deze klant opnieuw op bij MoneyBird, bepaal de gewenste stand, vergelijk die met wat we al gedaan hebben* (het dossier). Daaruit volgt precies één actie: **start, bijwerken, stoppen of niets**. De `state` in de webhook-payload gebruik ik bewust niet. MoneyBird zegt zelf in de docs dat de entity inmiddels veranderd kan zijn.

### Wat gebeurt waar

| Waar | Wat | Waarom daar |
|---|---|---|
| **MoneyBird** | Bron van waarheid voor de factuurstatus. Bepaalt *wanneer* iets vervallen is (betaaltermijn), stuurt webhooks | Billing werkt hier al. Eén definitie van "vervallen", zonder dat de automation zelf met vervaldatums gaat rekenen |
| **n8n / Make** | Alle logica: controleren, ontdubbelen, herberekenen, acties, logging, foutafhandeling, dagelijkse controle | MoneyBird, MailBlue en Asana kennen elkaar niet. De regels moeten op één plek staan die je kunt testen en loggen |
| **MailBlue** | Alleen een **tag** en **contactvelden** op het contact, plus een notitie. Inhoud, timing en tone of voice van de dunning-flow blijven bij Marketing | De flow bestaat al en is van Marketing. De automation hoeft die alleen te starten en te stoppen, en de juiste gegevens aan te leveren |
| **Asana** | Eén taak per klant (niet per factuur) in het Billing-project. Updates als comment, en de taak sluit vanzelf bij betaling | Billing volgt *klanten* op, geen losse facturen. Drie facturen mogen geen drie taken worden |
| **Dossier + event-log** (Data Tables, in productie een database) | Per klant: in dunning ja/nee, welke Asana-taak, welk MailBlue-contact, welke facturen. Per webhook: wat er is binnengekomen en wat ermee gedaan is | Zonder geheugen weet je niet of iets nieuw is. En de audit trail beantwoordt "waarom zit klant X in de flow?" |

### Opbouw in workflows
- **C4-10 Ontvangen** doet bewust weinig: afzender controleren, ontdubbelen, vastleggen, 200 terugsturen en de klant doorgeven.
- **C4-11 Klant herberekenen** bevat *alle* regels en acties. Het is een aparte sub-workflow, omdat ook **C4-12 Dagelijkse controle** hem aanroept. Zo is er één plek met regels, en is de controle dezelfde logica in plaats van een tweede implementatie die uit de pas kan lopen.
- **C4-13** is de error-workflow.

### n8n of Make?
Ik heb het in n8n gebouwd, omdat ik zo de workflows als code in Git kan zetten en tegen de echte API's kan testen. Het ontwerp is één-op-één over te zetten naar Make, als MailBlue dat liever heeft:

| n8n | Make |
|---|---|
| Webhook + Respond to Webhook | Custom webhook + Webhook response |
| Execute Workflow (C4-11 als sub-workflow) | Scenario C4-11 met een custom webhook, aangeroepen via HTTP (of "Run a scenario") |
| Switch | Router met filters |
| Data Tables (dossier, event-log) | Data stores |
| Error workflow | Error handler-route (Break met retries + alert) |
| Schedule trigger | Scenario-planning dagelijks 07:00 |

---

## 2. Welke webhooks, triggers, tags of custom fields gebruik je, en waarom?

### Triggers
| Trigger | Keuze | Waarom |
|---|---|---|
| **MoneyBird-webhook** | Registreren met `enabled_events`: de groep `sales_invoice_state_changed` (dekt *late, reminded, paid, uncollectible, open, pending_payment*), plus `payment_registered`, `payment_destroyed`, `sales_invoice_destroyed` en het opzeg-event van een abonnement* | Realtime is belangrijk bij het **stoppen**: wie betaalt, moet zo snel mogelijk uit de flow. De groep in plaats van losse events maakt het toekomstvast; wat niet relevant is, logt C4-10 als *ignored*. `payment_registered` is nodig voor deelbetalingen (de status blijft dan *late*), `payment_destroyed` voor storno's |
| **Dagelijkse controle** (schedule, 07:00) | Vraagt MoneyBird welke facturen *nu* vervallen zijn en herberekent die klanten, plus alle actieve dossiers | Webhooks kunnen wegvallen. MoneyBird geeft na 10 pogingen op, en n8n kan in onderhoud zijn. 07:00 = na de nachtelijke statuswijzigingen en vóór Billing begint |
| Bewust **geen** polling op vervaldatum | | Dan reken je in de automation na wat MoneyBird al weet, met het risico dat de twee uit elkaar lopen (betaaltermijnen, uitstel) |

\* *Het abonnement zit in deze mock in MoneyBird. Bij MailBlue komt de opzegging misschien uit de eigen backoffice: dan is dat de bron van dit event. De exacte eventnaam check ik bij de echte koppeling.*

**Beveiliging en betrouwbaarheid van de webhook:**
- `webhook_token` controleren. In productie ook de `Moneybird-Signature`-header.
- Dubbele webhooks afvangen op `Idempotency-Key`, de unieke sleutel die MoneyBird per push meestuurt.
- **Eerst loggen, dan pas 200**: zo is een event nooit kwijt.

### De tag in MailBlue: `billing-dunning-actief`
- **Een tag als koppelvlak** met Marketing: hun flow start op "tag toegevoegd", precies zoals de case beschrijft. Wij hoeven niets van de inhoud te weten, en zij niets van MoneyBird.
- **De tag is een toestand, geen gebeurtenis**: zolang hij er staat, heeft de klant een vervallen factuur. Weghalen = stoppen. Daarom staat "actief" in de naam en geen "factuur-vervallen", en daarom zet de automation hem bij elke update *zeker* (idempotent en zelfherstellend).
- **Naam met domeinprefix** (`billing-`): in een account met honderden tags zie je meteen van wie hij is. De omschrijving van de tag in MailBlue zegt: "gezet door n8n, niet handmatig wijzigen of hernoemen".
- **Stoppen gaat via een goal**: in de automation van Marketing komt een goal *"tag billing-dunning-actief bestaat niet meer"*. Contacten springen daar vanaf elke plek naartoe, ook midden in een wachtstap van 7 dagen. Dat is de enige aanpassing die Marketing aan hun bestaande flow moet doen (zie [docs/marketing-contract.md](docs/marketing-contract.md)).

### Contactvelden in MailBlue
| Veld | Personalisatietag | Waarvoor |
|---|---|---|
| Dunning – status | `%DUNNING_STATUS%` | actief / betaald / gecrediteerd / oninbaar. Blijft staan na het stoppen, voor segmenten en rapportage |
| Dunning – openstaand bedrag | `%DUNNING_BEDRAG%` | "€ 118,00" in de mail |
| Dunning – aantal facturen / factuurnummers | `%DUNNING_AANTAL%` / `%DUNNING_FACTUREN%` | De mail noemt de juiste facturen |
| Dunning – oudste vervaldatum | `%DUNNING_VERVALDATUM%` | Datumveld, zodat Marketing ook op leeftijd kan sturen ("na 30 dagen een andere toon") |
| Dunning – betaallink | `%DUNNING_BETAALLINK%` | Direct betalen vanuit de mail, de snelste weg naar "tag weg" |
| Dunning – abonnement opgezegd | `%DUNNING_OPGEZEGD%` | Marketing kan de tekst aanpassen: geen "uw account wordt gepauzeerd" aan iemand die al weg is |
| MoneyBird contact-ID | `%MONEYBIRD_CONTACT_ID%` | Koppelsleutel tussen de systemen |

De velden worden gevuld **vóórdat** de tag wordt gezet, dus de eerste mail heeft meteen het juiste bedrag. Bij het stoppen worden bedrag, facturen en betaallink leeggemaakt, zodat een oud bedrag nooit meer in een mail terechtkomt.

### Asana
- Eén project "Billing – Openstaande facturen" met de secties **Nieuw → In behandeling → Betalingsafspraak → Afgerond**. De automation zet nieuwe taken in *Nieuw* en verplaatst ze bij het stoppen naar *Afgerond* (afgevinkt). De secties ertussen zijn van Billing.
- **De taakbeschrijving legt zichzelf uit**: waarom de taak bestaat, de klant en de facturen met betaallink, wat de automation al gedaan heeft, wat Billing doet en hoe je stopt, plus een link naar de execution. Updates komen als **comment**, zodat de hele geschiedenis bij de taak staat.
- Op een betaald Asana-plan zou ik bedrag en status als custom fields toevoegen, zodat Billing kan sorteren en rapporteren.

---

## 3. Welke edge cases moet je afvangen?

Ze zijn allemaal gebouwd en, waar een nummer staat, als scenario getest tegen de echte MailBlue- en Asana-accounts.

| Situatie | Wat er gebeurt | Scenario |
|---|---|---|
| **Klant betaalt terwijl de dunning-flow al loopt** | `paid` → herberekenen → tag eraf → de goal haalt de klant direct uit de flow, ook midden in een wachtstap. Status = *betaald*, de Asana-taak sluit met een comment. **Restrisico:** een mail die vlak vóór de betaling is verstuurd, of een betaling die MoneyBird pas morgen ziet (bank-sync). Daarom staat in elke mail "Heb je net betaald? Dan kun je deze mail negeren", en checkt de flow vóór elke mail of de tag er nog is | 05 |
| **Deelbetaling** | Blijft in dunning met het nieuwe bedrag (veld + comment) | 03 |
| **Meerdere vervallen facturen** | Eén dossier, één taak, één tag. Een tweede factuur = bijwerken, en de flow herstart niet. Betaalt de klant één van de twee, dan loopt de dunning door voor de rest | 02, 04 |
| **Creditfactuur** | Een creditfactuur start nooit dunning. Een credit die nog niet verrekend is, wordt afgetrokken van de factuur waar hij bij hoort. Volledig gecrediteerd → stoppen (*gecrediteerd*) + comment aan Billing om de twee in MoneyBird te verrekenen. Een gedeeltelijke credit verlaagt het bedrag | 08 |
| **Klant zegt tussentijds op** | De vordering blijft bestaan, dus **de dunning loopt door**. Het veld *abonnement opgezegd* gaat op ja, zodat Marketing een andere tekst kan sturen. Billing krijgt een comment: is de laatste factuur (vooruit gefactureerd?) terecht? Crediteert Billing hem, dan stopt de dunning vanzelf via de creditregel | 10 |
| **Oninbaar / naar incassobureau** | Stoppen (*oninbaar*). Incasso is een ander proces, dus geen mails meer van ons | 11 |
| **Geen e-mailadres in MoneyBird** | Wel een Asana-taak ("handmatig opvolgen"), geen tag, en een alert. Vult Billing het e-mailadres aan, dan zet de volgende update de tag alsnog | 12 |
| **Storno / chargeback** | Factuur weer *late* → nieuwe ronde, nieuwe taak met een link naar de vorige | 13 |
| **Dubbele webhook** | Op `Idempotency-Key`: `duplicate`, niets dubbel. *Deze test vond een bug*: een retry die binnenkwam terwijl de eerste nog liep, werd opnieuw verwerkt. Nu geldt "ontvangen < 10 min geleden" als "wordt al verwerkt" | 05 |
| **Webhooks in de verkeerde volgorde** (een vertraagde retry van "late" na "paid") | Niets, want de actuele stand in MoneyBird is "betaald" | 06 |
| **Gemiste webhook** | De dagcontrole vindt de klant, zet hem recht en noemt hem in het dagrapport als correctie | 14–15 |
| **Nep-webhook** | 401, niets gelogd of gedaan | 16 |
| **MailBlue of Asana onbereikbaar** | 3 pogingen per call, daarna een alert via C4-13. Het event blijft op *received* en de dagcontrole pakt het op. Opnieuw draaien maakt niets dubbel: het dossier wordt direct na elke externe create opgeslagen, en tag zetten is idempotent (geverifieerd tegen de API) | |
| **Klein restbedrag** (< € 5, Config) | Geen dunning-mails, wel een comment voor Billing om af te boeken | |
| **Klant op SEPA-incasso** | Staat op `pending_payment`, dus geen dunning. Mislukt de incasso, dan wordt de factuur *late* en start de dunning gewoon | |
| **Factuur verwijderd in MoneyBird** | Herberekenen → stoppen (reden *verwijderd*) | |
| **Iemand haalt de tag handmatig weg** | De volgende update zet hem terug (zelfherstellend). Pauzeren doe je dus níet met de tag maar in MoneyBird (zie hieronder) | |

**Bewust (nog) niet gebouwd**
- **Betalingsregeling of geschil pauzeren.** Nu stopt dunning alleen via MoneyBird: betalen, crediteren of oninbaar. Een nette pauzeknop voor Billing (de taak naar *Betalingsafspraak* slepen = flow pauzeren tot datum X) is een logische v2. Dat kan via de dagcontrole, die de sectie uitleest; Asana-webhooks vragen een publieke URL.
- **Twee events voor dezelfde klant binnen dezelfde seconde.** Dat is een race condition: beide herberekeningen zien hetzelfde dossier. De oplossing is per klant serialiseren (queue mode met één worker voor C4-11, of een lock-rij in de database).
- **Meerdere valuta**, en klanten met verschillende e-mailadressen in MoneyBird en MailBlue. Nu wordt gematcht op e-mail; in v2 wordt het veld *MoneyBird contact-ID* de sleutel.
- **Dunning-mails aan uitgeschreven contacten.** Als een klant zich voor marketingmail heeft afgemeld, mag een betalingsherinnering nog steeds. Spreek met Marketing af dat deze mails als transactionele mail gaan.

---

## 4. Hoe zorg je dat Billing en Marketing het maanden later nog snappen, zonder te bellen?

Mijn uitgangspunt: **de uitleg moet staan op de plek waar iemand de vraag heeft**, niet alleen in een document dat niemand terugvindt.

1. **In de tools die ze dagelijks gebruiken.**
   - Elke **Asana-taak** zegt waarom hij bestaat, wat de automation al deed, wat Billing doet, hoe je stopt, en linkt naar de execution.
   - Elk **MailBlue-contact** krijgt een notitie ("Dunning gestart door n8n: 2 facturen, € 118,00"), en het veld *status* laat zien waarom iemand uit de flow is.
   - De **tag en de velden** hebben in MailBlue een omschrijving: "gezet door n8n, niet handmatig wijzigen".
2. **Een audit trail die de vraag beantwoordt.** "Waarom kreeg klant X gisteren een aanmaning?" staat in het event-log (welke webhook, welke actie, welke reden) en in het dossier, zonder dat iemand de workflow hoeft te lezen.
3. **Een zichtbare hartslag.** Elke ochtend een **dagrapport in #billing**: hoeveel klanten in dunning, totaalbedrag, gemiste webhooks die zijn rechtgezet. Komt het rapport niet, dan draait er iets niet. Een alert in #billing-alerts zegt altijd *wat je nu moet doen*.
4. **Leesbaar in n8n zelf.** Sticky notes per fase, een notitie op elke belangrijke node, Nederlandse namen die zeggen wat er gebeurt ("Dunning-tag verwijderen"). Alle regels staan in één Code-node, van boven naar beneden met commentaar ("regel 1: welke facturen tellen mee?"). Alles wat per omgeving verschilt (drempel, ID's) staat in één **Config**-node.
5. **Korte documenten per doelgroep** in plaats van één groot document:
   - [Billing-handleiding](docs/billing-handleiding.md) (1 A4): wat betekent een taak, wat doe ik, hoe stop ik de dunning?
   - [Contract met Marketing](docs/marketing-contract.md): de tag, de velden, de goal-eis, en wat je niet moet veranderen.
   - [Beheer](docs/beheer.md): alerts, opnieuw draaien, regels aanpassen, eigenaarschap.
6. **Duidelijk eigenaarschap.** Billing is eigenaar van de *regels* (drempel, wanneer stoppen), Marketing van de *inhoud* van de flow, de automation-developer van de techniek. Het contract (tag + velden + goal) verander je alleen samen.
7. **Testbaar en terug te lezen.** De workflows staan als code in Git, dus de geschiedenis laat zien wat er wanneer veranderd is. De 16 scenario's draaien in een paar minuten opnieuw na elke wijziging.

---

## Vóór productie
1. **Echte MoneyBird**: webhook registreren (`POST /{administratie}/webhooks` met de URL en `enabled_events`), `Moneybird-Signature` verifiëren, token/secret in een n8n-credential, base-URL in Config.
2. **Afstemmen wie herinneringen stuurt**: zet de eigen herinneringen/aanmaningen van MoneyBird uit (of maak duidelijke afspraken), anders krijgt de klant dubbele mails.
3. **Juridisch/tekst**: bij consumenten moet er vóór incassokosten een "14-dagenbrief" (WIK) uit. Laat de laatste mail van de flow daarop controleren. MailBlue-klanten zijn grotendeels zakelijk, maar check het.
4. **Opslag**: dossier en event-log van Data Tables naar een database met backups. Bewaartermijn voor het event-log (AVG: de ruwe payload bevat persoonsgegevens).
5. **Per klant serialiseren** (queue mode) en de webhook-URL achter een geheim pad.
6. **Monitoring**: een dead man's switch op het dagrapport (bijv. healthchecks.io), en alerts naar echte Slack.
7. **Rechten**: een eigen API-gebruiker in MailBlue en een eigen Asana-serviceaccount met minimale rechten.

## Hoe ik AI heb ingezet
Gebouwd met Claude Code en n8n-as-code: de workflows staan als TypeScript in Git, worden gecontroleerd tegen de node-schema's, naar n8n gepusht en getest met scenario's tegen de echte MailBlue- en Asana-API. Waar ik heb bijgestuurd:
1. **De scenariotest vond een echte bug.** Een dubbele push 1,5 seconde na de eerste werd ook verwerkt (twee "afgerond"-comments in Asana), omdat de eerste nog op *received* stond. Opgelost en opnieuw getest.
2. **Eerst verifiëren, dan op bouwen**: voordat de flow bij elke update de tag "zeker stelt", heb ik tegen de API gecontroleerd dat een tag die al bestaat geen tweede koppeling (en geen nieuwe automation-start) oplevert.
3. **Een webhook met een padparameter** krijgt in n8n een ID in de URL. Door dat ID bewust te kiezen, is de mock-URL gelijk aan die van MoneyBird (`…/sales_invoices/{id}`).
4. **MoneyBird-docs gelezen** voor het payload-formaat, `Idempotency-Key`, de retries en de waarschuwing dat de state in de payload verouderd kan zijn. Dat laatste is de basis van het hele ontwerp.

**Waar AI bewust níet zit:** in de geldstroom. Of iemand een aanmaning krijgt, is een deterministische regel en geen inschatting van een model. **Waar AI hier wel waarde heeft (v2):** antwoorden van klanten op een aanmaning in Intercom classificeren ("al betaald", "betwist", "kan ik in termijnen betalen?") en dat als comment bij de Asana-taak zetten, of bij "betwist" de dunning pauzeren tot Billing ernaar heeft gekeken.
