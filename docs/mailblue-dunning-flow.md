# MailBlue: dunning-flow (demo)

Export van de automation **"Dunning-flow (demo) – openstaande facturen"** uit de ActiveCampaign-trial (id 2, status: inactief). Gebouwd via de ActiveCampaign-MCP en daarna gecorrigeerd (zie TOELICHTING). Opbouw en teksten komen rechtstreeks uit de API.

## Opbouw

- START — trigger: tag `billing-dunning-actief` toegevoegd (meerdere keren toegestaan)
  - ALS — Check if contact has the tag 'billing-dunning-actief'
    - MAIL — Je factuur staat nog open
    - WACHT 7 dagen
    - ALS — Check if contact still has the tag 'billing-dunning-actief'
      - ALS — Check if contact field 'Dunning – abonnement opgezegd' equals 'ja'
        - MAIL — Nog één factuur open bij MailBlue
        - WACHT 7 dagen
        - ALS — Check if contact still has the tag 'billing-dunning-actief'
          - MAIL — Laatste herinnering vóór incasso
        - ANDERS
          - GOAL — Betaald of opgelost: Contact no longer has the tag 'billing-dunning-actief'
      - ANDERS
        - MAIL — Je factuur staat nog open
        - WACHT 7 dagen
        - ALS — Check if contact has the tag 'billing-dunning-actief'
          - MAIL — Laatste herinnering vóór incasso
          - GOAL — Betaald of opgelost: Contact no longer has the tag 'billing-dunning-actief'
        - ANDERS
    - ANDERS
  - ANDERS

"ALS heeft tag" met een lege ANDERS-tak = einde voor dat contact. De goal staat in beide takken, en vóór elke mail controleert de flow of de tag er nog is.

## Mails (tekstversie)

### Vriendelijke herinnering: je factuur staat nog open
*Preheader: Al betaald? Dan mag je dit negeren.*

```
Al betaald? Dan mag je dit negeren.

MailBlue Billing

**Je factuur staat nog open**

Hallo %IF !!($FIRSTNAME)%  %FIRSTNAME% %/IF% ,

Volgens onze administratie heb je nog een openstaande factuur bij MailBlue. Dat kan gebeuren, en daarom sturen we je deze vriendelijke herinnering. We vragen je de betaling zo snel mogelijk te voldoen, zodat je account zonder onderbreking blijft werken en alles netjes geregeld is.

**Wat je nu kunt doen**

Het gaat om %DUNNING_AANTAL% factuur/facturen (%DUNNING_FACTUREN%), samen %DUNNING_BEDRAG%. De oudste vervaldatum was %DUNNING_VERVALDATUM%. Je betaalt in een paar klikken via de knop hieronder. Klopt er iets niet of heb je vragen over een factuur? Beantwoord deze e-mail, dan kijkt ons billingteam met je mee.

Nu betalen: %DUNNING_BETAALLINK%

**Heb je in de tussentijd al betaald?** Dan kun je deze e-mail negeren. Betalingen worden soms pas na enkele dagen verwerkt, dus het kan zijn dat deze herinnering en je betaling elkaar gekruist hebben.

Met vriendelijke groet,
MailBlue Billing
```

### Je laatste openstaande factuur bij MailBlue
*Preheader: Al betaald? Dan mag je dit negeren.*

```
Al betaald? Dan mag je dit negeren.

**MailBlue Billing**

**Je hebt nog een openstaande factuur**

Hallo %IF !!($FIRSTNAME)%  %FIRSTNAME% %/IF% ,

Je abonnement bij MailBlue is opgezegd, maar er staat nog een factuur open op je account. Om je account netjes af te sluiten, verzoeken we je vriendelijk deze factuur zo spoedig mogelijk te voldoen. Het gaat om %DUNNING_FACTUREN%, samen %DUNNING_BEDRAG%. Je betaalt eenvoudig via de knop hieronder.

Nu betalen: %DUNNING_BETAALLINK%

**Al betaald?**

Heb je in de tussentijd al betaald? Dan kun je deze e-mail negeren; je betaling wordt automatisch verwerkt en je ontvangt geen verdere herinneringen. Klopt er iets niet aan de factuur, of heb je vragen over het bedrag? Beantwoord dan gewoon deze e-mail, dan zoeken we het samen met je uit.

Met vriendelijke groet,

**MailBlue Billing**
```

### Laatste herinnering vóór overdracht aan incasso
*Preheader: Betaal binnen 14 dagen na ontvangst*

```
Betaal binnen 14 dagen na ontvangst

MailBlue Billing

**Laatste herinnering vóór overdracht aan een incassobureau**

Hallo %IF !!($FIRSTNAME)%  %FIRSTNAME% %/IF% ,

Dit is onze laatste herinnering. Je hebt nog een openstaande factuur bij MailBlue. We hebben je hier eerder over gemaild en hebben nog geen betaling ontvangen. Het gaat om %DUNNING_FACTUREN%, samen %DUNNING_BEDRAG% (oudste vervaldatum %DUNNING_VERVALDATUM%).

**Betaal binnen 14 dagen**

Betaal je deze factuur niet binnen 14 dagen na ontvangst van deze e-mail, dan dragen we de vordering over aan een incassobureau. Dat willen we liever voorkomen. Betaal het openstaande bedrag via de knop hieronder, dan is de zaak voor beide partijen afgerond.

Nu betalen: %DUNNING_BETAALLINK%

Heb je in de tussentijd al betaald? Dan kun je deze e-mail negeren. Het kan een paar dagen duren voordat een betaling bij ons verwerkt is.

Met vriendelijke groet,

**MailBlue Billing**
```

### Tweede herinnering: openstaande factuur
*Preheader: Graag zo spoedig mogelijk voldoen*

```
Graag zo spoedig mogelijk voldoen

**MailBlue Billing**

**Tweede herinnering: openstaande factuur**

Hallo %FIRSTNAME%,

je hebt nog steeds een openstaande factuur bij MailBlue. Eerder stuurden we je al een herinnering, maar we hebben nog geen betaling ontvangen. Het gaat om %DUNNING_FACTUREN%, samen %DUNNING_BEDRAG% (oudste vervaldatum %DUNNING_VERVALDATUM%). We verzoeken je dringend dit bedrag zo spoedig mogelijk te voldoen via de knop hieronder.

Nu betalen: %DUNNING_BETAALLINK%

**Al betaald?**

Heb je in de tussentijd al betaald? Dan kun je deze e-mail negeren; betalingen kunnen elkaar kruisen en worden automatisch verwerkt. Klopt er iets niet aan de factuur, of heb je vragen over het bedrag? Reageer dan op deze e-mail, dan kijken we samen naar een oplossing.

MailBlue Billing
```

