const lancer_une_fois = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Lancer une fois' }
});

const cr_er_le_tableur_et_ses_6_onglets = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Créer le tableur et ses 6 onglets', parameters: { resource: 'spreadsheet', operation: 'create', title: 'Tableau de suivi – Veille AO', sheetsUi: { sheetValues: [{ title: 'Appels d\'offres' }, { title: 'Décideurs' }, { title: 'Organismes surveillés' }, { title: 'AO ratés' }, { title: 'Pondérations' }, { title: 'Exécutions' }] }, options: { locale: 'fr_FR' } }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [224, 0] }
});

const pr_parer_en_t_tes_et_r_gles_de_saisie = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer en-têtes et règles de saisie', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: 'const t = $input.first().json;\nconst entetes = {\n  "Appels d\'offres": [\'id_source\', \'source\', \'acheteur\', \'objet\', \'date_limite\', \'date_limite_questions\', \'lien_annonce\', \'score\', \'sous_scores\', \'recommandation\', \'faible\', \'date_publication\', \'présenté_le\', \'décision\', \'raison_no_go\', \'commentaire\', \'note_demandée\', \'lien_note\', \'échéances_créées\'],\n  \'Décideurs\': [\'date_nomination\', \'personne\', \'poste\', \'organisme\', \'prédécesseur\', \'angle_approche\', \'lien_source\'],\n  \'Organismes surveillés\': [\'organisme\', \'commentaire\'],\n  \'AO ratés\': [\'date_signalement\', \'lien\', \'commentaire\', \'signalé_par\'],\n  \'Pondérations\': [\'critere\', \'poids\', \'explication\'],\n  \'Exécutions\': [\'horodatage\', \'type\', \'statut\', \'periode_debut\', \'periode_fin\', \'id_execution\', \'examines\', \'retenus\', \'cout\', \'erreur\']\n};\nconst plage = nom => "\'" + nom.replace(/\'/g, "\'\'") + "\'!A1";\nconst data = Object.entries(entetes).map(([nom, cols]) => ({ range: plage(nom), values: [cols] }));\ndata.push({ range: "\'Pondérations\'!A2", values: [\n  [\'sujet\', \'\', \'Poids du critère « sujet de la mission » – à fixer et faire valider par l\u2019associé\'],\n  [\'acheteur\', \'\', \'Poids du critère « organisme acheteur » – à fixer et faire valider par l\u2019associé\'],\n  [\'proximite\', \'\', \'Poids du critère « proximité avec une mission passée » – à fixer et faire valider par l\u2019associé\'],\n  [\'seuil\', \'\', \'Score minimum (0-100) pour « y aller » – à fixer après le test chiffré\']\n] });\nconst ids = Object.fromEntries(t.sheets.map(s => [s.properties.title, s.properties.sheetId]));\nconst aoId = ids["Appels d\'offres"];\nconst colonne = nom => entetes["Appels d\'offres"].indexOf(nom);\nconst zone = c => ({ sheetId: aoId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: c, endColumnIndex: c + 1 });\nconst liste = valeurs => ({ condition: { type: \'ONE_OF_LIST\', values: valeurs.map(v => ({ userEnteredValue: v })) }, showCustomUi: true, strict: true });\nconst requests = [\n  ...Object.values(ids).map(sheetId => ({ updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: \'gridProperties.frozenRowCount\' } })),\n  ...Object.values(ids).map(sheetId => ({ repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: \'userEnteredFormat.textFormat.bold\' } })),\n  { setDataValidation: { range: zone(colonne(\'note_demandée\')), rule: { condition: { type: \'BOOLEAN\' }, strict: true } } },\n  { setDataValidation: { range: zone(colonne(\'décision\')), rule: liste([\'go\', \'no-go\']) } },\n  { setDataValidation: { range: zone(colonne(\'raison_no_go\')), rule: liste([\'hors compétence\', \'manque de temps\', \'prix\', \'acheteur\', \'autre\']) } }\n];\nreturn [{ json: { spreadsheetId: t.spreadsheetId, spreadsheetUrl: t.spreadsheetUrl, valeurs: { valueInputOption: \'RAW\', data }, mise_en_forme: { requests } } }];' }, position: [448, 0] }
});

const crire_les_en_t_tes_et_les_crit_res = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: { name: 'Écrire les en-têtes et les critères', parameters: { method: 'POST', url: expr('https://sheets.googleapis.com/v4/spreadsheets/{{ $json.spreadsheetId }}/values:batchUpdate'), authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api', sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($json.valeurs) }}') }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [672, 0] }
});

const figer_les_en_t_tes_et_ajouter_les_listes_de_choix = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: { name: 'Figer les en-têtes et ajouter les listes de choix', parameters: { method: 'POST', url: expr('https://sheets.googleapis.com/v4/spreadsheets/{{ $("Préparer en-têtes et règles de saisie").first().json.spreadsheetId }}:batchUpdate'), authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api', sendBody: true, contentType: 'json', specifyBody: 'json', jsonBody: expr('{{ JSON.stringify($("Préparer en-têtes et règles de saisie").first().json.mise_en_forme) }}') }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account 2', 'A20S4lJM1bs7wCV1') }, position: [896, 0] }
});

const wf = workflow('8zSrWx5ZOixK4how', 'Veille AO · 0 Installation du tableau de suivi', { executionOrder: 'v1', availableInMCP: true });

export default wf
  .add(lancer_une_fois)
  .to(cr_er_le_tableur_et_ses_6_onglets)
  .to(pr_parer_en_t_tes_et_r_gles_de_saisie)
  .to(crire_les_en_t_tes_et_les_crit_res)
  .to(figer_les_en_t_tes_et_ajouter_les_listes_de_choix)
  .add(sticky('## Installation (à lancer une seule fois)\nCrée le Google Sheets « Tableau de suivi – Veille AO » avec ses 6 onglets, les en-têtes attendus par les workflows 1 à 4, la case à cocher « note_demandée » et les listes de choix « décision » et « raison_no_go ». Peut être archivé ensuite.', [], { name: 'Sticky Note a107d5b4', color: 7, position: [384, 0] }))