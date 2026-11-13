import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : C4-00 Setup – Demo-data
// Nodes   : 24  |  Connections: 20
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// UitlegSetup                        stickyNote
// HandmatigStarten                   manualTrigger
// WebhookC4Setup                     webhook
// MaakTabelC4MbContacts              dataTable                  [executeOnce]
// MaakTabelC4MbInvoices              dataTable                  [executeOnce]
// MaakTabelC4DunningCases            dataTable                  [executeOnce]
// MaakTabelC4EventLog                dataTable                  [executeOnce]
// MaakTabelC4SlackMessages           dataTable                  [executeOnce]
// LeegC4MbContacts                   dataTable                  [executeOnce]
// LeegC4MbInvoices                   dataTable                  [executeOnce]
// LeegC4DunningCases                 dataTable                  [executeOnce]
// LeegC4EventLog                     dataTable                  [executeOnce]
// LeegC4SlackMessages                dataTable                  [executeOnce]
// MoneybirdContactenDemo             code                       [executeOnce]
// ContactenInvoegen                  dataTable
// MoneybirdFacturenDemo              code                       [executeOnce]
// FacturenInvoegen                   dataTable
// Samenvatting                       code
// UitlegStatus                       stickyNote
// WebhookC4Status                    webhook
// DossiersOphalen                    dataTable                  [alwaysOutput]
// EventLogOphalen                    dataTable                  [alwaysOutput] [executeOnce]
// SlackMockOphalen                   dataTable                  [alwaysOutput] [executeOnce]
// StatusSamenstellen                 code
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// HandmatigStarten
//    → MaakTabelC4MbContacts
//      → MaakTabelC4MbInvoices
//        → MaakTabelC4DunningCases
//          → MaakTabelC4EventLog
//            → MaakTabelC4SlackMessages
//              → LeegC4MbContacts
//                → LeegC4MbInvoices
//                  → LeegC4DunningCases
//                    → LeegC4EventLog
//                      → LeegC4SlackMessages
//                        → MoneybirdContactenDemo
//                          → ContactenInvoegen
//                            → MoneybirdFacturenDemo
//                              → FacturenInvoegen
//                                → Samenvatting
// WebhookC4Setup
//    → MaakTabelC4MbContacts (↩ loop)
// WebhookC4Status
//    → DossiersOphalen
//      → EventLogOphalen
//        → SlackMockOphalen
//          → StatusSamenstellen
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'rLw2pvlv3jgWlvq8',
    name: 'C4-00 Setup – Demo-data',
    active: false,
    isArchived: false,
    settings: { timezone: 'Europe/Amsterdam', executionOrder: 'v1' },
})
export class C400SetupDemoDataWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '7adb92c5-3b28-4e1d-9698-cbe0ebc6169f',
        name: 'Uitleg setup',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-60, -340],
    })
    UitlegSetup = {
        content: `## C4-00 Setup – Demo-data
Maakt de Data Tables voor case 4 aan (als ze nog niet bestaan), leegt ze en vult de fictieve MoneyBird-data.
- \`c4_mb_contacts\` / \`c4_mb_invoices\`: de mock van MoneyBird (bron van waarheid voor factuurstatus)
- \`c4_dunning_cases\`: één rij per klant — staat die klant in dunning, welke Asana-taak, welk AC-contact
- \`c4_event_log\`: elke binnengekomen webhook (idempotentie + audit trail)
- \`c4_slack_messages\`: mock van Slack (#billing, #billing-alerts)

Demo-reset: \`curl -X POST <n8n>/webhook/c4-setup\` (of scripts/run_demo.sh --reset).`,
        height: 280,
        width: 720,
        color: 7,
    };

    @node({
        id: '14adfb9a-ab9c-4aa7-a8d7-7e79cc429585',
        name: 'Handmatig starten',
        type: 'n8n-nodes-base.manualTrigger',
        version: 1,
        position: [0, -100],
    })
    HandmatigStarten = {};

    @node({
        id: 'dbaca78b-f01e-423f-82c2-e9c11f96c89f',
        webhookId: '8d8c9aa7-f0fc-4fd1-a84d-149557b17d79',
        name: 'Webhook c4-setup',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 100],
    })
    WebhookC4Setup = {
        httpMethod: 'POST',
        path: 'c4-setup',
        responseMode: 'lastNode',
        responseData: 'firstEntryJson',
        options: {},
    };

    @node({
        id: '34a2e3bd-3ebf-4cc4-8491-41dad03cf102',
        name: 'Maak tabel c4_mb_contacts',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [260, 0],
        executeOnce: true,
    })
    MaakTabelC4MbContacts = {
        resource: 'table',
        operation: 'create',
        tableName: 'c4_mb_contacts',
        columns: {
            column: [
                {
                    name: 'contact_id',
                    type: 'string',
                },
                {
                    name: 'company_name',
                    type: 'string',
                },
                {
                    name: 'firstname',
                    type: 'string',
                },
                {
                    name: 'lastname',
                    type: 'string',
                },
                {
                    name: 'email',
                    type: 'string',
                },
                {
                    name: 'customer_id',
                    type: 'string',
                },
                {
                    name: 'abonnement',
                    type: 'string',
                },
                {
                    name: 'abonnement_status',
                    type: 'string',
                },
                {
                    name: 'subscription_id',
                    type: 'string',
                },
                {
                    name: 'cancelled_at',
                    type: 'string',
                },
            ],
        },
        options: {
            createIfNotExists: true,
        },
    };

    @node({
        id: '923d5309-ee3f-4b40-88c0-85a1bf465a4d',
        name: 'Maak tabel c4_mb_invoices',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [480, 0],
        executeOnce: true,
    })
    MaakTabelC4MbInvoices = {
        resource: 'table',
        operation: 'create',
        tableName: 'c4_mb_invoices',
        columns: {
            column: [
                {
                    name: 'mb_id',
                    type: 'string',
                },
                {
                    name: 'contact_id',
                    type: 'string',
                },
                {
                    name: 'invoice_id',
                    type: 'string',
                },
                {
                    name: 'state',
                    type: 'string',
                },
                {
                    name: 'invoice_date',
                    type: 'string',
                },
                {
                    name: 'due_date',
                    type: 'string',
                },
                {
                    name: 'total_price_incl_tax',
                    type: 'number',
                },
                {
                    name: 'total_unpaid',
                    type: 'number',
                },
                {
                    name: 'original_sales_invoice_id',
                    type: 'string',
                },
                {
                    name: 'updated_at',
                    type: 'string',
                },
            ],
        },
        options: {
            createIfNotExists: true,
        },
    };

    @node({
        id: 'b9b8a13c-7be1-4151-9adb-d0d26be3f5e7',
        name: 'Maak tabel c4_dunning_cases',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [700, 0],
        executeOnce: true,
    })
    MaakTabelC4DunningCases = {
        resource: 'table',
        operation: 'create',
        tableName: 'c4_dunning_cases',
        columns: {
            column: [
                {
                    name: 'mb_contact_id',
                    type: 'string',
                },
                {
                    name: 'klant',
                    type: 'string',
                },
                {
                    name: 'email',
                    type: 'string',
                },
                {
                    name: 'status',
                    type: 'string',
                },
                {
                    name: 'reden',
                    type: 'string',
                },
                {
                    name: 'ac_contact_id',
                    type: 'string',
                },
                {
                    name: 'asana_task_gid',
                    type: 'string',
                },
                {
                    name: 'gestart_op',
                    type: 'string',
                },
                {
                    name: 'gestopt_op',
                    type: 'string',
                },
                {
                    name: 'openstaand_bedrag',
                    type: 'number',
                },
                {
                    name: 'facturen',
                    type: 'string',
                },
                {
                    name: 'abonnement_opgezegd',
                    type: 'string',
                },
                {
                    name: 'rondes',
                    type: 'number',
                },
                {
                    name: 'laatste_aanleiding',
                    type: 'string',
                },
                {
                    name: 'bijgewerkt_op',
                    type: 'string',
                },
            ],
        },
        options: {
            createIfNotExists: true,
        },
    };

    @node({
        id: 'ba9407ef-ad63-4e9c-ac40-2cdb742fd4b0',
        name: 'Maak tabel c4_event_log',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [920, 0],
        executeOnce: true,
    })
    MaakTabelC4EventLog = {
        resource: 'table',
        operation: 'create',
        tableName: 'c4_event_log',
        columns: {
            column: [
                {
                    name: 'idempotency_key',
                    type: 'string',
                },
                {
                    name: 'action',
                    type: 'string',
                },
                {
                    name: 'entity_type',
                    type: 'string',
                },
                {
                    name: 'entity_id',
                    type: 'string',
                },
                {
                    name: 'mb_contact_id',
                    type: 'string',
                },
                {
                    name: 'status',
                    type: 'string',
                },
                {
                    name: 'actie',
                    type: 'string',
                },
                {
                    name: 'reden',
                    type: 'string',
                },
                {
                    name: 'received_at',
                    type: 'string',
                },
                {
                    name: 'processed_at',
                    type: 'string',
                },
                {
                    name: 'raw',
                    type: 'string',
                },
            ],
        },
        options: {
            createIfNotExists: true,
        },
    };

    @node({
        id: '32c76a6d-2f05-4971-9db8-77eb35518177',
        name: 'Maak tabel c4_slack_messages',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1140, 0],
        executeOnce: true,
    })
    MaakTabelC4SlackMessages = {
        resource: 'table',
        operation: 'create',
        tableName: 'c4_slack_messages',
        columns: {
            column: [
                {
                    name: 'channel',
                    type: 'string',
                },
                {
                    name: 'severity',
                    type: 'string',
                },
                {
                    name: 'text',
                    type: 'string',
                },
                {
                    name: 'source',
                    type: 'string',
                },
                {
                    name: 'created_at',
                    type: 'string',
                },
            ],
        },
        options: {
            createIfNotExists: true,
        },
    };

    @node({
        id: '5bbdd73a-6e69-404f-bff9-0e48eb1200e2',
        name: 'Leeg c4_mb_contacts',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1360, 0],
        executeOnce: true,
    })
    LeegC4MbContacts = {
        resource: 'table',
        operation: 'clear',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_contacts',
            mode: 'name',
        },
    };

    @node({
        id: '76c340d9-278b-4650-8e67-d70b69b187d3',
        name: 'Leeg c4_mb_invoices',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1580, 0],
        executeOnce: true,
    })
    LeegC4MbInvoices = {
        resource: 'table',
        operation: 'clear',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_invoices',
            mode: 'name',
        },
    };

    @node({
        id: '27a1a14c-de70-44c3-aa59-ad9fd831f4d1',
        name: 'Leeg c4_dunning_cases',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1800, 0],
        executeOnce: true,
    })
    LeegC4DunningCases = {
        resource: 'table',
        operation: 'clear',
        dataTableId: {
            __rl: true,
            value: 'c4_dunning_cases',
            mode: 'name',
        },
    };

    @node({
        id: 'ea5cbeb9-2dff-4f32-b054-165dac6e0050',
        name: 'Leeg c4_event_log',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [2020, 0],
        executeOnce: true,
    })
    LeegC4EventLog = {
        resource: 'table',
        operation: 'clear',
        dataTableId: {
            __rl: true,
            value: 'c4_event_log',
            mode: 'name',
        },
    };

    @node({
        id: 'f20cfae2-bd00-4e11-9ce0-4bc6abe2483b',
        name: 'Leeg c4_slack_messages',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [2240, 0],
        executeOnce: true,
    })
    LeegC4SlackMessages = {
        resource: 'table',
        operation: 'clear',
        dataTableId: {
            __rl: true,
            value: 'c4_slack_messages',
            mode: 'name',
        },
    };

    @node({
        id: 'af133f02-77a4-4b27-b42e-d94fa0f30eb9',
        name: 'MoneyBird-contacten (demo)',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2460, 0],
        executeOnce: true,
        notes: 'Fictieve klanten (zelfde data als mock-data/moneybird_contacts.json). Kapsalon Knip heeft bewust geen e-mailadres.',
    })
    MoneybirdContactenDemo = {
        mode: 'runOnceForAllItems',
        jsCode: `// Fictieve MoneyBird-contacten (= mock-data/moneybird_contacts.json)
const rows = [
  {
    "contact_id": "mb_c_410001",
    "company_name": "Bakkerij De Korenaar",
    "firstname": "Fatima",
    "lastname": "de Wit",
    "email": "administratie@korenaar.example.com",
    "customer_id": "1041",
    "abonnement": "MailBlue Plus (maand)",
    "abonnement_status": "actief",
    "subscription_id": "mb_sub_610001"
  },
  {
    "contact_id": "mb_c_420001",
    "company_name": "Studio Noordlicht",
    "firstname": "Jesse",
    "lastname": "Bakker",
    "email": "finance@noordlicht.example.com",
    "customer_id": "1042",
    "abonnement": "MailBlue Pro (maand)",
    "abonnement_status": "actief",
    "subscription_id": "mb_sub_620001"
  },
  {
    "contact_id": "mb_c_430001",
    "company_name": "Fietsenmaker Spaak & Zn",
    "firstname": "Henk",
    "lastname": "Spaak",
    "email": "henk@spaak.example.com",
    "customer_id": "1043",
    "abonnement": "MailBlue Lite (maand)",
    "abonnement_status": "actief",
    "subscription_id": "mb_sub_630001"
  },
  {
    "contact_id": "mb_c_440001",
    "company_name": "Kapsalon Knip",
    "firstname": "Noor",
    "lastname": "Yilmaz",
    "email": "",
    "customer_id": "1044",
    "abonnement": "MailBlue Lite (maand)",
    "abonnement_status": "actief",
    "subscription_id": "mb_sub_640001"
  },
  {
    "contact_id": "mb_c_450001",
    "company_name": "Hoveniers Groenrijk",
    "firstname": "Sem",
    "lastname": "Jansen",
    "email": "info@groenrijk.example.com",
    "customer_id": "1045",
    "abonnement": "MailBlue Plus (maand)",
    "abonnement_status": "actief",
    "subscription_id": "mb_sub_650001"
  }
];
return rows.map(r => ({ json: { ...r, cancelled_at: '' } }));`,
    };

    @node({
        id: '6cd1e274-9c80-4b10-904f-62d2f84cf692',
        name: 'Contacten invoegen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [2680, 0],
    })
    ContactenInvoegen = {
        resource: 'row',
        operation: 'insert',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_contacts',
            mode: 'name',
        },
        columns: {
            mappingMode: 'autoMapInputData',
            value: {},
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: '213e1202-1886-4074-bfa8-d1a32f121a6d',
        name: 'MoneyBird-facturen (demo)',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2900, 0],
        executeOnce: true,
        notes: 'Fictieve sales invoices (= mock-data/moneybird_invoices.json). Alles staat nog op open: de simulator (C4-02) laat ze vervallen.',
    })
    MoneybirdFacturenDemo = {
        mode: 'runOnceForAllItems',
        jsCode: `// Fictieve MoneyBird sales invoices (= mock-data/moneybird_invoices.json). 'id' heet hier mb_id: data tables hebben zelf een id-kolom.
const rows = [
  {
    "mb_id": "mb_inv_510000",
    "contact_id": "mb_c_410001",
    "invoice_id": "2026-0433",
    "state": "paid",
    "invoice_date": "2026-09-01",
    "due_date": "2026-09-15",
    "total_price_incl_tax": 59.0,
    "total_unpaid": 0.0,
    "original_sales_invoice_id": ""
  },
  {
    "mb_id": "mb_inv_510001",
    "contact_id": "mb_c_410001",
    "invoice_id": "2026-0501",
    "state": "open",
    "invoice_date": "2026-10-01",
    "due_date": "2026-10-15",
    "total_price_incl_tax": 59.0,
    "total_unpaid": 59.0,
    "original_sales_invoice_id": ""
  },
  {
    "mb_id": "mb_inv_510002",
    "contact_id": "mb_c_410001",
    "invoice_id": "2026-0567",
    "state": "open",
    "invoice_date": "2026-10-29",
    "due_date": "2026-11-12",
    "total_price_incl_tax": 59.0,
    "total_unpaid": 59.0,
    "original_sales_invoice_id": ""
  },
  {
    "mb_id": "mb_inv_520001",
    "contact_id": "mb_c_420001",
    "invoice_id": "2026-0512",
    "state": "open",
    "invoice_date": "2026-10-06",
    "due_date": "2026-10-20",
    "total_price_incl_tax": 179.0,
    "total_unpaid": 179.0,
    "original_sales_invoice_id": ""
  },
  {
    "mb_id": "mb_inv_530001",
    "contact_id": "mb_c_430001",
    "invoice_id": "2026-0520",
    "state": "open",
    "invoice_date": "2026-10-10",
    "due_date": "2026-10-24",
    "total_price_incl_tax": 89.0,
    "total_unpaid": 89.0,
    "original_sales_invoice_id": ""
  },
  {
    "mb_id": "mb_inv_540001",
    "contact_id": "mb_c_440001",
    "invoice_id": "2026-0525",
    "state": "open",
    "invoice_date": "2026-10-13",
    "due_date": "2026-10-27",
    "total_price_incl_tax": 29.0,
    "total_unpaid": 29.0,
    "original_sales_invoice_id": ""
  },
  {
    "mb_id": "mb_inv_550001",
    "contact_id": "mb_c_450001",
    "invoice_id": "2026-0530",
    "state": "open",
    "invoice_date": "2026-10-15",
    "due_date": "2026-10-29",
    "total_price_incl_tax": 119.0,
    "total_unpaid": 119.0,
    "original_sales_invoice_id": ""
  }
];
const nu = new Date().toISOString();
return rows.map(r => ({ json: { ...r, updated_at: nu } }));`,
    };

    @node({
        id: '3ecd3c81-98bc-4e48-92e2-3eed4831504d',
        name: 'Facturen invoegen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [3120, 0],
    })
    FacturenInvoegen = {
        resource: 'row',
        operation: 'insert',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_invoices',
            mode: 'name',
        },
        columns: {
            mappingMode: 'autoMapInputData',
            value: {},
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: '5790bdff-afd1-4d5d-a7ad-f3bc3906c5a1',
        name: 'Samenvatting',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [3340, 0],
    })
    Samenvatting = {
        mode: 'runOnceForAllItems',
        jsCode: `return [{ json: {
  status: 'ok',
  tabellen: ["c4_mb_contacts", "c4_mb_invoices", "c4_dunning_cases", "c4_event_log", "c4_slack_messages"],
  contacten: $('MoneyBird-contacten (demo)').all().length,
  facturen: $input.all().length,
  opmerking: 'Dossiers, event-log en Slack-mock zijn geleegd (demo-reset). Reset ActiveCampaign en Asana met scripts/run_demo.sh --reset.'
}}];`,
    };

    @node({
        id: 'cc31205e-8e17-47ef-9595-c5ba02eda6ba',
        name: 'Uitleg status',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-60, 300],
    })
    UitlegStatus = {
        content: `### Status opvragen (voor checkscript en demo)
\`GET <n8n>/webhook/c4-status\` geeft alle dossiers, het event-log en de Slack-mock als JSON. Nodig omdat de Data Tables-API niet bereikbaar is met de API-key van deze lokale instance.`,
        height: 300,
        width: 1180,
        color: 4,
    };

    @node({
        id: '3fb88a41-2550-41c6-bdf0-2d2b699ddc3c',
        webhookId: '9683298f-ff78-4e3e-b44d-5837e6f011c4',
        name: 'Webhook c4-status',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 440],
    })
    WebhookC4Status = {
        httpMethod: 'GET',
        path: 'c4-status',
        responseMode: 'lastNode',
        responseData: 'firstEntryJson',
        options: {},
    };

    @node({
        id: '709eefe2-9888-4800-8245-9ffc1cb65230',
        name: 'Dossiers ophalen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [220, 440],
        alwaysOutputData: true,
    })
    DossiersOphalen = {
        resource: 'row',
        operation: 'get',
        dataTableId: {
            __rl: true,
            value: 'c4_dunning_cases',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [],
        },
        returnAll: true,
    };

    @node({
        id: '20c2d4e8-d485-45fe-9f9d-70be15cd4152',
        name: 'Event-log ophalen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [440, 440],
        alwaysOutputData: true,
        executeOnce: true,
    })
    EventLogOphalen = {
        resource: 'row',
        operation: 'get',
        dataTableId: {
            __rl: true,
            value: 'c4_event_log',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [],
        },
        returnAll: true,
    };

    @node({
        id: '098f0455-3e14-4c0b-80ab-ffdbd196d10b',
        name: 'Slack-mock ophalen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [660, 440],
        alwaysOutputData: true,
        executeOnce: true,
    })
    SlackMockOphalen = {
        resource: 'row',
        operation: 'get',
        dataTableId: {
            __rl: true,
            value: 'c4_slack_messages',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [],
        },
        returnAll: true,
    };

    @node({
        id: '97a01fc5-68d1-485f-a413-847b14e31706',
        name: 'Status samenstellen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [880, 440],
    })
    StatusSamenstellen = {
        mode: 'runOnceForAllItems',
        jsCode: `const rows = n => $(n).all().map(i => i.json).filter(r => r && Object.keys(r).length > 0 && r.id !== undefined);
const strip = r => { const o = { ...r }; delete o.createdAt; delete o.updatedAt; return o; };
const log = rows('Event-log ophalen').map(strip).map(r => ({ ...r, raw: undefined }));
return [{ json: {
  dossiers: rows('Dossiers ophalen').map(strip),
  event_log: log,
  slack: rows('Slack-mock ophalen').map(strip)
} }];`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.WebhookC4Status.out(0).to(this.DossiersOphalen.in(0));
        this.DossiersOphalen.out(0).to(this.EventLogOphalen.in(0));
        this.EventLogOphalen.out(0).to(this.SlackMockOphalen.in(0));
        this.SlackMockOphalen.out(0).to(this.StatusSamenstellen.in(0));
        this.HandmatigStarten.out(0).to(this.MaakTabelC4MbContacts.in(0));
        this.WebhookC4Setup.out(0).to(this.MaakTabelC4MbContacts.in(0));
        this.MaakTabelC4MbContacts.out(0).to(this.MaakTabelC4MbInvoices.in(0));
        this.MaakTabelC4MbInvoices.out(0).to(this.MaakTabelC4DunningCases.in(0));
        this.MaakTabelC4DunningCases.out(0).to(this.MaakTabelC4EventLog.in(0));
        this.MaakTabelC4EventLog.out(0).to(this.MaakTabelC4SlackMessages.in(0));
        this.MaakTabelC4SlackMessages.out(0).to(this.LeegC4MbContacts.in(0));
        this.LeegC4MbContacts.out(0).to(this.LeegC4MbInvoices.in(0));
        this.LeegC4MbInvoices.out(0).to(this.LeegC4DunningCases.in(0));
        this.LeegC4DunningCases.out(0).to(this.LeegC4EventLog.in(0));
        this.LeegC4EventLog.out(0).to(this.LeegC4SlackMessages.in(0));
        this.LeegC4SlackMessages.out(0).to(this.MoneybirdContactenDemo.in(0));
        this.MoneybirdContactenDemo.out(0).to(this.ContactenInvoegen.in(0));
        this.ContactenInvoegen.out(0).to(this.MoneybirdFacturenDemo.in(0));
        this.MoneybirdFacturenDemo.out(0).to(this.FacturenInvoegen.in(0));
        this.FacturenInvoegen.out(0).to(this.Samenvatting.in(0));
    }
}
