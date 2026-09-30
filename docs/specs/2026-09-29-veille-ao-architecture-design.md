# Architecture n8n | Veille quotidienne AO & Décideurs (lot 1)

Créé le 2026-09-29 · Mis à jour le 2026-09-30 · Source : « Specs | Veille quotidienne Appels d'offres & Décideurs publics » v3.0 (2026-09-28)

## Objet et statut

Ce document décrit l'architecture n8n du lot 1 (MVP) **telle qu'elle est construite et en service**.

- Instance : `joliment.app.n8n.cloud`, projet personnel, dossier **Sandbox** (`X2egoqftB6uLHElg`).
- **Phase de test** au sens de la spec métier : un seul destinataire (le porteur), messagerie et agenda personnels du porteur, poids et seuil provisoires.
- État des workflows :

| # | Workflow | État |
|---|---|---|
| 1 | Veille quotidienne | **Publié**, testé de bout en bout (collecte, score, notes, email, tableau). Section Décideurs en attente (Journal officiel) |
| 2 | Actions du tableau | **Publié**, testé en réel (no-go sans raison, go, note demandée) |
| 3 | Bilan mensuel | Configuré, **non publié** : adresse de l'associé manquante |
| 4 | Générer une note | **Publié**, testé |
| 0 | Installation du tableau | Utilitaire exécuté une fois ; peut être archivé |

- Les nœuds encore provisoires portent le préfixe `[À CONFIGURER]`.
- Hors périmètre : tout ce qui relève des lots 2 et 3 (sources secondaires, traduction, recherche sémantique, page web, poids automatiques).

## Vue d'ensemble

| # | Workflow | Déclencheur | Rôle |
|---|---|---|---|
| 1 | Veille quotidienne | Horaire : lun.–ven. 7h30 et 8h30, Europe/Paris ; déclencheur d'erreur interne | Collecte, pré-filtre, score, notes, email, tableau, décideurs |
| 2 | Actions du tableau | Ligne modifiée dans l'onglet « Appels offres » (vérification chaque minute) | Notes demandées, échéances go, rappels no-go |
| 3 | Bilan mensuel | Horaire : lun.–ven. 8h, filtre « 1er jour ouvré du mois » | Synthèse mensuelle envoyée à l'associé |
| 4 | Générer une note (sous-workflow) | Appelé par 1 et 2 | Note d'analyse en document Google, renvoie son lien |

Les alertes au porteur sont des nœuds Gmail intégrés aux workflows. Il n'y a pas de workflow d'erreur séparé : le workflow 1 contient son propre déclencheur d'erreur (voir « Gestion des pannes »).

n8n impose qu'un sous-workflow soit **publié avant** les workflows qui l'appellent : publier 4 avant 1 et 2.

## Données : tableau de suivi (un Google Sheets)

Tableur `1nx_9Z7myjoq2p7ctsjxJAyOgiN1BgVexegCI_f4xubg`, créé par le workflow 0.

| Onglet | Colonnes principales | Écrit par | Lu par |
|---|---|---|---|
| Appels offres | id_source, source, acheteur, objet, date_limite, date_limite_questions, lien_annonce, score, sous_scores, recommandation, faible, date_publication, présenté_le, décision, raison_no_go, commentaire, note_demandée, lien_note, échéances_créées | WF1, WF2, équipe | WF1, WF2, WF3 |
| Décideurs | date_nomination, personne, poste, organisme, prédécesseur, angle_approche, lien_source | WF1 | équipe |
| Organismes surveillés | organisme, commentaire | équipe | WF1 |
| AO ratés | date_signalement, lien, commentaire, signalé_par | équipe | WF3 |
| Pondérations | critere, poids, explication (lignes sujet, acheteur, proximite, seuil) | associé | WF1 |
| Filtres | type (`cpv` ou `mot_cle`), valeur, commentaire | équipe | WF1 |
| Exécutions (technique) | horodatage, type (quotidienne / note / bilan), statut (en cours / succès / échec), periode_debut, periode_fin, id_execution, examines, retenus, cout, erreur | WF1, WF2, WF3 | WF1, WF2 |

Règles de saisie :

- **note_demandée** : liste avec la seule valeur « oui » (pas de case à cocher : des cases valant FALSE sur des lignes vides faisaient écrire les ajouts de n8n en bas de feuille).
- **décision** : liste « go / no-go » ; **raison_no_go** : liste « hors compétence, manque de temps, prix, acheteur, autre ».
- L'onglet des AO s'appelle **« Appels offres »**, sans apostrophe : le déclencheur Google Sheets de n8n échoue (« Cannot read properties of undefined (reading '!ref') ») sur un nom d'onglet contenant une apostrophe.

Données internes lues dans Google Drive : fiches références (dossier `1UmYCTYejBCfu7UkGCjmPyEYWF0QLqycc`, **PDF ou Google Docs**) ; dossier des notes `1njHdSXcJCtXVZZhlASrLW8dJEXygiVV5`. Le tableur des clients n'est pas encore branché.

## WF1 · Veille quotidienne

1. **Démarrage** : déclencheurs 7h30 et 8h30. Lecture de l'onglet Exécutions. À 8h30, si l'exécution quotidienne du jour a réussi, arrêt sans action. Sinon, période = dernière exécution réussie → maintenant (3 jours en arrière s'il n'y en a aucune) ; ajout d'une ligne « en cours » ; lecture de l'onglet Filtres.
2. **Collecte** (chaque source : 3 tentatives, 5 s d'écart) :
   - **BOAMP** (API open data, sans compte) : avis de marché de type SERVICES publiés depuis le début de la période, pagination par 100.
   - **TED** (API publique, sans compte) : avis de marché d'acheteurs **hors de France** (les AO français viennent du BOAMP, ce qui évite les doublons), limités aux codes CPV de l'onglet Filtres, pagination par 100.
   - **Journal officiel** (nominations) : nœud **désactivé** en attendant l'accès à l'API Légifrance (compte PISTE, application de production).
3. **Préparation et pré-filtre** : mise au même format ; un avis BOAMP est gardé si l'un de ses codes CPV commence par un code de l'onglet Filtres **ou** si son objet contient un mot-clé de l'onglet Filtres (42 % des avis BOAMP n'ont pas de CPV lisible : un filtre CPV seul ferait rater des AO) ; suppression des doublons et des AO déjà présents dans le tableau ; comptage des annonces examinées.
4. **Score** : lecture des Pondérations, des organismes surveillés et des fiches références ; découpage des nouveaux AO en **lots de 20** (un lot unique de ~185 AO produisait des notes stéréotypées) ; un appel Mistral par lot, 2 en parallèle, textes externes transmis comme données non fiables, consigne de calibrage (utiliser toute l'échelle 0-100) ; calcul du score pondéré, recommandation (y aller ≥ seuil ; à creuser ≥ seuil − 15 ; non) ; sélection des 10 meilleurs, marqués « faibles » si aucun ne dépasse le seuil.
5. **Notes** : appel de WF4 pour chaque AO « y aller » **parmi les 10 retenus pour l'email** (plafond temporaire, voir « Écarts assumés »).
6. **Décideurs** : liste des organismes surveillés = acheteurs d'AO « y aller » sur 12 mois + onglet Organismes surveillés (+ tableur clients, désactivé) ; filtrage des nominations ; Mistral propose un angle d'approche ; ajout à l'onglet Décideurs. **Inactif tant que le Journal officiel n'est pas branché.**
7. **Email et clôture** : email HTML au porteur (AO groupés par recommandation avec acheteur, objet, date limite, score, lien de l'annonce, lien de la note ou lien vers le tableau pour la demander ; décideurs ; compteurs examinés / nouveaux / retenus) ; ajout de tous les nouveaux AO au tableau, y compris écartés, avec « présenté_le » pour ceux de l'email et le lien de la note ; ajout des décideurs ; ligne Exécutions en « succès » avec examinés, retenus et coût estimé.

Relance manuelle : le porteur exécute WF1 à la main depuis n8n.

### Gestion des pannes

- **Panne d'une source** (après 3 tentatives) : ligne Exécutions en « échec », alerte au porteur, arrêt.
- **Toute autre erreur** (IA, tableur, email…) : le **déclencheur d'erreur** du workflow marque la ligne Exécutions en « échec » et alerte le porteur. Il ne se déclenche que pour les exécutions planifiées (pas pour les exécutions manuelles de test).
- Message d'alerte : à 7h30, « nouvelle tentative à 8h30 » ; à 8h30, « relance manuelle requise ».
- L'exécution de 8h30 relance automatiquement si celle de 7h30 n'a pas réussi, quelle qu'en soit la cause.

## WF2 · Actions du tableau

Déclencheur Google Sheets sur modification de ligne (colonnes surveillées : note_demandée, décision, raison_no_go), vérification chaque minute ; délai constaté entre la modification et l'action : 1 à 2 minutes. Aiguillage (une même ligne peut déclencher plusieurs actions) :

- **note_demandée = « oui » et lien_note vide** : comptage des notes du jour dans Exécutions ; au-delà de 10, alerte au porteur (pas de plafond, la note est produite) ; appel de WF4 ; lien écrit dans la ligne ; ligne Exécutions de type « note » avec le coût estimé.
- **décision = go et échéances_créées vide** : création dans l'agenda principal du compte Google relié de deux événements « journée entière » : « AO – questions » (date_limite_questions) et « AO – REMISE » (date_limite) ; échéances_créées = date du jour (pas de doublon si « go » est ressaisi).
- **décision = no-go et raison_no_go vide** : rappel par email au porteur.

Seules les modifications du tableau (partagé nominativement) déclenchent une action ; un email ne donne aucun droit d'agir.

## WF3 · Bilan mensuel

Déclencheur lun.–ven. 8h ; poursuite uniquement le premier jour ouvré du mois. Lecture du mois écoulé : décisions, répartition des raisons de no-go (« non renseignée » si absente), AO ratés, échantillon aléatoire de 10 AO écartés (non présentés dans l'email). Email à l'associé avec lien vers le tableau. Aucune modification automatique des poids. Ligne Exécutions de type « bilan ». Le mois d'un AO est celui de sa **date de publication** (le tableau n'a pas de date de décision).

## WF4 · Générer une note (sous-workflow)

- Entrée : la ligne complète de l'AO, transmise par l'appelant.
- Lecture de toutes les fiches du dossier : téléchargement (les Google Docs sont convertis en PDF) puis extraction du texte. Mesure au 2026-09-29 : 2 fiches PDF, ~42 000 caractères, ~11 000 tokens, lisibles en une fois.
- Mistral rédige les 6 rubriques obligatoires en **texte simple** (le texte est collé tel quel dans le document) ; règles : chaque argument cite l'annonce ou une fiche identifiée par son titre et son lien, sinon « aucune preuve trouvée » ; ne citer que ce qui figure dans les fiches ; textes externes traités comme données.
- Création d'un Google Doc dans le dossier des notes ; durée constatée ~30 à 40 s.
- Sortie : id_source, lien_note, coût estimé. **L'appelant écrit lien_note dans le tableau.**

## Écarts assumés et limites connues

| Sujet | Exigence de la spec métier | Situation actuelle | Suite prévue |
|---|---|---|---|
| Notes automatiques | Une note pour chaque AO « y aller » | Notes limitées aux AO « y aller » parmi les **10 retenus pour l'email** (plafond temporaire décidé le 2026-09-30) : avec le score actuel, jusqu'à ~50 notes par jour sinon | Lever le plafond une fois le seuil calibré par le test chiffré |
| Coût traçable | Coût de chaque exécution et de chaque note | **Estimation** à partir de la longueur des textes (≈ 4 caractères par token). Le décompte réel de Mistral n'est visible que dans le journal d'exécution de n8n | Remplacer les nœuds IA par des appels directs à l'API Mistral (qui renvoie le décompte) si le suivi précis devient nécessaire |
| Calibrage du score | Seuil issu du test chiffré | Poids et seuil **provisoires** (0,5 / 0,2 / 0,3 ; seuil 60) ; score jugé encore généreux (ex. hydraulique notée haut à cause du mot « modélisation ») | Validation par l'associé, test chiffré ; éventuel onglet « Profil » (sujets visés / exclus) |
| Lien pour demander une note | Lien vers la ligne du tableau | Lien vers le tableau entier | À améliorer si besoin |
| Décideurs | Nominations du Journal officiel | Nœud désactivé | Compte PISTE (application de production Légifrance, CGU acceptées pour PROD) |
| Organismes surveillés | Acheteurs 12 mois + tableur clients + liste fixe | Onglet rempli avec les 11 clients et partenaires cités sur ecosysgroup.com ; tableur clients non branché | Brancher le tableur clients s'il existe |
| Titres TED | Avis en version française | Début de titre en français (pays, catégorie), suite dans la langue d'origine | Traduction prévue au lot 2 |

## Éléments encore provisoires

| Élément | Dépend de |
|---|---|
| Nœud Journal officiel (URL, identifiants OAuth) | Compte PISTE / API Légifrance en production |
| Nœud tableur des clients | Emplacement du tableur |
| Adresse de l'associé (WF3) | À fournir |
| Poids et seuil | Points ouverts 4 et 5 (associé, test chiffré) |

## Vérification

- Chaque workflow a été validé par n8n avant création.
- Les essais ont été faits **en réel** plutôt qu'avec des données simulées : sous-workflow 4 (notes de test), workflow 2 (3 cas sur une ligne TEST), workflow 1 (deux exécutions complètes sur 3 jours de publications : 502 annonces examinées, 185 nouvelles, 10 notes). Les données de test du tableau ont été effacées ; restent à supprimer à la main 2 événements d'agenda (5 et 15 novembre) et les notes TEST du dossier des notes.
- Le déclencheur d'erreur du workflow 1 n'est vérifiable que sur une exécution planifiée.
