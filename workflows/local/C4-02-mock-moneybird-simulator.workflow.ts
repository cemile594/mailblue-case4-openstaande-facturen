import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : C4-02 Mock – MoneyBird-gebeurtenis (simulator)
// Nodes   : 13  |  Connections: 14
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// UitlegSimulator                    stickyNote
// WebhookC4MoneybirdSim              webhook
// FacturenLezen                      dataTable                  [alwaysOutput]
// ContactenLezen                     dataTable                  [alwaysOutput] [executeOnce]
// GebeurtenisUitvoeren               code
// SoortMutatie                       switch
// FactuurBijwerken                   dataTable
// CreditfactuurToevoegen             dataTable
// ContactBijwerken                   dataTable
// WebhookVersturen                   if                         [executeOnce]
// PushesKlaarzetten                  code                       [executeOnce]
// WebhookNaarC410                    httpRequest
// Samenvatting                       code                       [executeOnce]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// WebhookC4MoneybirdSim
//    → FacturenLezen
//      → ContactenLezen
//        → GebeurtenisUitvoeren
//          → SoortMutatie
//            → FactuurBijwerken
//              → WebhookVersturen
//                → PushesKlaarzetten
//                  → WebhookNaarC410
//                    → Samenvatting
//               .out(1) → Samenvatting (↩ loop)
//           .out(1) → CreditfactuurToevoegen
//              → WebhookVersturen (↩ loop)
//           .out(2) → ContactBijwerken
//              → WebhookVersturen (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'PhGcbTwqZ5YoLbob',
    name: 'C4-02 Mock – MoneyBird-gebeurtenis (simulator)',
    active: false,
    isArchived: false,
    settings: { timezone: 'Europe/Amsterdam', executionOrder: 'v1' },
})
export class C402MockMoneybirdGebeurtenisSimulatorWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'f21b2385-3909-4a03-8c85-c7ade6cba208',
        name: 'Uitleg simulator',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-80, -520],
    })
    UitlegSimulator = {
        content: `## C4-02 Simulator: "er gebeurt iets in MoneyBird"
Speelt na wat MoneyBird doet: **status van een factuur wijzigen** in de mock-tabellen en daarna **een webhook sturen in het echte MoneyBird-formaat** (\`administration_id, webhook_id, webhook_token, entity_type, entity_id, state, action, entity\` + header \`Idempotency-Key\`) naar C4-10.

\`POST /webhook/c4-moneybird-sim\` met \`{ "gebeurtenis": …, "factuur": "2026-0501", "bedrag": 40 }\`
- **vervalt** → state late · \`sales_invoice_state_changed_to_late\`
- **deelbetaling** → total_unpaid omlaag · \`payment_registered\` (Payment, alleen factuur-ID)
- **betaling** → paid · \`sales_invoice_state_changed_to_paid\`
- **creditfactuur** → nieuwe creditfactuur (negatief) · \`sales_invoice_state_changed_to_open\`
- **storno** → betaling teruggedraaid, weer late · \`payment_destroyed\`
- **oninbaar** → uncollectible · \`sales_invoice_state_changed_to_uncollectible\`
- **opzegging** (\`"contact"\`) → abonnement opgezegd · \`subscription_cancelled\`

Opties: \`"zonder_webhook": true\` (= gemiste webhook), \`"dubbel": true\` (= MoneyBird stuurt dezelfde push 2×).`,
        height: 460,
        width: 980,
        color: 7,
    };

    @node({
        id: '182a3f76-3e68-4ed2-814a-6a92f523c82f',
        webhookId: '0426c2d9-8137-44cc-948b-20886e8ccf14',
        name: 'Webhook c4-moneybird-sim',
        type: 'n8n-nodes-base.webhook',
        version: 2.1,
        position: [0, 0],
    })
    WebhookC4MoneybirdSim = {
        httpMethod: 'POST',
        path: 'c4-moneybird-sim',
        responseMode: 'lastNode',
        responseData: 'firstEntryJson',
        options: {},
    };

    @node({
        id: '7850941b-a85f-4967-819e-d52f2324c521',
        name: 'Facturen lezen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [220, 0],
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
        id: 'ee99b575-2254-41aa-b6b3-97e8f27791c1',
        name: 'Contacten lezen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [440, 0],
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
        id: '5dc1e3a7-ec3e-417e-a086-27567655cce6',
        name: 'Gebeurtenis uitvoeren',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [660, 0],
        notes: 'Bepaalt de mutatie op de mock-data én de webhook-payload die MoneyBird daarna zou sturen.',
    })
    GebeurtenisUitvoeren = {
        mode: 'runOnceForAllItems',
        jsCode: `const body = $('Webhook c4-moneybird-sim').first().json.body || {};
const rows = n => $(n).all().map(i => i.json).filter(r => r && r.id !== undefined);
const facturen = rows('Facturen lezen');
const contacten = rows('Contacten lezen');
const g = String(body.gebeurtenis || '').toLowerCase();
const num = v => Math.round(Number(v || 0) * 100) / 100;
const nu = new Date().toISOString();
const vandaag = nu.slice(0, 10);
const TOKEN = 'demo-c4-webhook-token';

const contactObj = c => c ? { id: c.contact_id, company_name: c.company_name, firstname: c.firstname, lastname: c.lastname,
  email: c.email, send_invoices_to_email: c.email, customer_id: c.customer_id } : null;
const toMb = (r, c) => ({ id: r.mb_id, administration_id: 'adm-demo', contact_id: r.contact_id, contact: contactObj(c),
  invoice_id: r.invoice_id, state: r.state, invoice_date: r.invoice_date, due_date: r.due_date, currency: 'EUR',
  total_price_incl_tax: num(r.total_price_incl_tax).toFixed(2), total_unpaid: num(r.total_unpaid).toFixed(2),
  original_sales_invoice_id: r.original_sales_invoice_id || null, updated_at: nu });

let mutatie = null, push = null, melding = '';
if (g === 'opzegging') {
  const c = contacten.find(x => x.contact_id === body.contact || x.company_name === body.contact || x.customer_id === String(body.contact));
  if (!c) throw new Error('Contact niet gevonden: ' + body.contact);
  mutatie = { soort: 'contact', contact_id: c.contact_id, cancelled_at: nu, abonnement_status: 'opgezegd' };
  push = { entity_type: 'Subscription', entity_id: c.subscription_id, state: 'cancelled', action: 'subscription_cancelled',
    entity: { id: c.subscription_id, contact_id: c.contact_id, contact: contactObj(c), reference: c.abonnement, cancelled_at: nu, end_date: vandaag } };
  melding = c.company_name + ' heeft het abonnement opgezegd';
} else {
  const f = facturen.find(x => x.mb_id === body.factuur || x.invoice_id === body.factuur);
  if (!f) throw new Error('Factuur niet gevonden: ' + body.factuur);
  const c = contacten.find(x => x.contact_id === f.contact_id);
  const nieuw = { ...f };
  const payment = (prijs) => ({ id: 'mb_pay_' + Date.now(), administration_id: 'adm-demo', invoice_type: 'SalesInvoice',
    invoice_id: f.mb_id, price: num(prijs).toFixed(2), payment_date: vandaag, created_at: nu });
  if (g === 'vervalt') {
    nieuw.state = 'late';
    push = { entity_type: 'SalesInvoice', action: 'sales_invoice_state_changed_to_late', state: 'late' };
    melding = 'Factuur ' + f.invoice_id + ' is vervallen (vervaldatum ' + f.due_date + ')';
  } else if (g === 'deelbetaling') {
    const bedrag = num(body.bedrag);
    if (!(bedrag > 0)) throw new Error('Geef een bedrag mee voor een deelbetaling');
    nieuw.total_unpaid = Math.max(0, num(f.total_unpaid - bedrag));
    if (nieuw.total_unpaid === 0) nieuw.state = 'paid';
    push = { entity_type: 'Payment', action: 'payment_registered', state: null, entity: payment(bedrag) };
    melding = 'Deelbetaling van ' + bedrag + ' op ' + f.invoice_id + ', nog open: ' + nieuw.total_unpaid;
  } else if (g === 'betaling') {
    nieuw.total_unpaid = 0; nieuw.state = 'paid';
    push = { entity_type: 'SalesInvoice', action: 'sales_invoice_state_changed_to_paid', state: 'paid' };
    melding = 'Factuur ' + f.invoice_id + ' is volledig betaald';
  } else if (g === 'storno') {
    nieuw.total_unpaid = num(f.total_price_incl_tax);
    nieuw.state = (f.due_date < vandaag) ? 'late' : 'open';
    push = { entity_type: 'Payment', action: 'payment_destroyed', state: null, entity: payment(f.total_price_incl_tax) };
    melding = 'Betaling op ' + f.invoice_id + ' is teruggedraaid (storno), status weer ' + nieuw.state;
  } else if (g === 'oninbaar') {
    nieuw.state = 'uncollectible';
    push = { entity_type: 'SalesInvoice', action: 'sales_invoice_state_changed_to_uncollectible', state: 'uncollectible' };
    melding = 'Factuur ' + f.invoice_id + ' is op oninbaar gezet';
  } else if (g === 'creditfactuur') {
    const bedrag = num(body.bedrag || f.total_unpaid);
    const credit = { mb_id: f.mb_id + '_cr', contact_id: f.contact_id, invoice_id: f.invoice_id + '-C', state: 'open',
      invoice_date: vandaag, due_date: vandaag, total_price_incl_tax: -bedrag, total_unpaid: -bedrag,
      original_sales_invoice_id: f.mb_id, updated_at: nu };
    mutatie = { soort: 'factuur_toevoegen', rij: credit };
    push = { entity_type: 'SalesInvoice', entity_id: credit.mb_id, action: 'sales_invoice_state_changed_to_open', state: 'open', entity: toMb(credit, c) };
    melding = 'Creditfactuur ' + credit.invoice_id + ' (' + (-bedrag) + ') aangemaakt op ' + f.invoice_id;
  } else {
    throw new Error('Onbekende gebeurtenis "' + g + '". Kies: vervalt, deelbetaling, betaling, creditfactuur, storno, oninbaar, opzegging');
  }
  if (!mutatie) {
    nieuw.updated_at = nu;
    mutatie = { soort: 'factuur_bijwerken', mb_id: f.mb_id, state: nieuw.state, total_unpaid: num(nieuw.total_unpaid), updated_at: nu };
  }
  push.entity_id = push.entity_id || (push.entity ? push.entity.id : f.mb_id);
  push.entity = push.entity || toMb(nieuw, c);
}

const payload = { administration_id: 'adm-demo', webhook_id: 'wh_demo_c4', webhook_token: TOKEN,
  entity_type: push.entity_type, entity_id: push.entity_id, state: push.state, action: push.action, entity: push.entity };
const key = 'mb-push-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
return [{ json: { gebeurtenis: g, melding, mutatie, payload, idempotency_key: key,
  zonder_webhook: body.zonder_webhook === true, dubbel: body.dubbel === true } }];`,
    };

    @node({
        id: 'fde23058-b539-4fe3-aa9c-ee923fa6babf',
        name: 'Soort mutatie',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [880, 0],
    })
    SoortMutatie = {
        mode: 'rules',
        rules: {
            values: [
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 3,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.mutatie.soort }}',
                                rightValue: 'factuur_bijwerken',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'factuur bijwerken',
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 3,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.mutatie.soort }}',
                                rightValue: 'factuur_toevoegen',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'creditfactuur toevoegen',
                },
                {
                    conditions: {
                        options: {
                            caseSensitive: true,
                            leftValue: '',
                            typeValidation: 'strict',
                            version: 3,
                        },
                        conditions: [
                            {
                                leftValue: '={{ $json.mutatie.soort }}',
                                rightValue: 'contact',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'contact bijwerken',
                },
            ],
        },
        options: {},
    };

    @node({
        id: 'dba5541e-5acd-48ca-b908-9747965e0993',
        name: 'Factuur bijwerken',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1120, -160],
    })
    FactuurBijwerken = {
        resource: 'row',
        operation: 'update',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_invoices',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [
                {
                    keyName: 'mb_id',
                    condition: 'eq',
                    keyValue: '={{ $json.mutatie.mb_id }}',
                },
            ],
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                state: '={{ $json.mutatie.state }}',
                total_unpaid: '={{ $json.mutatie.total_unpaid }}',
                updated_at: '={{ $json.mutatie.updated_at }}',
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: '1ce57f33-974a-4954-9271-150846a1e7ea',
        name: 'Creditfactuur toevoegen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1120, 0],
    })
    CreditfactuurToevoegen = {
        resource: 'row',
        operation: 'insert',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_invoices',
            mode: 'name',
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                mb_id: '={{ $json.mutatie.rij.mb_id }}',
                contact_id: '={{ $json.mutatie.rij.contact_id }}',
                invoice_id: '={{ $json.mutatie.rij.invoice_id }}',
                state: '={{ $json.mutatie.rij.state }}',
                invoice_date: '={{ $json.mutatie.rij.invoice_date }}',
                due_date: '={{ $json.mutatie.rij.due_date }}',
                total_price_incl_tax: '={{ $json.mutatie.rij.total_price_incl_tax }}',
                total_unpaid: '={{ $json.mutatie.rij.total_unpaid }}',
                original_sales_invoice_id: '={{ $json.mutatie.rij.original_sales_invoice_id }}',
                updated_at: '={{ $json.mutatie.rij.updated_at }}',
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: 'a4e14de5-5931-47c4-aa43-2d943a9e50ca',
        name: 'Contact bijwerken',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [1120, 160],
    })
    ContactBijwerken = {
        resource: 'row',
        operation: 'update',
        dataTableId: {
            __rl: true,
            value: 'c4_mb_contacts',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [
                {
                    keyName: 'contact_id',
                    condition: 'eq',
                    keyValue: '={{ $json.mutatie.contact_id }}',
                },
            ],
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                cancelled_at: '={{ $json.mutatie.cancelled_at }}',
                abonnement_status: '={{ $json.mutatie.abonnement_status }}',
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: 'ba6ae282-7b1f-4997-9b6c-9ada98b12ab3',
        name: 'Webhook versturen?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1360, 0],
        executeOnce: true,
    })
    WebhookVersturen = {
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
                    leftValue: "={{ !$('Gebeurtenis uitvoeren').first().json.zonder_webhook }}",
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
        id: '3c5450d8-1735-48ee-bdf2-e5e6942bce88',
        name: 'Pushes klaarzetten',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1580, -80],
        executeOnce: true,
        notes: 'Eén push, of twee met dezelfde Idempotency-Key ("dubbel": MoneyBird probeert opnieuw). Bij "zonder_webhook" geen push: zo simuleer je een gemiste webhook.',
    })
    PushesKlaarzetten = {
        mode: 'runOnceForAllItems',
        jsCode: `const g = $('Gebeurtenis uitvoeren').first().json;
const n = g.dubbel ? 2 : 1;
return Array.from({ length: n }, (_, i) => ({ json: { poging: i + 1, idempotency_key: g.idempotency_key, payload: g.payload } }));`,
    };

    @node({
        id: '36e56419-8861-4401-adaa-66fce9ce7a86',
        name: 'Webhook naar C4-10',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [1800, -80],
        notes: 'POST naar het webhook-adres zoals MoneyBird dat doet. Eén voor één (batch 1), zoals een retry van MoneyBird ook later komt.',
    })
    WebhookNaarC410 = {
        method: 'POST',
        url: 'http://127.0.0.1:5678/webhook/moneybird-events',
        sendHeaders: true,
        headerParameters: {
            parameters: [
                {
                    name: 'Idempotency-Key',
                    value: '={{ $json.idempotency_key }}',
                },
            ],
        },
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody: '={{ JSON.stringify($json.payload) }}',
        options: {
            timeout: 30000,
            batching: {
                batch: {
                    batchSize: 1,
                    batchInterval: 1500,
                },
            },
        },
    };

    @node({
        id: '48a07f7d-fbc7-4d56-bc32-8815caf14df3',
        name: 'Samenvatting',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2020, 40],
        executeOnce: true,
    })
    Samenvatting = {
        mode: 'runOnceForAllItems',
        jsCode: `const g = $('Gebeurtenis uitvoeren').first().json;
const antwoorden = $('Webhook naar C4-10').isExecuted ? $('Webhook naar C4-10').all().map(i => i.json) : [];
return [{ json: {
  gebeurtenis: g.gebeurtenis,
  melding: g.melding,
  webhook: g.zonder_webhook ? 'NIET verstuurd (gemiste webhook gesimuleerd)' : g.payload.action,
  idempotency_key: g.idempotency_key,
  antwoorden_c4_10: antwoorden
}}];`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.WebhookC4MoneybirdSim.out(0).to(this.FacturenLezen.in(0));
        this.FacturenLezen.out(0).to(this.ContactenLezen.in(0));
        this.ContactenLezen.out(0).to(this.GebeurtenisUitvoeren.in(0));
        this.GebeurtenisUitvoeren.out(0).to(this.SoortMutatie.in(0));
        this.SoortMutatie.out(0).to(this.FactuurBijwerken.in(0));
        this.SoortMutatie.out(1).to(this.CreditfactuurToevoegen.in(0));
        this.SoortMutatie.out(2).to(this.ContactBijwerken.in(0));
        this.FactuurBijwerken.out(0).to(this.WebhookVersturen.in(0));
        this.CreditfactuurToevoegen.out(0).to(this.WebhookVersturen.in(0));
        this.ContactBijwerken.out(0).to(this.WebhookVersturen.in(0));
        this.WebhookVersturen.out(0).to(this.PushesKlaarzetten.in(0));
        this.WebhookVersturen.out(1).to(this.Samenvatting.in(0));
        this.PushesKlaarzetten.out(0).to(this.WebhookNaarC410.in(0));
        this.WebhookNaarC410.out(0).to(this.Samenvatting.in(0));
    }
}
