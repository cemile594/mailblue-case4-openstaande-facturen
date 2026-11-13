import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : C4-11 Klant herberekenen (dunning-regels)
// Nodes   : 40  |  Connections: 40
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// UitlegOverzicht                    stickyNote
// Uitleg1Ophalen                     stickyNote
// Uitleg2Regels                      stickyNote
// Uitleg3Start                       stickyNote
// Uitleg4Bijwerken                   stickyNote
// Uitleg5Stoppen                     stickyNote
// Uitleg6Vastleggen                  stickyNote
// StartVanuitC410C412                executeWorkflowTrigger
// Config                             code
// MoneybirdFacturenVanKlant          httpRequest                [creds] [retry]
// MoneybirdAbonnement                httpRequest                [creds] [retry]
// DossierOphalen                     dataTable                  [alwaysOutput]
// GewensteStandBepalen               code
// WelkeActie                         switch
// StartEMailadresBekend              if
// AcContactSynchroniserenStart       activeCampaign             [creds] [retry]
// AcDunningTagZetten                 activeCampaign             [creds] [retry]
// AcNotitieStart                     httpRequest                [creds] [retry]
// AsanaTaakAanmaken                  asana                      [creds] [retry]
// BijwerkenEMailadresBekend          if
// AcContactSynchroniserenBijwerken   activeCampaign             [creds] [retry]
// AcDunningTagZekerStellen           activeCampaign             [creds] [retry]
// AsanaTaaknaamBijwerken             asana                      [creds] [retry]
// AsanaCommentUpdate                 asana                      [creds] [retry]
// StoppenAcContactBekend             if
// AcTagsVanContact                   httpRequest                [creds] [retry]
// TagKoppelingZoeken                 code
// TagNogAanwezig                     if
// AcDunningTagVerwijderen            activeCampaign             [creds] [retry]
// AcVeldenLeegmakenStatus            activeCampaign             [creds] [retry]
// AcNotitieStop                      httpRequest                [creds] [retry]
// AsanaCommentAfgerond               asana                      [creds] [retry]
// AsanaNaarSectieAfgerond            asana                      [creds] [retry]
// AsanaTaakAfvinken                  asana                      [creds] [retry]
// DossierOpbouwen                    code
// DossierOpslaan                     dataTable
// AlertNodig                         if
// AlertKlaarzetten                   code
// SlackAlertMock                     dataTable
// Resultaat                          code                       [executeOnce]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// StartVanuitC410C412
//    → Config
//      → MoneybirdFacturenVanKlant
//        → MoneybirdAbonnement
//          → DossierOphalen
//            → GewensteStandBepalen
//              → WelkeActie
//                → StartEMailadresBekend
//                  → AcContactSynchroniserenStart
//                    → AcDunningTagZetten
//                      → AcNotitieStart
//                        → AsanaTaakAanmaken
//                          → DossierOpbouwen
//                            → DossierOpslaan
//                              → AlertNodig
//                                → AlertKlaarzetten
//                                  → SlackAlertMock
//                                    → Resultaat
//                               .out(1) → Resultaat (↩ loop)
//                 .out(1) → AsanaTaakAanmaken (↩ loop)
//               .out(1) → BijwerkenEMailadresBekend
//                  → AcContactSynchroniserenBijwerken
//                    → AcDunningTagZekerStellen
//                      → AsanaTaaknaamBijwerken
//                        → AsanaCommentUpdate
//                          → DossierOpbouwen (↩ loop)
//                 .out(1) → AsanaTaaknaamBijwerken (↩ loop)
//               .out(2) → StoppenAcContactBekend
//                  → AcTagsVanContact
//                    → TagKoppelingZoeken
//                      → TagNogAanwezig
//                        → AcDunningTagVerwijderen
//                          → AcVeldenLeegmakenStatus
//                            → AcNotitieStop
//                              → AsanaCommentAfgerond
//                                → AsanaNaarSectieAfgerond
//                                  → AsanaTaakAfvinken
//                                    → DossierOpbouwen (↩ loop)
//                       .out(1) → AcVeldenLeegmakenStatus (↩ loop)
//                 .out(1) → AsanaCommentAfgerond (↩ loop)
//               .out(3) → Resultaat (↩ loop)
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'ei3Py6RKxMFC7lDR',
    name: 'C4-11 Klant herberekenen (dunning-regels)',
    active: false,
    isArchived: false,
    settings: {
        saveManualExecutions: true,
        saveDataErrorExecution: 'all',
        errorWorkflow: 'sgxTqtIS8A4PmzVM',
        timezone: 'Europe/Amsterdam',
        executionOrder: 'v1',
        callerPolicy: 'workflowsFromSameOwner',
    },
})
export class C411KlantHerberekenenDunningRegelsWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: 'aa868aa7-630d-4139-87ab-33431671d98f',
        name: 'Uitleg overzicht',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-80, -760],
    })
    UitlegOverzicht = {
        content: `## C4-11 Klant herberekenen — hier zitten álle dunning-regels
Wordt aangeroepen door **C4-10** (bij elke MoneyBird-webhook) en door **C4-12** (dagelijkse controle), altijd met één MoneyBird-contact.

**Principe: het event is alleen de aanleiding, MoneyBird is de waarheid.**
1. Haal álle facturen + het abonnement van deze klant opnieuw op bij MoneyBird.
2. Bepaal de *gewenste* stand (moet deze klant in de dunning-flow? welk bedrag? welke facturen?).
3. Vergelijk met de *huidige* stand in \`c4_dunning_cases\`.
4. Voer precies één actie uit: **start · bijwerken · stoppen · niets**.

Daardoor maakt de volgorde van webhooks niet uit, doet een dubbele webhook niets, en zet de dagelijkse controle een gemiste webhook vanzelf recht.`,
        height: 380,
        width: 900,
        color: 7,
    };

    @node({
        id: '8a218bfb-09c4-4d84-a7cb-248996fb2723',
        name: 'Uitleg 1 ophalen',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-80, -340],
    })
    Uitleg1Ophalen = {
        content: `### 1. Huidige waarheid ophalen
MoneyBird: alle facturen + abonnement van de klant (3 pogingen; lukt het niet, dan foutworkflow C4-13 en morgen opnieuw via C4-12). Daarnaast het dossier uit \`c4_dunning_cases\`.`,
        height: 560,
        width: 1120,
        color: 4,
    };

    @node({
        id: '0504a81d-dc1a-4d01-9470-8a98e7b1abf5',
        name: 'Uitleg 2 regels',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1060, -340],
    })
    Uitleg2Regels = {
        content: `### 2. Regels → één actie
In dunning = facturen op *late/reminded* met een openstaand bedrag, min. creditfacturen die erop slaan, totaal ≥ drempel (Config). Creditfacturen zelf starten nooit dunning. Opzegging stopt de dunning niet (de vordering blijft), maar zet een veld + comment.`,
        height: 560,
        width: 520,
        color: 3,
    };

    @node({
        id: '69ea2df6-e25f-45e2-9f8a-ee08b1a54f0b',
        name: 'Uitleg 3 start',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1600, -760],
    })
    Uitleg3Start = {
        content: `### Start
Contact sync op e-mail + velden (bedrag, facturen, betaallink) → tag **billing-dunning-actief** (start de flow van Marketing) → notitie → Asana-taak. Geen e-mailadres? Dan alleen een Asana-taak + alert.`,
        height: 300,
        width: 1360,
        color: 5,
    };

    @node({
        id: '53378acb-74d9-482c-81a1-a9d3e749c8b9',
        name: 'Uitleg 4 bijwerken',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1600, -440],
    })
    Uitleg4Bijwerken = {
        content: `### Bijwerken
Nieuwe factuur vervallen, deelbetaling, opzegging: velden bijwerken (tag zeker stellen) + Asana-taaknaam en een comment. **Geen tweede taak, de flow herstart niet.**`,
        height: 300,
        width: 1360,
        color: 6,
    };

    @node({
        id: '6d111eea-a115-48d9-bd87-ce86cc7ad2c5',
        name: 'Uitleg 5 stoppen',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [1600, -120],
    })
    Uitleg5Stoppen = {
        content: `### Stoppen
Betaald / gecrediteerd / oninbaar: tag eraf (de goal in de MailBlue-automation haalt de klant er direct uit), velden leeg + status, notitie. Asana: comment → sectie Afgerond → afgevinkt.`,
        height: 380,
        width: 1360,
        color: 2,
    };

    @node({
        id: '35554165-c073-4f0b-b08c-75199260bf8a',
        name: 'Uitleg 6 vastleggen',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [3000, -340],
    })
    Uitleg6Vastleggen = {
        content: `### 3. Vastleggen
Dossier bijwerken in \`c4_dunning_cases\` (direct na de externe acties, zodat opnieuw draaien niets dubbel maakt). Alert als er geen e-mailadres is.`,
        height: 560,
        width: 1120,
        color: 4,
    };

    @node({
        id: '6c5f5dd8-6b7b-4999-b67b-25000e6d77bd',
        name: 'Start (vanuit C4-10 / C4-12)',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        version: 1.1,
        position: [0, 0],
    })
    StartVanuitC410C412 = {
        inputSource: 'workflowInputs',
        workflowInputs: {
            values: [
                {
                    name: 'mb_contact_id',
                    type: 'string',
                },
                {
                    name: 'aanleiding',
                    type: 'string',
                },
                {
                    name: 'event_key',
                    type: 'string',
                },
            ],
        },
    };

    @node({
        id: '151826a6-633a-4992-beb9-79c89db838f9',
        name: 'Config',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [220, 0],
        notes: "Eén plek voor alles wat per omgeving verschilt: drempel, URL's, ActiveCampaign- en Asana-ID's. In productie: n8n Variables.",
    })
    Config = {
        mode: 'runOnceForAllItems',
        jsCode: `// Eén plek voor alles wat per omgeving verschilt. In productie: n8n Variables / environment.
// ID's zijn gevuld door scripts/setup_activecampaign.py en scripts/setup_asana.py (zie mock-data/*_ids.json).
const input = $('Start (vanuit C4-10 / C4-12)').first().json;
return [{ json: {
  mb_contact_id: String(input.mb_contact_id || ''),
  aanleiding: input.aanleiding || 'onbekend',
  event_key: input.event_key || '',
  min_bedrag: 5,                 // € — onder dit totaal geen dunning-mails (afronding/restbedrag)
  deadline_werkdagen: 2,         // deadline Asana-taak
  // Mock-API in deze n8n (poort binnen de container). Productie: https://moneybird.com/api/v2/<administratie_id>
  moneybird_base_url: 'http://127.0.0.1:5678/webhook/c4-moneybird/api/v2/adm-demo',
  n8n_ui: 'http://127.0.0.1:5690',
  ac_base_url: 'https://celimec.api-us1.com',
  ac_tag_id: '3',                // billing-dunning-actief
  ac_tag_naam: 'billing-dunning-actief',
  ac_fields: { status: '2', bedrag: '3', aantal: '4', facturen: '5', vervaldatum: '6', betaallink: '7', opgezegd: '8', mb_contact: '9' },
  asana_workspace: '1220530892739267',
  asana_project: '1220516739774524',
  asana_section_afgerond: '1220516827263416',
  asana_assignee: '1220530892739247'
}}];`,
    };

    @node({
        id: 'f4b5dd8d-1733-40aa-bee8-44be70d38014',
        name: 'MoneyBird: facturen van klant',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [440, 0],
        credentials: { httpHeaderAuth: { id: 'r3SrscUS0aDMhEz5', name: 'MoneyBird API (mock)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Alle facturen van dit contact, in elke status. Zelfde endpoint + filter als de echte MoneyBird API.',
    })
    MoneybirdFacturenVanKlant = {
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
                    value: "=contact_id:{{ $('Config').first().json.mb_contact_id }}",
                },
            ],
        },
        options: {
            timeout: 10000,
            response: {
                response: {
                    fullResponse: true,
                    responseFormat: 'json',
                },
            },
        },
    };

    @node({
        id: '0acff990-1b8d-467a-a116-8685cfc64a04',
        name: 'MoneyBird: abonnement',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [660, 0],
        credentials: { httpHeaderAuth: { id: 'r3SrscUS0aDMhEz5', name: 'MoneyBird API (mock)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Is het abonnement opgezegd? Dan blijft de vordering staan, maar krijgt Marketing een veld om de tekst op aan te passen.',
    })
    MoneybirdAbonnement = {
        method: 'GET',
        url: "={{ $('Config').first().json.moneybird_base_url }}/subscriptions",
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendQuery: true,
        specifyQuery: 'keypair',
        queryParameters: {
            parameters: [
                {
                    name: 'filter',
                    value: "=contact_id:{{ $('Config').first().json.mb_contact_id }}",
                },
            ],
        },
        options: {
            timeout: 10000,
            response: {
                response: {
                    fullResponse: true,
                    responseFormat: 'json',
                },
            },
        },
    };

    @node({
        id: '12c3fe0a-ffe7-4640-b9ba-0af25beb6a74',
        name: 'Dossier ophalen',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [880, 0],
        alwaysOutputData: true,
        notes: 'Huidige stand: staat deze klant al in dunning, met welke Asana-taak en welk AC-contact?',
    })
    DossierOphalen = {
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
                    keyName: 'mb_contact_id',
                    condition: 'eq',
                    keyValue: "={{ $('Config').first().json.mb_contact_id }}",
                },
            ],
        },
        returnAll: false,
        limit: 1,
    };

    @node({
        id: '545ee460-a795-45e8-940c-cb0c834a987d',
        name: 'Gewenste stand bepalen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [1180, 0],
        notes: 'ALLE business-regels op één plek. Vergelijkt de gewenste stand (uit MoneyBird) met het dossier en kiest één actie: start / bijwerken / stoppen / niets. Bouwt ook alle teksten (Asana, notitie, velden).',
    })
    GewensteStandBepalen = {
        mode: 'runOnceForAllItems',
        jsCode: `const cfg = $('Config').first().json;
const invoices = $('MoneyBird: facturen van klant').first().json.body || [];
const subs = $('MoneyBird: abonnement').first().json.body || [];
const d0 = $input.first().json;
const dossier = (d0 && d0.mb_contact_id) ? d0 : null;
const actiefNu = !!(dossier && dossier.status === 'actief');

// ── hulpjes
const num = v => Math.round(Number(v || 0) * 100) / 100;
const eur = n => '€ ' + num(n).toFixed(2).replace('.', ',');
const vandaag = $now.setZone('Europe/Amsterdam').startOf('day');
const nl = iso => iso ? String(iso).slice(8, 10) + '-' + String(iso).slice(5, 7) + '-' + String(iso).slice(0, 4) : '';
const dagenTeLaat = iso => Math.max(0, Math.round(vandaag.diff(DateTime.fromISO(String(iso), { zone: 'Europe/Amsterdam' }), 'days').days));
const meervoud = (n, een, meer) => n + ' ' + (n === 1 ? een : meer);

// ── klant (uit het contact dat MoneyBird in elke factuur meestuurt)
const c = (invoices.find(i => i.contact) || subs.find(s => s.contact) || {}).contact || {};
const klant = c.company_name || [c.firstname, c.lastname].filter(Boolean).join(' ') || (dossier && dossier.klant) || ('MoneyBird-contact ' + cfg.mb_contact_id);
const email = String(c.send_invoices_to_email || c.email || '').trim().toLowerCase();
const sub = subs[0] || null;
const opgezegd = !!(sub && sub.cancelled_at);

// ── regel 1: welke facturen tellen mee?
// Vervallen = state late/reminded met een openstaand bedrag. Een creditfactuur (original_sales_invoice_id of negatief)
// start nooit dunning, maar een openstaande credit wordt wél verrekend met de factuur waar hij bij hoort.
const isCredit = i => !!i.original_sales_invoice_id || num(i.total_price_incl_tax) < 0;
const credits = invoices.filter(i => isCredit(i) && num(i.total_unpaid) < 0 && i.state !== 'paid');
const regels = invoices
  .filter(i => !isCredit(i) && ['late', 'reminded'].includes(i.state) && num(i.total_unpaid) > 0)
  .map(i => {
    const cr = credits.filter(x => x.original_sales_invoice_id === i.id);
    const rest = num(num(i.total_unpaid) + cr.reduce((s, x) => s + num(x.total_unpaid), 0));
    return { id: i.id, nr: i.invoice_id || i.id, due: i.due_date, rest, credits: cr.map(x => x.invoice_id || x.id), link: i.payment_url || i.url || '' };
  })
  .sort((a, b) => (a.due < b.due ? -1 : 1));
const teInnen = regels.filter(r => r.rest > 0);
const totaal = num(teInnen.reduce((s, r) => s + r.rest, 0));

// ── regel 2: in dunning als er iets te innen is én het totaal boven de drempel ligt
const gewenstActief = teInnen.length > 0 && totaal >= cfg.min_bedrag;

// ── wat is er veranderd t.o.v. het dossier?
let vorige = [];
try { vorige = dossier && dossier.facturen ? JSON.parse(dossier.facturen) : []; } catch (e) { vorige = []; }
const byId = {};
for (const i of invoices) byId[i.id] = i;
const gebeurd = [];
const redenen = [];
for (const v of vorige) {
  const nu = byId[v.id];
  const r = regels.find(x => x.id === v.id);
  if (r && r.rest > 0) {
    if (r.rest < v.rest) gebeurd.push('Deelbetaling of credit op ' + v.nr + ': ' + eur(v.rest - r.rest) + ' ontvangen, nog ' + eur(r.rest) + ' open.');
    continue;
  }
  if (!nu) { gebeurd.push('Factuur ' + v.nr + ' bestaat niet meer in MoneyBird (verwijderd).'); redenen.push('verwijderd'); }
  else if (nu.state === 'paid') { gebeurd.push('Factuur ' + v.nr + ' is betaald.'); redenen.push('betaald'); }
  else if (nu.state === 'uncollectible') { gebeurd.push('Factuur ' + v.nr + ' is in MoneyBird op oninbaar gezet.'); redenen.push('oninbaar'); }
  else if (r && r.credits.length) { gebeurd.push('Factuur ' + v.nr + ' is volledig gecrediteerd (' + r.credits.join(', ') + ').'); redenen.push('gecrediteerd'); }
  else { gebeurd.push('Factuur ' + v.nr + ' is niet meer vervallen (status nu: ' + nu.state + ').'); redenen.push('niet meer vervallen'); }
}
for (const r of teInnen) {
  if (!vorige.find(v => v.id === r.id)) gebeurd.push('Nieuwe vervallen factuur: ' + r.nr + ' (' + eur(r.rest) + ', vervaldatum ' + nl(r.due) + ').');
}
const wasOpgezegd = !!(dossier && dossier.abonnement_opgezegd === 'ja');
if (opgezegd && !wasOpgezegd && actiefNu) {
  gebeurd.push('LET OP: de klant heeft het abonnement opgezegd (per ' + nl(String(sub.cancelled_at).slice(0, 10)) + '). De vordering blijft staan, dus de dunning loopt door. Het veld "Dunning – abonnement opgezegd" staat nu op ja, zodat de flow van Marketing geen "uw account wordt gepauzeerd"-tekst meer stuurt. Billing: controleer of de laatste factuur terecht is of (deels) gecrediteerd moet worden.');
}
if (teInnen.length > 0 && totaal < cfg.min_bedrag) {
  redenen.push('restbedrag onder drempel');
  gebeurd.push('Restbedrag ' + eur(totaal) + ' ligt onder de drempel van ' + eur(cfg.min_bedrag) + ': geen dunning-mails meer. Boek het af of vorder het handmatig.');
}
for (const r of regels.filter(x => x.credits.length > 0)) {
  gebeurd.push('Actie Billing: creditfactuur ' + r.credits.join(', ') + ' is nog niet verrekend met ' + r.nr + '. Verreken ze in MoneyBird, dan staan beide op betaald.');
}

// ── de actie
const sleutel = lijst => lijst.map(r => r.id + ':' + r.rest).join(',');
let actie = 'niets';
if (gewenstActief && !actiefNu) actie = 'start';
else if (gewenstActief && actiefNu) actie = (sleutel(teInnen) !== sleutel(vorige.filter(v => v.rest > 0)) || opgezegd !== wasOpgezegd) ? 'bijwerken' : 'niets';
else if (!gewenstActief && actiefNu) actie = 'stoppen';

const uniek = [...new Set(redenen)];
const stopStatus = ['oninbaar', 'gecrediteerd', 'betaald'].find(s => uniek.includes(s)) || 'gestopt';
let reden;
if (actie === 'start') reden = meervoud(teInnen.length, 'vervallen factuur', 'vervallen facturen') + ', ' + eur(totaal);
else if (actie === 'bijwerken') reden = gebeurd.join(' ');
else if (actie === 'stoppen') reden = (uniek.length ? uniek.join(' + ') : 'geen vervallen facturen meer') + '. ' + gebeurd.join(' ');
else reden = actiefNu ? 'Geen wijziging t.o.v. het dossier (dubbel of verouderd event)' : 'Geen vervallen facturen en geen lopend dossier';

// ── teksten
const execUrl = cfg.n8n_ui + '/workflow/' + $workflow.id + '/executions/' + $execution.id;
const factuurregels = teInnen.map(r => '- ' + r.nr + ' · ' + eur(r.rest) + ' · vervaldatum ' + nl(r.due) + ' (' + dagenTeLaat(r.due) + ' dagen te laat) · ' + r.link);
const taakNaam = 'Vervallen factuur – ' + klant + ' – ' + eur(totaal) + (teInnen.length > 1 ? ' (' + teInnen.length + ' facturen)' : '');
const vorigeTaak = dossier && dossier.asana_task_gid ? 'https://app.asana.com/0/' + cfg.asana_project + '/' + dossier.asana_task_gid : null;

let deadline = vandaag;
for (let n = 0; n < cfg.deadline_werkdagen;) { deadline = deadline.plus({ days: 1 }); if (deadline.weekday <= 5) n++; }

const notes = [
  'Automatisch aangemaakt door n8n (workflow C4-11 Klant herberekenen), omdat deze klant een vervallen factuur heeft in MoneyBird.',
  '',
  'KLANT',
  klant + ' · MoneyBird-contact ' + cfg.mb_contact_id + (c.customer_id ? ' · klantnr ' + c.customer_id : ''),
  'E-mail: ' + (email || 'ONTBREEKT in MoneyBird'),
  'Abonnement: ' + (sub ? (sub.reference || 'onbekend') + (opgezegd ? ' — OPGEZEGD per ' + nl(String(sub.cancelled_at).slice(0, 10)) : ' — actief') : 'onbekend'),
  '',
  'OPENSTAAND: ' + eur(totaal),
  ...factuurregels,
  '',
  'WAT DE AUTOMATION AL HEEFT GEDAAN',
  email
    ? '- MailBlue: tag "' + cfg.ac_tag_naam + '" gezet. Daarmee is de dunning-flow van Marketing gestart.\\n- MailBlue: velden "Dunning – …" gevuld (bedrag, facturen, betaallink) voor in de mails.'
    : '- MailBlue: NIETS. Er staat geen e-mailadres in MoneyBird, dus de dunning-flow kan niet starten. Volg deze klant handmatig op en vul het e-mailadres aan in MoneyBird (dan start de flow bij de volgende update vanzelf).',
  '',
  'WAT BILLING DOET',
  '- Zet de taak in "In behandeling" zodra je ermee bezig bent. Afspraak gemaakt? Zet hem in "Betalingsafspraak" en zet de afspraak in een comment.',
  '- Stoppen gaat via MoneyBird, niet hier: een betaling, creditfactuur of "oninbaar" in MoneyBird sluit deze taak vanzelf af en haalt de klant uit de dunning-flow.',
  '- Updates (nieuwe vervallen factuur, deelbetaling, opzegging) komen automatisch als comment onder deze taak.',
  '',
  vorigeTaak ? 'Eerdere dunning-ronde van deze klant: ' + vorigeTaak : null,
  'Handleiding: docs/billing-handleiding.md · Execution: ' + execUrl
].filter(x => x !== null).join('\\n');

const comment = actie === 'stoppen'
  ? 'Afgerond (automatisch): ' + gebeurd.join(' ') + '\\n\\n' + (dossier && dossier.ac_contact_id ? 'De tag "' + cfg.ac_tag_naam + '" is verwijderd in MailBlue, dus de dunning-flow stopt. ' : '') + 'Deze taak is afgesloten. Execution: ' + execUrl
  : 'Update (automatisch): ' + gebeurd.join(' ') + '\\n\\nOpenstaand nu: ' + eur(totaal) + ' over ' + meervoud(teInnen.length, 'factuur', 'facturen') + '. Execution: ' + execUrl;

// ── MailBlue-velden (bij stoppen leeg, met de reden als status)
const oudste = teInnen[0] || null;
const acVelden = actie === 'stoppen'
  ? { status: stopStatus, bedrag: '', aantal: '0', facturen: '', vervaldatum: '', betaallink: '', opgezegd: opgezegd ? 'ja' : 'nee', mb_contact: cfg.mb_contact_id }
  : { status: 'actief', bedrag: eur(totaal), aantal: String(teInnen.length), facturen: teInnen.map(r => r.nr).join(', '), vervaldatum: oudste ? oudste.due : '', betaallink: oudste ? oudste.link : '', opgezegd: opgezegd ? 'ja' : 'nee', mb_contact: cfg.mb_contact_id };

// AC-notities: geen | → ⚠ ✓ (die haalt ActiveCampaign weg)
const acNotitie = actie === 'stoppen'
  ? '[case 4] Dunning gestopt door n8n (C4-11): ' + stopStatus + '. ' + gebeurd.join(' ') + ' Tag ' + cfg.ac_tag_naam + ' verwijderd.'
  : '[case 4] Dunning gestart door n8n (C4-11): ' + meervoud(teInnen.length, 'vervallen factuur', 'vervallen facturen') + ' (' + teInnen.map(r => r.nr).join(', ') + '), totaal ' + eur(totaal) + '. Tag ' + cfg.ac_tag_naam + ' gezet. Opvolging door Billing via Asana.';

const slack = (actie === 'start' && !email)
  ? [{ channel: '#billing-alerts', severity: 'warning', text: ':warning: *' + klant + '* heeft een vervallen factuur (' + eur(totaal) + ') maar geen e-mailadres in MoneyBird. De dunning-flow kan niet starten; er staat een Asana-taak klaar voor handmatige opvolging.', source: 'C4-11', created_at: new Date().toISOString() }]
  : [];

return [{ json: {
  actie, reden, mb_contact_id: cfg.mb_contact_id, aanleiding: cfg.aanleiding, klant, email,
  heeft_email: email !== '', totaal, aantal: teInnen.length, opgezegd,
  facturen_json: JSON.stringify(teInnen.map(r => ({ id: r.id, nr: r.nr, rest: r.rest }))),
  gebeurd, stop_status: stopStatus,
  ac_velden: acVelden, ac_notitie: acNotitie,
  asana: { naam: taakNaam, notes, due_on: deadline.toISODate(), comment },
  slack, slack_nodig: slack.length > 0,
  dossier_ac_contact_id: dossier ? String(dossier.ac_contact_id || '') : '',
  dossier_asana_task_gid: dossier ? String(dossier.asana_task_gid || '') : '',
  dossier_gestart_op: dossier ? String(dossier.gestart_op || '') : '',
  dossier_rondes: dossier ? Number(dossier.rondes || 0) : 0,
  heeft_ac_contact: !!(dossier && dossier.ac_contact_id)
}}];`,
    };

    @node({
        id: 'b193afc2-f413-4e00-b5f3-4377c223bb2c',
        name: 'Welke actie?',
        type: 'n8n-nodes-base.switch',
        version: 3.4,
        position: [1400, 0],
    })
    WelkeActie = {
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
                                leftValue: '={{ $json.actie }}',
                                rightValue: 'start',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'start',
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
                                leftValue: '={{ $json.actie }}',
                                rightValue: 'bijwerken',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'bijwerken',
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
                                leftValue: '={{ $json.actie }}',
                                rightValue: 'stoppen',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'stoppen',
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
                                leftValue: '={{ $json.actie }}',
                                rightValue: 'niets',
                                operator: {
                                    type: 'string',
                                    operation: 'equals',
                                },
                            },
                        ],
                        combinator: 'and',
                    },
                    renameOutput: true,
                    outputKey: 'niets',
                },
            ],
        },
        options: {},
    };

    @node({
        id: '262d7f1b-a4dc-48d9-a62e-39040122456d',
        name: 'Start: e-mailadres bekend?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1660, -560],
    })
    StartEMailadresBekend = {
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
                    leftValue: '={{ $json.heeft_email }}',
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
        id: 'e983371e-dfd7-4354-81d6-83edb045492f',
        name: 'AC: contact synchroniseren (start)',
        type: 'n8n-nodes-base.activeCampaign',
        version: 1,
        position: [1880, -640],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Contact sync op e-mail (bestaat → bijwerken, anders aanmaken) en direct de dunning-velden vullen, zodat de eerste mail van de flow al het juiste bedrag en de betaallink heeft.',
    })
    AcContactSynchroniserenStart = {
        resource: 'contact',
        operation: 'create',
        email: "={{ $('Gewenste stand bepalen').first().json.email }}",
        updateIfExists: true,
        additionalFields: {
            fieldValues: {
                property: [
                    {
                        field: "={{ $('Config').first().json.ac_fields.status }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.status }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.bedrag }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.bedrag }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.aantal }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.aantal }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.facturen }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.facturen }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.vervaldatum }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.vervaldatum }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.betaallink }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.betaallink }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.opgezegd }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.opgezegd }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.mb_contact }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.mb_contact }}",
                    },
                ],
            },
        },
    };

    @node({
        id: '0d7d09a4-f27c-4c56-a9cf-4b87ad7da6f8',
        name: 'AC: dunning-tag zetten',
        type: 'n8n-nodes-base.activeCampaign',
        version: 1,
        position: [2100, -640],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'De tag is het contract met Marketing: "tag toegevoegd" start hun bestaande dunning-flow. Idempotent: een tag die er al staat, wordt niet dubbel gezet.',
    })
    AcDunningTagZetten = {
        resource: 'contactTag',
        operation: 'add',
        contactId: "={{ Number($('AC: contact synchroniseren (start)').first().json.id) }}",
        tagId: "={{ $('Config').first().json.ac_tag_id }}",
    };

    @node({
        id: 'd11f6122-bc97-406e-a908-f1b2f767703d',
        name: 'AC: notitie (start)',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [2320, -640],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Notitie op het contact, zodat Marketing/CS in MailBlue ziet waarom deze klant in de flow zit.',
    })
    AcNotitieStart = {
        method: 'POST',
        url: "={{ $('Config').first().json.ac_base_url }}/api/3/notes",
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'activeCampaignApi',
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody:
            "={{ JSON.stringify({ note: { note: $('Gewenste stand bepalen').first().json.ac_notitie, relid: Number($('AC: contact synchroniseren (start)').first().json.id), reltype: 'Subscriber' } }) }}",
        options: {
            timeout: 10000,
        },
    };

    @node({
        id: 'a4096909-143f-492a-8c58-06ecd008bbcc',
        name: 'Asana: taak aanmaken',
        type: 'n8n-nodes-base.asana',
        version: 1,
        position: [2540, -560],
        credentials: { asanaApi: { id: 'VEhMQe66uYmJ9ko5', name: 'Asana (case 4)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Eén taak per klant (niet per factuur), in de eerste sectie "Nieuw" van het Billing-project. Beschrijving = waarom deze taak bestaat + wat de automation al deed.',
    })
    AsanaTaakAanmaken = {
        authentication: 'accessToken',
        resource: 'task',
        operation: 'create',
        workspace: "={{ $('Config').first().json.asana_workspace }}",
        name: "={{ $('Gewenste stand bepalen').first().json.asana.naam }}",
        otherProperties: {
            projects: ["={{ $('Config').first().json.asana_project }}"],
            notes: "={{ $('Gewenste stand bepalen').first().json.asana.notes }}",
            due_on: "={{ $('Gewenste stand bepalen').first().json.asana.due_on }}",
            assignee: "={{ $('Config').first().json.asana_assignee }}",
        },
    };

    @node({
        id: '2f128f5e-4034-43f9-ba08-6fbaa166fafa',
        name: 'Bijwerken: e-mailadres bekend?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1660, -240],
    })
    BijwerkenEMailadresBekend = {
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
                    leftValue: '={{ $json.heeft_email }}',
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
        id: '0c49fae1-ce09-4592-b044-a0e594cce585',
        name: 'AC: contact synchroniseren (bijwerken)',
        type: 'n8n-nodes-base.activeCampaign',
        version: 1,
        position: [1880, -320],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Velden bijwerken (nieuw bedrag / factuurnummers / opgezegd), zodat de volgende mail in de flow klopt.',
    })
    AcContactSynchroniserenBijwerken = {
        resource: 'contact',
        operation: 'create',
        email: "={{ $('Gewenste stand bepalen').first().json.email }}",
        updateIfExists: true,
        additionalFields: {
            fieldValues: {
                property: [
                    {
                        field: "={{ $('Config').first().json.ac_fields.status }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.status }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.bedrag }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.bedrag }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.aantal }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.aantal }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.facturen }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.facturen }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.vervaldatum }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.vervaldatum }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.betaallink }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.betaallink }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.opgezegd }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.opgezegd }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.mb_contact }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.mb_contact }}",
                    },
                ],
            },
        },
    };

    @node({
        id: '5f478589-c4c5-4f95-ba05-03c56ef1725c',
        name: 'AC: dunning-tag zeker stellen',
        type: 'n8n-nodes-base.activeCampaign',
        version: 1,
        position: [2100, -320],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Zelfherstellend: staat de tag er al, dan gebeurt er niets (de flow herstart niet). Is hij per ongeluk weggehaald, of is het e-mailadres pas later aangevuld, dan staat hij er weer.',
    })
    AcDunningTagZekerStellen = {
        resource: 'contactTag',
        operation: 'add',
        contactId: "={{ Number($('AC: contact synchroniseren (bijwerken)').first().json.id) }}",
        tagId: "={{ $('Config').first().json.ac_tag_id }}",
    };

    @node({
        id: '14a6b2ad-006e-4c2d-934d-2f9ac42819f5',
        name: 'Asana: taaknaam bijwerken',
        type: 'n8n-nodes-base.asana',
        version: 1,
        position: [2320, -240],
        credentials: { asanaApi: { id: 'VEhMQe66uYmJ9ko5', name: 'Asana (case 4)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
    })
    AsanaTaaknaamBijwerken = {
        authentication: 'accessToken',
        resource: 'task',
        operation: 'update',
        id: "={{ $('Gewenste stand bepalen').first().json.dossier_asana_task_gid }}",
        otherProperties: {
            name: "={{ $('Gewenste stand bepalen').first().json.asana.naam }}",
        },
    };

    @node({
        id: '6eb32a44-7257-488c-95d6-83e9d3ac137c',
        name: 'Asana: comment (update)',
        type: 'n8n-nodes-base.asana',
        version: 1,
        position: [2540, -240],
        credentials: { asanaApi: { id: 'VEhMQe66uYmJ9ko5', name: 'Asana (case 4)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Wat er veranderd is (nieuwe factuur, deelbetaling, opzegging) als comment: zo staat de hele geschiedenis bij de taak.',
    })
    AsanaCommentUpdate = {
        authentication: 'accessToken',
        resource: 'taskComment',
        operation: 'add',
        id: "={{ $('Gewenste stand bepalen').first().json.dossier_asana_task_gid }}",
        isTextHtml: false,
        text: "={{ $('Gewenste stand bepalen').first().json.asana.comment }}",
        additionalFields: {},
    };

    @node({
        id: '8a1026c8-2410-4b84-9c42-f6e1a32d14b9',
        name: 'Stoppen: AC-contact bekend?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [1660, 100],
    })
    StoppenAcContactBekend = {
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
                    leftValue: '={{ $json.heeft_ac_contact }}',
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
        id: '7fd73326-02c2-4189-8c84-38c8131350b7',
        name: 'AC: tags van contact',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [1880, 20],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Om een tag te verwijderen heeft ActiveCampaign het ID van de koppeling contact↔tag nodig, niet het tag-ID.',
    })
    AcTagsVanContact = {
        method: 'GET',
        url: "={{ $('Config').first().json.ac_base_url }}/api/3/contacts/{{ $('Gewenste stand bepalen').first().json.dossier_ac_contact_id }}/contactTags",
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'activeCampaignApi',
        options: {
            timeout: 10000,
        },
    };

    @node({
        id: '428f75ad-ee15-42d1-812e-37c1bfe95912',
        name: 'Tag-koppeling zoeken',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [2100, 20],
    })
    TagKoppelingZoeken = {
        mode: 'runOnceForAllItems',
        jsCode: `const cfg = $('Config').first().json;
const koppeling = ($input.first().json.contactTags || []).find(t => String(t.tag) === String(cfg.ac_tag_id));
return [{ json: { contact_tag_id: koppeling ? Number(koppeling.id) : 0, gevonden: !!koppeling } }];`,
    };

    @node({
        id: '772da4d2-9e67-4ff8-84dc-5a08eb27192e',
        name: 'Tag nog aanwezig?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [2320, 20],
    })
    TagNogAanwezig = {
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
                    leftValue: '={{ $json.gevonden }}',
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
        id: '97648fb9-1379-450c-8df9-83b48a8cbfe6',
        name: 'AC: dunning-tag verwijderen',
        type: 'n8n-nodes-base.activeCampaign',
        version: 1,
        position: [2540, -40],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Tag eraf = de goal "tag bestaat niet meer" in de MailBlue-automation haalt de klant direct uit de flow, ook als hij midden in een wachtstap zit.',
    })
    AcDunningTagVerwijderen = {
        resource: 'contactTag',
        operation: 'remove',
        contactTagId: '={{ $json.contact_tag_id }}',
    };

    @node({
        id: 'c58bee85-47d0-446d-9f34-568e36e7b6c4',
        name: 'AC: velden leegmaken + status',
        type: 'n8n-nodes-base.activeCampaign',
        version: 1,
        position: [2760, 20],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
        notes: 'Bedrag/facturen/betaallink leeg (geen oude bedragen in mails), status = betaald / gecrediteerd / oninbaar.',
    })
    AcVeldenLeegmakenStatus = {
        resource: 'contact',
        operation: 'update',
        contactId: "={{ Number($('Gewenste stand bepalen').first().json.dossier_ac_contact_id) }}",
        updateFields: {
            fieldValues: {
                property: [
                    {
                        field: "={{ $('Config').first().json.ac_fields.status }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.status }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.bedrag }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.bedrag }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.aantal }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.aantal }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.facturen }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.facturen }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.betaallink }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.betaallink }}",
                    },
                    {
                        field: "={{ $('Config').first().json.ac_fields.opgezegd }}",
                        value: "={{ $('Gewenste stand bepalen').first().json.ac_velden.opgezegd }}",
                    },
                ],
            },
        },
    };

    @node({
        id: 'f261cd97-3fe0-431c-ba38-72af546203a5',
        name: 'AC: notitie (stop)',
        type: 'n8n-nodes-base.httpRequest',
        version: 4.5,
        position: [2980, 20],
        credentials: { activeCampaignApi: { id: 'p8gpGpHa1hYCkFp9', name: 'ActiveCampaign (trial)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
    })
    AcNotitieStop = {
        method: 'POST',
        url: "={{ $('Config').first().json.ac_base_url }}/api/3/notes",
        authentication: 'predefinedCredentialType',
        nodeCredentialType: 'activeCampaignApi',
        sendBody: true,
        contentType: 'json',
        specifyBody: 'json',
        jsonBody:
            "={{ JSON.stringify({ note: { note: $('Gewenste stand bepalen').first().json.ac_notitie, relid: Number($('Gewenste stand bepalen').first().json.dossier_ac_contact_id), reltype: 'Subscriber' } }) }}",
        options: {
            timeout: 10000,
        },
    };

    @node({
        id: 'b4e047f2-8324-462e-9b2d-90d4cce3754e',
        name: 'Asana: comment (afgerond)',
        type: 'n8n-nodes-base.asana',
        version: 1,
        position: [3200, 100],
        credentials: { asanaApi: { id: 'VEhMQe66uYmJ9ko5', name: 'Asana (case 4)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
    })
    AsanaCommentAfgerond = {
        authentication: 'accessToken',
        resource: 'taskComment',
        operation: 'add',
        id: "={{ $('Gewenste stand bepalen').first().json.dossier_asana_task_gid }}",
        isTextHtml: false,
        text: "={{ $('Gewenste stand bepalen').first().json.asana.comment }}",
        additionalFields: {},
    };

    @node({
        id: '58596683-f8ac-41f4-822b-0901037f3ae3',
        name: 'Asana: naar sectie Afgerond',
        type: 'n8n-nodes-base.asana',
        version: 1,
        position: [3420, 100],
        credentials: { asanaApi: { id: 'VEhMQe66uYmJ9ko5', name: 'Asana (case 4)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
    })
    AsanaNaarSectieAfgerond = {
        authentication: 'accessToken',
        resource: 'task',
        operation: 'move',
        id: "={{ $('Gewenste stand bepalen').first().json.dossier_asana_task_gid }}",
        projectId: "={{ $('Config').first().json.asana_project }}",
        section: "={{ $('Config').first().json.asana_section_afgerond }}",
    };

    @node({
        id: '2c769b25-1af2-49b1-8473-aea592a7db8d',
        name: 'Asana: taak afvinken',
        type: 'n8n-nodes-base.asana',
        version: 1,
        position: [3640, 100],
        credentials: { asanaApi: { id: 'VEhMQe66uYmJ9ko5', name: 'Asana (case 4)' } },
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 2000,
    })
    AsanaTaakAfvinken = {
        authentication: 'accessToken',
        resource: 'task',
        operation: 'update',
        id: "={{ $('Gewenste stand bepalen').first().json.dossier_asana_task_gid }}",
        otherProperties: {
            completed: true,
        },
    };

    @node({
        id: 'd9dbfcd6-9923-4b6b-a3d5-f77046608225',
        name: 'Dossier opbouwen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [3860, -200],
        notes: "Neemt de ID's over van wat er net is aangemaakt (AC-contact, Asana-taak), zodat een volgende run weet waar hij moet bijwerken.",
    })
    DossierOpbouwen = {
        mode: 'runOnceForAllItems',
        jsCode: `const g = $('Gewenste stand bepalen').first().json;
const ran = n => { try { return $(n).isExecuted; } catch (e) { return false; } };
const nu = new Date().toISOString();
let ac = g.dossier_ac_contact_id || '';
for (const n of ['AC: contact synchroniseren (start)', 'AC: contact synchroniseren (bijwerken)']) {
  if (ran(n)) ac = String($(n).first().json.id || ac);
}
let gid = g.dossier_asana_task_gid || '';
if (g.actie === 'start' && ran('Asana: taak aanmaken')) gid = String($('Asana: taak aanmaken').first().json.gid || gid);
return [{ json: {
  mb_contact_id: g.mb_contact_id,
  klant: g.klant,
  email: g.email,
  status: g.actie === 'stoppen' ? 'gestopt' : 'actief',
  reden: String(g.reden).slice(0, 1000),
  ac_contact_id: ac,
  asana_task_gid: gid,
  gestart_op: g.actie === 'start' ? nu : g.dossier_gestart_op,
  gestopt_op: g.actie === 'stoppen' ? nu : '',
  openstaand_bedrag: g.totaal,
  facturen: g.facturen_json,
  abonnement_opgezegd: g.opgezegd ? 'ja' : 'nee',
  rondes: g.actie === 'start' ? g.dossier_rondes + 1 : g.dossier_rondes,
  laatste_aanleiding: g.aanleiding,
  bijgewerkt_op: nu
}}];`,
    };

    @node({
        id: 'f9c0bf6b-4970-410c-8add-8819632c2b19',
        name: 'Dossier opslaan',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [4080, -200],
    })
    DossierOpslaan = {
        resource: 'row',
        operation: 'upsert',
        dataTableId: {
            __rl: true,
            value: 'c4_dunning_cases',
            mode: 'name',
        },
        matchType: 'allConditions',
        filters: {
            conditions: [
                {
                    keyName: 'mb_contact_id',
                    condition: 'eq',
                    keyValue: '={{ $json.mb_contact_id }}',
                },
            ],
        },
        columns: {
            mappingMode: 'defineBelow',
            value: {
                mb_contact_id: '={{ $json.mb_contact_id }}',
                klant: '={{ $json.klant }}',
                email: '={{ $json.email }}',
                status: '={{ $json.status }}',
                reden: '={{ $json.reden }}',
                ac_contact_id: '={{ $json.ac_contact_id }}',
                asana_task_gid: '={{ $json.asana_task_gid }}',
                gestart_op: '={{ $json.gestart_op }}',
                gestopt_op: '={{ $json.gestopt_op }}',
                openstaand_bedrag: '={{ $json.openstaand_bedrag }}',
                facturen: '={{ $json.facturen }}',
                abonnement_opgezegd: '={{ $json.abonnement_opgezegd }}',
                rondes: '={{ $json.rondes }}',
                laatste_aanleiding: '={{ $json.laatste_aanleiding }}',
                bijgewerkt_op: '={{ $json.bijgewerkt_op }}',
            },
            matchingColumns: [],
            schema: [],
        },
        options: {},
    };

    @node({
        id: '9053b41f-a1a1-45e7-9776-a488d5894b17',
        name: 'Alert nodig?',
        type: 'n8n-nodes-base.if',
        version: 2.3,
        position: [4300, -200],
    })
    AlertNodig = {
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
                    leftValue: "={{ $('Gewenste stand bepalen').first().json.slack_nodig }}",
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
        id: '988ec605-40b8-41ae-a6b3-bc562ef122be',
        name: 'Alert klaarzetten',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [4520, -280],
    })
    AlertKlaarzetten = {
        mode: 'runOnceForAllItems',
        jsCode: "return $('Gewenste stand bepalen').first().json.slack.map(m => ({ json: m }));",
    };

    @node({
        id: '8ed72ba6-1f55-48db-ae73-1ce70ab5cdd9',
        name: 'Slack-alert (mock)',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [4740, -280],
        notes: 'Mock van Slack: een rij in c4_slack_messages. In productie: Slack-node met dezelfde tekst.',
    })
    SlackAlertMock = {
        resource: 'row',
        operation: 'insert',
        dataTableId: {
            __rl: true,
            value: 'c4_slack_messages',
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
        id: '373af0ce-417d-4a77-9184-493c3fc8b95c',
        name: 'Resultaat',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [4960, 0],
        executeOnce: true,
        notes: 'Wat er teruggaat naar C4-10 / C4-12 (voor het event-log en het dagrapport).',
    })
    Resultaat = {
        mode: 'runOnceForAllItems',
        jsCode: `const g = $('Gewenste stand bepalen').first().json;
return [{ json: { mb_contact_id: g.mb_contact_id, klant: g.klant, actie: g.actie, reden: String(g.reden).slice(0, 1000), totaal: g.totaal, aantal: g.aantal } }];`,
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.StartVanuitC410C412.out(0).to(this.Config.in(0));
        this.Config.out(0).to(this.MoneybirdFacturenVanKlant.in(0));
        this.MoneybirdFacturenVanKlant.out(0).to(this.MoneybirdAbonnement.in(0));
        this.MoneybirdAbonnement.out(0).to(this.DossierOphalen.in(0));
        this.DossierOphalen.out(0).to(this.GewensteStandBepalen.in(0));
        this.GewensteStandBepalen.out(0).to(this.WelkeActie.in(0));
        this.WelkeActie.out(0).to(this.StartEMailadresBekend.in(0));
        this.WelkeActie.out(1).to(this.BijwerkenEMailadresBekend.in(0));
        this.WelkeActie.out(2).to(this.StoppenAcContactBekend.in(0));
        this.WelkeActie.out(3).to(this.Resultaat.in(0));
        this.StartEMailadresBekend.out(0).to(this.AcContactSynchroniserenStart.in(0));
        this.StartEMailadresBekend.out(1).to(this.AsanaTaakAanmaken.in(0));
        this.AcContactSynchroniserenStart.out(0).to(this.AcDunningTagZetten.in(0));
        this.AcDunningTagZetten.out(0).to(this.AcNotitieStart.in(0));
        this.AcNotitieStart.out(0).to(this.AsanaTaakAanmaken.in(0));
        this.AsanaTaakAanmaken.out(0).to(this.DossierOpbouwen.in(0));
        this.BijwerkenEMailadresBekend.out(0).to(this.AcContactSynchroniserenBijwerken.in(0));
        this.BijwerkenEMailadresBekend.out(1).to(this.AsanaTaaknaamBijwerken.in(0));
        this.AcContactSynchroniserenBijwerken.out(0).to(this.AcDunningTagZekerStellen.in(0));
        this.AcDunningTagZekerStellen.out(0).to(this.AsanaTaaknaamBijwerken.in(0));
        this.AsanaTaaknaamBijwerken.out(0).to(this.AsanaCommentUpdate.in(0));
        this.AsanaCommentUpdate.out(0).to(this.DossierOpbouwen.in(0));
        this.StoppenAcContactBekend.out(0).to(this.AcTagsVanContact.in(0));
        this.StoppenAcContactBekend.out(1).to(this.AsanaCommentAfgerond.in(0));
        this.AcTagsVanContact.out(0).to(this.TagKoppelingZoeken.in(0));
        this.TagKoppelingZoeken.out(0).to(this.TagNogAanwezig.in(0));
        this.TagNogAanwezig.out(0).to(this.AcDunningTagVerwijderen.in(0));
        this.TagNogAanwezig.out(1).to(this.AcVeldenLeegmakenStatus.in(0));
        this.AcDunningTagVerwijderen.out(0).to(this.AcVeldenLeegmakenStatus.in(0));
        this.AcVeldenLeegmakenStatus.out(0).to(this.AcNotitieStop.in(0));
        this.AcNotitieStop.out(0).to(this.AsanaCommentAfgerond.in(0));
        this.AsanaCommentAfgerond.out(0).to(this.AsanaNaarSectieAfgerond.in(0));
        this.AsanaNaarSectieAfgerond.out(0).to(this.AsanaTaakAfvinken.in(0));
        this.AsanaTaakAfvinken.out(0).to(this.DossierOpbouwen.in(0));
        this.DossierOpbouwen.out(0).to(this.DossierOpslaan.in(0));
        this.DossierOpslaan.out(0).to(this.AlertNodig.in(0));
        this.AlertNodig.out(0).to(this.AlertKlaarzetten.in(0));
        this.AlertNodig.out(1).to(this.Resultaat.in(0));
        this.AlertKlaarzetten.out(0).to(this.SlackAlertMock.in(0));
        this.SlackAlertMock.out(0).to(this.Resultaat.in(0));
    }
}
