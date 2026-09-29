const ligne_modifi_e_dans_Appels_offres = trigger({
  type: 'n8n-nodes-base.googleSheetsTrigger',
  version: 1,
  config: { name: 'Ligne modifiée dans « Appels offres »', parameters: { pollTimes: { item: [{ mode: 'everyMinute' }] }, documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'list', value: '1010327845', cachedResultName: 'Appels offres' }, event: 'rowUpdate', options: { columnsToWatch: ['note_demandée', 'décision', 'raison_no_go'] } }, credentials: { googleSheetsTriggerOAuth2Api: newCredential('Google Sheets Trigger account', 'cq8QGWxMqLVXXSAi') }, position: [0, 384] }
});

const quelle_action = node({
  type: 'n8n-nodes-base.switch',
  version: 3.2,
  config: { name: 'Quelle action ?', parameters: { rules: { values: [{ conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 1 }, conditions: [{ leftValue: expr('{{ [\'TRUE\', \'OUI\'].includes(String($json["note_demandée"]).trim().toUpperCase()) && !$json.lien_note }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } }, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 1 }, conditions: [{ leftValue: expr('{{ String($json["décision"]).trim().toLowerCase() === "go" && !$json["échéances_créées"] }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } }, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 1 }, conditions: [{ leftValue: expr('{{ String($json["décision"]).trim().toLowerCase() === "no-go" && !$json.raison_no_go }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } }] }, options: { allMatchingOutputs: true } }, position: [224, 368] }
});

const lire_les_ex_cutions_compteur_de_notes = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Lire les exécutions (compteur de notes)', parameters: { documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'name', value: 'Exécutions' }, options: {} }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [448, 96], executeOnce: true, alwaysOutputData: true }
});

const compter_les_notes_du_jour = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Compter les notes du jour', parameters: { jsCode: 'const aujourdHui = $now.setZone(\'Europe/Paris\').toFormat(\'yyyy-MM-dd\');\nconst dejaFaites = $input.all().map(i => i.json).filter(l => l.type === \'note\' && String(l.horodatage).startsWith(aujourdHui)).length;\nconst demandes = $(\'Quelle action ?\').all(0);\nreturn demandes.map((d, i) => ({ json: { ...d.json, notes_du_jour: dejaFaites + i + 1 } }));' }, position: [672, 96] }
});

const plus_de_10_notes_aujourd_hui = node({
  type: 'n8n-nodes-base.if',
  version: 2.2,
  config: { name: 'Plus de 10 notes aujourd\u2019hui ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 1 }, conditions: [{ leftValue: expr('{{ $json.notes_du_jour }}'), rightValue: 10, operator: { type: 'number', operation: 'gt' } }], combinator: 'and' }, options: {} }, position: [896, 0] }
});

const alerter_le_porteur_10_notes = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: { name: 'Alerter le porteur (> 10 notes)', parameters: { sendTo: 'jean-li.sek@joliment.fr', subject: '[Veille AO] Plus de 10 notes demandées aujourd\u2019hui', emailType: 'text', message: expr('{{ $json.notes_du_jour }} notes ont été demandées aujourd\u2019hui. Les notes sont quand même produites (pas de plafond) ; vérifiez que ces demandes sont légitimes.'), options: { appendAttribution: false } }, credentials: { gmailOAuth2: newCredential('Gmail account', 'zsxWFhN0AKvr8cBW') }, position: [1120, 0], webhookId: 'b67a983f-1a1f-4b5e-b07f-686cc59772bd', executeOnce: true }
});

const g_n_rer_la_note_sous_workflow_4 = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.3,
  config: { name: 'Générer la note (sous-workflow 4)', parameters: { workflowId: { __rl: true, mode: 'id', value: 'ObGmRz9ea0aKDD70', cachedResultName: 'Veille AO · 4 Générer une note' }, mode: 'each', options: { waitForSubWorkflow: true } }, position: [896, 192] }
});

const crire_le_lien_de_la_note_dans_le_tableau = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Écrire le lien de la note dans le tableau', parameters: { operation: 'update', documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'name', value: 'Appels offres' }, columns: { mappingMode: 'defineBelow', value: { id_source: expr('{{ $json.id_source }}'), lien_note: expr('{{ $json.lien_note }}') }, matchingColumns: ['id_source'], schema: [{ id: 'id_source', displayName: 'id_source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'lien_note', displayName: 'lien_note', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }] }, options: {} }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [1120, 192] }
});

const tracer_la_note_et_son_co_t_Ex_cutions = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Tracer la note et son coût (Exécutions)', parameters: { operation: 'append', documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'name', value: 'Exécutions' }, columns: { mappingMode: 'defineBelow', value: { horodatage: expr('{{ $now.setZone("Europe/Paris").toISO() }}'), type: 'note', statut: 'succès', id_execution: expr('{{ $execution.id }}'), cout: expr('{{ $("Générer la note (sous-workflow 4)").item.json.cout_estime }} – {{ $("Générer la note (sous-workflow 4)").item.json.id_source }}') }, schema: [{ id: 'horodatage', displayName: 'horodatage', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'type', displayName: 'type', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'statut', displayName: 'statut', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'id_execution', displayName: 'id_execution', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'cout', displayName: 'cout', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }] }, options: {} }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [1344, 192] }
});

const ch_ance_date_limite_des_questions = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: { name: 'Échéance : date limite des questions', parameters: { calendar: { __rl: true, mode: 'list', value: 'primary', cachedResultName: 'Agenda principal' }, start: expr('{{ $json.date_limite_questions }}'), end: expr('{{ DateTime.fromISO($json.date_limite_questions).plus({ days: 1 }).toISODate() }}'), additionalFields: { allday: 'yes', description: expr('Date limite des questions.\nAnnonce : {{ $json.lien_annonce }}\nNote : {{ $json.lien_note }}'), summary: expr('AO – questions : {{ $json.acheteur }} – {{ $json.objet }}') } }, credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar account', 'pH1Pn4oFJabcMRRF') }, position: [448, 384], onError: 'continueRegularOutput' }
});

const ch_ance_date_de_remise = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: { name: 'Échéance : date de remise', parameters: { calendar: { __rl: true, mode: 'list', value: 'primary', cachedResultName: 'Agenda principal' }, start: expr('{{ $("Quelle action ?").item.json.date_limite }}'), end: expr('{{ DateTime.fromISO($("Quelle action ?").item.json.date_limite).plus({ days: 1 }).toISODate() }}'), additionalFields: { allday: 'yes', description: expr('Date de remise de l\u2019offre.\nAnnonce : {{ $("Quelle action ?").item.json.lien_annonce }}\nNote : {{ $("Quelle action ?").item.json.lien_note }}'), summary: expr('AO – REMISE : {{ $("Quelle action ?").item.json.acheteur }} – {{ $("Quelle action ?").item.json.objet }}') } }, credentials: { googleCalendarOAuth2Api: newCredential('Google Calendar account', 'pH1Pn4oFJabcMRRF') }, position: [672, 384] }
});

const marquer_ch_ances_cr_es = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Marquer « échéances créées »', parameters: { operation: 'update', documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'name', value: 'Appels offres' }, columns: { mappingMode: 'defineBelow', value: { id_source: expr('{{ $("Quelle action ?").item.json.id_source }}'), 'échéances_créées': expr('{{ $now.setZone("Europe/Paris").toFormat("yyyy-MM-dd") }}') }, matchingColumns: ['id_source'], schema: [{ id: 'id_source', displayName: 'id_source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'échéances_créées', displayName: 'échéances_créées', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }] }, options: {} }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [896, 384] }
});

const rappeler_la_raison_du_no_go = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: { name: 'Rappeler la raison du no-go', parameters: { sendTo: 'jean-li.sek@joliment.fr', subject: expr('[Veille AO] No-go sans raison : {{ $json.acheteur }}'), emailType: 'text', message: expr('Le no-go sur « {{ $json.objet }} » ({{ $json.acheteur }}) n\u2019est pas pris en compte tant que la raison n\u2019est pas renseignée dans le tableau.\nRaisons possibles : hors compétence, manque de temps, prix, acheteur, autre.'), options: { appendAttribution: false } }, credentials: { gmailOAuth2: newCredential('Gmail account', 'zsxWFhN0AKvr8cBW') }, position: [448, 576], webhookId: 'f00b5590-62df-4dcd-bee3-31dd7042069e' }
});

const wf = workflow('tQdAAChAMmakcf72', 'Veille AO · 2 Actions du tableau', { timezone: 'Europe/Paris', executionOrder: 'v1', availableInMCP: true, binaryMode: 'separate' });

export default wf
  .add(ligne_modifi_e_dans_Appels_offres)
  .to(quelle_action.onCase(0, lire_les_ex_cutions_compteur_de_notes
    .to(compter_les_notes_du_jour
    .to([
      plus_de_10_notes_aujourd_hui.onTrue(alerter_le_porteur_10_notes),
      g_n_rer_la_note_sous_workflow_4
      .to(crire_le_lien_de_la_note_dans_le_tableau)
      .to(tracer_la_note_et_son_co_t_Ex_cutions)]))).onCase(1, ch_ance_date_limite_des_questions
    .to(ch_ance_date_de_remise)
    .to(marquer_ch_ances_cr_es)).onCase(2, rappeler_la_raison_du_no_go))
  .add(sticky('## Veille AO · 2 Actions du tableau\n\nSurveille l\'onglet « Appels d\'offres » chaque minute (colonnes note_demandée, décision, raison_no_go). Une même ligne peut déclencher plusieurs actions.\n\n- **Note demandée** (et pas encore de lien) → sous-workflow 4 en 5 min max ; alerte au-delà de 10 notes/jour, sans plafond.\n- **Go** → 2 échéances dans l\'agenda, une seule fois.\n- **No-go sans raison** → rappel au porteur.\n\nSeul le tableau (partagé nominativement) déclenche une action : un email transféré ne donne aucun droit d\'agir.', [], { name: 'Sticky Note eea5eac1', color: 7, width: 864, height: 224, position: [528, 416] }))
  .add(sticky('### À savoir\n- Agenda : agenda principal du compte Google relié à n8n (phase de test) ; agenda pro avant élargissement.\n- Colonne date_limite_questions : alimentée par la veille si l\'annonce la contient, sinon à saisir à la main avant le go.', [], { name: 'Sticky Note 345b3bfe', color: 3, width: 560, height: 144, position: [1088, 688] }))