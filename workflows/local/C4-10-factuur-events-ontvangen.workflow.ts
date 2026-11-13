import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : C4-10 Factuur-events ontvangen (MoneyBird-webhook)
// Nodes   : 20  |  Connections: 17
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// UitlegOverzicht                    stickyNote
// Uitleg1Ontvangen                   stickyNote
// Uitleg2Doorgeven                   stickyNote
// WebhookMoneybirdEvents             webhook
// Config                             code
// EventLezenControleren              code
// AfzenderKlopt                      if
// Antwoord401                        respondToWebhook
// AlEerderOntvangen                  dataTable                  [alwaysOutput]
// AlVerwerkt                         if
// AntwoordDuplicaat                  respondToWebhook
// EventLoggen                        dataTable
// AntwoordOntvangen200               respondToWebhook
// RelevantEvent                      if
// LogGenegeerd                       dataTable
// ContactInPayload                   if
// MoneybirdFactuurOphalen            httpRequest                [creds] [retry]
// KlantBepalen                       code
// C411KlantHerberekenen              executeWorkflow
// LogVerwerkt                        dataTable
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookMoneybirdEvents
//    → Config
//      → EventLezenControleren
//        → AfzenderKlopt
//          → AlEerderOntvangen
//            → AlVerwerkt
//              → AntwoordDuplicaat
//             .out(1) → EventLoggen
//                → AntwoordOntvangen200
//                  → RelevantEvent
//                    → ContactInPayload
//                      → KlantBepalen
//                        → C411KlantHerberekenen
//                          → LogVerwerkt
//                     .out(1) → MoneybirdFactuurOphalen
//                        → KlantBepalen (↩ loop)
//                   .out(1) → LogGenegeerd
//         .out(1) → Antwoord401
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'NruxftSqoGmiAZg2',
    name: 'C4-10 Factuur-events ontvangen (MoneyBird-webhook)',
    active: true,
    isArchived: false,
    settings: {
        saveManualExecutions: true,
        saveDataErrorExecution: 'all',
        errorWorkflow: 'sgxTqtIS8A4PmzVM',
        timezone: 'Europe/Amsterdam',
        executionOrder: 'v1',
    },
})
export class C410FactuurEventsOntvangenMoneybirdWebhookWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '8dfdd184-9064-4632-9463-ce6fd87ff54f',
        name: 'Uitleg overzicht',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-80, -620],
    })
    UitlegOverzicht = {
        content: `## C4-10 Factuur-events ontvangen
Het adres dat in MoneyBird als webhook is geregistreerd. Doet bewust **weinig**: controleren, vastleggen, bevestigen en doorgeven. Alle regels zitten in **C4-11**.

MoneyBird-events (registratie met \`enabled_events\`): de groep \`sales_invoice_state_changed\` (o.a. *_to_late*, *_to_paid*, *_to_uncollectible*, *_to_open*), \`payment_registered\` / \`payment_destroyed\` (deelbetaling, storno) en \`subscription_cancelled\`.

- **Afzender controleren**: \`webhook_token\` (productie: ook de \`Moneybird-Signature\`-header).
- **Idempotent**: MoneyBird stuurt bij elke push een \`Idempotency-Key\` en probeert tot 10× opnieuw. Al verwerkt → 200 "duplicate", niets dubbel.
- **Eerst vastleggen, dan 200**: zo is een event nooit kwijt (C4-12 kijkt naar events die op *received* blijven hangen).`,
        height: 360,
        width: 980,
        color: 7,
    };

    @node({
        id: '0131ef36-1f26-45b6-a484-f858cd374e62',
        name: 'Uitleg 1 ontvangen',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-80, -240],
    })
    Uitleg1Ontvangen = {
        content: '### 1. Controleren, vastleggen, bevestigen',
        height: 560,
        width: 1780,
        color: 5,
    };

    @node({
        id: '5d7f472f-dc3b-47e1-aa8f-fd35334575d7',
        name: 'Uitleg 2 doorgeven',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1720, -240],
    })
    Uitleg2Doorgeven = {
        content: `### 2. Klant bepalen → C4-11 → log bijwerken
Een \`payment_registered\` bevat alleen het factuur-ID, dus dan eerst de factuur ophalen voor het contact. Niet-relevante events worden gelogd als *ignored*.`,
        height: 560,
        width: 1560,
        color: 4,
    };

    @node({
        id: '86ac1eae-aa15-48df-b0f2-6b48db1246e2',
        webhookId: '1c3548cc-1398-4391-b5b6-3a34006d3873',
        name: 'Webhook moneybird-events',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 0],
    })
    WebhookMoneybirdEvents = {
        httpMethod: 'POST',
        path: 'moneybird-events',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'f2f0bb1b-4577-4e12-9998-4e6996a3e6ad',
        name: 'Config',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [220, 0],
        notes: 'Token van de webhook-registratie en welke MoneyBird-events ertoe doen. In productie: token/secret uit een n8n-credential.',
    })
    Config = {
        mode: 'runOnceForAllItems',
        jsCode: `// In productie: het webhook_token/secret dat MoneyBird teruggeeft bij POST /webhooks, als n8n-credential.
return [{ json: {
  webhook_token: 'demo-c4-webhook-token',
  relevante_events: [
    'sales_invoice_state_changed_to_late', 'sales_invoice_state_changed_to_reminded',
    'sales_invoice_state_changed_to_paid', 'sales_invoice_state_changed_to_uncollectible',
    'sales_invoice_state_changed_to_open', 'sales_invoice_state_changed_to_pending_payment',
    'sales_invoice_destroyed', 'payment_registered', 'payment_destroyed', 'subscription_cancelled'
  ],
  moneybird_base_url: 'http://127.0.0.1:5678/webhook/c4-moneybird/api/v2/adm-demo'
}}];`,
    };

    @node({
        id: '620e0635-6e9f-4f2c-9146-6ac7366bcce2',
        name: 'Event lezen & controleren',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [440, 0],
        notes: 'Leest de MoneyBird-payload. De state in de payload wordt bewust NIET gebruikt: C4-11 haalt altijd de actuele stand op.',
    })
    EventLezenControleren = {
        mode: 'runOnceForAllItems',
        jsCode: `const cfg = $('Config').first().json;
const req = $('Webhook moneybird-events').first().json;
const b = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
const h = req.headers || {};
const entity = (b.entity && typeof b.entity === 'object') ? b.entity : {};
const action = String(b.action || '');
const entity_type = String(b.entity_type || '');
const entity_id = String(b.entity_id || entity.id || '');
// MoneyBird stuurt per push een unieke Idempotency-Key; zonder header bouwen we er zelf een.
const idempotency_key = String(h['idempotency-key'] || '') || ['geen-key', b.webhook_id, entity_id, action, entity.updated_at || ''].join(':');
const mb_contact_id = String(entity.contact_id || (entity.contact || {}).id || '');
return [{ json: {
  token_ok: String(b.webhook_token || '') === cfg.webhook_token,
  idempotency_key,
  action,
  entity_type,
  entity_id,
  mb_contact_id,
  factuur_id_voor_lookup: (!mb_contact_id && entity.invoice_id) ? String(entity.invoice_id) : '',
  relevant: cfg.relevante_events.includes(action),
  raw: JSON.stringify(b).slice(0, 4000)
}}];`,
    };

    @node({
        id: '677c7240-9984-43a0-b0de-a2ca82f8a96a',
        name: 'Afzender klopt?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [660, 0],
    })
    AfzenderKlopt = {
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
                    leftValue: '={{ $json.token_ok }}',
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
        id: '864afccc-ec49-4671-af40-66fd564d80ea',
        name: 'Antwoord: 401',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.5,
        position: [880, 180],
    })
    Antwoord401 = {
        respondWith: 'json',
        responseBody: '{ "status": "unauthorized", "melding": "Onbekend webhook_token" }',
        options: {
            responseCode: 401,
        },
    };

    @node({
        id: '0520209c-88d9-4ad3-91e8-1b0d2bee7413',
        name: 'Al eerder ontvangen?',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [880, -80],
        alwaysOutputData: true,
        notes: 'Idempotentie: zoekt de Idempotency-Key in c4_event_log.',
    })
    AlEerderOntvangen = {
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
                    keyName: 'idempotency_key',
                    condition: 'eq',
                    keyValue: '={{ $json.idempotency_key }}',
                },
            ],
        },
        returnAll: false,
        limit: 1,
    };

    @node({
        id: '32030f57-8757-414a-ab39-84f22628f9d9',
        name: 'Al verwerkt?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1100, -80],
        notes: 'Al gedaan = processed/ignored, of received van < 10 min geleden (wordt nu verwerkt). Staat hij langer op received, dan is de vorige poging gecrasht en verwerken we hem opnieuw.',
    })
    AlVerwerkt = {
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
                        "={{ ['processed', 'ignored'].includes($json.status) || ($json.status === 'received' && (Date.now() - new Date($json.received_at).getTime()) < 10 * 60 * 1000) }}",
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
        id: 'cb0448fc-0377-4234-b7f5-2865473663c5',
        name: 'Antwoord: duplicaat',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.5,
        position: [1320, -220],
    })
    AntwoordDuplicaat = {
        respondWith: 'json',
        responseBody:
            "={{ JSON.stringify({ status: 'duplicate', idempotency_key: $('Event lezen & controleren').first().json.idempotency_key, melding: 'Dit event is al ontvangen (verwerkt of nog bezig); er wordt niets dubbel gedaan.' }) }}",
        options: {
            responseCode: 200,
        },
    };

    @node({
        id: '7ce7edee-e498-49a3-859a-97798f52cc86',
        name: 'Event loggen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1320, -40],
        notes: 'Eerst vastleggen, dan pas 200: crasht een latere stap, dan staat het event er nog (C4-12 ziet het).',
    })
    EventLoggen = {
        resource: 'row',
        operation: 'upsert',
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
                    keyValue: "={{ $('Event lezen & controleren').first().json.idempotency_key }}",
                },
            ],
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                idempotency_key: "={{ $('Event lezen & controleren').first().json.idempotency_key }}",
                action: "={{ $('Event lezen & controleren').first().json.action }}",
                entity_type: "={{ $('Event lezen & controleren').first().json.entity_type }}",
                entity_id: "={{ $('Event lezen & controleren').first().json.entity_id }}",
                mb_contact_id: "={{ $('Event lezen & controleren').first().json.mb_contact_id }}",
                status: 'received',
                actie: '',
                reden: '',
                received_at: '={{ $now.toISO() }}',
                processed_at: '',
                raw: "={{ $('Event lezen & controleren').first().json.raw }}",
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: 'd5ec90fc-e2f9-4b6a-b311-96f4b9300cc2',
        name: 'Antwoord: ontvangen (200)',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.5,
        position: [1540, -40],
        notes: 'MoneyBird wil een 200; anders probeert hij het opnieuw. Verwerking loopt hierna door.',
    })
    AntwoordOntvangen200 = {
        respondWith: 'json',
        responseBody:
            "={{ JSON.stringify({ status: 'received', idempotency_key: $('Event lezen & controleren').first().json.idempotency_key }) }}",
        options: {
            responseCode: 200,
        },
    };

    @node({
        id: '43092e78-c4ae-4bd6-8760-b769a7056317',
        name: 'Relevant event?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1780, -40],
    })
    RelevantEvent = {
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
                    leftValue: "={{ $('Event lezen & controleren').first().json.relevant }}",
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
        id: '3ac7ba8c-efda-46b6-940d-888d37a1f8da',
        name: 'Log: genegeerd',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [2000, 160],
    })
    LogGenegeerd = {
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
                    keyValue: "={{ $('Event lezen & controleren').first().json.idempotency_key }}",
                },
            ],
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                status: 'ignored',
                reden: "={{ 'Event ' + $('Event lezen & controleren').first().json.action + ' is niet relevant voor dunning' }}",
                processed_at: '={{ $now.toISO() }}',
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: 'd232d07e-f93a-43fb-8a80-c9d46d9fd530',
        name: 'Contact in payload?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [2000, -120],
    })
    ContactInPayload = {
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
                    leftValue: "={{ $('Event lezen & controleren').first().json.mb_contact_id !== '' }}",
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
        id: '545cb41e-b51a-4982-bd5b-eceb726b2659',
        name: 'MoneyBird: factuur ophalen',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [2220, -40],
        credentials: { httpHeaderAuth: { id: 'r3SrscUS0aDMhEz5', name: 'MoneyBird API (mock)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Een betaling (payment_registered/destroyed) bevat alleen het factuur-ID: haal de factuur op om het contact te weten.',
    })
    MoneybirdFactuurOphalen = {
        method: 'GET',
        url: "={{ $('Config').first().json.moneybird_base_url }}/sales_invoices/{{ $('Event lezen & controleren').first().json.factuur_id_voor_lookup }}",
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        options: {
            timeout: 10000,
        },
    };

    @node({
        id: '82a39f5d-d65e-47d8-b5fa-7003f49c5afa',
        name: 'Klant bepalen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2440, -120],
    })
    KlantBepalen = {
        mode: 'runOnceForAllItems',
        jsCode: `const ev = $('Event lezen & controleren').first().json;
let id = ev.mb_contact_id;
if (!id && $('MoneyBird: factuur ophalen').isExecuted) id = String($('MoneyBird: factuur ophalen').first().json.contact_id || '');
if (!id) throw new Error('Geen MoneyBird-contact te bepalen voor event ' + ev.action + ' (' + ev.entity_type + ' ' + ev.entity_id + '). Het event staat in c4_event_log op received.');
return [{ json: { mb_contact_id: id, aanleiding: ev.action, event_key: ev.idempotency_key } }];`,
    };

    @node({
        id: 'dc84f0ef-18fa-429f-8efd-a16ab1df07d4',
        name: 'C4-11 Klant herberekenen',
        type: 'n8n-nodes-base.executeWorkflow',
        version: 1.2,
        position: [2660, -120],
        notes: 'Alle regels en acties zitten in C4-11, zodat de dagelijkse controle (C4-12) precies hetzelfde doet.',
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
        id: '1d8dd7e8-260c-4883-8320-0ae8789e84f3',
        name: 'Log: verwerkt',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [2880, -120],
    })
    LogVerwerkt = {
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
                    keyValue: "={{ $('Event lezen & controleren').first().json.idempotency_key }}",
                },
            ],
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                status: 'processed',
                mb_contact_id: '={{ $json.mb_contact_id }}',
                actie: '={{ $json.actie }}',
                reden: '={{ $json.reden }}',
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
        this.WebhookMoneybirdEvents.out(0).to(this.Config.in(0));
        this.Config.out(0).to(this.EventLezenControleren.in(0));
        this.EventLezenControleren.out(0).to(this.AfzenderKlopt.in(0));
        this.AfzenderKlopt.out(0).to(this.AlEerderOntvangen.in(0));
        this.AfzenderKlopt.out(1).to(this.Antwoord401.in(0));
        this.AlEerderOntvangen.out(0).to(this.AlVerwerkt.in(0));
        this.AlVerwerkt.out(0).to(this.AntwoordDuplicaat.in(0));
        this.AlVerwerkt.out(1).to(this.EventLoggen.in(0));
        this.EventLoggen.out(0).to(this.AntwoordOntvangen200.in(0));
        this.AntwoordOntvangen200.out(0).to(this.RelevantEvent.in(0));
        this.RelevantEvent.out(0).to(this.ContactInPayload.in(0));
        this.RelevantEvent.out(1).to(this.LogGenegeerd.in(0));
        this.ContactInPayload.out(0).to(this.KlantBepalen.in(0));
        this.ContactInPayload.out(1).to(this.MoneybirdFactuurOphalen.in(0));
        this.MoneybirdFactuurOphalen.out(0).to(this.KlantBepalen.in(0));
        this.KlantBepalen.out(0).to(this.C411KlantHerberekenen.in(0));
        this.C411KlantHerberekenen.out(0).to(this.LogVerwerkt.in(0));
    }
}
