const entr_e_document = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.1,
  config: { name: 'Entrée : document', parameters: { inputSource: 'passthrough' }, position: [0, -256] }
});

const purger_le_staging_reprise = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Purger le staging (reprise)', parameters: { operation: 'executeQuery', query: 'delete from documents_staging where metadata->>\'file_hash\' = $1;', options: { queryReplacement: expr('{{ $(\'Entrée : document\').first().json.fileHash }}') } }, credentials: { postgres: newCredential('Postgres account - n8n rag', 'fcU2NrNfRbMEUqOZ') }, position: [224, -256], executeOnce: true }
});

const restaurer_le_binaire = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: { name: 'Restaurer le binaire', parameters: { assignments: { assignments: [{ id: 'document', name: 'document', value: expr('{{ $(\'Entrée : document\').first().binary.document }}'), type: 'binary' }] }, includeOtherFields: true, options: {} }, position: [448, -256] }
});

const oCR_Mistral_markdown_par_page = node({
  type: 'n8n-nodes-base.mistralAi',
  version: 1,
  config: { name: 'OCR Mistral (markdown par page)', parameters: { binaryProperty: 'document', options: {} }, credentials: { mistralCloudApi: newCredential('Mistral Cloud account - n8n rag', '85NQMrlexcMRjHZs') }, position: [672, -256], retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueErrorOutput' }
});

const marquer_en_chec_et_nettoyer = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Marquer en échec et nettoyer', parameters: { operation: 'executeQuery', query: 'WITH purged AS (\n  DELETE FROM documents_staging WHERE metadata->>\'file_hash\' = $1 RETURNING 1\n)\nUPDATE source_documents SET status = \'failed\'\nWHERE file_hash = $1\nRETURNING status, (SELECT count(*) FROM purged) AS chunks_purges;', options: { queryReplacement: expr('{{ $(\'Entrée : document\').first().json.fileHash }}') } }, credentials: { postgres: newCredential('Postgres account - n8n rag', 'fcU2NrNfRbMEUqOZ') }, position: [6512, -112], executeOnce: true }
});

const rep_rer_les_pages_avec_images = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Repérer les pages avec images', parameters: { jsCode: '// Pages contenant au moins une image (index Mistral, à partir de 0) ; le PDF est remis en binaire pour l\'envoi à Mistral\nconst ocr = $(\'OCR Mistral (markdown par page)\').first().json;\nconst imagePages = (ocr.pages || []).filter((p) => (p.images || []).length > 0).map((p) => p.index);\nreturn [{ json: { imagePages, hasImages: imagePages.length > 0 }, binary: $(\'Entrée : document\').first().binary }];' }, position: [896, -320], onError: 'continueRegularOutput' }
});

const le_document_contient_des_images = node({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: { name: 'Le document contient des images ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, combinator: 'and', conditions: [{ id: 'img', leftValue: expr('{{ $json.hasImages === true }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }] }, options: {} }, position: [1120, -320] }
});

const t_l_verser_le_PDF_chez_Mistral = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Téléverser le PDF chez Mistral', parameters: { method: 'POST', url: 'https://api.mistral.ai/v1/files', authentication: 'predefinedCredentialType', nodeCredentialType: 'mistralCloudApi', sendBody: true, contentType: 'multipart-form-data', bodyParameters: { parameters: [{ name: 'purpose', value: 'ocr' }, { parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'document' }] }, options: { timeout: 120000 } }, credentials: { mistralCloudApi: newCredential('Mistral Cloud account - n8n rag', '85NQMrlexcMRjHZs') }, position: [1344, -400], retryOnFail: true, maxTries: 2, waitBetweenTries: 5000, onError: 'continueRegularOutput' }
});

const obtenir_une_URL_temporaire = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Obtenir une URL temporaire', parameters: { url: expr('{{ "https://api.mistral.ai/v1/files/" + $json.id + "/url" }}'), authentication: 'predefinedCredentialType', nodeCredentialType: 'mistralCloudApi', sendQuery: true, queryParameters: { parameters: [{ name: 'expiry', value: '1' }] }, options: {} }, credentials: { mistralCloudApi: newCredential('Mistral Cloud account - n8n rag', '85NQMrlexcMRjHZs') }, position: [1568, -400], retryOnFail: true, maxTries: 2, waitBetweenTries: 3000, onError: 'continueRegularOutput' }
});

const d_crire_les_images_Mistral = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Décrire les images (Mistral)', parameters: { method: 'POST', url: 'https://api.mistral.ai/v1/ocr', authentication: 'predefinedCredentialType', nodeCredentialType: 'mistralCloudApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ { "model": "mistral-ocr-latest", "document": { "type": "document_url", "document_url": $json.url }, "pages": $(\'Repérer les pages avec images\').first().json.imagePages, "include_image_base64": false, "bbox_annotation_format": { "type": "json_schema", "json_schema": { "name": "image_description", "strict": true, "schema": { "type": "object", "additionalProperties": false, "required": ["image_type", "description"], "properties": { "image_type": { "type": "string", "description": "Nature de l\'image, en français : graphique, schéma, tableau, photo, logo ou autre" }, "description": { "type": "string", "description": "Description factuelle en français, 120 mots maximum : ce que montre l\'image, axes, valeurs lisibles, tendances, légendes. Ne rien inventer." } } } } } } }}'), options: { timeout: 300000 } }, credentials: { mistralCloudApi: newCredential('Mistral Cloud account - n8n rag', '85NQMrlexcMRjHZs') }, position: [1792, -400], retryOnFail: true, maxTries: 2, waitBetweenTries: 5000, onError: 'continueRegularOutput' }
});

const supprimer_le_fichier_chez_Mistral = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Supprimer le fichier chez Mistral', parameters: { method: 'DELETE', url: expr('{{ "https://api.mistral.ai/v1/files/" + $(\'Téléverser le PDF chez Mistral\').first().json.id }}'), authentication: 'predefinedCredentialType', nodeCredentialType: 'mistralCloudApi', options: {} }, credentials: { mistralCloudApi: newCredential('Mistral Cloud account - n8n rag', '85NQMrlexcMRjHZs') }, position: [2016, -400], retryOnFail: true, maxTries: 2, waitBetweenTries: 3000, onError: 'continueRegularOutput' }
});

const nettoyer_le_texte = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Nettoyer le texte', parameters: { jsCode: 'const raw = $(\'OCR Mistral (markdown par page)\').first().json;\n\nlet pages;\nlet blocksByPage = [];\nlet isMarkdown = false;\nif (Array.isArray(raw.pages) && raw.pages.length) {\n  isMarkdown = true;\n  const indexOf = (p, i) => (typeof p.index === \'number\' ? p.index : i);\n  const maxIndex = Math.max(...raw.pages.map(indexOf));\n  pages = new Array(maxIndex + 1).fill(\'\');\n  blocksByPage = new Array(maxIndex + 1).fill(null).map(() => []);\n  raw.pages.forEach((p, i) => {\n    pages[indexOf(p, i)] = p.markdown || \'\';\n    blocksByPage[indexOf(p, i)] = Array.isArray(p.blocks) ? p.blocks : [];\n  });\n} else if (Array.isArray(raw.text)) {\n  pages = raw.text;\n  blocksByPage = pages.map(() => []);\n} else {\n  throw new Error(\'Sortie OCR inattendue : ni pages[] ni text[]. Clés reçues : \' + Object.keys(raw).join(\', \'));\n}\n\n// 1. Descriptions d\'images produites par Mistral (étape facultative : absente si le document n\'a pas d\'image ou si l\'appel a échoué).\n//    Rattachées par page et par ordre d\'apparition, pas par identifiant (la numérotation change quand on ne traite que certaines pages).\nconst imageNotes = {};\ntry {\n  const described = $(\'Décrire les images (Mistral)\').first().json;\n  (described.pages || []).forEach((p) => {\n    imageNotes[p.index] = (p.images || []).map((img) => {\n      try {\n        const a = typeof img.image_annotation === \'string\' ? JSON.parse(img.image_annotation) : img.image_annotation;\n        return a && a.description ? { type: a.image_type || \'image\', description: String(a.description).replace(/\\s+/g, \' \').trim() } : null;\n      } catch (e) { return null; }\n    });\n  });\n} catch (e) { /* pas d\'étape de description dans cette exécution */ }\nlet imagesDescribed = 0;\npages = pages.map((p, i) => {\n  const notes = imageNotes[i] || [];\n  let k = 0;\n  return (p || \'\').replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g, () => {\n    const note = notes[k++];\n    if (!note) return \'\';\n    imagesDescribed++;\n    return \'\\n\\n[Description automatique d\\\'une image (\' + note.type + \'), à ne jamais citer : \' + note.description + \']\\n\\n\';\n  });\n});\n\n// 2. Numéro de page imprimé et titre courant, lus dans les en-têtes et pieds de page (blocs Mistral, sinon lignes de bord)\nconst cleanBlock = (s) => String(s || \'\').replace(/\\^\\{\\}\\[\\]/g, \' \').replace(/[*_\\\\]/g, \'\').replace(/\\s+/g, \' \').trim();\nconst edgeLinesOf = (md) => {\n  const lines = md.split(\'\\n\').map((l) => l.trim()).filter(Boolean);\n  return [...lines.slice(0, 2), ...lines.slice(-2)];\n};\nconst marginTexts = blocksByPage.map((blocks, i) => {\n  const fromBlocks = blocks.filter((b) => b.type === \'header\' || b.type === \'footer\').map((b) => cleanBlock(b.content));\n  if (fromBlocks.length) return { texts: fromBlocks, source: \'blocks\' };\n  return { texts: edgeLinesOf(pages[i] || \'\').map(cleanBlock).filter((t) => t.length <= 70), source: \'lines\' };\n});\nconst numberCandidates = marginTexts.map(({ texts }) => {\n  const nums = [];\n  texts.forEach((t) => {\n    if (t.length > 80) return; // note de bas de page, pas un folio\n    const m = t.match(/^(\\d{1,4})(?:\\s|$)/) || t.match(/(?:^|\\s)(\\d{1,4})$/);\n    if (m) nums.push(Number(m[1]));\n  });\n  return nums;\n});\nconst romanCandidates = marginTexts.map(({ texts }) => texts.filter((t) => /^[ivxlcdm]{1,7}$/i.test(t)).map((t) => t.toLowerCase()));\n\nconst n = pages.length;\nconst accepted = new Array(n).fill(null);\nfor (let p = 0; p < n; p++) {\n  for (const num of numberCandidates[p]) {\n    const offset = (p + 1) - num;\n    let agrees = false;\n    for (let q = Math.max(0, p - 3); q <= Math.min(n - 1, p + 3) && !agrees; q++) {\n      if (q === p) continue;\n      agrees = numberCandidates[q].some((m) => (q + 1) - m === offset);\n    }\n    if (agrees) { accepted[p] = num; break; }\n  }\n}\n// Pages sans folio (ouvertures de chapitre) : déduites seulement si les pages voisines numérotées ont le même décalage\nconst printedPages = accepted.map((v) => (v === null ? null : String(v)));\nfor (let p = 0; p < n; p++) {\n  if (printedPages[p] !== null) continue;\n  let a = p - 1; while (a >= 0 && accepted[a] === null && p - a <= 4) a--;\n  let b = p + 1; while (b < n && accepted[b] === null && b - p <= 4) b++;\n  if (a >= 0 && b < n && accepted[a] !== null && accepted[b] !== null && (a + 1) - accepted[a] === (b + 1) - accepted[b]) {\n    printedPages[p] = String((p + 1) - ((a + 1) - accepted[a]));\n  } else if (romanCandidates[p].length && p < n * 0.1) {\n    printedPages[p] = romanCandidates[p][0];\n  }\n}\n\n// 3. Chapitre : titre courant de la page, en écartant les titres « larges » (titre de partie ou du livre, dont l\'étendue\n//    englobe celle d\'un autre titre). Une page d\'ouverture sans titre courant prend le chapitre qui commence juste après.\n//    Sans titres courants : dernier titre markdown (# ou ##) rencontré.\nconst headsByPage = marginTexts.map(({ texts, source }) => (source !== \'blocks\' ? [] : texts\n  .filter((t) => t.length <= 80)\n  .map((t) => t.replace(/^\\d{1,4}\\s+/, \'\').replace(/\\s+\\d{1,4}$/, \'\').replace(/[\\s\\-–—:.,]+$/, \'\').trim())\n  .filter((t) => (t.match(/\\p{L}/gu) || []).length >= 3 && !/^[ivxlcdm]{1,7}$/i.test(t))));\nconst spans = {};\nheadsByPage.forEach((hs, p) => hs.forEach((h) => {\n  if (!spans[h]) spans[h] = { first: p, last: p, count: 0 };\n  spans[h].last = p;\n  spans[h].count++;\n}));\nconst kept = Object.keys(spans).filter((h) => spans[h].count >= 2);\nconst broad = new Set(kept.filter((h) => kept.some((o) => o !== h\n  && spans[o].first >= spans[h].first && spans[o].last <= spans[h].last)));\nconst chapterHeads = kept.filter((h) => !broad.has(h));\nconst pagesWithHeads = headsByPage.filter((hs) => hs.length).length;\nconst chapters = new Array(n).fill(null);\nlet chapterSource = \'aucun\';\nif (pagesWithHeads >= n * 0.3 && chapterHeads.length) {\n  chapterSource = \'titres courants\';\n  for (let p = 0; p < n; p++) {\n    const inside = chapterHeads.filter((h) => spans[h].first <= p && p <= spans[h].last)\n      .sort((a, b) => (spans[a].last - spans[a].first) - (spans[b].last - spans[b].first));\n    if (inside.length) { chapters[p] = inside[0]; continue; }\n    // Page entre deux chapitres : rattachée au plus proche (à égalité, au chapitre qui commence : page d\'ouverture)\n    const next = chapterHeads.filter((h) => spans[h].first > p && spans[h].first - p <= 2).sort((a, b) => spans[a].first - spans[b].first)[0];\n    const prev = chapterHeads.filter((h) => spans[h].last < p && p - spans[h].last <= 2).sort((a, b) => spans[b].last - spans[a].last)[0];\n    if (next && prev) chapters[p] = (p - spans[prev].last) < (spans[next].first - p) ? prev : next;\n    else chapters[p] = next || prev || null;\n  }\n} else {\n  let current = null;\n  for (let p = 0; p < n; p++) {\n    const h = (pages[p] || \'\').split(\'\\n\').map((l) => l.match(/^#{1,2}\\s+(.+)$/)).find(Boolean);\n    if (h) {\n      const title = h[1].replace(/[*_]/g, \'\').trim();\n      if (title.length >= 3 && title.length <= 120) { current = title; chapterSource = \'titres markdown\'; }\n    }\n    chapters[p] = current;\n  }\n}\n\n// 4. Nettoyage du texte (inchangé)\nconst normalizeLine = (l) => l.toLowerCase().replace(/[0-9]+/g, \'\').replace(/[^\\p{L} ]/gu, \'\').replace(/\\s+/g, \' \').trim();\n\nconst pre = pages.map((p) => (p || \'\')\n  .replace(/\\r/g, \'\')\n  .replace(/!\\[[^\\]]*\\]\\([^)]*\\)/g, \'\')\n  .replace(/�/g, \'\')\n  .replace(/­/g, \'\')\n  .replace(/ /g, \' \')\n  .replace(/ﬁ/g, \'fi\')\n  .replace(/ﬂ/g, \'fl\')\n  .replace(/[ \\t]+/g, \' \'));\n\nconst edgeIndexes = (lines) => {\n  const idx = lines.map((l, i) => (l ? i : -1)).filter((i) => i >= 0);\n  return new Set([...idx.slice(0, 2), ...idx.slice(-2)]);\n};\n\nconst edgeCount = {};\npre.forEach((p) => {\n  const lines = p.split(\'\\n\').map((l) => l.trim());\n  const seen = new Set();\n  edgeIndexes(lines).forEach((i) => {\n    const nl = normalizeLine(lines[i]);\n    if (nl.length >= 8) seen.add(nl);\n  });\n  seen.forEach((nl) => { edgeCount[nl] = (edgeCount[nl] || 0) + 1; });\n});\nconst repeated = new Set(Object.keys(edgeCount).filter((k) => edgeCount[k] >= 3));\n\nconst cleaned = pre.map((p) => {\n  const lines = p.split(\'\\n\').map((l) => l.trim());\n  const edges = edgeIndexes(lines);\n  const kept = lines.filter((l, i) => {\n    if (/^\\d{1,4}$/.test(l)) return false;\n    if (l && !l.startsWith(\'|\') && /^[^\\p{L}\\p{N}]+$/u.test(l)) return false;\n    if (edges.has(i) && repeated.has(normalizeLine(l))) return false;\n    return true;\n  });\n  let text = kept.join(\'\\n\')\n    .replace(/_{3,}/g, \'\')\n    .replace(/(\\w)-\\n(\\w)/g, \'$1$2\');\n  if (!isMarkdown) text = text.replace(/([^\\n])\\n(?!\\n)/g, \'$1 \');\n  return text.replace(/\\n{3,}/g, \'\\n\\n\').replace(/ {2,}/g, \' \').trim();\n});\n\nconst charsBefore = pages.reduce((s, p) => s + (p || \'\').length, 0);\nconst charsAfter = cleaned.reduce((s, p) => s + p.length, 0);\nreturn [{ json: {\n  text: cleaned,\n  printedPages,\n  chapters,\n  numpages: pages.length,\n  source: isMarkdown ? \'mistral-ocr\' : \'pdf-text\',\n  stats: {\n    charsBefore, charsAfter,\n    imagesDescribed,\n    pagesWithPrintedNumber: printedPages.filter((v) => v !== null).length,\n    chapterSource,\n    chapterList: [...new Set(chapters.filter(Boolean))].slice(0, 60),\n    repeatedHeaders: [...repeated].slice(0, 30),\n  },\n} }];\n' }, position: [2240, -320], onError: 'continueErrorOutput' }
});

const r_sumer_le_document = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: { name: 'Résumer le document', parameters: { modelId: { __rl: true, mode: 'id', value: 'models/gemini-flash-lite-latest' }, messages: { values: [{ content: expr('{{ $(\'Nettoyer le texte\').first().json.text.join(\'\\n\\n\').slice(0, 15000) }}') }] }, builtInTools: {}, options: { systemMessage: 'Tu résumes en un paragraphe (150 mots maximum) le sujet et la structure générale d\'un document à partir de son texte (même partiel, potentiellement tronqué). Ce résumé sert ensuite à situer des passages individuels dans le document. Réponds uniquement par le résumé, sans préambule ni guillemets.', maxOutputTokens: 300, temperature: 0.2 } }, credentials: { googlePalmApi: newCredential('Google Gemini Api account - n8n rag', 'LfRppAWT5jFqr0uu') }, position: [2464, -400], executeOnce: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueRegularOutput' }
});

const d_couper_en_chunks_chevauchement = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Découper en chunks (chevauchement)', parameters: { jsCode: 'function splitRecursive(text, chunkSize, overlap) {\n  // Coupe d\'abord sur les titres markdown, puis paragraphes, lignes, phrases, mots\n  const separators = [\'\\n## \', \'\\n### \', \'\\n\\n\', \'\\n\', \'. \', \' \', \'\'];\n  function split(txt, seps) {\n    if (txt.length <= chunkSize) return [txt];\n    const sep = seps[0] || \'\';\n    const rest = seps.slice(1);\n    const parts = sep === \'\' ? txt.split(\'\') : txt.split(sep);\n    const chunks = [];\n    let current = \'\';\n    for (const part of parts) {\n      const candidate = current ? current + sep + part : part;\n      if (candidate.length > chunkSize && current) {\n        chunks.push(current);\n        current = part;\n      } else {\n        current = candidate;\n      }\n    }\n    if (current) chunks.push(current);\n    let result = [];\n    for (const c of chunks) {\n      if (c.length > chunkSize && rest.length) {\n        result = result.concat(split(c, rest));\n      } else {\n        result.push(c);\n      }\n    }\n    return result;\n  }\n  const rawChunks = split(text, separators);\n  const withOverlap = [];\n  for (let i = 0; i < rawChunks.length; i++) {\n    if (i === 0) { withOverlap.push(rawChunks[i]); continue; }\n    // Reprise de la fin du chunk précédent, recalée sur un début de mot et séparée par un saut de ligne\n    let prevTail = rawChunks[i - 1].slice(-overlap);\n    const firstSpace = prevTail.search(/\\s/);\n    if (firstSpace > 0) prevTail = prevTail.slice(firstSpace + 1);\n    withOverlap.push(prevTail.trim() + \'\\n\' + rawChunks[i]);\n  }\n  return withOverlap;\n}\n\n// Index et table des matières : la plupart des lignes se terminent par des numéros de page.\n// Ces pages renvoient vers d\'autres pages sans contenu propre et remontent à tort dans les recherches.\nconst entryRe = /[,\\s]\\d{1,4}(\\s*[–-]\\s*\\d{0,4})?(\\s*fn\\.)?(,\\s*\\d{1,4}(\\s*[–-]\\s*\\d{0,4})?(\\s*fn\\.)?)*,?\\s*$/;\nconst isReferenceListing = (text) => {\n  const lines = text.split(\'\\n\').map((l) => l.trim()).filter(Boolean);\n  if (lines.length < 15) return false;\n  const entries = lines.filter((l) => !l.startsWith(\'|\') && l.length <= 120 && entryRe.test(l)).length;\n  return entries / lines.length >= 0.6;\n};\n\nconst cleaned = $(\'Nettoyer le texte\').first().json;\nconst pages = cleaned.text;\nconst printedPages = cleaned.printedPages || [];\nconst chapters = cleaned.chapters || [];\nconst summaryJson = $(\'Résumer le document\').first().json;\nconst summary = (summaryJson.content && summaryJson.content.parts && summaryJson.content.parts[0] && summaryJson.content.parts[0].text) || \'\';\nconst entree = $(\'Entrée : document\').first().json;\nconst fileHash = entree.fileHash;\nconst fileName = entree.fileName;\nconst totalPages = pages.length;\n\nconst items = [];\n// Position du passage dans le document : sert à retrouver ses voisins au moment de la recherche\nlet chunkIndex = 0;\nfor (let p = 0; p < pages.length; p++) {\n  const pageText = (pages[p] || \'\').trim();\n  if (!pageText || isReferenceListing(pageText)) continue;\n  for (const c of splitRecursive(pageText, 3000, 300)) {\n    // \\p{L} : lettres de toutes les écritures (latin, arabe, cyrillique, CJK...)\n    const letters = (c.match(/\\p{L}/gu) || []).length;\n    if (letters < 40) continue;\n    items.push({ json: {\n      pageContent: c,\n      pageNumber: p + 1,\n      printedPage: printedPages[p] || null,\n      chapter: chapters[p] || null,\n      chunkIndex: chunkIndex++,\n      totalPages: totalPages,\n      fileHash: fileHash,\n      fileName: fileName,\n      docSummary: summary,\n    } });\n  }\n}\nreturn items;\n' }, position: [2880, -256] }
});

const limite_mode_test = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: { name: 'Limite (mode test)', parameters: { maxItems: 25 }, position: [3104, -256], disabled: true, notes: 'Désactivé en production. Activer pour tester l\'indexation sur 5 chunks sans traiter tout un livre.' }
});

const traiter_chaque_chunk = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.2,
  config: { name: 'Traiter chaque chunk', parameters: { workflowId: { __rl: true, mode: 'id', value: 'Kp0bueymzy4YUWgZ', cachedResultName: 'Traiter un chunk (RAG)' }, mode: 'each', options: { waitForSubWorkflow: true } }, position: [3328, -256], onError: 'continueRegularOutput' }
});

const regrouper_les_passages_par_chapitre = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Regrouper les passages par chapitre', parameters: { jsCode: '// Un élément par chapitre détecté (au moins 2 passages), avec le début et la fin du chapitre : les conclusions sont souvent à la fin.\n// En mode test, seuls les passages qui ont passé la limite sont pris en compte.\nlet chunks;\ntry { chunks = $(\'Limite (mode test)\').all(); } catch (e) { chunks = $(\'Découper en chunks (chevauchement)\').all(); }\nconst groups = new Map();\nfor (const it of chunks) {\n  const c = it.json;\n  if (!c.chapter) continue;\n  if (!groups.has(c.chapter)) {\n    groups.set(c.chapter, { chapter: c.chapter, fileHash: c.fileHash, fileName: c.fileName, firstPage: c.pageNumber, lastPage: c.pageNumber, firstPrinted: c.printedPage || null, parts: [] });\n  }\n  const g = groups.get(c.chapter);\n  g.firstPage = Math.min(g.firstPage, c.pageNumber);\n  g.lastPage = Math.max(g.lastPage, c.pageNumber);\n  g.parts.push(c.pageContent);\n}\nconst out = [...groups.values()].filter((g) => g.parts.length >= 2).map((g) => {\n  const full = g.parts.join(\'\\n\\n\');\n  const text = full.length <= 14000 ? full : full.slice(0, 10000) + \'\\n\\n[...]\\n\\n\' + full.slice(-4000);\n  const { parts, ...rest } = g;\n  return { json: { ...rest, passages: parts.length, text } };\n});\nreturn out.length ? out : [{ json: { skip: true } }];\n' }, position: [3344, -400], alwaysOutputData: true, onError: 'continueRegularOutput' }
});

const chapitres_r_sumer = node({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: { name: 'Chapitres à résumer ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, combinator: 'and', conditions: [{ id: 'chap', leftValue: expr('{{ $json.skip !== true && !!$json.chapter }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }] }, options: {} }, position: [3568, -400] }
});

const r_sumer_le_chapitre = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: { name: 'Résumer le chapitre', parameters: { modelId: { __rl: true, mode: 'id', value: 'models/gemini-flash-lite-latest' }, messages: { values: [{ content: expr('Document : {{ $json.fileName }}\nChapitre : {{ $json.chapter }} (pages {{ $json.firstPage }} à {{ $json.lastPage }})\n\nTexte du chapitre :\n{{ $json.text }}') }] }, builtInTools: {}, options: { systemMessage: 'Tu résumes un chapitre de document en français, en 120 à 180 mots : sujet, idées principales, conclusion du chapitre et position de l\'auteur. Reformule avec tes propres mots : ne recopie aucune phrase du texte. Réponds uniquement par le résumé, sans titre ni préambule.', maxOutputTokens: 500, temperature: 0.2 } }, credentials: { googlePalmApi: newCredential('Google Gemini Api account - n8n rag', 'LfRppAWT5jFqr0uu') }, position: [3792, -320], retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueRegularOutput' }
});

const rep_rer_les_r_sum_s_manquants = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Repérer les résumés manquants', parameters: { jsCode: '// Chapitres dont le résumé a échoué au 1er essai (saturation Google) : repris une fois après une pause. Sinon un seul élément « skip ».\n// Les sorties du modèle sont appariées par position aux chapitres envoyés (un appel en échec donne un élément sans texte).\nconst summaryOf = (it) => (it.json.content && it.json.content.parts && it.json.content.parts[0] && it.json.content.parts[0].text || \'\').trim();\nconst groups = $(\'Regrouper les passages par chapitre\').all();\nconst failed = $input.all().map((it, i) => ({ it, g: groups[i] })).filter(({ it, g }) => g && g.json.chapter && !summaryOf(it)).map(({ g }) => ({ json: { ...g.json, essai: 2 } }));\nreturn failed.length ? failed : [{ json: { skip: true, chapitresEnEchec: 0 } }];\n' }, position: [4144, -320], alwaysOutputData: true, onError: 'continueRegularOutput' }
});

const chapitres_r_essayer = node({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: { name: 'Chapitres à réessayer ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, combinator: 'and', conditions: [{ id: 'retry', leftValue: expr('{{ $json.skip !== true && !!$json.chapter }}'), operator: { type: 'boolean', operation: 'true', singleValue: true }, rightValue: '' }] }, options: {} }, position: [4368, -320] }
});

const attendre_avant_le_2e_essai = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: { name: 'Attendre avant le 2e essai', parameters: { amount: 60 }, position: [4592, -256], webhookId: '3945833b-823a-4ba1-855a-6fec83b44967' }
});

const r_sumer_le_chapitre_2e_essai = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: { name: 'Résumer le chapitre (2e essai)', parameters: { modelId: { __rl: true, mode: 'id', value: 'models/gemini-flash-lite-latest' }, messages: { values: [{ content: expr('Document : {{ $json.fileName }}\nChapitre : {{ $json.chapter }} (pages {{ $json.firstPage }} à {{ $json.lastPage }})\n\nTexte du chapitre :\n{{ $json.text }}') }] }, builtInTools: {}, options: { systemMessage: 'Tu résumes un chapitre de document en français, en 120 à 180 mots : sujet, idées principales, conclusion du chapitre et position de l\'auteur. Reformule avec tes propres mots : ne recopie aucune phrase du texte. Réponds uniquement par le résumé, sans titre ni préambule.', maxOutputTokens: 500, temperature: 0.2 } }, credentials: { googlePalmApi: newCredential('Google Gemini Api account - n8n rag', 'LfRppAWT5jFqr0uu') }, position: [4816, -256], retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueRegularOutput' }
});

const pr_parer_le_r_sum_du_chapitre = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer le résumé du chapitre', parameters: { jsCode: '// Résumés du 1er essai (appariés par position aux chapitres envoyés), complétés par ceux du 2e essai pour les chapitres repris\nconst summaryOf = (it) => (it.json.content && it.json.content.parts && it.json.content.parts[0] && it.json.content.parts[0].text || \'\').trim();\nconst groups = $(\'Regrouper les passages par chapitre\').all();\nconst summaries = new Map(); const essais = new Map();\n$(\'Résumer le chapitre\').all().forEach((it, i) => { const g = groups[i]; const s = summaryOf(it); if (g && g.json.chapter && s) { summaries.set(g.json.chapter, s); essais.set(g.json.chapter, 1); } });\nconst retried = $(\'Repérer les résumés manquants\').all().filter((it) => it.json.skip !== true);\nif (retried.length) $input.all().forEach((it, i) => { const g = retried[i]; const s = summaryOf(it); if (g && s && !summaries.has(g.json.chapter)) { summaries.set(g.json.chapter, s); essais.set(g.json.chapter, 2); } });\nreturn groups.filter((g) => g.json.chapter && summaries.has(g.json.chapter)).map((g) => {\n  const { text, ...rest } = g.json;\n  const summary = summaries.get(g.json.chapter);\n  return { json: { ...rest, summary, essai: essais.get(g.json.chapter), embedText: \'Résumé du chapitre « \' + g.json.chapter + \' » (\' + g.json.fileName + \', pages \' + g.json.firstPage + \' à \' + g.json.lastPage + \') : \' + summary } };\n});\n' }, position: [5168, -320], alwaysOutputData: true, onError: 'continueRegularOutput' }
});

const embedder_le_r_sum = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: { name: 'Embedder le résumé', parameters: { method: 'POST', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent', authentication: 'predefinedCredentialType', nodeCredentialType: 'googlePalmApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ { "model": "models/gemini-embedding-001", "content": { "parts": [ { "text": $json.embedText } ] } } }}'), options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini Api account - n8n rag', 'LfRppAWT5jFqr0uu') }, position: [5392, -320], retryOnFail: true, maxTries: 3, waitBetweenTries: 5000, onError: 'continueRegularOutput' }
});

const pr_parer_l_insertion_du_r_sum = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer l\'insertion du résumé', parameters: { jsCode: '// Résumé stocké avec type \'chapter_summary\' : sert à orienter la recherche, jamais cité comme texte du document\nconst prepared = $(\'Préparer le résumé du chapitre\').all();\nconst rows = $input.all().map((it, i) => {\n  const values = it.json.embedding && it.json.embedding.values;\n  const g = prepared[i] ? prepared[i].json : null;\n  if (!values || !values.length || !g || !g.summary) return null;\n  const metadata = { type: \'chapter_summary\', file_hash: g.fileHash, file_name: g.fileName, chapter: g.chapter, loc: { pageNumber: g.firstPage, lastPage: g.lastPage, printedPage: g.firstPrinted || null }, context: null, keywords: g.chapter };\n  return { json: { params: [g.summary, JSON.stringify(metadata), \'[\' + values.join(\',\') + \']\'] } };\n}).filter(Boolean);\nreturn rows.length ? rows : [{ json: { params: null, aucunResume: true } }];' }, position: [5616, -320], alwaysOutputData: true, onError: 'continueRegularOutput' }
});

const ins_rer_les_r_sum_s_en_staging = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Insérer les résumés en staging', parameters: { operation: 'executeQuery', query: 'insert into documents_staging (content, metadata, embedding) values ($1, $2::jsonb, $3::vector);', options: { queryReplacement: expr('{{ $json.params }}') } }, credentials: { postgres: newCredential('Postgres account - n8n rag', 'fcU2NrNfRbMEUqOZ') }, position: [5840, -320], alwaysOutputData: true, onError: 'continueRegularOutput' }
});

const v_rifier_compl_tude_staging = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Vérifier complétude (staging)', parameters: { operation: 'executeQuery', query: 'select count(*) as chunk_count, coalesce(max((metadata->\'loc\'->>\'pageNumber\')::int), 0) as max_page\nfrom documents_staging\nwhere metadata->>\'file_hash\' = $1 and coalesce(metadata->>\'type\', \'chunk\') = \'chunk\';', options: { queryReplacement: expr('{{ $(\'Entrée : document\').first().json.fileHash }}') } }, credentials: { postgres: newCredential('Postgres account - n8n rag', 'fcU2NrNfRbMEUqOZ') }, position: [6064, -400], executeOnce: true }
});

const d_p_t_complet = node({
  type: 'n8n-nodes-base.if',
  version: 2.3,
  config: { name: 'Dépôt complet ?', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, combinator: 'and', conditions: [{ id: 'c1', leftValue: expr('{{ Number($json.chunk_count) }}'), operator: { type: 'number', operation: 'gt' }, rightValue: 0 }, { id: 'c2', leftValue: expr('{{ Number($json.chunk_count) }}'), operator: { type: 'number', operation: 'gte' }, rightValue: expr('{{ (() => { try { return $(\'Limite (mode test)\').all().length; } catch (e) { return $(\'Découper en chunks (chevauchement)\').all().length; } })() }}') }] }, options: {} }, position: [6288, -400] }
});

const basculer_en_production_atomique = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Basculer en production (atomique)', parameters: { operation: 'executeQuery', query: 'WITH previous AS (\n  DELETE FROM documents WHERE metadata->>\'file_hash\' = $1 RETURNING 1\n), moved AS (\n  DELETE FROM documents_staging WHERE metadata->>\'file_hash\' = $1\n  RETURNING content, metadata, embedding\n), inserted AS (\n  INSERT INTO documents (content, metadata, embedding)\n  SELECT content, metadata, embedding FROM moved\n  RETURNING metadata\n)\nUPDATE source_documents\nSET status = $2, chunk_count = (SELECT count(*) FROM inserted WHERE coalesce(metadata->>\'type\', \'chunk\') = \'chunk\')\nWHERE file_hash = $1\nRETURNING status, chunk_count,\n  (SELECT count(*) FROM inserted WHERE metadata->>\'type\' = \'chapter_summary\') AS resumes_chapitres,\n  (SELECT count(*) FROM previous) AS chunks_remplaces;', options: { queryReplacement: expr('{{ [ $(\'Entrée : document\').first().json.fileHash, $(\'Limite (mode test)\').all().length < $(\'Découper en chunks (chevauchement)\').all().length ? \'test\' : \'complete\' ] }}') } }, credentials: { postgres: newCredential('Postgres account - n8n rag', 'fcU2NrNfRbMEUqOZ') }, position: [6512, -448] }
});

const wf = workflow('kkJZEESjSWTgsg9o', 'Indexer un document (RAG)', { executionOrder: 'v1', availableInMCP: true, binaryMode: 'separate' });

export default wf
  .add(entr_e_document)
  .to(purger_le_staging_reprise)
  .to(restaurer_le_binaire)
  .to(oCR_Mistral_markdown_par_page
  .onError(marquer_en_chec_et_nettoyer))
  .to(rep_rer_les_pages_avec_images)
  .to(le_document_contient_des_images.onTrue(t_l_verser_le_PDF_chez_Mistral
    .to(obtenir_une_URL_temporaire)
    .to(d_crire_les_images_Mistral)
    .to(supprimer_le_fichier_chez_Mistral)
    .to(nettoyer_le_texte
    .onError(marquer_en_chec_et_nettoyer))
    .to(r_sumer_le_document)
    .to(d_couper_en_chunks_chevauchement)
    .to(limite_mode_test)
    .to(traiter_chaque_chunk)
    .to(regrouper_les_passages_par_chapitre)
    .to(chapitres_r_sumer.onTrue(r_sumer_le_chapitre
      .to(rep_rer_les_r_sum_s_manquants)
      .to(chapitres_r_essayer.onTrue(attendre_avant_le_2e_essai
        .to(r_sumer_le_chapitre_2e_essai)
        .to(pr_parer_le_r_sum_du_chapitre)
        .to(embedder_le_r_sum)
        .to(pr_parer_l_insertion_du_r_sum)
        .to(ins_rer_les_r_sum_s_en_staging)
        .to(v_rifier_compl_tude_staging)
        .to(d_p_t_complet.onTrue(basculer_en_production_atomique).onFalse(marquer_en_chec_et_nettoyer))).onFalse(pr_parer_le_r_sum_du_chapitre))).onFalse(v_rifier_compl_tude_staging))).onFalse(nettoyer_le_texte))