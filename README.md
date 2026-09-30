# Veille AO & décideurs publics — n8n

Automatisation n8n qui, chaque matin de semaine, repère les **appels d'offres publics** pertinents pour une entreprise de conseil, les note avec une **IA européenne (Mistral)**, rédige une **note d'analyse** pour les plus intéressants et envoie un **email récapitulatif**. Un **Google Sheets partagé** sert de tableau de suivi : décisions go / no-go, demandes de notes, historique, pondérations du score.

Deux rôles reviennent dans ce document : le **porteur** (responsable du projet, seul destinataire pendant la phase de test) et l'**associé** (valide les pondérations du score et reçoit le bilan mensuel).

Statut : **lot 1 (MVP) en phase de test**, en service depuis le 30 septembre 2026. Le détail des exigences, des choix et des limites est dans la [spec technique](docs/specs/2026-09-29-veille-ao-architecture-design.md).

## Problème et objectifs

La veille des appels d'offres et des changements de décideurs est faite à la main : elle prend du temps et laisse passer des opportunités. Le projet réussit s'il **ne laisse passer aucun appel d'offres pertinent** et **fait gagner au moins 2 heures de veille par semaine**.

| Indicateur | Cible | Mesure |
|---|---|---|
| AO pertinents ratés | zéro par mois | signalement par l'équipe (onglet « AO ratés ») + revue mensuelle d'un échantillon d'AO écartés |
| Temps de veille économisé | ≥ 2 h par semaine | comparaison avec le temps de veille manuelle |
| Qualité du score (test chiffré, avant élargissement) | ≥ 8 AO pertinents retrouvés sur 10, ≤ 3 faux positifs sur 10 retenus | lot d'AO passés étiqueté par deux personnes |

Le lot 1 couvre trois sources gratuites : le BOAMP (bulletin national des marchés), TED (journal européen des marchés) et le Journal officiel (nominations). Les lots 2 et 3 (sources secondaires, traduction, page web dédiée) ne démarrent qu'une fois le lot 1 validé.

## Fonctionnement

```mermaid
flowchart LR
    subgraph Sources
        B[BOAMP<br/>avis de services]
        T[TED<br/>hors France]
        JO[Journal officiel<br/>nominations]
    end
    W1[1 · Veille quotidienne<br/>lun–ven 7h30, relance 8h30]
    W2[2 · Actions du tableau<br/>chaque minute]
    W3[3 · Bilan mensuel<br/>1er jour ouvré]
    W4[4 · Générer une note<br/>sous-workflow]
    AI([Mistral<br/>IA européenne])
    S[(Tableau de suivi<br/>Google Sheets)]
    M[Email au porteur]
    A[Google Agenda]
    D[Notes<br/>Google Docs]

    B --> W1
    T --> W1
    JO -.->|en attente| W1
    W1 <-.->|score| AI
    W1 -->|AO « y aller »| W4
    W1 --> M
    W1 --> S
    S -->|note demandée / go / no-go| W2
    W2 --> W4
    W2 -->|go| A
    W2 -->|no-go sans raison| M
    W4 <-.->|rédaction| AI
    W4 --> D
    S --> W3
    W3 -->|bilan| M
    classDef todo stroke-dasharray: 5 5
    class JO todo
```

| Workflow | Déclencheur | Rôle |
|---|---|---|
| **1 · Veille quotidienne** | lun–ven 7h30 ; relance unique à 8h30 si 7h30 a échoué | Collecte BOAMP + TED depuis la dernière exécution réussie → pré-filtre (onglet Filtres) → score Mistral par lots de 20 → notes des AO « y aller » (plafond : ceux des 10 AO de l'email) → email → écriture dans le tableau. Toute panne alerte le porteur. |
| **2 · Actions du tableau** | modification d'une ligne de l'onglet « Appels offres » | Note demandée → note en ~2 min ; go → 2 échéances dans l'agenda ; no-go sans raison → rappel par email |
| **3 · Bilan mensuel** | 1er jour ouvré du mois, 8h | Décisions, raisons des no-go, AO ratés, échantillon d'AO écartés → email à l'associé |
| **4 · Générer une note** | appelé par 1 et 2 | Lit les fiches références (PDF ou Google Docs), Mistral rédige les 6 rubriques obligatoires, crée le Google Doc, renvoie le lien |
| **0 · Installation du tableau** | manuel, une seule fois | Crée le Google Sheets avec ses onglets et en-têtes |

## Tableau de suivi (Google Sheets)

| Onglet | Contenu | Modifié par |
|---|---|---|
| Appels offres | un AO par ligne : score, recommandation, décision, raison du no-go, note demandée (« oui »), lien de la note | workflows + équipe |
| Décideurs | nominations du Journal officiel (lot 1, en attente) | workflow 1 |
| Organismes surveillés | clients, anciens clients, partenaires | équipe |
| AO ratés | AO pertinents trouvés par un autre canal | équipe |
| Pondérations | poids des 3 critères (sujet, acheteur, proximité) et seuil | associé |
| Filtres | codes CPV et mots-clés du pré-filtre | équipe |
| Exécutions | journal technique : période couverte, statut, volumes, coût | workflows |

> L'onglet des AO s'appelle « Appels offres » (sans apostrophe) : le déclencheur Google Sheets de n8n échoue sur les noms d'onglet contenant une apostrophe.

## Garde-fous intégrés

- Les textes des annonces sont transmis à l'IA comme **données non fiables**, jamais comme instructions.
- Chaque argument d'une note doit citer l'annonce ou une fiche référence identifiée, sinon « aucune preuve trouvée ».
- Un AO n'apparaît qu'une fois dans l'email ; aucune annonce n'est perdue (période = depuis la dernière exécution réussie, sources interrogées depuis la veille).
- Aucun poids n'est modifié automatiquement ; un no-go n'est pris en compte qu'avec sa raison ; alerte au-delà de 10 notes demandées par jour.
- Une configuration vide ou incomplète (onglet Filtres, Pondérations) arrête la veille avec une alerte, au lieu de produire un email vide ou des scores à zéro en silence.

## État au 30 septembre 2026

| Élément | État |
|---|---|
| Workflows 1, 2 et 4 | publiés, testés en conditions réelles |
| Workflow 3 (bilan mensuel) | configuré, non publié : adresse de l'associé à renseigner |
| Journal officiel (section Décideurs) | en attente de l'accès à l'API Légifrance (compte PISTE) |
| Première exécution planifiée (30/09, 7h30) | succès en 7 min : 349 annonces examinées, 69 nouvelles après pré-filtre, 23 « y aller », 10 notes rédigées, email envoyé ; relance de 8h30 arrêtée en 3 s comme prévu |
| Workflow 2 | testé sur une ligne de test : rappel de no-go reçu, 2 échéances créées, note produite en ~2 min |
| Coût par jour (ordre de grandeur, estimé) | ~4 à 10 appels Mistral pour le score + 10 notes à ~13 000 tokens ; ~12 exécutions n8n |

## Limites connues et arbitrages ouverts

Assumés et documentés dans la spec (section « Écarts assumés » et « Relecture hostile du 2026-09-30 ») :

- les notes automatiques sont limitées aux AO « y aller » parmi les 10 de l'email, tant que le seuil n'est pas calibré par le test chiffré ;
- le coût est **estimé** (≈ 4 caractères par token), pas mesuré ;
- les poids et le seuil du score sont **provisoires** ; le score est jugé encore généreux ;
- un doublon d'email reste possible si l'exécution s'interrompt dans les secondes qui séparent l'envoi de l'écriture dans le tableau ;
- l'alerte de panne passe par Gmail : si Gmail est la cause de la panne, elle ne part pas.

## Méthode

Le projet a été mené avec trois fiches de méthode réutilisables, versionnées dans [`skills/`](skills/), qui s'enchaînent :

1. [**interview**](skills/interview/SKILL.md) : cadrage par entretien, une question à la fois, jusqu'à une spécification vérifiable, puis exploration de ce qui existe déjà avant de figer le besoin. C'est ainsi que la spec métier a été produite.
2. [**hostile-review**](skills/hostile-review/SKILL.md) : relecture adversariale de la spec puis de la réalisation (la lettre contre l'esprit, contenus malveillants, dérive dans le temps, contradictions, exigences invérifiables, poids). Ses conclusions du 30/09 sont intégrées à la spec technique.
3. [**doubt-driven-dev**](skills/doubt-driven-dev/SKILL.md) : avant qu'une décision ne compte, tenter de la réfuter : test réel pour ce qui touche au monde extérieur (c'est ce qui a montré que le BOAMP publie aussi en journée), relecteur sans contexte pour le raisonnement.

Chaque fiche est un fichier Markdown autonome, applicable à tout projet, pas seulement aux automatisations.

## Contenu du dépôt

```
n8n/
  workflows/Sandbox/Veille AO · *.workflow.ts   # les 5 workflows (SDK n8n, TypeScript)
  config/                                       # configuration n8ncli
docs/
  specs/                                        # spec technique, décisions, relecture hostile
skills/                                         # méthode : interview, hostile-review, doubt-driven-dev
```

Les workflows sont exportés depuis n8n Cloud avec [`n8ncli`](https://www.npmjs.com/package/@workflows-accelerator/n8n-cli) (`n8ncli pull`). **Aucun secret n'est versionné** : les identifiants (Google, Gmail, Mistral) restent chiffrés dans n8n et les workflows ne font référence qu'à leur nom.

## Réinstaller sur une autre instance n8n

1. Installer `n8ncli` (Node.js ≥ 20) : `npm install -g @workflows-accelerator/n8n-cli`
2. `n8ncli init --url https://<instance>.app.n8n.cloud --access-token <jeton MCP>` (jeton : Settings → Instance-level MCP → Connect)
3. `n8ncli push` pour créer les workflows (procédure non encore éprouvée sur une instance vierge), puis dans n8n :
   - créer les identifiants Google Sheets, Google Drive, Google Docs, Gmail, Google Calendar et Mistral Cloud ;
   - lancer « 0 · Installation du tableau », puis reporter l'ID du tableur, du dossier des fiches références et du dossier des notes dans les nœuds concernés ;
   - publier **4** avant **1** et **2** (n8n exige qu'un sous-workflow soit publié avant ses appelants).

## Reste à faire (lot 1)

- Journal officiel (section Décideurs) : compte PISTE / API Légifrance en production, puis règle de conservation des données personnelles.
- Validation des poids et du seuil par un associé ; test chiffré (≥ 8/10 AO pertinents retrouvés, ≤ 3/10 faux positifs).
- Email de l'associé pour le bilan mensuel ; tableur clients complet.
- Avant élargissement à l'équipe : messagerie et agenda professionnels, validation du traitement des données des décideurs.
