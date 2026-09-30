# Réinstaller sur une autre instance n8n

Procédure pour recréer les cinq workflows « Veille AO » sur une nouvelle instance n8n Cloud à partir de ce dépôt.

1. Installer `n8ncli` (Node.js ≥ 20) : `npm install -g @workflows-accelerator/n8n-cli`
2. `n8ncli init --url https://<instance>.app.n8n.cloud --access-token <jeton MCP>` (jeton : Settings → Instance-level MCP → Connect)
3. `n8ncli push` pour créer les workflows (procédure non encore éprouvée sur une instance vierge), puis dans n8n :
   - créer les identifiants Google Sheets, Google Drive, Google Docs, Gmail, Google Calendar et Mistral Cloud ;
   - lancer « 0 · Installation du tableau », puis reporter l'ID du tableur, du dossier des fiches références et du dossier des notes dans les nœuds concernés ;
   - publier **4** avant **1** et **2** (n8n exige qu'un sous-workflow soit publié avant ses appelants).

Les identifiants ne sont jamais versionnés : ils restent chiffrés dans n8n, et les workflows n'y font référence que par leur nom.
