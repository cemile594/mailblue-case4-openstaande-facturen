import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : C4-13 Facturen – Foutafhandeling
// Nodes   : 4  |  Connections: 2
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// UitlegFoutafhandeling              stickyNote
// BijFoutInFactuurflow               errorTrigger
// AlertOpbouwen                      code
// SlackAlertMock                     dataTable
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// BijFoutInFactuurflow
//    → AlertOpbouwen
//      → SlackAlertMock
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'sgxTqtIS8A4PmzVM',
    name: 'C4-13 Facturen – Foutafhandeling',
    active: false,
    isArchived: false,
    settings: { timezone: 'Europe/Amsterdam', executionOrder: 'v1' },
})
export class C413FacturenFoutafhandelingWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '67432dec-52b9-4fc1-9d9d-2ad89e24c33b',
        name: 'Uitleg foutafhandeling',
        type: 'n8n-nodes-base.stickyNote',
        version: 1,
        position: [-60, -280],
    })
    UitlegFoutafhandeling = {
        content: `## C4-13 Foutafhandeling
Error-workflow van C4-10, C4-11 en C4-12. Crasht er iets (bijv. Asana of ActiveCampaign onbereikbaar na 3 pogingen), dan volgt een alert in **#billing-alerts** met een link naar de execution.

Er gaat niets verloren: het event staat in \`c4_event_log\` op *received*, en de dagelijkse controle (C4-12) herberekent de klant opnieuw. Alle acties zijn idempotent, dus opnieuw draaien maakt niets dubbel.

Let op: in n8n 2.x start een error-workflow alleen als hij zelf **actief** is.`,
        height: 260,
        width: 760,
        color: 7,
    };

    @node({
        id: '4c68eb74-d7f6-4339-a47c-e500c26cc5ad',
        name: 'Bij fout in factuurflow',
        type: 'n8n-nodes-base.errorTrigger',
        version: 1,
        position: [0, 0],
    })
    BijFoutInFactuurflow = {};

    @node({
        id: '0300e6f2-674b-4aec-a71c-c079ecbfeb2d',
        name: 'Alert opbouwen',
        type: 'n8n-nodes-base.code',
        version: 2,
        position: [260, 0],
    })
    AlertOpbouwen = {
        mode: 'runOnceForAllItems',
        jsCode: `const e = $input.first().json;
const exec = e.execution || {};
const wf = e.workflow || {};
const err = exec.error || {};
const lines = [
  ':rotating_light: *Factuur-automation mislukt*',
  'Workflow: ' + (wf.name || 'onbekend'),
  'Laatste node: ' + (exec.lastNodeExecuted || 'onbekend'),
  'Fout: ' + String(err.message || 'onbekend').slice(0, 300),
  'Execution: ' + (exec.url || exec.id || 'onbekend'),
  'Wat nu: niets verloren. Het event staat in c4_event_log (status received) en de dagelijkse controle (C4-12) zet de klant morgen alsnog goed. Is het urgent, start C4-12 dan handmatig nadat de storing is opgelost.'
];
return [{ json: {
  channel: '#billing-alerts',
  severity: 'critical',
  text: lines.join('\\n'),
  source: 'C4-13 foutafhandeling',
  created_at: new Date().toISOString()
}}];`,
    };

    @node({
        id: '5a908ef9-5805-40c1-817b-1445dd62e959',
        name: 'Slack-alert (mock)',
        type: 'n8n-nodes-base.dataTable',
        version: 1.1,
        position: [520, 0],
        notes: 'Mock van Slack: een rij in c4_slack_messages. In productie: Slack-node (chat.postMessage) met dezelfde tekst.',
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

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.BijFoutInFactuurflow.out(0).to(this.AlertOpbouwen.in(0));
        this.AlertOpbouwen.out(0).to(this.SlackAlertMock.in(0));
    }
}
