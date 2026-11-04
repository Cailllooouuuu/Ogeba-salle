# OGEBA Salle – application web pour téléphone

Version téléphone d'OGEBA Salle (réservation des salles, de la voiture et des congés), publiée par GitHub Pages.

- Adresse : https://cailllooouuuu.github.io/ogeba-salle/
- Connexion : dans OGEBA Salle sur le PC, bouton « Téléphone », puis QR code et code à 6 chiffres.
- Les données restent dans le cloud Supabase d'OGEBA. Ce dépôt ne contient que les pages, sans aucun secret :
  la clé `sb_publishable_…` d'app.js est une clé publique, et chaque appel est vérifié par le jeton du téléphone.

Fichiers : `index.html`, `app.js`, `style.css`, `sw.js` (hors connexion et notifications), `manifest.webmanifest`, `icones/`.
