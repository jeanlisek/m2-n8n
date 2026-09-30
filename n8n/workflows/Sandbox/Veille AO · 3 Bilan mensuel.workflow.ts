const lun_ven_8h = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: { name: 'Lun–ven 8h', parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 0 8 * * 1-5' }] } } }
});

const seulement_le_1er_jour_ouvr_du_mois = node({
  type: 'n8n-nodes-base.filter',
  version: 2.2,
  config: { name: 'Seulement le 1er jour ouvré du mois', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [{ leftValue: expr('{{ (() => { const j = $now.setZone("Europe/Paris"); let p = j.startOf("month"); while (p.weekday > 5) { p = p.plus({ days: 1 }); } return j.hasSame(p, "day"); })() }}'), operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } }, position: [224, 0] }
});

const lire_les_appels_d_offres = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Lire les appels d\u2019offres', parameters: { resource: 'sheet', operation: 'read', documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'name', value: 'Appels offres' } }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [448, 0], executeOnce: true, alwaysOutputData: true }
});

const lire_les_AO_rat_s_signal_s = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Lire les AO ratés signalés', parameters: { resource: 'sheet', operation: 'read', documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'name', value: 'AO ratés' } }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [672, 0], executeOnce: true, alwaysOutputData: true }
});

const pr_parer_le_bilan_du_mois_coul = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer le bilan du mois écoulé', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: 'const moisPrecedent = $now.setZone(\'Europe/Paris\').minus({ months: 1 });\nconst prefixe = moisPrecedent.toFormat(\'yyyy-MM\');\nconst libelleMois = moisPrecedent.setLocale(\'fr\').toFormat(\'LLLL yyyy\');\nconst esc = s => String(s ?? \'\').replace(/[&<>]/g, c => ({ \'&\': \'&amp;\', \'<\': \'&lt;\', \'>\': \'&gt;\' }[c]));\nconst aos = $(\'Lire les appels d\u2019offres\').all().map(i => i.json).filter(a => a.id_source);\nconst duMois = aos.filter(a => String(a.date_publication).startsWith(prefixe));\nconst decides = duMois.filter(a => a[\'décision\']);\nconst go = decides.filter(a => String(a[\'décision\']).toLowerCase() === \'go\');\nconst noGo = decides.filter(a => String(a[\'décision\']).toLowerCase() === \'no-go\');\nconst raisons = {};\nfor (const a of noGo) { const r = a.raison_no_go || \'non renseignée\'; raisons[r] = (raisons[r] ?? 0) + 1; }\nconst rates = $input.all().map(i => i.json).filter(r => String(r.date_signalement).startsWith(prefixe));\nconst ecartes = duMois.filter(a => !a[\'présenté_le\']);\nconst echantillon = [...ecartes].sort(() => Math.random() - 0.5).slice(0, 10);\nlet html = \'<h2>Bilan veille AO – \' + esc(libelleMois) + \'</h2>\';\nhtml += \'<p>\' + duMois.length + \' AO enregistrés, \' + decides.length + \' décisions : \' + go.length + \' go, \' + noGo.length + \' no-go.</p>\';\nhtml += \'<h3>Raisons des no-go</h3><ul>\' + Object.entries(raisons).map(([r, n]) => \'<li>\' + esc(r) + \' : \' + n + \'</li>\').join(\'\') + \'</ul>\';\nhtml += \'<h3>AO ratés signalés (\' + rates.length + \')</h3><ul>\' + rates.map(r => \'<li><a href="\' + r.lien + \'">\' + esc(r.lien) + \'</a> – \' + esc(r.commentaire) + \'</li>\').join(\'\') + \'</ul>\';\nhtml += \'<h3>Échantillon de \' + echantillon.length + \' AO écartés par l\u2019outil</h3><ul>\' + echantillon.map(a => \'<li>\' + esc(a.acheteur) + \' – \' + esc(a.objet) + \' – score \' + a.score + \'</li>\').join(\'\') + \'</ul>\';\nhtml += \'<p>Pour ajuster le score, modifiez vous-même l\u2019onglet Pondérations : <a href="https://docs.google.com/spreadsheets/d/1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg/edit">tableau de suivi</a>. Aucun poids n\u2019est modifié automatiquement.</p>\';\nreturn [{ json: { sujet: \'[Veille AO] Bilan \' + libelleMois, html, nb_decisions: decides.length, nb_rates: rates.length } }];' }, position: [896, 0] }
});

const CONFIGURER_Envoyer_le_bilan_l_associ = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: { name: '[À CONFIGURER] Envoyer le bilan à l\u2019associé', parameters: { resource: 'message', operation: 'send', sendTo: placeholder('Adresse email de l\u2019associé'), subject: expr('{{ $json.sujet }}'), emailType: 'html', message: expr('{{ $json.html }}'), options: { appendAttribution: false } }, credentials: { gmailOAuth2: newCredential('Gmail account', 'zsxWFhN0AKvr8cBW') }, position: [1120, 0], webhookId: 'c6983a1a-dca3-4a54-b538-e00eabb749f4' }
});

const tracer_le_bilan_Ex_cutions = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Tracer le bilan (Exécutions)', parameters: { resource: 'sheet', operation: 'append', documentId: { __rl: true, mode: 'id', value: '1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg', cachedResultName: 'Tableau de suivi – Veille AO' }, sheetName: { __rl: true, mode: 'name', value: 'Exécutions' }, columns: { mappingMode: 'defineBelow', value: { horodatage: expr('{{ $now.setZone("Europe/Paris").toISO() }}'), type: 'bilan', statut: 'succès', id_execution: expr('{{ $execution.id }}'), examines: expr('{{ $("Préparer le bilan du mois écoulé").item.json.nb_decisions }} décisions, {{ $("Préparer le bilan du mois écoulé").item.json.nb_rates }} AO ratés') }, schema: [{ id: 'horodatage', displayName: 'horodatage', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'type', displayName: 'type', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'statut', displayName: 'statut', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'id_execution', displayName: 'id_execution', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'examines', displayName: 'examines', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }] } }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [1344, 0] }
});

const wf = workflow('sMDcjNIAxJ9aBsoS', 'Veille AO · 3 Bilan mensuel', { timezone: 'Europe/Paris', executionOrder: 'v1', availableInMCP: true });

export default wf
  .add(lun_ven_8h)
  .to(seulement_le_1er_jour_ouvr_du_mois)
  .to(lire_les_appels_d_offres)
  .to(lire_les_AO_rat_s_signal_s)
  .to(pr_parer_le_bilan_du_mois_coul)
  .to(CONFIGURER_Envoyer_le_bilan_l_associ)
  .to(tracer_le_bilan_Ex_cutions)
  .add(sticky('## Veille AO · 3 Bilan mensuel\n\nLe 1er jour ouvré du mois à 8h : décisions du mois écoulé, répartition des raisons de no-go, AO ratés signalés, échantillon aléatoire de 10 AO écartés. Envoyé à l\'associé, qui ajuste lui-même l\'onglet Pondérations (aucune modification automatique).\n\nSpec : « Conséquences d\'une décision » + garde-fous « Dérives dans le temps ».', [], { name: 'Sticky Note 330340d7', color: 7, position: [608, 0] }))
  .add(sticky('### À faire avant publication\n- Renseigner l\'adresse de l\'associé dans « [À CONFIGURER] Envoyer le bilan à l\'associé », puis publier.\n\n### À savoir\n- Le mois d\'un AO est celui de sa date de publication (pas de date de décision dans le tableau).\n- Le lien vers le tableau de suivi est dans « Préparer le bilan ».', [], { name: 'Sticky Note acb4d064', color: 3, position: [608, 256] }))