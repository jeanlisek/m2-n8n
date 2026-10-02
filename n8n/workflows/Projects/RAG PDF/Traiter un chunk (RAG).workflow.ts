const entr_e_un_chunk = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Entrée : un chunk', parameters: { inputSource: 'passthrough' } }
});

const g_n_rer_le_contexte_du_passage = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: { name: 'Générer le contexte du passage', parameters: { modelId: { __rl: true, mode: 'id', value: 'models/gemini-flash-lite-latest' }, messages: { values: [{ content: expr('Résumé du document : {{ $json.docSummary }}\n\nChapitre : {{ $json.chapter || \'non détecté\' }}\n\nPassage (page {{ $json.pageNumber }} sur {{ $json.totalPages }}) :\n{{ $json.pageContent }}') }] }, builtInTools: {}, options: { systemMessage: 'Tu analyses un passage d\'un document à partir du résumé global fourni. Réponds en exactement deux lignes, sans préambule ni guillemets :\nLigne 1 : une phrase courte (25 mots maximum) qui situe le passage dans le document.\nLigne 2 : MOTS-CLES: 5 à 8 mots-clés ou noms propres présents dans le passage, séparés par des virgules, dans la langue du document, suivis de leur traduction française quand elle diffère.', maxOutputTokens: 160, temperature: 0.2, topP: 0.95 } }, credentials: { googlePalmApi: newCredential('Google Gemini Api account - n8n rag', 'LfRppAWT5jFqr0uu') }, position: [224, 0], retryOnFail: true, maxTries: 5, waitBetweenTries: 5000, onError: 'continueRegularOutput' }
});

const pr_parer_le_texte_contextualis = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer le texte contextualisé', parameters: { jsCode: '// Réponse attendue : ligne 1 = phrase de contexte, ligne 2 = "MOTS-CLES: a, b, c" (tolère accents, ordre, absence)\nconst raw = ($json.content && $json.content.parts && $json.content.parts[0] && $json.content.parts[0].text || \'\').trim();\nconst lines = raw.split(\'\\n\').map((l) => l.trim()).filter(Boolean);\nconst kwRe = /^\\**\\s*mots?[\\s-]*cl[eé]s?\\s*\\**\\s*:\\s*/i;\nconst kwLine = lines.find((l) => kwRe.test(l)) || \'\';\nconst keywords = kwLine.replace(kwRe, \'\').split(/[,;]/).map((k) => k.replace(/^[\\s"\'«»*]+|[\\s"\'«»*.]+$/g, \'\').trim()).filter((k) => k && k.length <= 60).slice(0, 16);\nconst ctx = lines.filter((l) => l !== kwLine).join(\' \').replace(/^(ligne\\s*1\\s*:\\s*)/i, \'\').trim();\nconst entree = $(\'Entrée : un chunk\').item.json;\n// Le chapitre entre dans le texte vectorisé : une question sur un chapitre retrouve ses passages\nconst contextualizedContent = [entree.chapter ? \'Chapitre : \' + entree.chapter : \'\', ctx, keywords.length ? \'Mots-clés : \' + keywords.join(\', \') : \'\', entree.pageContent].filter(Boolean).join(\'\\n\\n\');\nreturn [{ json: { pageContent: entree.pageContent, pageNumber: entree.pageNumber, printedPage: entree.printedPage || null, chapter: entree.chapter || null, chunkIndex: entree.chunkIndex, totalPages: entree.totalPages, fileHash: entree.fileHash, fileName: entree.fileName, docSummary: entree.docSummary, context: ctx, keywords, contextualizedContent } }];\n' }, position: [576, 0] }
});

const embedder_le_passage = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Embedder le passage', parameters: { method: 'POST', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', authentication: 'predefinedCredentialType', nodeCredentialType: 'googlePalmApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ { "model": "models/gemini-embedding-001", "content": { "parts": [ { "text": $json.contextualizedContent } ] } } }}'), options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini Api account - n8n rag', 'LfRppAWT5jFqr0uu') }, position: [800, 0], retryOnFail: true, maxTries: 5, waitBetweenTries: 5000 }
});

const pr_parer_l_insertion = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer l\'insertion', parameters: { jsCode: 'const embedding = ($json.embedding && $json.embedding.values) ? $json.embedding.values : [];\nif (!embedding.length) { throw new Error(\'Embedding vide pour ce chunk\'); }\nconst prev = $(\'Préparer le texte contextualisé\').item.json;\n// Texte stocké = texte brut de la page (citable) ; contexte, mots-clés, chapitre et page imprimée restent en métadonnées\nconst metadata = {\n  type: \'chunk\',\n  file_hash: prev.fileHash,\n  file_name: prev.fileName,\n  loc: { pageNumber: prev.pageNumber, printedPage: prev.printedPage || null },\n  chapter: prev.chapter || null,\n  chunk_index: typeof prev.chunkIndex === \'number\' ? prev.chunkIndex : null,\n  context: prev.context || null,\n  keywords: (prev.keywords || []).join(\', \'),\n};\nconst vectorLiteral = \'[\' + embedding.join(\',\') + \']\';\nreturn [{ json: { params: [prev.pageContent, JSON.stringify(metadata), vectorLiteral] } }];' }, position: [1024, 0] }
});

const ins_rer_en_staging = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Insérer en staging', parameters: { operation: 'executeQuery', query: 'insert into documents_staging (content, metadata, embedding) values ($1, $2::jsonb, $3::vector);', options: { queryReplacement: expr('{{ $json.params }}') } }, credentials: { postgres: newCredential('Postgres account - n8n rag', 'fcU2NrNfRbMEUqOZ') }, position: [1248, 0] }
});

const wf = workflow('Kp0bueymzy4YUWgZ', 'Traiter un chunk (RAG)', { executionOrder: 'v1', availableInMCP: true, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', binaryMode: 'separate' });

export default wf
  .add(entr_e_un_chunk)
  .to(g_n_rer_le_contexte_du_passage)
  .to(pr_parer_le_texte_contextualis)
  .to(embedder_le_passage)
  .to(pr_parer_l_insertion)
  .to(ins_rer_en_staging)
  .add(sticky('## Traiter un chunk (un passage)\nGemini produit une phrase de situation (25 mots au plus) et 5 à 8 mots-clés avec leur traduction (contextual retrieval). Texte vectorisé = chapitre + contexte + mots-clés + passage ; le texte **stocké** reste le texte brut de la page, donc citable. Embedding `gemini-embedding-001` (3 072 dimensions) par appel HTTP : le nœud d\'embeddings natif ne s\'exécute pas dans un flux et stockait des vecteurs vides en cas de quota dépassé. Insertion en `documents_staging`.\nL\'échec d\'un passage n\'arrête pas les autres : la complétude est contrôlée à la fin.', [entr_e_un_chunk, g_n_rer_le_contexte_du_passage, pr_parer_le_texte_contextualis, embedder_le_passage, pr_parer_l_insertion, ins_rer_en_staging], { name: 'Note : traitement du passage', color: 5, width: 1480, height: 420, position: [-60, -170] }))