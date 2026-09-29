# Architecture n8n | Veille quotidienne AO & Décideurs (lot 1)

2026-09-29 · Source : « Specs | Veille quotidienne Appels d'offres & Décideurs publics » v3.0 (2026-09-28)

## Objet et statut

Ce document décrit l'architecture n8n du lot 1 (MVP). Le livrable est un **squelette documenté** : la structure complète (déclencheurs, étapes, branches, gestion des pannes) est créée dans n8n, mais les nœuds dont la configuration dépend des hypothèses non vérifiées (point ouvert n°1) ou de l'accès à l'IA européenne (point ouvert n°2) sont des emplacements provisoires.

- Instance : `joliment.app.n8n.cloud`, projet personnel, dossier **Sandbox** (`X2egoqftB6uLHElg`).
- Tous les workflows sont créés **désactivés** ; aucun n'envoie d'email ni ne crée d'événement tant qu'il n'est pas configuré et publié.
- Chaque nœud provisoire porte le préfixe `[À CONFIGURER]` dans son nom et une note expliquant ce qu'il attend.
- Chaque bloc est encadré d'une note de canevas qui renvoie à la section correspondante de la spec.
- Hors périmètre : tout ce qui relève des lots 2 et 3 (sources secondaires, traduction, recherche sémantique, page web, poids automatiques).

## Vue d'ensemble

| # | Workflow | Déclencheur | Rôle |
|---|---|---|---|
| 1 | Veille quotidienne | Horaire : lun.–ven. 7h30 et 8h30, Europe/Paris | Collecte, score, email, tableau, décideurs |
| 2 | Actions du tableau | Ligne modifiée dans l'onglet Appels d'offres (vérification chaque minute) | Notes demandées, échéances go, rappels no-go |
| 3 | Bilan mensuel | Horaire : lun.–ven. 8h, filtre « 1er jour ouvré du mois » | Synthèse mensuelle envoyée à l'associé |
| 4 | Générer une note (sous-workflow) | Appelé par 1 et 2 | Note d'analyse en document Google, lien écrit dans le tableau |

Les alertes au porteur sont des nœuds Gmail intégrés à chaque workflow (pas de workflow d'alerte dédié). Il n'y a pas de workflow de gestion des erreurs : l'exécution de 8h30 détecte l'échec de celle de 7h30 via l'onglet Exécutions.

## Données : tableau de suivi (un Google Sheets)

| Onglet | Colonnes principales | Écrit par | Lu par |
|---|---|---|---|
| Appels offres (renommé, sans apostrophe : bug du déclencheur Google Sheets) | id_source, source, acheteur, objet, date_limite, date_limite_questions, lien_annonce, score, sous-scores, recommandation, faible, date_publication, présenté_le, décision, raison_no_go, commentaire, note_demandée, lien_note, échéances_créées | WF1, WF2, WF4, équipe | WF1, WF2, WF3, WF4 |
| Décideurs | date_nomination, personne, poste, organisme, prédécesseur, angle_approche, lien_source | WF1 | équipe |
| Organismes surveillés | organisme, commentaire | équipe | WF1 |
| AO ratés | date_signalement, lien, commentaire, signalé_par | équipe | WF3 |
| Pondérations | critère, poids ; seuil | associé | WF1 |
| Exécutions (technique) | horodatage, type (quotidienne / note / bilan), statut (en cours / succès / échec), période_début, période_fin, examinés, retenus, coût, erreur | WF1, WF2, WF3 | WF1, WF2 |

L'onglet Exécutions sert à trois choses : définir la période couverte (depuis la dernière exécution quotidienne réussie), tracer le coût de chaque exécution et de chaque note, et permettre à l'exécution de 8h30 de savoir si celle de 7h30 a réussi.

Données internes lues dans Google Drive : fiches références (font foi), tableau des missions (index), tableur des clients.

## WF1 · Veille quotidienne

1. **Démarrage** : déclencheurs 7h30 et 8h30. Lecture de l'onglet Exécutions. À 8h30, si l'exécution quotidienne du jour a réussi, arrêt sans action. Sinon, période = dernière exécution réussie → maintenant ; ajout d'une ligne « en cours ».
2. **Collecte** : trois requêtes HTTP `[À CONFIGURER]` (bulletin national des marchés, journal européen des marchés en version française, Journal officiel nominations), chacune avec 3 nouvelles tentatives. Échec persistant d'une source → ligne Exécutions en « échec », alerte au porteur, arrêt.
3. **Préparation** : normalisation des AO des deux sources au même format ; suppression de ceux dont l'id_source existe déjà dans le tableau ; comptage des éléments examinés.
4. **Score** : lecture des Pondérations, des organismes surveillés et des fiches références ; nœud IA Mistral `[À CONFIGURER]` qui note chaque AO sur trois critères (sujet, acheteur, proximité missions), les textes externes étant transmis comme données non fiables, jamais comme instructions ; calcul du score pondéré, comparaison au seuil, recommandation (y aller / à creuser / non) ; sélection des 10 meilleurs, marqués « faibles » si aucun ne dépasse le seuil.
5. **Écriture et notes** : ajout de tous les nouveaux AO au tableau (y compris écartés, pour l'échantillon du bilan) ; appel de WF4 pour chaque AO « y aller ».
6. **Décideurs** : liste des organismes surveillés = acheteurs d'AO intéressants sur 12 mois + tableur clients + onglet Organismes surveillés ; filtrage des nominations ; nœud IA `[À CONFIGURER]` pour l'angle d'approche ; ajout à l'onglet Décideurs.
7. **Email et clôture** : construction de l'email (AO groupés par recommandation avec acheteur, objet, date limite, lien, score, lien note ou ligne du tableau ; décideurs avec personne, poste, organisme, lien) ; envoi Gmail au porteur ; marquage « présenté_le » ; ligne Exécutions en « succès » avec examinés, retenus, coût.

Relance manuelle : le porteur exécute WF1 à la main depuis n8n.

## WF2 · Actions du tableau

Déclencheur Google Sheets sur modification de ligne, vérification chaque minute. Aiguillage :

- **Note demandée cochée et lien_note vide** : comptage des notes du jour dans Exécutions ; au-delà de 10, alerte au porteur (pas de plafond, la note est produite) ; appel de WF4 ; ligne Exécutions de type « note » avec le coût.
- **Décision = go et échéances_créées vide** : création dans Google Agenda des événements « date limite des questions » et « date de remise » ; échéances_créées = date du jour.
- **Décision = no-go et raison_no_go vide** : rappel au porteur ; la décision n'est pas prise en compte tant que la raison est absente.

Seules les modifications du tableau (partagé nominativement) déclenchent une action ; un email ne donne aucun droit d'agir.

## WF3 · Bilan mensuel

Déclencheur lun.–ven. 8h ; poursuite uniquement le premier jour ouvré du mois. Lecture du mois écoulé : décisions, répartition des raisons de no-go, AO ratés, échantillon aléatoire d'AO écartés. Email à l'associé avec lien vers l'onglet Pondérations. Aucune modification automatique des poids. Ligne Exécutions de type « bilan ».

## WF4 · Générer une note (sous-workflow)

- Entrée : la ligne complète de l'AO (tous ses champs), transmise par l'appelant.
- Lecture de l'ensemble des fiches références (hypothèse : lisibles en une fois).
- Nœud IA Mistral `[À CONFIGURER]` produisant les 6 rubriques obligatoires ; règle : chaque argument cite l'annonce ou une fiche identifiée avec son lien, sinon « aucune preuve trouvée » ; textes externes traités comme données.
- Création d'un document Google dans le dossier des notes `[À CONFIGURER]`.
- Sortie : id_source, lien_note, coût. **L'appelant écrit lien_note dans le tableau** (WF1 l'inclut dans la ligne ajoutée, WF2 met la ligne à jour) : ainsi WF4 ne dépend pas d'une ligne déjà écrite.

## Éléments provisoires (à configurer après vérification)

| Élément | Dépend de |
|---|---|
| URL et paramètres des 3 sources | Point ouvert 1 (hypothèses : quotas, conditions, heure de publication) |
| Nœuds IA Mistral et identifiants | Point ouvert 2 |
| Poids initiaux et seuil | Points ouverts 4 et 5 |
| Identifiant du tableur de suivi, dossier Drive des notes, fiches références, tableur clients | Création des ressources Google |
| Adresses email porteur et associé, agenda | Configuration des accès Google |

## Vérification

- Validation de chaque workflow par n8n avant création.
- Après configuration : essais avec données simulées (pin data), sans envoi réel, avant toute activation.
