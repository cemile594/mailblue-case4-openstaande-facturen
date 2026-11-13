import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : C4-01 Mock – MoneyBird API
// Nodes   : 11  |  Connections: 9
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// UitlegMock                         stickyNote
// GetSalesInvoices                   webhook
// GetSalesInvoicesId                 webhook
// GetSubscriptions                   webhook
// VerzoekLezen                       code
// Geautoriseerd                      if
// FacturenLezen                      dataTable                  [alwaysOutput]
// ContactenLezen                     dataTable                  [alwaysOutput] [executeOnce]
// NaarMoneybirdFormaat               code
// Antwoord                           respondToWebhook
// Antwoord401                        respondToWebhook
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// GetSalesInvoices
//    → VerzoekLezen
//      → Geautoriseerd
//        → FacturenLezen
//          → ContactenLezen
//            → NaarMoneybirdFormaat
//              → Antwoord
//       .out(1) → Antwoord401
// GetSalesInvoicesId
//    → VerzoekLezen (↩ loop)
// GetSubscriptions
//    → VerzoekLezen (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: '4t40daXVWLBtu4jQ',
    name: 'C4-01 Mock – MoneyBird API',
    active: false,
    isArchived: false,
    settings: { timezone: 'Europe/Amsterdam', executionOrder: 'v1' },
})
export class C401MockMoneybirdApiWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '99f3cec4-ff02-488e-a856-15abfeef6ecc',
        name: 'Uitleg mock',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-60, -420],
    })
    UitlegMock = {
        content: `## C4-01 Mock – MoneyBird API
Doet zich voor als de MoneyBird REST API (v2), met **dezelfde paden, filtersyntax en velden**. Productie = alleen base-URL + credential wisselen.
- \`GET …/sales_invoices?filter=contact_id:X,state:late|reminded\`
- \`GET …/sales_invoices/{id}\` (nodig bij een \`payment_registered\`-webhook: die bevat alleen het factuur-ID)
- \`GET …/subscriptions?filter=contact_id:X\`

Data komt uit de Data Tables \`c4_mb_invoices\` en \`c4_mb_contacts\`; de simulator (C4-02) muteert die.
**Storing testen = deze workflow uitzetten.**`,
        height: 300,
        width: 760,
        color: 7,
    };

    @node({
        id: '08ce19ee-5a64-4c13-baf6-da7144d10748',
        webhookId: '89672285-3504-4858-9d3f-b15f46d65df5',
        name: 'GET sales_invoices',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, -100],
    })
    GetSalesInvoices = {
        httpMethod: 'GET',
        path: 'c4-moneybird/api/v2/adm-demo/sales_invoices',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'b04b14ee-f6e8-4ba8-af88-09d2f30dd40d',
        webhookId: 'c4-moneybird',
        name: 'GET sales_invoices/{id}',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 60],
        notes: 'Dynamisch pad: n8n zet de webhookId ervoor. Door die op "c4-moneybird" te zetten is de URL gelijk aan die van het lijst-endpoint + /{id}.',
    })
    GetSalesInvoicesId = {
        httpMethod: 'GET',
        path: 'api/v2/adm-demo/sales_invoices/:id',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: 'e0d948da-def2-4666-947b-7a1433cb8927',
        webhookId: 'c90e8e14-eb95-4fe5-976f-5d91cd3536c4',
        name: 'GET subscriptions',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 220],
    })
    GetSubscriptions = {
        httpMethod: 'GET',
        path: 'c4-moneybird/api/v2/adm-demo/subscriptions',
        responseMode: 'responseNode',
        options: {},
    };

    @node({
        id: '7d826449-e476-48b0-9889-2489151fa014',
        name: 'Verzoek lezen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [260, 60],
        notes: 'Bepaalt welk endpoint is aangeroepen, controleert de Bearer-token en leest de MoneyBird-filter ("contact_id:X,state:late|reminded").',
    })
    VerzoekLezen = {
        mode: 'runOnceForAllItems',
        jsCode: `const req = $input.first().json;
const auth = String((req.headers || {}).authorization || '');
const url = String(req.webhookUrl || '');
const id = (req.params || {}).id || '';
const soort = id ? 'invoice' : (url.includes('/subscriptions') ? 'subscriptions' : 'invoices');
const filter = String((req.query || {}).filter || '');
const parts = {};
for (const p of filter.split(',')) {
  const i = p.indexOf(':');
  if (i > 0) parts[p.slice(0, i).trim()] = p.slice(i + 1).trim();
}
return [{ json: {
  authorized: auth.startsWith('Bearer ') && auth.length > 7,
  soort,
  id: String(id).replace(/\\.json$/, ''),
  contact_id: parts.contact_id || '',
  states: parts.state ? parts.state.split('|') : [],
  administration_id: 'adm-demo'
}}];`,
    };

    @node({
        id: '5be09caa-2476-43e1-a4ab-8d4c0a9c1987',
        name: 'Geautoriseerd?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [480, 60],
    })
    Geautoriseerd = {
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
                    leftValue: '={{ $json.authorized }}',
                    rightValue: true,
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
        id: 'e2781b40-255d-4d6d-bb9a-4c4e68a0767e',
        name: 'Facturen lezen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [720, -40],
        alwaysOutputData: true,
    })
    FacturenLezen = {
        resource: 'row',
        operation: 'get',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_invoices',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [],
        },
        returnAll: true,
    };

    @node({
        id: '94159222-ff17-46e1-a483-a6565092e7b2',
        name: 'Contacten lezen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [940, -40],
        alwaysOutputData: true,
        executeOnce: true,
    })
    ContactenLezen = {
        resource: 'row',
        operation: 'get',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_contacts',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [],
        },
        returnAll: true,
    };

    @node({
        id: 'fb0e6f7d-e5a5-4306-b914-a5c08f5af3a6',
        name: 'Naar MoneyBird-formaat',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1160, -40],
        notes: 'Zelfde veldnamen als de echte API: id, contact_id, contact{…}, invoice_id, state, due_date, total_unpaid (string), original_sales_invoice_id, url/payment_url.',
    })
    NaarMoneybirdFormaat = {
        mode: 'runOnceForAllItems',
        jsCode: `const req = $('Verzoek lezen').first().json;
const rows = n => $(n).all().map(i => i.json).filter(r => r && r.id !== undefined);
const contacts = {};
for (const c of rows('Contacten lezen')) contacts[c.contact_id] = c;
const contactObj = c => c ? {
  id: c.contact_id, company_name: c.company_name, firstname: c.firstname, lastname: c.lastname,
  email: c.email, send_invoices_to_email: c.email, customer_id: c.customer_id
} : null;

if (req.soort === 'subscriptions') {
  const subs = Object.values(contacts)
    .filter(c => !req.contact_id || c.contact_id === req.contact_id)
    .map(c => ({
      id: c.subscription_id, administration_id: req.administration_id, contact_id: c.contact_id,
      contact: contactObj(c), reference: c.abonnement, frequency_type: 'month', frequency: 1,
      start_date: '2025-01-01', end_date: c.cancelled_at ? c.cancelled_at.slice(0, 10) : null,
      cancelled_at: c.cancelled_at || null
    }));
  return [{ json: { code: 200, body: subs } }];
}

const toMb = r => ({
  id: r.mb_id,
  administration_id: req.administration_id,
  contact_id: r.contact_id,
  contact: contactObj(contacts[r.contact_id]),
  invoice_id: r.invoice_id,
  state: r.state,
  invoice_date: r.invoice_date,
  due_date: r.due_date,
  currency: 'EUR',
  total_price_incl_tax: Number(r.total_price_incl_tax).toFixed(2),
  total_unpaid: Number(r.total_unpaid).toFixed(2),
  original_sales_invoice_id: r.original_sales_invoice_id || null,
  url: 'https://pay.example.com/moneybird/' + r.mb_id,
  payment_url: 'https://pay.example.com/moneybird/' + r.mb_id + '/betalen',
  updated_at: r.updated_at
});
const invoices = rows('Facturen lezen').filter(r => r.mb_id);

if (req.soort === 'invoice') {
  const r = invoices.find(x => x.mb_id === req.id);
  return [{ json: r ? { code: 200, body: toMb(r) } : { code: 404, body: { error: 'record not found', symbol: 'not_found' } } }];
}
const lijst = invoices
  .filter(r => !req.contact_id || r.contact_id === req.contact_id)
  .filter(r => req.states.length === 0 || req.states.includes(r.state))
  .map(toMb);
return [{ json: { code: 200, body: lijst } }];`,
    };

    @node({
        id: '2fac3a97-5e27-4661-800b-fbd694b3de8a',
        name: 'Antwoord',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.5,
        position: [1380, -40],
    })
    Antwoord = {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify($json.body) }}',
        options: {
            responseCode: '={{ $json.code }}',
        },
    };

    @node({
        id: 'a2b0d254-4a88-4549-b9dc-e2a0d2ff4e7e',
        name: 'Antwoord: 401',
        type: 'n8n-nodes-base.respondToWebhook',
        version: 1.5,
        position: [720, 180],
    })
    Antwoord401 = {
        respondWith: 'json',
        responseBody: '{ "error": "Unauthorized", "symbol": "unauthorized" }',
        options: {
            responseCode: 401,
        },
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.GetSalesInvoices.out(0).to(this.VerzoekLezen.in(0));
        this.GetSalesInvoicesId.out(0).to(this.VerzoekLezen.in(0));
        this.GetSubscriptions.out(0).to(this.VerzoekLezen.in(0));
        this.VerzoekLezen.out(0).to(this.Geautoriseerd.in(0));
        this.Geautoriseerd.out(0).to(this.FacturenLezen.in(0));
        this.Geautoriseerd.out(1).to(this.Antwoord401.in(0));
        this.FacturenLezen.out(0).to(this.ContactenLezen.in(0));
        this.ContactenLezen.out(0).to(this.NaarMoneybirdFormaat.in(0));
        this.NaarMoneybirdFormaat.out(0).to(this.Antwoord.in(0));
    }
}
