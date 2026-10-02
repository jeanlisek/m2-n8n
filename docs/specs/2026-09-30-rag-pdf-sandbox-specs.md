# Specs | RAG PDF Sandbox
Version 2.5 — 2026-10-02 — statut : ingestion (lot 1 bis) et réponse (lot 2) livrées et testées sur deux livres réels, tous deux complets en base ; prompts du chat restructurés selon la méthode du cours

## Objectif
Un exercice de M2 doit démontrer un RAG qui ne répond que sur la base de ce qu'il peut prouver, jamais par extrapolation. Le projet n8n (dossier Sandbox) publie un formulaire de dépôt de PDF et un chat public ; chaque réponse est soit sourcée (document + page + extrait exact vérifié), soit un refus explicite si l'information n'est pas dans la base.

Depuis la v1.3, l'objectif est passé d'un « RAG classique niveau 0 » à une version de qualité production : extraction OCR, nettoyage, découpage récursif, contexte par passage (contextual retrieval), recherche hybride, vérification automatique des citations, indexation asynchrone et atomique.

## Scope et lots de livraison
- **Lot 1 (MVP)** — livré le 2026-09-30 : dépôt, indexation, chat sourcé, refus strict (voir Historique v1.3).
- **Lot 1 bis (qualité production)** — livré le 2026-10-01 : tout ce que décrivent les Phases 1 à 3 et l'Architecture ci-dessous.
- **Lot 2 (réponse)** — livré le 2026-10-01, complété le 2026-10-02 : pipeline en cinq étapes (Context, Routing, Search, Reranking, Generation), calqué sur celui présenté en cours ; jeu formel de 10 questions passé ; second document déposé (livre d'un collègue), questions à plusieurs documents et questions ambiguës traitées.
- **Lot 3 (V2 ambitieuse)** — plus tard, conditionné à la fin du lot 2 : GraphRAG, SPR, génération de questions hypothétiques par passage.

**Entré dans le scope depuis la v1.3** (était hors scope) : PDF scannés (OCR Mistral), tableaux (conservés en markdown), images (décrites automatiquement), multilingue partiel (questions en français sur un document en anglais).

**Toujours hors scope** : interface de gestion des documents, modération du contenu déposé, authentification.

## Phase 1 : point de départ et livrables
- **Déclencheurs**, deux entrées indépendantes :
  1. **On form submission** (public) : dépôt d'un PDF → réservation puis indexation **en arrière-plan** ; le formulaire répond immédiatement.
  2. **When chat message received** (public) : une question → recherche puis réponse.
- **Livrable du dépôt** : message immédiat « Dépôt reçu » (indexation en cours), « Document déjà présent » ou « Document non accepté » (plus de 500 pages). Le document devient interrogeable quand l'indexation a fini, d'un seul coup, sans état intermédiaire visible.
- **Livrable du chat** : réponse en français dont chaque affirmation est suivie de `(nom du document, page X, p. Y imprimée)` et d'un extrait entre « » copié mot pour mot dans la langue du document (12 mots maximum, 4 extraits au plus). Chaque extrait est vérifié automatiquement contre le texte récupéré. Sinon, exactement « Je ne trouve pas cette information dans les documents. ».
- **Refus par le seuil, jamais par un modèle libre** : si aucun passage du document n'atteint une similarité vectorielle de 0,60 avec l'une des requêtes, la réponse fixe de refus est renvoyée sans appeler le modèle de génération. Le routeur ne peut pas refuser lui-même : seul un message sans demande d'information (salutation, remerciement) reçoit une réponse directe ; toute question passe par la recherche.
- **Questions de suivi** : l'historique de la session est relu avant la recherche et la question est reformulée de façon autonome (« Et Karl Marx, qu'en dit-il ? » devient « Que dit le livre de Robert L. Heilbroner sur Karl Marx ? »). Testé sur une conversation de trois tours. Les réponses directes (salutation, demande de précision) sont aussi écrites dans l'historique, sinon le tour suivant perd son sens.
- **Plusieurs documents en base** (depuis le 2026-10-02) :
  - le routeur désigne les **documents visés** par la question (un document nommé, « les deux livres », ou aucun : recherche sur toute la base) ; seuls des identifiants connus sont acceptés ;
  - avec plusieurs documents visés, la recherche est faite **document par document** avec un quota de candidats par document, pour qu'aucun document n'écrase les autres ; la réponse est organisée document par document et chaque source nomme son document ;
  - un document visé dont aucun passage n'est jugé pertinent est signalé comme ne traitant pas du sujet, jamais comme « absent » ;
  - **question ambiguë** (« De quoi parle le livre ? » avec deux documents en base) : pas de choix arbitraire ; le chat liste les documents et demande lequel. La précision suivante (« Le premier ») est comprise grâce à l'historique.
- **Réponse partielle autorisée** : si les passages traitent du sujet sans y répondre littéralement, le modèle répond à partir de ce qu'ils contiennent et le signale (« Le document ne donne pas de définition en une phrase, mais… »). Le refus exact est réservé au cas où aucun passage ne traite du sujet (règle assouplie le 2026-10-01).
- **Sources en désaccord** : les deux sources sont citées et le désaccord est signalé, sans trancher.

## Phase 2 : environnement (outils, données, dépendances)
- **n8n Cloud** (`joliment.app.n8n.cloud`), dossier Sandbox, trois workflows publiés :

  | Workflow | Id | Rôle |
  |---|---|---|
  | RAG PDF (nommé « RAG PDF Sandbox » jusqu'au 2026-10-02 ; ce nom reste celui du projet dans ce document) | `rLAUYoCgy0u2vs9C` | Formulaire de dépôt et chat public |
  | Indexer un document (RAG) | `kkJZEESjSWTgsg9o` | Indexation en arrière-plan d'un document |
  | Traiter un chunk (RAG) | `Kp0bueymzy4YUWgZ` | Traitement d'un passage (contexte, embedding, staging) |

- **Modèles** :
  - Chat, routage, juge de pertinence, contexte des passages, résumés : `models/gemini-flash-lite-latest`. `flash-latest` renvoyait des 503 répétés et `pro-latest` a un quota nul sur cette clé (constaté le 2026-10-01).
  - **Réglages d'échantillonnage** : température **0** pour ce qui décide (routeur, juge), **0,2** pour ce qui rédige (génération, contexte des passages, résumés) ; **top-p fixé explicitement à 0,95** sur les six appels Gemini depuis le 2026-10-02 (c'était la valeur par défaut du modèle, laissée implicite jusque-là ; à ces températures son effet est marginal, contrôlé par un tour de 10 questions). `thinkingBudget` volontairement absent (voir faits tranchés).
  - Embeddings : `gemini-embedding-001`, 3072 dimensions, appelé en HTTP (`embedContent`). `gemini-embedding-2` a été essayé puis abandonné : ses vecteurs ne sont pas comparables à ceux de `001`, et l'utiliser seulement pour la question cassait la recherche.
  - OCR : Mistral `mistral-ocr-latest` (node n8n pour le texte ; API HTTP pour la description des images, que le node n'expose pas).
- **Base : Supabase**, projet `rag-pdf` (ref `tuxeoixdfxgetvhebmar`, région `eu-west-3`) :
  - `documents` : passages en production (`content`, `metadata` jsonb, `embedding vector(3072)`), colonne générée `fts` (tsvector anglais + français sur le texte et les mots-clés) avec index GIN ;
  - `documents_staging` : même structure, zone tampon de l'indexation tout-ou-rien ;
  - `source_documents` : un document par empreinte SHA-256 (`file_hash` unique, `file_name`, `page_count`, `chunk_count`, `status` parmi `processing`, `complete`, `failed`, `test`) ;
  - fonctions `hybrid_search`, `rag_search` (une requête), `rag_multi_search` (plusieurs requêtes, un filtre document) et `rag_search_documents` (plusieurs requêtes, liste de documents visés avec quota par document ; utilisée par le chat depuis le 2026-10-02) ; `match_documents` subsiste mais n'est plus appelée ;
  - `chat_histories` : historique des conversations, écrit par le node Postgres Chat Memory (session, message jsonb). Le node suffixe l'identifiant de session avec son nom ;
  - `queries` : journal de chaque question (routage, candidats, notes du juge, issue), pour le débogage et l'évaluation ;
  - RLS activée sans policy : seule la clé `service_role` du credential n8n accède aux tables.
- **Métadonnées d'un passage** : `type` (`chunk` ou `chapter_summary`), `file_hash`, `file_name`, `loc.pageNumber` (page du PDF), `loc.printedPage` (numéro imprimé), `chapter`, `chunk_index` (position dans le document), `context` (phrase de situation générée), `keywords` (mots-clés bilingues générés). Le `content` stocké est toujours le texte brut du document (citable) ; le contexte et les mots-clés générés restent en métadonnées.
- **Nodes** : les nodes imposés en v1.0 sont toujours utilisés pour les déclencheurs (On form submission, When chat message received) et le modèle de chat (Google Gemini Chat Model). Deux remplacements sont documentés dans « Contradictions et arbitrages » : Embeddings Google Gemini remplacé par un appel HTTP, Vector Store Supabase remplacé par des requêtes SQL (node Postgres « Execute a SQL query »).
- **Identifiants** : uniquement dans les credentials n8n (Gemini, Mistral, Postgres), jamais en clair dans un node.

## Phase 3 : contraintes et cas d'échec
- **Doublons** : empreinte SHA-256 du fichier, jamais le nom. La réservation est atomique (`insert … on conflict`). Un redépôt n'est accepté que si le document est en `failed` ou `test`, ou bloqué en `processing` depuis plus de 2 heures.
- **Volume** : 500 pages maximum, contrôlées dès le dépôt ; au-delà, refus avec message. Limites Mistral : 50 Mo, 1 000 pages.
- **PDF scanné** : traité par l'OCR, plus rejeté.
- **Échec d'indexation**, politique tout ou rien :
  - les passages sont écrits en staging ;
  - la complétude compare le nombre de passages en staging au nombre de passages découpés, résumés de chapitre exclus ;
  - si c'est complet : bascule atomique en une requête (suppression de l'ancienne version, déplacement du staging, mise à jour du statut) ;
  - sinon : purge du staging et statut `failed`. L'OCR et le nettoyage en erreur mènent aussi à `failed`.
- **Étapes facultatives** (description des images, résumé du document, résumés de chapitre) : en cas d'échec, l'indexation continue sans elles, elles ne la bloquent jamais. Les résumés de chapitre en échec (saturation Google) sont repris **une fois, après 60 secondes de pause** (ajouté le 2026-10-02, après la perte de 6 résumés sur 18 sur le second livre) ; les chapitres encore en échec après cette reprise restent sans résumé.
- **Mode test** : le node « Limite (mode test) » limite à 25 passages et le document reçoit le statut `test`. Il est désactivé en production.
- **Confidentialité** : avertissement sur le formulaire (contenu public, lu par Mistral AI et indexé via Google). Le PDF envoyé à Mistral pour décrire les images est supprimé chez Mistral juste après (suppression vérifiée sur l'indexation du 2026-10-01).
- **Modèle saturé (503 « forte demande »)** : chaque appel Gemini est réessayé (3 fois pour la génération, 2 pour le routage et le juge). Si le juge échoue, l'ordre RRF est conservé ; si le routeur échoue, la question brute sert de requête ; si la génération échoue après 3 essais, un message de saturation lisible est affiché (plus d'erreur HTTP brute depuis le 2026-10-01). Observé pendant le jeu de 30 questions enchaînées en 5 minutes : 2 tours sur 3 ont perdu le juge, une génération a échoué.
- **Réponse bloquée par Google** (filtre `RECITATION` sur la reproduction de textes protégés) : réponse vide du modèle, remplacée par un message clair qui invite à reformuler, jamais par un faux refus.
- **Rétention** : indéfinie, suppression manuelle dans Supabase.

## Critères de succès
1. Sur un jeu de 10 questions de test (1 à 2 PDF connus, 7 questions dans le document et 3 hors sujet) : au moins 6 réponses sur 7 correctement sourcées et 10 refus corrects sur 10 hors sujet.
   **Passé le 2026-10-01 sur *Economics Explained*, 3 tours, 30 réponses** (jeu : Luddites, illusion monétaire, contrôle des grandes entreprises, conclusion du livre, répartition des revenus 1950-1979 d'après un graphique, main invisible, question de suivi « Et Karl Marx, qu'en dit-il ? » ; hors sujet : capitale du Japon, Coupe du monde 2018, salaire d'Adam Smith). Résultat : **20 réponses sur 21** citent au moins une page attendue avec tous les extraits vérifiés exacts ; la réponse manquante est une erreur technique (503 Google après 3 essais), pas une mauvaise réponse ; **9 refus sur 9** avec la phrase exacte. Temps : médiane 7,2 s, moyenne 8,4 s, 4 réponses entre 16 et 20 s à cause des nouveaux essais sur 503. Rejouable depuis la table `queries` (sessions `eval-r<tour>-<question>`).
2. Chaque citation est vérifiable : l'extrait se retrouve mot pour mot dans le PDF. C'est désormais contrôlé automatiquement à chaque réponse (nœud « Vérifier les citations »).

**Observé le 2026-10-01** sur *Economics Explained* (258 pages, une seule exécution par question) :
- extraits vérifiés exacts sur toutes les réponses testées après correction (main invisible, Luddites, capitalisme, illusion monétaire, égalité des revenus, grandes entreprises, conclusion du livre, répartition des revenus 1950-1979) ;
- questions hors sujet refusées avant tout appel au modèle (capitale du Japon, Coupe du monde 2018).

**Observé le 2026-10-02** avec deux livres en base (*Economics Explained* et *What Are You Doing Here?* de Laina Dawes, 274 passages), une exécution par question :
- « De quoi parle le livre ? » → liste des deux documents et demande de précision (4 s) ; « Le premier » → présentation sourcée du livre de Heilbroner (7 s) ;
- « Les deux livres parlent-ils du capitalisme ? » → le livre de Heilbroner cité (page 22) et le livre de Dawes signalé comme ne traitant pas du sujet (vérifié : aucun de ses 274 passages ne contient « capitalis ») ;
- « Que disent les deux livres de la place des femmes ? » → réponse en deux parties, trois extraits vérifiés par livre (pages 196-197 ; pages 13, 14, 43), 7,5 s ;
- questions nommant un seul livre (auteur, titre, sujet manifeste) : passages du bon livre seulement (testé la veille sur 4 questions).

## Solutions existantes envisagées
- **n8n Simple Vector Store** : écarté (développement uniquement, purge sur Cloud, pas d'isolement).
- **Supabase (pgvector)** : retenu.
- **Template n8n #15738** : référence de câblage seulement.
- **Templates #9007 et #5023** : consultés, non retenus.
- **Template n8n `jj4iiL6iMnhfZVoK`** (template d'un collègue) : comparé le 2026-10-01 ; le workflow actuel a été amélioré à partir de ses meilleurs éléments, dont l'usage du node « Execute a SQL query ».
- **Contextual retrieval (Anthropic)** : retenu. Une phrase de contexte et des mots-clés par passage entrent dans le texte vectorisé.
- **Reranking** : retenu (lot 2), Gemini flash-lite en juge de pertinence, comme chez l'intervenant. Un modèle de reranking dédié (Cohere, Voyage) serait plus précis mais demanderait un fournisseur de plus.
- **Safe JSON Parser de Lucas Peyrin** (template n8n #5146) : réutilisé, porté dans les nodes Code du routage et du reranking.
- **Recherche hybride** : d'abord écartée, puis retenue le 2026-10-01 (fusion RRF vecteurs et mots-clés).

## Hypothèses et contraintes

**Faits tranchés par test réel (`doubt-driven-dev`)** :
- *(v1.2, devenus sans objet)* Le Default Data Loader conservait le numéro de page, et le node Embeddings Gemini stockait des vecteurs vides sans erreur. Ce second fait a motivé le remplacement de ce node par un appel HTTP qui échoue explicitement.
- **OCR Mistral** : les pages sont indexées à partir de 0. La sortie contient des blocs typés `header` et `footer`, qui donnent le numéro imprimé et le titre courant de chaque page. Vérifié sur la sortie réelle du livre.
- **Décalage entre page PDF et page imprimée** : il n'est pas constant (5 pages au début du livre, 2 vers la page 160, 1 à la fin). Une correction fixe aurait été fausse ; le numéro est donc lu page par page et validé par cohérence avec les pages voisines. Résultat : 249 pages sur 258 numérotées, sans rupture d'ordre.
- **Description des images** : l'API OCR Mistral, appelée avec le credential existant, décrit les images en français. Ce n'est possible qu'en appel HTTP, le node n8n n'exposant pas l'option. L'appel peut être limité aux pages contenant des images. Testé sur un PDF public, puis sur le livre : 13 images décrites sur 13.
- **Filtre RECITATION de Gemini** : avec des extraits de 25 mots, 4 réponses sur 4 ont été bloquées ; avec 12 mots maximum, 3 sur 3 sont passées.
- **Exclusion des pages d'index et de table des matières** (au moins 60 % des lignes finissent par des numéros de page) : sur les 255 pages du livre, la règle ne touche que la page 4 et les pages 251 à 257, sans faux positif même à un seuil de 30 %.
- **Récupérer 12 passages au lieu de 8 ne suffisait pas** : les pages 186 à 190 restaient absentes, le problème étant le classement et non le nombre. L'ajout des passages voisins et des meilleurs passages des chapitres bien classés a corrigé les deux cas testés (une exécution chacun).
- **Juge de pertinence** : avec des passages tronqués à 1 800 caractères, le juge notait 0 des passages dont l'information utile se trouvait après la coupure (Luddites, page 19), de façon reproductible sur 3 essais. Transmis en entier, il note juste. Un juge qui met tout sous 3 ne décide plus du refus : repli sur l'ordre RRF, la génération tranche.
- **Node Postgres Chat Memory** : crée la table (id, session_id, message jsonb avec `type`, `content`, `additional_kwargs`, `response_metadata`) et enregistre sous « <sessionId>__<nom du node> », les caractères non ASCII du nom remplacés par `_` (`__M_moire_Postgres`, lu en base le 2026-10-02). La lecture du contexte doit accepter ce suffixe ; l'écriture des réponses directes reproduit exactement cette clé et cette forme.
- **Recherche par documents visés** : sans quota, une question sur « les deux livres » ne ramenait que des passages du livre le plus bavard sur le sujet (12 sur 12). Avec génération document par document et quota, 6 candidats de chaque livre (test SQL puis chat réel, 2026-10-02).
- **Juge et document sans le sujet** : quand un document visé ne contient rien sur la question, le juge met 0 à tous ses passages (c'est juste) ; sans note explicite dans le contexte, le générateur en concluait que le livre « n'est pas mentionné ». Avec la note, il dit que le livre ne traite pas du sujet.
- **Exemples dans le prompt du générateur** (2026-10-02) : avec cinq exemples entrée/sortie, le modèle a d'abord cité davantage (32 extraits sur 10 questions contre 21, jusqu'à 10 sur une question) et mis une paraphrase française entre « », signalée « non vérifiée » par le contrôle. Deux règles explicites (« » réservés aux extraits copiés ; 4 extraits au plus même pour une question large) ramènent à 24 extraits, 0 non vérifié, 10/10. Les exemples ne remplacent pas les règles de discipline, ils les complètent.
- **Embedding groupé** : `batchEmbedContents` accepte 5 textes en un appel avec le credential existant.
- **Node Google Gemini en sortie JSON** : le JSON arrive en texte dans `content.parts[0].text`, parsé par le parseur tolérant.
- **Temps de réponse mesurés après le lot 2** : 5,5 à 9 s par question (refus par seuil : 4 s ; salutation : 2 s), contre 4 à 7 s avant, pour deux appels LLM de plus.
- **Réglage `thinkingBudget` des nodes Gemini** : à 0, les appels échouent ; à -1, ils produisent des fragments inexploitables. Le paramètre est laissé absent.
- **Lecture d'un node désactivé** : sa sortie reste lisible par expression (utilisé pour le mode test).

**Hypothèses encore à tester** :
- [Risque moyen] Le seuil de 0,60 et la détection des chapitres par titres courants ont été calibrés sur un livre imprimé. Sur le second livre (livre numérique sans folios ni titres courants), les chapitres viennent des titres markdown (18 détectés) et aucune page imprimée n'est lue : attendu, pas une erreur. Un document d'un autre type (rapport, mémoire) reste à tester.
- [Risque faible] La branche « 2e essai » des résumés de chapitre n'a pas encore été exercée : au redépôt du second livre (2026-10-02), les 18 résumés sont passés au premier essai (Google non saturé), le chemin « aucun échec » a été vérifié (un seul passage par le nœud de préparation, 18 résumés en production) mais pas le chemin de reprise. Il ne s'exercera qu'au prochain 503 pendant une indexation.
- [Risque faible] Le routeur décide seul qu'une question est ambiguë ou vise tel document ; testé sur 7 questions, pas sur un jeu formel. Une erreur de sa part donne au pire une recherche sur toute la base (jamais une invention : seuls les identifiants connus sont acceptés).
- [Risque moyen] Le juge de pertinence a été mesuré sur un seul tour complet (le premier ; les deux suivants ont subi des 503) : notes cohérentes sur 10 questions sur 10. Les réponses restent justes sans lui (repli RRF), mais sa valeur ajoutée en précision n'est pas chiffrée.
- [Risque moyen] Un enchaînement rapide de questions (plus de 6 par minute) déclenche des 503 chez Google sur flash-lite. Usage normal (un utilisateur) non concerné ; une démonstration devant un jury devrait espacer les questions.
- [Risque faible] Quotas gratuits Gemini et coût Mistral au-delà de quelques documents : non mesurés.

**Contradictions et arbitrages** :
- **Node « Embeddings Google Gemini » imposé** contre **pas de vecteurs vides silencieux** : remplacé par un appel HTTP `embedContent`, qui lève une erreur explicite et permet un traitement par passage. C'est un écart par rapport aux nodes imposés en v1.0.
- **Node Vector Store Supabase** contre **atomicité, recherche hybride et métadonnées riches** : remplacé par des requêtes SQL. L'utilisateur a demandé d'intégrer le node « Execute a SQL query ».
- **Extraits mot pour mot** contre **filtre RECITATION de Google** : extraits limités à 12 mots (au plus 4), le reste reformulé.
- **Résumés et descriptions générés utiles à la recherche** contre **ne citer que le document** : utilisables par le modèle pour s'orienter, jamais citables. Ils sont exclus de la vérification, et un extrait qui en provient est marqué « non vérifié ».
- **Arbitrages v1.1 toujours valables** : dépôt public accepté sans modération, vérification manuelle de la base avant la notation, risque de quota pendant la notation accepté.

## Points ouverts
| # | Point | Propriétaire probable |
|---|-------|------------------------|
| 1 | ~~Passer le jeu formel de 10 questions.~~ Passé 3 fois sur le livre le 2026-10-01 (voir Critères de succès). Un jeu formel sur le second livre n'a pas été passé (7 questions libres seulement). | Utilisateur, si le temps le permet |
| 2 | ~~Extraits de 12 mots au plus, parfois de simples fragments.~~ Réglé le 2026-10-01 : le nœud de vérification allonge l'extrait jusqu'à sa phrase (30 mots au plus) après le modèle, donc hors de portée du filtre RECITATION. | Réglé |
| 3 | ~~Un seul document en base : filtre document non testé.~~ Réglé le 2026-10-02 : documents visés, recherche par document, question ambiguë (voir Phase 1). | Réglé |
| 4 | Une information issue uniquement d'une description d'image n'affiche pas la page imprimée dans la citation. Détail d'affichage. | Lot 3 |
| 5 | Consigne de cours précise (grille, livrable, date) non communiquée. | Utilisateur / enseignant |
| 6 | ~~Redéposer le second livre pour obtenir ses 18 résumés de chapitre.~~ Fait le 2026-10-02 : `complete`, 274 passages, 18 résumés sur 18 (tous au premier essai), 286 anciennes lignes remplacées, 6 min 25 s. | Réglé |
| 7 | Rien n'est encore commité dans le dépôt git (spec non suivie). | Utilisateur |

## Architecture technique (état au 2026-10-02)

**Dépôt (RAG PDF Sandbox, réponse immédiate).**
1. Formulaire : PDF, avertissement de confidentialité.
2. Extract from File : contrôle du nombre de pages, refus au-delà de 500.
3. Empreinte SHA-256 du fichier.
4. Réservation atomique dans `source_documents` :
   - réservée : lancement du sous-workflow d'indexation **sans attente**, puis message « Dépôt reçu » ;
   - sinon : message « Document déjà présent ».

**Indexation (Indexer un document).**
1. Purge du staging de ce document (reprise après échec).
2. OCR Mistral, page par page, en markdown.
3. Pages avec images (facultatif, seulement si le document en contient) :
   - téléversement du PDF chez Mistral ;
   - URL temporaire (1 heure) ;
   - description en français des images de ces seules pages ;
   - suppression du fichier chez Mistral.
4. Nettoyage :
   - en-têtes et pieds de page répétés, folios, caractères parasites, césures ;
   - lecture du numéro imprimé et du titre courant dans les blocs `header`/`footer`, avec validation par cohérence des décalages entre pages voisines ;
   - chapitre = titre courant le plus spécifique, en écartant les titres de partie ; à défaut, dernier titre markdown ;
   - descriptions d'images insérées sous la forme « [Description automatique d'une image (…), à ne jamais citer : …] ».
5. Résumé du document (Gemini, sur les 15 000 premiers caractères, facultatif).
6. Découpage :
   - récursif sur titres, paragraphes, lignes, phrases puis mots ;
   - 3 000 caractères avec 300 de chevauchement recalé sur un début de mot, sans jamais déborder d'une page (citation de page exacte) ;
   - pages d'index et de table des matières écartées, passages de moins de 40 lettres ignorés (toutes écritures, `\p{L}`) ;
   - chaque passage porte sa page, sa page imprimée, son chapitre et sa position.
7. Limite (mode test), désactivée en production.
8. Un sous-workflow par passage (« Traiter un chunk ») :
   - Gemini produit une phrase de situation (25 mots maximum) et 5 à 8 mots-clés avec leur traduction française ;
   - le texte vectorisé réunit chapitre, contexte, mots-clés et passage ;
   - le texte brut du passage est inséré en staging.
9. Résumés de chapitre (facultatif) :
   - regroupement des passages par chapitre (au moins 2 passages), début et fin du chapitre dans la limite de 14 000 caractères ;
   - résumé Gemini en français de 120 à 180 mots, reformulé ;
   - chapitres sans résumé après les 3 essais du nœud : attente de 60 s, puis un second appel pour ces seuls chapitres ; les résumés des deux passes sont réunis par nom de chapitre ;
   - embedding, puis insertion en staging avec `type = chapter_summary`.
10. Complétude (passages seulement), puis bascule atomique en production ou statut `failed`.

Mesuré le 2026-10-01 sur *Economics Explained* (258 pages) : 7 min 10 s, 246 passages (242 avec page imprimée, 241 avec chapitre), 22 résumés de chapitre, 13 images décrites. Sur *What Are You Doing Here?* (274 pages, livre numérique) : premier dépôt 19 min, 274 passages, 0 page imprimée (le livre n'en a pas), 16 images décrites, 12 résumés de chapitre sur 18 (6 perdus sur 503 Google, d'où la deuxième passe) ; redépôt le 2026-10-02 : 6 min 25 s, 18 résumés sur 18. L'écart de durée tient à la charge de Google, pas au document.

**Réponse (RAG PDF Sandbox, chat), cinq étapes comme dans le pipeline présenté en cours.**
1. **Context** : une requête SQL lit les 10 derniers messages de la session dans `chat_histories` et la liste des documents en base (nom, identifiant, pages, un extrait pour deviner la langue).
2. **Routing** : un appel Gemini flash-lite en sortie JSON (température 0 ; prompt structuré en objectif, règles, cinq exemples entrée/sortie couvrant salutation, hors sujet, question de suivi, question ambiguë et question à deux documents, format de sortie) produit la question autonome, 2 à 3 reformulations dont une dans la langue du document, des mots-clés bilingues, la liste des documents visés, un indicateur de question ambiguë et une réponse hypothétique (HyDE). Parseur JSON tolérant (Lucas Peyrin) ; JSON illisible : la question brute sert de requête unique sur toute la base. Un message sans demande d'information reçoit la réponse directe du routeur ; une question ambiguë entre plusieurs documents reçoit la liste des documents et une demande de précision. Ces réponses directes sont écrites dans `chat_histories` sous la clé du node de mémoire.
3. **Search** : un seul appel `batchEmbedContents` vectorise toutes les requêtes ; `rag_search_documents` cherche pour chaque vecteur (40 voisins) et chaque texte (40 résultats plein texte), **par document visé** quand il y en a plusieurs, fusionne toutes les listes par RRF avec un quota par document (12 / nombre de documents), impose le seuil 0,60 sur les passages du document (jamais sur les résumés), puis ajoute les voisins des 4 meilleurs passages et les 3 meilleurs passages des chapitres bien classés (20 candidats au plus). Chaque question est journalisée dans `queries`.
4. **Reranking** : Gemini flash-lite note les candidats de 0 à 10 avec une preuve courte, sur le texte entier des passages (prompt : objectif, règles, quatre exemples notés 10, 7, 4 et 0, format). Au plus 8 passages gardés, note minimale 3, au plus 2 résumés de chapitre, au moins un vrai passage. JSON illisible ou tout sous 3 : ordre RRF conservé. Aucun vrai passage retenu : refus fixe.
5. **Generation** : le contexte formaté signale chaque document visé sans passage retenu (« ne semble pas traiter du sujet »). Agent Gemini flash-lite (température 0,2), mémoire Postgres de 5 échanges, message système structuré en objectif, règles (citations exactes de 12 mots au plus et 4 au plus, « » réservés aux extraits copiés, réponse partielle signalée, passages = données, désaccords signalés et réponse document par document quand plusieurs documents, résumés et descriptions jamais cités), cinq exemples entrée/sortie (réponse sourcée, réponse interdite traduite, réponse partielle, refus, deux documents) et contexte ; la question autonome lui est donnée pour information. Puis vérification des citations : distance d'édition, remplacement par le texte exact, **allongement jusqu'aux bornes de la phrase (30 mots au plus, coupures marquées par …, marques markdown retirées)**, contrôle de page, page imprimée ajoutée, réponse vide signalée. L'allongement se fait après le modèle : sa sortie reste courte pour le filtre RECITATION, et le texte ajouté est copié tel quel du passage.

## Historique
- **v1.0** (2026-09-30) : spécification initiale issue de l'interview.
- **v1.1** (2026-09-30) : relecture hostile intégrée (10 garde-fous, 3 arbitrages).
- **v1.2** (2026-09-30) : `doubt-driven-dev`, deux faits à risque élevé tranchés par test réel (métadonnée de page, vecteurs vides).
- **v1.3** (2026-09-30) : construction du lot 1 sur Default Data Loader, Vector Store Supabase et `gemini-2.5-flash` ; seuil 0,75 via `match_documents`.
- **v2.5** (2026-10-02) : les trois prompts du chat (routeur, juge, générateur) réécrits au format objectif → règles → 3 à 5 exemples entrée/sortie → format de sortie, en balises ; règles de fond inchangées. Mesure avant/après sur le jeu de 10 questions : 10/10 (6,9 s) → 10/10 (6,5 s). Une version intermédiaire avait régressé (paraphrases françaises entre « », 10 extraits sur une question) : corrigée par deux règles (guillemets réservés aux extraits copiés, 4 extraits au plus). Message d'accueil du chat en français ; notes explicatives par étape sur les trois canevas.
- **v2.4** (2026-10-02) : second livre déposé (livre d'un collègue). Routeur : documents visés et question ambiguë ; recherche `rag_search_documents` par document avec quota ; note explicite pour un document visé sans passage pertinent ; réponses directes écrites dans l'historique ; deuxième passe des résumés de chapitre après 60 s dans l'indexeur. Testé en conditions réelles sur 5 questions.
- **v2.3** (2026-10-01) : jeu formel de 10 questions passé 3 fois (20/21 et 9/9) ; message de saturation lisible quand Google renvoie 503 après les essais.
- **v2.2** (2026-10-01) : extraits allongés jusqu'à leur phrase par le nœud de vérification (30 mots au plus), après le modèle. Testé : « as Luddites to burn down » devient la phrase complète de la page 19.
- **v2.1** (2026-10-01) : lot 2, réponse en cinq étapes (Context, Routing, Search, Reranking, Generation) : historique en Postgres relu avant la recherche, routage LLM (question autonome, requêtes multiples, traduction, mots-clés, filtre, HyDE), recherche multi-requêtes RRF avec journal, juge de pertinence, génération inchangée. Testé sur 12 questions et une conversation de trois tours ; 5,5 à 9 s par réponse.
- **v2.0** (2026-10-01) : refonte qualité production.
  - **Dépôt et indexation** : asynchrones et atomiques (staging puis bascule), mode test.
  - **Extraction et nettoyage** : OCR Mistral, nettoyage, exclusion de l'index et de la table des matières.
  - **Découpage** : récursif borné à la page.
  - **Enrichissement** : un sous-workflow par passage avec contexte et mots-clés bilingues.
  - **Recherche** : hybride RRF, seuil 0,60, passages voisins et chapitres.
  - **Réponse** : vérification automatique des citations, règle de réponse partielle, gestion du filtre RECITATION.
  - **Numérotation et structure** : pages imprimées, chapitres et résumés de chapitre, descriptions d'images.
  - **Modèles** : `gemini-flash-lite-latest` et `gemini-embedding-001`.
  - **Base** : `rag-pdf` (`documents`, `documents_staging`, `source_documents`, `hybrid_search`, `rag_search`).
