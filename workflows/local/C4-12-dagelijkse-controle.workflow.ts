import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : C4-12 Dagelijkse controle (vangnet + dagrapport)
// Nodes   : 18  |  Connections: 19
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// UitlegDagcontrole                  stickyNote
// ElkeOchtend0700                    scheduleTrigger
// WebhookC4Dagcontrole               webhook
// Config                             code                       [executeOnce]
// MoneybirdVervallenFacturen         httpRequest                [creds] [retry]
// ActieveDossiers                    dataTable                  [alwaysOutput] [executeOnce]
// EventsOpReceived                   dataTable                  [alwaysOutput] [executeOnce]
// TeControlerenKlanten               code                       [alwaysOutput]
// IetsTeControleren                  if                         [executeOnce]
// PerKlant                           splitInBatches
// KlantenAlle                        code                       [executeOnce]
// C411KlantHerberekenen              executeWorkflow
// DagrapportOpbouwen                 code                       [executeOnce]
// DagrapportNaarBillingMock          dataTable
// HandmatigGestart                   if
// AntwoordHandmatigeRun              respondToWebhook
// VastgelopenEventsAfsluiten         code                       [executeOnce]
// LogViaDagcontrole                  dataTable
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ElkeOchtend0700
//    → Config
//      → MoneybirdVervallenFacturen
//        → ActieveDossiers
//          → EventsOpReceived
//            → TeControlerenKlanten
//              → IetsTeControleren
//                → KlantenAlle
//                  → PerKlant
//                    → DagrapportOpbouwen
//                      → DagrapportNaarBillingMock
//                        → HandmatigGestart
//                          → AntwoordHandmatigeRun
//                            → VastgelopenEventsAfsluiten
//                              → LogViaDagcontrole
//                         .out(1) → VastgelopenEventsAfsluiten (↩ loop)
//                   .out(1) → C411KlantHerberekenen
//                      → PerKlant (↩ loop)
//               .out(1) → DagrapportOpbouwen (↩ loop)
// WebhookC4Dagcontrole
//    → Config (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'PWKSUZV2sAjzGHxY',
    name: 'C4-12 Dagelijkse controle (vangnet + dagrapport)',
    active: false,
    isArchived: false,
    settings: {
        saveManualExecutions: true,
        saveDataErrorExecution: 'all',
        errorWorkflow: 'sgxTqtIS8A4PmzVM',
        timezone: 'Europe/Amsterdam',
        executionOrder: 'v1',
    },
})
export class C412DagelijkseControleVangnetDagrapportWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '345260fb-0a0f-432a-9462-06f5e1ffd5bb',
        name: 'Uitleg dagcontrole',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-80, -560],
    })
    UitlegDagcontrole = {
        content: `## C4-12 Dagelijkse controle — het vangnet
Webhooks kunnen wegvallen (n8n even plat, MoneyBird geeft na 10 pogingen op). Daarom elke ochtend om 07:00:
1. Vraag MoneyBird welke klanten **nu** vervallen facturen hebben.
2. Neem alle klanten met een **actief dossier** erbij, plus klanten van events die zijn **blijven hangen** op *received*.
3. Herbereken ze allemaal met **C4-11** (dezelfde regels als bij een webhook). Is alles al goed, dan doet C4-11 niets.
4. **Dagrapport in #billing**: hoeveel klanten in dunning, totaalbedrag, en elke correctie (= een gemiste webhook) apart genoemd.

Handmatig starten (demo of na een storing): \`POST <n8n>/webhook/c4-dagcontrole\`.`,
        height: 340,
        width: 900,
        color: 7,
    };

    @node({
        id: '94a5f36c-31d7-40d8-ab53-2dd2ae78b314',
        name: 'Elke ochtend 07:00',
        type: 'n8n-nodes-base.scheduleTrigger',
        version: 1.2,
        position: [0, -120],
    })
    ElkeOchtend0700 = {
        rule: {
            interval: [
                {
                    field: 'days',
                    triggerAtHour: 7,
                },
            ],
        },
    };

    @node({
        id: '86f1338d-14d6-447b-991d-48dc2a548b24',
        webhookId: 'bd578078-22f2-478d-88ee-8ebc49fd1104',
        name: 'Webhook c4-dagcontrole',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 60],
    })
    WebhookC4Dagcontrole = {
        httpMethod: 'POST',
        path: 'c4-dagcontrole',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'ae5d50ba-8269-4bfb-9ada-4fa5855330c4',
        name: 'Config',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [240, -40],
        executeOnce: true,
    })
    Config = {
        mode: 'runOnceForAllItems',
        jsCode: `return [{ json: {
  // Productie: https://moneybird.com/api/v2/<administratie_id>
  moneybird_base_url: 'http://127.0.0.1:5678/webhook/c4-moneybird/api/v2/adm-demo',
  vastgelopen_na_minuten: 10
}}];`,
    };

    @node({
        id: 'bcd372b3-9aa4-4ffa-9399-f5d114fdfd06',
        name: 'MoneyBird: vervallen facturen',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [460, -40],
        credentials: { httpHeaderAuth: { id: 'r3SrscUS0aDMhEz5', name: 'MoneyBird API (mock)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 5000,
        notes: 'Alle facturen op late/reminded, ongeacht of we er een webhook voor kregen.',
    })
    MoneybirdVervallenFacturen = {
        method: 'GET',
        url: "={{ $('Config').first().json.moneybird_base_url }}/sales_invoices",
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendQuery: true,
        specifyQuery: 'keypair',
        queryParameters: {
            parameters: [
                {
                    name: 'filter',
                    value: 'state:late|reminded',
                },
            ],
        },
        options: {
            timeout: 15000,
            response: {
                response: {
                    fullResponse: true,
                    responseFormat: 'json',
                },
            },
        },
    };

    @node({
        id: 'c166ea0b-5c8d-4a1d-967a-0009f137d890',
        name: 'Actieve dossiers',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [680, -40],
        alwaysOutputData: true,
        executeOnce: true,
    })
    ActieveDossiers = {
        resource: 'row',
        operation: 'get',
        dataTableId: {
            __rl: true,
            value: 'c4_dunning_cases',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [
                {
                    keyName: 'status',
                    condition: 'eq',
                    keyValue: 'actief',
                },
            ],
        },
        returnAll: true,
    };

    @node({
        id: 'e7c75643-b20b-4d15-9edd-4181509498bb',
        name: 'Events op received',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [900, -40],
        alwaysOutputData: true,
        executeOnce: true,
    })
    EventsOpReceived = {
        resource: 'row',
        operation: 'get',
        dataTableId: {
            __rl: true,
            value: 'c4_event_log',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [
                {
                    keyName: 'status',
                    condition: 'eq',
                    keyValue: 'received',
                },
            ],
        },
        returnAll: true,
    };

    @node({
        id: 'ee8a10de-3186-489e-9e63-286426369da8',
        name: 'Te controleren klanten',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1120, -40],
        alwaysOutputData: true,
        notes: 'Unie van: klanten met vervallen facturen (MoneyBird) + actieve dossiers + klanten van vastgelopen events. Eén item per klant.',
    })
    TeControlerenKlanten = {
        mode: 'runOnceForAllItems',
        jsCode: `const cfg = $('Config').first().json;
const rows = n => $(n).all().map(i => i.json).filter(r => r && r.id !== undefined);
const vervallen = ($('MoneyBird: vervallen facturen').first().json.body || [])
  .filter(i => !i.original_sales_invoice_id && Number(i.total_unpaid) > 0);
const grens = Date.now() - cfg.vastgelopen_na_minuten * 60 * 1000;
const vast = rows('Events op received').filter(e => e.received_at && new Date(e.received_at).getTime() < grens);
const bron = {};
const voeg = (id, waarom) => { if (!id) return; (bron[id] = bron[id] || new Set()).add(waarom); };
for (const i of vervallen) voeg(i.contact_id, 'vervallen factuur in MoneyBird');
for (const d of rows('Actieve dossiers')) voeg(d.mb_contact_id, 'actief dossier');
for (const e of vast) voeg(e.mb_contact_id, 'vastgelopen event');
return Object.entries(bron).map(([id, w]) => ({ json: { mb_contact_id: id, aanleiding: 'dagcontrole', event_key: '', waarom: [...w].join(' + ') } }));`,
    };

    @node({
        id: '416d1eae-5a24-4548-8907-7922b980c4a5',
        name: 'Iets te controleren?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1340, -40],
        executeOnce: true,
    })
    IetsTeControleren = {
        conditions: {
            combinator: 'and',
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 3,
            },
            conditions: [
                {
                    leftValue: '={{ !!$json.mb_contact_id }}',
                    rightValue: '',
                    operator: {
                        type: 'boolean',
                        operation: 'true',
                        singleValue: true,
                    },
                },
            ],
        },
        looseTypeValidation: false,
        options: {},
    };

    @node({
        id: 'c725419d-c552-4059-a1dc-e17b78c1f6c9',
        name: 'Per klant',
        type: 'n8n-nodes-base.splitInBatches',
        version: 3,
        position: [1560, -120],
    })
    PerKlant = {
        batchSize: 1,
        options: {},
    };

    @node({
        id: 'a7a3c6f4-de12-4e3b-a912-93caf380a62b',
        name: 'Klanten (alle)',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1450, -260],
        executeOnce: true,
        notes: 'De If laat maar één item door (executeOnce); hier weer alle klanten.',
    })
    KlantenAlle = {
        mode: 'runOnceForAllItems',
        jsCode: "return $('Te controleren klanten').all().map(i => ({ json: i.json }));",
    };

    @node({
        id: '7adb67ff-cb63-4379-9c31-357caf615004',
        name: 'C4-11 Klant herberekenen',
        type: 'n8n-nodes-base.executeWorkflow',
        version: 1.2,
        position: [1800, -260],
        notes: 'Precies dezelfde regels als bij een webhook. Is er niets veranderd, dan doet C4-11 niets.',
    })
    C411KlantHerberekenen = {
        source: 'database',
        workflowId: {
            __rl: true,
            value: 'ei3Py6RKxMFC7lDR',
            mode: 'id',
        },
        workflowInputs: {
            mappingMode: 'defineBelow',
            value: {
                mb_contact_id: '={{ $json.mb_contact_id }}',
                aanleiding: '={{ $json.aanleiding }}',
                event_key: '={{ $json.event_key }}',
            },
            matchingColumns: [],
            schema: [
                {
                    id: 'mb_contact_id',
                    displayName: 'mb_contact_id',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    canBeUsedToMatch: true,
                    type: 'string',
                    removed: false,
                },
                {
                    id: 'aanleiding',
                    displayName: 'aanleiding',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    canBeUsedToMatch: true,
                    type: 'string',
                    removed: false,
                },
                {
                    id: 'event_key',
                    displayName: 'event_key',
                    required: false,
                    defaultMatch: false,
                    display: true,
                    canBeUsedToMatch: true,
                    type: 'string',
                    removed: false,
                },
            ],
            attemptToConvertTypes: false,
            convertFieldsToString: true,
        },
        mode: 'once',
        options: {
            waitForSubWorkflow: true,
        },
    };

    @node({
        id: 'cb00c00f-eaf2-4466-acfb-3597b9d7659c',
        name: 'Dagrapport opbouwen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2060, 0],
        executeOnce: true,
        notes: 'Elke actie ≠ "niets" betekent dat een webhook is gemist of vastliep: die worden apart genoemd.',
    })
    DagrapportOpbouwen = {
        mode: 'runOnceForAllItems',
        jsCode: `const ran = n => { try { return $(n).isExecuted; } catch (e) { return false; } };
const resultaten = ran('Per klant') ? $('Per klant').all(0).map(i => i.json).filter(r => r && r.actie) : [];
const cfg = $('Config').first().json;
const grens = Date.now() - cfg.vastgelopen_na_minuten * 60 * 1000;
const vast = $('Events op received').all().map(i => i.json).filter(e => e && e.id !== undefined && e.received_at && new Date(e.received_at).getTime() < grens);
const correcties = resultaten.filter(r => r.actie !== 'niets');
const inDunning = resultaten.filter(r => (r.actie === 'start' || r.actie === 'bijwerken' || r.actie === 'niets') && Number(r.aantal) > 0);
const totaal = inDunning.reduce((s, r) => s + Number(r.totaal || 0), 0);
const eur = n => '€ ' + Number(n).toFixed(2).replace('.', ',');
const regels = [
  ':bar_chart: *Dagrapport dunning* (' + new Date().toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' }) + ')',
  'In dunning: ' + inDunning.length + ' klant(en), samen ' + eur(totaal) + ' openstaand.',
  correcties.length
    ? ':warning: ' + correcties.length + ' correctie(s) — hier is een webhook gemist of vastgelopen, nu rechtgezet:\\n' + correcties.map(r => '• ' + r.klant + ': ' + r.actie + ' (' + String(r.reden).slice(0, 140) + ')').join('\\n')
    : 'Geen correcties nodig: alle webhooks zijn verwerkt.',
  vast.length ? ':hourglass: ' + vast.length + ' vastgelopen event(s) opnieuw verwerkt via de controle.' : null
].filter(Boolean);
return [{ json: {
  channel: '#billing',
  severity: (correcties.length || vast.length) ? 'warning' : 'info',
  text: regels.join('\\n'),
  source: 'C4-12 dagcontrole',
  created_at: new Date().toISOString(),
  gecontroleerd: resultaten.length,
  correcties: correcties.length,
  vastgelopen: vast.map(e => e.idempotency_key)
}}];`,
    };

    @node({
        id: '94e3b861-a3b5-4317-91e6-2dca430bd25c',
        name: 'Dagrapport naar #billing (mock)',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [2280, 0],
        notes: 'Mock van Slack. Het dagrapport is ook de "hartslag": komt het niet, dan draait de automation niet.',
    })
    DagrapportNaarBillingMock = {
        resource: 'row',
        operation: 'insert',
        dataTableId: {
            __rl: true,
            value: 'c4_slack_messages',
            mode: 'name',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                channel: '={{ $json.channel }}',
                severity: '={{ $json.severity }}',
                text: '={{ $json.text }}',
                source: '={{ $json.source }}',
                created_at: '={{ $json.created_at }}',
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: '9c564e79-caf6-43c3-abcd-0258cdc934d1',
        name: 'Handmatig gestart?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [2500, 0],
        notes: 'Alleen bij een handmatige run (webhook) een antwoord terugsturen; om 07:00 is er niemand om op te antwoorden.',
    })
    HandmatigGestart = {
        conditions: {
            combinator: 'and',
            options: {
                caseSensitive: true,
                leftValue: '',
                typeValidation: 'strict',
                version: 3,
            },
            conditions: [
                {
                    leftValue:
                        "={{ (() => { try { return $('Webhook c4-dagcontrole').isExecuted; } catch (e) { return false; } })() }}",
                    rightValue: '',
                    operator: {
                        type: 'boolean',
                        operation: 'true',
                        singleValue: true,
                    },
                },
            ],
        },
        looseTypeValidation: false,
        options: {},
    };

    @node({
        id: '48716c4c-6542-473c-9307-6c91940a6f3a',
        name: 'Antwoord (handmatige run)',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.5,
        position: [2720, -80],
    })
    AntwoordHandmatigeRun = {
        respondWith: 'json',
        responseBody: "={{ JSON.stringify($('Dagrapport opbouwen').first().json) }}",
        options: {
            responseCode: 200,
        },
    };

    @node({
        id: '7f8f28a0-aeb3-4843-aea0-2fba930e0a29',
        name: 'Vastgelopen events afsluiten',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2940, 0],
        executeOnce: true,
    })
    VastgelopenEventsAfsluiten = {
        mode: 'runOnceForAllItems',
        jsCode: "return $('Dagrapport opbouwen').first().json.vastgelopen.map(k => ({ json: { idempotency_key: k } }));",
    };

    @node({
        id: '5c496a9f-8c79-47d0-9c4e-f11bbe96bfa2',
        name: 'Log: via dagcontrole',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [3160, 0],
    })
    LogViaDagcontrole = {
        resource: 'row',
        operation: 'update',
        dataTableId: {
            __rl: true,
            value: 'c4_event_log',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [
                {
                    keyName: 'idempotency_key',
                    condition: 'eq',
                    keyValue: '={{ $json.idempotency_key }}',
                },
            ],
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                status: 'processed',
                actie: 'via dagcontrole',
                reden: 'Bleef hangen op received; klant is opnieuw berekend door C4-12.',
                processed_at: '={{ $now.toISO() }}',
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ElkeOchtend0700.out(0).to(this.Config.in(0));
        this.WebhookC4Dagcontrole.out(0).to(this.Config.in(0));
        this.Config.out(0).to(this.MoneybirdVervallenFacturen.in(0));
        this.MoneybirdVervallenFacturen.out(0).to(this.ActieveDossiers.in(0));
        this.ActieveDossiers.out(0).to(this.EventsOpReceived.in(0));
        this.EventsOpReceived.out(0).to(this.TeControlerenKlanten.in(0));
        this.TeControlerenKlanten.out(0).to(this.IetsTeControleren.in(0));
        this.IetsTeControleren.out(0).to(this.KlantenAlle.in(0));
        this.IetsTeControleren.out(1).to(this.DagrapportOpbouwen.in(0));
        this.KlantenAlle.out(0).to(this.PerKlant.in(0));
        this.PerKlant.out(0).to(this.DagrapportOpbouwen.in(0));
        this.PerKlant.out(1).to(this.C411KlantHerberekenen.in(0));
        this.C411KlantHerberekenen.out(0).to(this.PerKlant.in(0));
        this.DagrapportOpbouwen.out(0).to(this.DagrapportNaarBillingMock.in(0));
        this.DagrapportNaarBillingMock.out(0).to(this.HandmatigGestart.in(0));
        this.HandmatigGestart.out(0).to(this.AntwoordHandmatigeRun.in(0));
        this.HandmatigGestart.out(1).to(this.VastgelopenEventsAfsluiten.in(0));
        this.AntwoordHandmatigeRun.out(0).to(this.VastgelopenEventsAfsluiten.in(0));
        this.VastgelopenEventsAfsluiten.out(0).to(this.LogViaDagcontrole.in(0));
    }
}
