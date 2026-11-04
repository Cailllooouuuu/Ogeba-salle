// OGEBA Salle — application web pour téléphone.
// Mêmes données que l'application Windows (Supabase) : planning, réservations, congés, notifications et agenda.
'use strict';

const SUPABASE = 'https://axadkutmrggmmtluiolo.supabase.co';
const CLE_API = 'sb_publishable_gmYgDG_Y8Q4jZvS_aMDq9w__oNBx11A'; // clé publique, faite pour être dans une page web
const VERSION = '1.4';
const HEURE_DEBUT = 7, HEURE_FIN = 20, PAS = 30;

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const JOURS_COURTS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
// Mêmes couleurs automatiques que l'application Windows (Theme.Palette).
const PALETTE = ['#6366F1', '#14B8A6', '#F43F5E', '#F59E0B', '#8B5CF6', '#0EA5E9', '#10B981', '#F97316'];
const REPETITIONS = ['Ne se répète pas', 'Tous les jours ouvrés (lun. – ven.)', 'Chaque semaine', 'Toutes les 2 semaines', 'Chaque mois'];
const RAPPELS = [[0, 'Aucun'], [5, '5 min avant'], [10, '10 min avant'], [15, '15 min avant'], [30, '30 min avant'], [60, '1 h avant'], [120, '2 h avant']];
const THEMES = {
  noel: ['🎄', '#b91c1c', '#15803d'], nouvelan: ['🎆', '#1e3a8a', '#7c3aed'], paques: ['🐣', '#f59e0b', '#ec4899'],
  muguet: ['🌿', '#15803d', '#65a30d'], memoire: ['🇫🇷', '#1e40af', '#b91c1c'], printemps: ['🌸', '#db2777', '#16a34a'],
  fetenationale: ['🎇', '#1d4ed8', '#dc2626'], ete: ['☀️', '#ea580c', '#f59e0b'], automne: ['🍂', '#9a3412', '#b45309'],
};

// ---------- Petits outils ----------
const $ = (s, r = document) => r.querySelector(s);
const memo = {
  lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  ecrire(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
};
function h(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const deux = n => String(n).padStart(2, '0');
const cleJour = d => d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate());
const texteHeure = d => deux(d.getHours()) + ':' + deux(d.getMinutes());
const versServeur = d => cleJour(d) + ' ' + texteHeure(d);
function lireDate(t) { // « 2026-11-04 10:00 » (heure locale de Paris)
  return new Date(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10), +t.slice(11, 13) || 0, +t.slice(14, 16) || 0);
}
function lireJour(t) { return new Date(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)); }
function debutJour(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function ajouterJours(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ajouterMois(d, n) { // comme DateTime.AddMonths : le 31 devient le dernier jour du mois
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  const dernier = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d.getDate(), dernier));
  return x;
}
function lundi(d) { const x = debutJour(d); const j = (x.getDay() + 6) % 7; return ajouterJours(x, -j); }
const memeJour = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const aujourdhui = () => debutJour(new Date());
const majuscule = t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
function texteJour(d, court) {
  return court ? JOURS_COURTS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS_COURTS[d.getMonth()]
    : JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
}
function texteJourRelatif(d) {
  const ecart = Math.round((debutJour(d) - aujourdhui()) / 864e5);
  if (ecart === 0) return "Aujourd'hui";
  if (ecart === 1) return 'Demain';
  if (ecart === -1) return 'Hier';
  return majuscule(texteJour(d)) + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
}
function nouvelId() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const o = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(o, b => b.toString(16).padStart(2, '0')).join('');
}
function initiales(nom) {
  const mots = String(nom || '?').trim().split(/\s+/).filter(Boolean);
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}
const prenom = nom => String(nom || '').trim().split(/\s+/)[0] || nom;
function simplifier(t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '').toLowerCase(); }
function couleurAuto(nom) { // Theme.CouleurAuto
  let n = 0; const t = String(nom || '').toLowerCase();
  for (let i = 0; i < t.length; i++) n = (Math.imul(n, 31) + t.charCodeAt(i)) | 0;
  return PALETTE[((n % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
function melanger(hex, blanc) { // éclaircit une couleur vers le blanc (0 à 1)
  const c = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!c) return hex;
  const v = parseInt(c[1], 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
  const m = x => Math.round(x + (255 - x) * blanc);
  return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
}
const estIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const estAndroid = /Android/i.test(navigator.userAgent);
const installee = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const ICONES = {
  gauche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  droite: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  planning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M7.5 13.5h3M13.5 13.5h3M7.5 17h3"/></svg>',
  liste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6"/></svg>',
  reglages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  fermer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  horloge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  lieu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  personnes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.8 3 2.6 3.5 5.2"/></svg>',
  texte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 11h16M4 16h10"/></svg>',
  repeter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M8 12.5l2.8 2.7L16 10"/></svg>',
  attention: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5L2.5 20h19L12 3.5z"/><path d="M12 10v4.5M12 17.5v.5"/></svg>',
  non: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M9 9l6 6M15 9l-6 6"/></svg>',
  coche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cloche: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
  agenda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 13v5M9.5 15.5h5"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.4-1.9-.4-1.2.4-2.6 1.8-2.6H17a4 4 0 0 0 4-4c0-5.2-4-9.5-9-9.5z"/><circle cx="7.5" cy="11" r="1.3"/><circle cx="10.5" cy="7" r="1.3"/><circle cx="15" cy="7.5" r="1.3"/></svg>',
  telephone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
  sortie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4"/></svg>',
  partager: '<svg class="partager" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/></svg>',
  copier: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
  actualiser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  google: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9.1L6.4 14z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.7 9.4 5.9 12 5.9z"/></svg>',
  pomme: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5a4.3 4.3 0 0 0-3.4-1.8c-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3a10 10 0 0 0 1.3-2.6 4 4 0 0 1-2.5-3.7zM14.1 5.8A4 4 0 0 0 15 2.9a4.2 4.2 0 0 0-2.7 1.4 3.9 3.9 0 0 0-1 2.8 3.5 3.5 0 0 0 2.8-1.3z"/></svg>',
  outlook: '<svg viewBox="0 0 24 24"><rect x="8" y="4" width="14" height="16" rx="2" fill="#28A8EA"/><rect x="2" y="6.5" width="11" height="11" rx="1.8" fill="#0A64AD"/><ellipse cx="7.5" cy="12" rx="2.6" ry="3.2" fill="none" stroke="#fff" stroke-width="1.6"/></svg>',
  installer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
};

// ---------- État ----------
const etat = {
  jeton: memo.lire('jeton'),
  d: null,              // données préparées
  enLigne: navigator.onLine,
  majLe: null,
  onglet: 'planning',
  vue: memo.lire('vue') || 'jour',
  jour: aujourdhui(),
  filtre: memo.lire('filtre') || '',
  modeCouleurs: memo.lire('modeCouleurs') || '', // '' : comme sur le PC ; sinon 'salle' ou 'personne'
  weekend: memo.lire('weekend') === 'oui',
  installation: null,   // proposition d'installation d'Android (beforeinstallprompt)
  lienAgenda: null,
  erreurConnexion: '',
};

// ---------- Serveur ----------
async function rpc(fonction, parametres) {
  let r;
  try {
    r = await fetch(SUPABASE + '/rest/v1/rpc/' + fonction, {
      method: 'POST',
      headers: { apikey: CLE_API, 'Content-Type': 'application/json' },
      body: JSON.stringify(parametres || {}),
    });
  } catch (e) {
    const erreur = new Error('Pas de connexion internet.');
    erreur.horsLigne = true;
    throw erreur;
  }
  const texte = await r.text();
  let corps = null;
  try { corps = texte ? JSON.parse(texte) : null; } catch (e) { corps = texte; }
  if (!r.ok) {
    const erreur = new Error((corps && corps.message) || ('Erreur ' + r.status));
    erreur.code = corps && corps.code;
    if (erreur.code === '28P01' && fonction.indexOf('ogeba_mobile_') === 0 && fonction !== 'ogeba_mobile_lier') deconnecterIci('Ce téléphone a été déconnecté. Demandez un nouveau code sur le PC.');
    throw erreur;
  }
  return corps;
}

function preparer(brut) {
  const d = {
    version: brut.version,
    salles: brut.salles || [],
    organisateurs: brut.organisateurs || [],
    utilisateurs: brut.utilisateurs || [],
    anniversaires: brut.anniversaires || [],
    moi: brut.moi || { nom: memo.lire('nom') || '', email: '' },
    reglages: brut.reglages || { rappel: 15, tout: false },
    clePush: brut.cle_push || null,
    jours: new Map(),
    reservations: [],
  };
  d.salleDe = new Map(d.salles.map(s => [s.nom.toLowerCase(), s]));
  d.couleurPerso = new Map(d.organisateurs.filter(o => o.couleur).map(o => [o.nom.toLowerCase(), o.couleur]));
  // Couleurs que la personne a choisies pour elle-même sur son PC (Personnaliser) et son mode « Colorer par ».
  const pc = brut.couleurs || {};
  const carte = o => new Map(Object.keys(o || {}).map(k => [k.trim().toLowerCase(), o[k]]));
  d.mesCouleurs = { mode: pc.mode || null, salles: carte(pc.salles), personnes: carte(pc.personnes) };
  d.nomParEmail = new Map(d.utilisateurs.filter(u => u.email).map(u => [u.email.trim().toLowerCase(), u.nom]));
  d.emailMoi = (d.moi.email || '').trim().toLowerCase();
  for (const j of brut.jours || []) d.jours.set(j.jour, j);
  for (const r of brut.reservations || []) {
    r.d = lireDate(r.debut);
    r.f = lireDate(r.fin);
    r.conge = r.salle.trim().toLowerCase() === 'congé';
    const s = d.salleDe.get(r.salle.toLowerCase());
    r.type = r.conge ? 'conge' : (s ? s.type : 'salle');
    d.reservations.push(r);
  }
  return d;
}

async function charger(silencieux) {
  try {
    const brut = await rpc('ogeba_mobile_lire', { p_jeton: etat.jeton });
    memo.ecrire('donnees', JSON.stringify(brut));
    memo.ecrire('majLe', String(Date.now()));
    memo.ecrire('nom', brut.moi && brut.moi.nom);
    etat.d = preparer(brut);
    etat.majLe = new Date();
    etat.enLigne = true;
    afficher();
    synchroniserNotifications();
  } catch (e) {
    if (e.horsLigne) { etat.enLigne = false; afficher(); }
    else if (e.code !== '28P01' && !silencieux) toast(e.message, 'erreur');
  }
}

let minuterie = null;
function surveiller() {
  clearInterval(minuterie);
  minuterie = setInterval(verifierVersion, 30000);
}
async function verifierVersion() {
  if (!etat.jeton || document.hidden) return;
  try {
    const v = await rpc('ogeba_mobile_version', { p_jeton: etat.jeton });
    if (!etat.enLigne) { etat.enLigne = true; afficher(); }
    if (!etat.d || v !== etat.d.version) await charger(true);
  } catch (e) {
    if (e.horsLigne && etat.enLigne) { etat.enLigne = false; afficher(); }
  }
}

// ---------- Règles de l'application Windows ----------
// Comme CouleursPerso : la couleur choisie par la personne sur son PC passe avant la couleur commune de l'équipe.
function couleurPersonne(nom) {
  const k = String(nom || '').trim().toLowerCase();
  return (etat.d && (etat.d.mesCouleurs.personnes.get(k) || etat.d.couleurPerso.get(k))) || couleurAuto(nom);
}
function couleurSalle(nom) {
  const k = String(nom || '').trim().toLowerCase();
  const perso = etat.d && etat.d.mesCouleurs.salles.get(k);
  if (perso) return perso;
  const s = etat.d && etat.d.salleDe.get(k);
  return (s && s.couleur) || couleurAuto(nom);
}
// Le mode du PC (« Colorer par » salle ou organisateur), sauf si la personne en a choisi un autre sur le téléphone.
const modePC = () => (etat.d && etat.d.mesCouleurs.mode === 'organisateur' ? 'personne' : 'salle');
const modeCouleur = () => (etat.modeCouleurs === 'salle' || etat.modeCouleurs === 'personne' ? etat.modeCouleurs : modePC());
// Filtres du planning, comme la légende du PC : une salle (mode Salles), ou une personne « @p:Nom » (mode Personnes), ou « @moi ».
const personneChoisie = () => (etat.filtre && etat.filtre.indexOf('@p:') === 0 ? etat.filtre.slice(3) : null);
const personneFiltree = () => (etat.filtre === '@moi' ? etat.d.moi.nom : personneChoisie());
const salleFiltree = () => (etat.filtre && etat.filtre[0] !== '@' ? etat.filtre : null);
function passeFiltre(r) {
  if (!etat.filtre) return true;
  if (etat.filtre === '@moi') return meConcerne(r);
  const p = personneChoisie();
  return p ? concerne(r, p, emailDe(p).toLowerCase()) : memeNom(r.salle, etat.filtre);
}
// Un filtre qui ne va pas avec le mode (une salle en mode Personnes…) est retiré, comme sur le PC quand on change de mode.
function filtreSelonMode() {
  const parPersonne = modeCouleur() === 'personne';
  if ((parPersonne && salleFiltree()) || (!parPersonne && personneChoisie())) { etat.filtre = ''; memo.ecrire('filtre', ''); }
}
function changerModeCouleurs(mode, depuisBascule) {
  // Depuis la bascule du planning, revenir au mode du PC, c'est de nouveau suivre le PC.
  etat.modeCouleurs = depuisBascule && mode === modePC() ? '' : mode;
  memo.ecrire('modeCouleurs', etat.modeCouleurs || null);
  filtreSelonMode();
  afficher();
}
// Comme la légende du PC : les personnes qui ont réservé ces deux derniers mois ou qui ont une réunion à venir, et les collègues qui ont un compte.
function personnesLegende() {
  const depuis = ajouterJours(aujourdhui(), -60), vus = new Map();
  const noms = etat.d.reservations.filter(r => !r.conge && r.f >= depuis).map(r => r.organisateur).concat(etat.d.utilisateurs.map(u => u.nom));
  for (const n of noms) { const t = String(n || '').trim(); if (t && !vus.has(t.toLowerCase())) vus.set(t.toLowerCase(), t); }
  return [...vus.values()].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
}
const estVehicule = nom => { const s = etat.d.salleDe.get(String(nom || '').toLowerCase()); return !!s && s.type === 'vehicule'; };
const memeNom = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const adresses = p => String(p || '').split(/[;, ]+/).map(a => a.trim()).filter(a => a.indexOf('@') > 0);
function concerne(r, nom, email) {
  if (memeNom(r.organisateur, nom)) return true;
  if (!email) return false;
  return adresses(r.participants).some(a => a.toLowerCase() === email);
}
const estMoi = r => memeNom(r.organisateur, etat.d.moi.nom);
const meConcerne = r => concerne(r, etat.d.moi.nom, etat.d.emailMoi);
function invites(r) { // [{nom, email, compte}]
  return adresses(r.participants).map(a => {
    const nom = etat.d.nomParEmail.get(a.toLowerCase());
    return { nom: nom || a.split('@')[0], email: a, compte: !!nom };
  }).filter(p => !memeNom(p.nom, r.organisateur));
}
function emailDe(nom) { const u = etat.d.utilisateurs.find(x => memeNom(x.nom, nom)); return u && u.email ? u.email.trim() : ''; }

// Une réunion et sa voiture forment un seul événement.
function evenements(debut, fin) {
  const groupes = new Map();
  for (const r of etat.d.reservations) {
    if (r.conge || presence(r) || r.f <= debut || r.d >= fin) continue;
    const cle = r.groupe || r.id;
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(r);
  }
  const liste = [];
  for (const [cle, lignes] of groupes) {
    const r = lignes.find(x => !estVehicule(x.salle)) || lignes[0];
    liste.push({ cle, r, lignes, d: r.d, f: r.f, lieux: [...new Set(lignes.map(x => x.salle))] });
  }
  return liste.filter(filtrer).sort((a, b) => a.d - b.d || b.f - a.f);
}
function filtrer(ev) {
  return ev.lignes.some(passeFiltre);
}
function couleurDe(ev) {
  if (modeCouleur() !== 'personne') return couleurSalle(ev.r.salle);
  // La personne choisie donne sa couleur à toutes ses réunions, celles qu'elle organise comme celles où elle est invitée (CouleurPlanning).
  return couleurPersonne(personneFiltree() || ev.r.organisateur);
}
function melange(ev) { // couleurs de l'organisateur et des invités (mode Personnes)
  if (modeCouleur() !== 'personne' || personneFiltree()) return null;
  const c = [couleurPersonne(ev.r.organisateur)];
  for (const p of invites(ev.r)) if (p.compte) { const x = couleurPersonne(p.nom); if (c.indexOf(x) < 0) c.push(x); }
  return c.length > 1 ? c.slice(0, 5) : null;
}
function jourSpecial(d) { return etat.d.jours.get(cleJour(d)); }
function bloque(d) { const j = jourSpecial(d); return !!(j && j.bloque); }
function congesDu(d) {
  const debut = debutJour(d), fin = ajouterJours(debut, 1);
  return etat.d.reservations.filter(r => r.conge && r.d < fin && r.f > debut);
}
// Télétravail, ou longue journée sur un chantier, sans invités : une simple présence, montrée dans le bandeau du jour.
// Un rendez-vous sur site (avec des invités, ou de moins de 6 h) reste une réunion dans le planning, comme sur le PC.
function presence(r) {
  if (r.type !== 'site') return false;
  if (adresses(r.participants).length) return false;
  return /t[ée]l[ée]travail/i.test(r.salle) || r.f - r.d >= 6 * 36e5;
}
function sitesDu(d) {
  const debut = debutJour(d), fin = ajouterJours(debut, 1);
  return etat.d.reservations.filter(r => presence(r) && r.d < fin && r.f > debut)
    .filter(passeFiltre);
}
function anniversairesDu(d) {
  return etat.d.anniversaires.filter(a => {
    const dernier = new Date(d.getFullYear(), a.mois, 0).getDate();
    return a.mois === d.getMonth() + 1 && Math.min(a.jour, dernier) === d.getDate();
  }).map(a => {
    const compte = etat.d.utilisateurs.find(u => simplifier(u.nom) === simplifier(a.nom));
    return compte ? compte.nom : a.nom;
  });
}
// Anniversaires à montrer ce jour-là : sans le week-end, ceux du samedi et du dimanche passent au vendredi, comme sur le PC.
// Avec une personne choisie dans les filtres, seulement le sien.
function fetesDu(d) {
  const liste = anniversairesDu(d).map(nom => ({ nom, quand: '' }));
  if (!etat.weekend && d.getDay() === 5) {
    for (const [decalage, quand] of [[1, ' (sam.)'], [2, ' (dim.)']]) for (const nom of anniversairesDu(ajouterJours(d, decalage))) liste.push({ nom, quand });
  }
  const choisie = personneChoisie();
  return liste.filter(f => !choisie || memeNom(f.nom, choisie));
}
function partConge(r, d) {
  const debut = debutJour(d), midi = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate(), 12), fin = ajouterJours(debut, 1);
  const matin = r.d < midi && r.f > debut, apres = r.f > midi && r.d < fin;
  if (matin && !apres) return 'matin';
  if (apres && !matin) return 'après-midi';
  return '';
}
function joursConge(debut, fin) { // jours ouvrés, par demi-journée, sans week-end ni jour férié
  let n = 0;
  for (let t = new Date(debut); t < fin; t = new Date(t.getTime() + 12 * 3600e3)) {
    const j = t.getDay();
    if (j !== 0 && j !== 6 && !(jourSpecial(t) && jourSpecial(t).ferie)) n += 0.5;
  }
  return n;
}
function periodeConge(r) {
  const finJour = r.f.getHours() === 0 && r.f.getMinutes() === 0 ? ajouterJours(r.f, -1) : r.f;
  const debutTxt = texteJour(r.d, true) + (r.d.getHours() === 12 ? ' après-midi' : '');
  const finTxt = texteJour(finJour, true) + (r.f.getHours() === 12 ? ' midi' : '');
  if (memeJour(r.d, finJour)) {
    const part = r.d.getHours() === 12 ? ' après-midi' : (r.f.getHours() === 12 ? ' matin' : '');
    return 'le ' + texteJour(r.d, true) + part;
  }
  return 'du ' + debutTxt + ' au ' + finTxt;
}
function typeRepetition(serie) { const m = /^(\d+)-/.exec(serie || ''); return m ? +m[1] : 0; }
function debutsSerie(premier, rep, jusqua) { // Reservation.Debuts
  const debuts = [premier];
  if (!rep) return debuts;
  const limite = ajouterJours(debutJour(jusqua), 1);
  for (let i = 1; debuts.length < 260; i++) {
    let d;
    if (rep === 1) d = ajouterJours(premier, i);
    else if (rep === 2) d = ajouterJours(premier, 7 * i);
    else if (rep === 3) d = ajouterJours(premier, 14 * i);
    else d = ajouterMois(premier, i);
    if (d >= limite) break;
    if (rep === 1 && (d.getDay() === 0 || d.getDay() === 6)) continue;
    debuts.push(d);
  }
  return debuts;
}
function estPartage(salle) { const s = etat.d.salleDe.get(String(salle).toLowerCase()); return String(salle).trim().toLowerCase() === 'congé' || (!!s && s.type === 'site'); }
function occupants(salle, d, f, ignorer) {
  if (estPartage(salle)) return [];
  return etat.d.reservations.filter(r => r.exclusif !== false && !r.conge && memeNom(r.salle, salle) && r.d < f && d < r.f && !(ignorer && ignorer.has(r.id)));
}

// ---------- Affichage ----------
function afficher() {
  const app = $('#app');
  if (!etat.jeton) { app.innerHTML = ecranConnexion(); preparerConnexion(); return; }
  if (!etat.d) { app.innerHTML = '<div class="chargement"><div class="roue"></div></div>'; return; }
  const defilement = window.scrollY;
  let contenu;
  if (etat.onglet === 'planning') contenu = pagePlanning();
  else if (etat.onglet === 'mes') contenu = pageMesReunions();
  else contenu = pageReglages();
  app.innerHTML = '<div class="appli">' + contenu + '</div>' + barreOnglets() +
    (etat.onglet === 'reglages' ? '' : '<button class="fab" data-action="reserver">' + ICONES.plus + 'Réserver</button>');
  if (etat.onglet === 'planning') apresPlanning(defilement);
}

function barreOnglets() {
  const maintenant = new Date();
  const aVenir = new Set(etat.d.reservations.filter(r => !r.conge && r.f >= maintenant && r.d < ajouterJours(aujourdhui(), 1) && meConcerne(r)).map(r => r.groupe || r.id)).size;
  const b = (id, icone, texte, extra) => '<button class="' + (etat.onglet === id ? 'actif' : '') + '" data-action="onglet" data-onglet="' + id + '"><span class="compteur">' + icone + (extra || '') + '</span>' + texte + '</button>';
  return '<nav class="onglets">' + b('planning', ICONES.planning, 'Planning') + b('mes', ICONES.liste, 'Mes réunions', aVenir ? '<em>' + aVenir + '</em>' : '') + b('reglages', ICONES.reglages, 'Réglages') + '</nav>';
}

function bandeauReseau() {
  if (etat.enLigne) return '';
  const t = etat.majLe ? ' · données de ' + texteHeure(etat.majLe) : '';
  return '<div class="etat-reseau">Hors connexion' + h(t) + ' — la réservation reviendra avec le réseau.</div>';
}

function joursAffiches() {
  const l = lundi(etat.jour);
  const n = etat.weekend ? 7 : 5;
  return Array.from({ length: n }, (_, i) => ajouterJours(l, i));
}

function pagePlanning() {
  const jours = joursAffiches();
  const titre = etat.vue === 'jour' ? majuscule(texteJour(etat.jour)) : 'Semaine du ' + jours[0].getDate() + (jours[0].getMonth() !== jours[jours.length - 1].getMonth() ? ' ' + MOIS_COURTS[jours[0].getMonth()] : '') + ' au ' + texteJour(jours[jours.length - 1]).replace(/^\S+ /, '');
  const estAujourdhui = jours.some(j => memeJour(j, aujourdhui())) && (etat.vue === 'semaine' || memeJour(etat.jour, aujourdhui()));
  let html = '<header class="entete"><div class="entete-ligne">' +
    '<img class="entete-logo" src="icones/icone-192.png" alt="">' +
    '<div class="entete-titre"><b>' + h(MOIS[etat.jour.getMonth()].replace(/^./, c => c.toUpperCase()) + ' ' + etat.jour.getFullYear()) + '</b><span>' + h(titre) + '</span></div>' +
    (estAujourdhui ? '' : '<button class="bouton-aujourdhui" data-action="aujourdhui" aria-label="Revenir à aujourd\'hui"><span>' + aujourdhui().getDate() + '</span></button>') +
    '<div class="bascule"><button class="' + (etat.vue === 'jour' ? 'actif' : '') + '" data-action="vue" data-vue="jour">Jour</button><button class="' + (etat.vue === 'semaine' ? 'actif' : '') + '" data-action="vue" data-vue="semaine">Sem.</button></div></div>';

  // Bande des jours (en vue semaine, les en-têtes de colonnes en tiennent lieu)
  if (etat.vue === 'jour') html += '<div class="semaine"><button class="fleche" data-action="semaine" data-sens="-1" aria-label="Semaine précédente">' + ICONES.gauche + '</button>' +
    '<div class="jours" style="grid-template-columns:repeat(' + jours.length + ',1fr)">';
  if (etat.vue === 'jour') for (const j of jours) {
    const sp = jourSpecial(j);
    const mes = etat.d.reservations.some(r => !r.conge && r.d < ajouterJours(j, 1) && r.f > j && meConcerne(r));
    const conge = congesDu(j).some(r => estMoi(r));
    const deco = sp && sp.bloque ? (THEMES[sp.theme] || ['⛔'])[0] : (fetesDu(j).length ? '🎂' : '');
    html += '<button class="jour-pastille' + (etat.vue === 'jour' && memeJour(j, etat.jour) ? ' choisi' : '') + (memeJour(j, aujourdhui()) ? ' aujourdhui' : '') + (sp && sp.bloque ? ' ferie' : '') + '" data-action="jour" data-jour="' + cleJour(j) + '">' +
      JOURS_COURTS[j.getDay()].replace('.', '') + '<b>' + j.getDate() + '</b>' +
      (deco ? '<span class="deco">' + deco + '</span>' : '') +
      '<span class="points">' + (mes ? '<i></i>' : '') + (conge ? '<i style="background:#16a34a"></i>' : '') + '</span></button>';
  }
  if (etat.vue === 'jour') html += '</div><button class="fleche" data-action="semaine" data-sens="1" aria-label="Semaine suivante">' + ICONES.droite + '</button></div>';
  else html += '<div style="height:10px"></div>';

  // Vue et filtres
  // Comme sur le PC : la bascule Salles / Personnes colore le planning et change la liste qui suit.
  filtreSelonMode();
  const parPersonne = modeCouleur() === 'personne';
  html += '<div class="filtres"><div class="bascule"><button class="' + (parPersonne ? '' : 'actif') + '" data-action="modeCouleurs" data-mode="salle">Salles</button><button class="' + (parPersonne ? 'actif' : '') + '" data-action="modeCouleurs" data-mode="personne">Personnes</button></div>' +
    '<button class="puce' + (!etat.filtre ? ' actif' : '') + '" data-action="filtre" data-filtre="">Tout</button>' +
    '<button class="puce' + (etat.filtre === '@moi' ? ' actif' : '') + '" data-action="filtre" data-filtre="@moi"><i style="background:' + couleurPersonne(etat.d.moi.nom) + '"></i>Mes réunions</button>';
  if (parPersonne) {
    for (const n of personnesLegende()) if (!memeNom(n, etat.d.moi.nom)) html += '<button class="puce' + (memeNom(personneChoisie(), n) ? ' actif' : '') + '" data-action="filtre" data-filtre="@p:' + h(n) + '"><i style="background:' + h(couleurPersonne(n)) + '"></i>' + h(n) + '</button>';
  } else {
    for (const s of etat.d.salles) html += '<button class="puce' + (memeNom(etat.filtre, s.nom) ? ' actif' : '') + '" data-action="filtre" data-filtre="' + h(s.nom) + '"><i style="background:' + h(couleurSalle(s.nom)) + '"></i>' + h(s.nom) + '</button>';
  }
  html += '</div></header>' + bandeauReseau();

  html += etat.vue === 'jour' ? vueJour() : vueSemaine(jours);
  return html;
}

function bandeauJour(d) {
  let html = '';
  const sp = jourSpecial(d);
  if (sp && (sp.bloque || sp.titre)) {
    const t = THEMES[sp.theme] || ['⛔', '#64748b', '#94a3b8'];
    html += '<div class="fete" style="background:linear-gradient(120deg,' + t[1] + ',' + t[2] + ')"><span class="emoji">' + t[0] + '</span><div><b>' + h(sp.titre || 'Jour bloqué') + '</b><span>' + (sp.ferie ? 'Jour férié · pas de réservation' : sp.bloque ? 'Pas de réservation ce jour-là' : '') + '</span></div></div>';
  }
  const etiquettes = [];
  const choisie = personneChoisie();
  for (const f of fetesDu(d)) etiquettes.push('<span class="etiquette anniv"><span>🎂</span><span>Anniversaire de <b>' + h(f.nom) + '</b>' + h(f.quand) + '</span></span>');
  for (const r of congesDu(d).filter(r => !choisie || memeNom(r.organisateur, choisie)).sort((a, b) => a.organisateur.localeCompare(b.organisateur))) {
    const part = partConge(r, d);
    etiquettes.push('<button class="etiquette" data-action="details" data-id="' + h(r.id) + '"><span class="avatar" style="background:' + couleurPersonne(r.organisateur) + '">' + h(initiales(r.organisateur)) + '</span><span>' + h(r.organisateur) + '</span><small>🌴 Congé' + (part ? ' (' + part + ')' : '') + '</small></button>');
  }
  for (const r of sitesDu(d)) {
    const journee = r.d <= new Date(d.getFullYear(), d.getMonth(), d.getDate(), HEURE_DEBUT + 1) && r.f >= new Date(d.getFullYear(), d.getMonth(), d.getDate(), HEURE_FIN - 2);
    const emoji = /t[ée]l[ée]travail/i.test(r.salle) ? '🏠' : '🏗️';
    etiquettes.push('<button class="etiquette" data-action="details" data-id="' + h(r.id) + '"><span class="avatar" style="background:' + couleurPersonne(r.organisateur) + '">' + h(initiales(r.organisateur)) + '</span><span>' + h(r.organisateur) + '</span><small>' + emoji + ' ' + h(r.salle) + (r.objet && !/t[ée]l[ée]travail/i.test(r.objet) ? ' · ' + h(r.objet) : '') + (journee ? '' : ' · ' + texteHeure(r.d) + '–' + texteHeure(r.f)) + '</small></button>');
  }
  if (etiquettes.length) html += '<div class="etiquettes">' + etiquettes.join('') + '</div>';
  return html ? '<div class="bandeau">' + html + '</div>' : '';
}

function disposer(evs) { // place côte à côte les réunions qui se chevauchent
  let groupe = [], finMax = 0;
  const fermer = () => {
    const colonnes = [];
    for (const e of groupe) {
      let i = colonnes.findIndex(f => f <= e.d);
      if (i < 0) { i = colonnes.length; colonnes.push(0); }
      colonnes[i] = +e.f;
      e.col = i;
    }
    for (const e of groupe) e.nbCol = colonnes.length;
    groupe = [];
    finMax = 0;
  };
  for (const e of evs) {
    if (groupe.length && +e.d >= finMax) fermer();
    groupe.push(e);
    finMax = Math.max(finMax, +e.f);
  }
  if (groupe.length) fermer();
}

function blocEvenement(ev, jour, hauteurHeure, compact) {
  const debut = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), HEURE_DEBUT);
  const fin = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate(), HEURE_FIN);
  const d = ev.d < debut ? debut : ev.d, f = ev.f > fin ? fin : ev.f;
  if (f <= d) return '';
  const haut = (d - debut) / 36e5 * hauteurHeure, hauteur = Math.max(18, (f - d) / 36e5 * hauteurHeure - 2);
  // En vue jour, côte à côte ; en vue semaine (colonnes étroites), en cascade pour garder les titres lisibles.
  const pas = compact && ev.nbCol > 1 ? Math.min(28, 56 / (ev.nbCol - 1)) : 0;
  const gauche = compact ? ev.col * pas : ev.col * 100 / ev.nbCol, largeur = compact ? 100 - gauche : 100 / ev.nbCol;
  const c = couleurDe(ev), m = melange(ev);
  const fond = m ? 'linear-gradient(135deg,' + m.map(x => melanger(x, 0.72)).join(',') + ')' : melanger(c, 0.8);
  const barre = m ? 'linear-gradient(' + m.map((x, i) => x + ' ' + (i * 100 / m.length) + '% ' + ((i + 1) * 100 / m.length) + '%').join(',') + ')' : c;
  const projet = ev.r.objet && ev.r.objet.trim() ? ev.r.objet : ev.r.salle;
  const lieux = ev.lieux.map(l => estVehicule(l) ? '🚗 ' + l.replace(/^voiture\s+/i, '') : estPartage(l) ? (/t[ée]l[ée]travail/i.test(l) ? '🏠 ' : '🏗️ ') + l : l).join(' + ');
  const court = hauteur < 40;
  let html = '<button class="evt' + (court ? ' court' : '') + (pas && ev.col ? ' empile' : '') + (meConcerne(ev.r) ? ' moi' : '') + '" data-action="details" data-id="' + h(ev.r.id) + '" style="top:' + haut.toFixed(1) + 'px;height:' + hauteur.toFixed(1) + 'px;left:calc(' + gauche.toFixed(2) + '% + 2px);width:calc(' + largeur.toFixed(2) + '% - 4px);z-index:' + (2 + ev.col) + ';background:' + fond + ';--barre:' + barre + '">';
  html += '<b>' + h(projet) + '</b>';
  if (compact) html += '<span class="meta">' + texteHeure(ev.d) + '</span>';
  else {
    html += '<span class="meta">' + texteHeure(ev.d) + '–' + texteHeure(ev.f) + ' · ' + h(lieux) + '</span>';
    if (hauteur > 58) html += '<span class="meta">' + h(ev.r.organisateur) + '</span>';
    const p = invites(ev.r);
    if (hauteur > 76 && p.length) html += '<span class="invites">' + p.slice(0, 4).map(x => '<span><i style="background:' + (x.compte ? couleurPersonne(x.nom) : '#94a3b8') + '"></i>' + h(prenom(x.nom)) + '</span>').join('') + (p.length > 4 ? '<span>+' + (p.length - 4) + '</span>' : '') + '</span>';
  }
  return html + '</button>';
}

function grilleHeures() {
  let html = '';
  for (let hh = HEURE_DEBUT; hh <= HEURE_FIN; hh++) html += '<div class="heure-ligne"><span>' + deux(hh) + ':00</span></div>';
  return html;
}

function vueJour() {
  const d = etat.jour;
  const evs = evenements(d, ajouterJours(d, 1));
  disposer(evs);
  let html = bandeauJour(d);
  html += '<div class="grille-zone" data-zone="jour"><div class="grille" style="--heure:56px">' + grilleHeures() + '<div class="couche" data-action="vide" data-jour="' + cleJour(d) + '">';
  for (const ev of evs) html += blocEvenement(ev, d, 56, false);
  if (memeJour(d, aujourdhui())) html += ligneMaintenant(56);
  html += '</div></div></div>';
  if (!evs.length && !bloque(d)) html += '';
  return html;
}

function ligneMaintenant(hauteurHeure) {
  const m = new Date();
  const heures = m.getHours() + m.getMinutes() / 60;
  if (heures < HEURE_DEBUT || heures > HEURE_FIN) return '';
  return '<div class="maintenant" style="top:' + ((heures - HEURE_DEBUT) * hauteurHeure).toFixed(1) + 'px"></div>';
}

function vueSemaine(jours) {
  const HH = 44;
  const cols = 'repeat(' + jours.length + ',1fr)';
  let tete = '<div class="entetes-semaine" style="grid-template-columns:' + cols + ';top:0"><div class="nav-semaine"><button data-action="semaine" data-sens="-1" aria-label="Semaine précédente">' + ICONES.gauche + '</button><button data-action="semaine" data-sens="1" aria-label="Semaine suivante">' + ICONES.droite + '</button></div>';
  for (const j of jours) {
    const marques = [], mots = [];
    const sp = jourSpecial(j);
    // Sous le jour, le nom du férié (ou du jour bloqué) et les prénoms de ceux qui fêtent leur anniversaire.
    if (sp && (sp.bloque || sp.titre)) {
      const t = THEMES[sp.theme] || ['⛔', '#64748b', '#94a3b8'];
      mots.push('<span class="mot fete" style="background:linear-gradient(120deg,' + t[1] + ',' + t[2] + ')">' + t[0] + ' ' + h(sp.titre || 'Jour bloqué') + '</span>');
    }
    for (const f of fetesDu(j)) mots.push('<span class="mot anniv">🎂 ' + h(prenom(f.nom)) + (f.quand ? ' <small>' + h(f.quand.trim()) + '</small>' : '') + '</span>');
    const choisie = personneChoisie();
    const conges = congesDu(j).filter(r => !choisie || memeNom(r.organisateur, choisie));
    for (const r of conges.slice(0, 4)) marques.push('<i style="background:' + couleurPersonne(r.organisateur) + '" title="' + h(r.organisateur) + '"></i>');
    tete += '<button class="' + (memeJour(j, aujourdhui()) ? 'aujourdhui' : '') + '" data-action="jour" data-jour="' + cleJour(j) + '">' + JOURS_COURTS[j.getDay()].replace('.', '') + '<b>' + j.getDate() + '</b><span class="marques">' + marques.join('') + '</span>' + mots.join('') + '</button>';
  }
  tete += '</div>';
  let html = '<div class="grille-zone semaine-grille" data-zone="semaine">' + tete + '<div class="grille" style="--heure:' + HH + 'px">' + grilleHeures() + '<div class="colonnes" style="grid-template-columns:' + cols + ';left:52px">';
  for (const j of jours) {
    const evs = evenements(j, ajouterJours(j, 1));
    disposer(evs);
    html += '<div class="colonne' + (bloque(j) ? ' ferie' : '') + (memeJour(j, aujourdhui()) ? ' aujourdhui' : '') + '" data-action="vide" data-jour="' + cleJour(j) + '">';
    if (bloque(j)) html += '<span class="titre-ferie">' + h(jourSpecial(j).titre || 'Jour bloqué') + '</span>';
    for (const ev of evs) html += blocEvenement(ev, j, HH, true);
    if (memeJour(j, aujourdhui())) html += ligneMaintenant(HH);
    html += '</div>';
  }
  html += '</div></div></div>';
  return html;
}

function apresPlanning(defilement) {
  // À l'ouverture, on fait défiler jusqu'à l'heure actuelle (ou 8 h).
  if (!apresPlanning.fait) {
    apresPlanning.fait = true;
    const m = new Date();
    const heure = memeJour(etat.jour, aujourdhui()) ? Math.max(HEURE_DEBUT, m.getHours() - 1) : 8;
    const grille = $('.grille');
    if (grille) window.scrollTo(0, Math.max(0, grille.getBoundingClientRect().top + window.scrollY - $('.entete').offsetHeight - 10 + (heure - HEURE_DEBUT) * (etat.vue === 'jour' ? 56 : 44)));
  } else window.scrollTo(0, defilement);
  const tete = $('.entetes-semaine');
  if (tete) tete.style.top = $('.entete').offsetHeight + 'px';
  // La salle ou la personne choisie reste visible dans la liste qui défile.
  const filtres = $('.filtres'), actif = filtres && filtres.querySelector('.puce.actif');
  if (actif && actif.dataset.filtre) filtres.scrollLeft += actif.getBoundingClientRect().left - filtres.getBoundingClientRect().left - (filtres.clientWidth - actif.offsetWidth) / 2;
}

function pageMesReunions() {
  const maintenant = new Date();
  const miennes = etat.d.reservations.filter(r => !r.conge && !presence(r) && r.f >= maintenant && meConcerne(r));
  const groupes = new Map();
  for (const r of miennes) { const cle = r.groupe || r.id; if (!groupes.has(cle)) groupes.set(cle, []); groupes.get(cle).push(r); }
  const evs = [...groupes.values()].map(l => { const r = l.find(x => !estVehicule(x.salle)) || l[0]; return { r, lignes: l, d: r.d, f: r.f, lieux: [...new Set(l.map(x => x.salle))] }; }).sort((a, b) => a.d - b.d);
  const conges = etat.d.reservations.filter(r => r.conge && r.f >= maintenant && estMoi(r)).sort((a, b) => a.d - b.d);
  const sites = etat.d.reservations.filter(r => presence(r) && r.f >= maintenant && meConcerne(r)).sort((a, b) => a.d - b.d);
  let html = '<header class="entete"><div class="entete-ligne" style="padding-bottom:10px"><img class="entete-logo" src="icones/icone-192.png" alt=""><div class="entete-titre"><b>Mes réunions</b><span>' + h(etat.d.moi.nom) + '</span></div><button class="bouton-rond" data-action="actualiser" aria-label="Actualiser">' + ICONES.actualiser + '</button></div></header>' + bandeauReseau() + '<div class="page">';
  if (!evs.length && !conges.length && !sites.length) {
    html += '<div class="vide"><b>Rien de prévu</b>Les réunions que vous organisez, et celles où l\'on vous invite, apparaîtront ici.</div>';
  }
  let jourCourant = '';
  let ouvert = false;
  for (const ev of evs.slice(0, 120)) {
    const k = cleJour(ev.d);
    if (k !== jourCourant) {
      if (ouvert) html += '</div>';
      html += '<div class="titre-section">' + h(texteJourRelatif(ev.d)) + '</div><div class="carte">';
      jourCourant = k;
      ouvert = true;
    }
    html += ligneReunion(ev);
  }
  if (ouvert) html += '</div>';
  if (sites.length) {
    html += '<div class="titre-section">Télétravail et chantiers</div><div class="carte">';
    for (const r of sites.slice(0, 40)) html += '<button class="ligne-reunion" data-action="details" data-id="' + h(r.id) + '"><span class="barre" style="background:' + couleurSalle(r.salle) + '"></span><span class="infos"><b>' + h(r.salle) + (r.objet && r.objet !== r.salle ? ' · ' + h(r.objet) : '') + '</b><span>' + h(majuscule(texteJour(r.d, true))) + ' · ' + texteHeure(r.d) + '–' + texteHeure(r.f) + (estMoi(r) ? '' : ' · avec ' + h(r.organisateur)) + '</span></span></button>';
    html += '</div>';
  }
  if (conges.length) {
    html += '<div class="titre-section">Mes congés</div><div class="carte">';
    for (const r of conges) html += '<button class="ligne-reunion" data-action="details" data-id="' + h(r.id) + '"><span class="barre" style="background:#16a34a"></span><span class="infos"><b>🌴 Congé</b><span>' + h(majuscule(periodeConge(r))) + ' · ' + String(joursConge(r.d, r.f)).replace('.', ',') + ' j ouvré' + (joursConge(r.d, r.f) > 1 ? 's' : '') + '</span></span></button>';
    html += '</div>';
  }
  return html + '</div>';
}

function ligneReunion(ev) {
  const c = couleurDe(ev);
  const moi = estMoi(ev.r);
  const lieux = ev.lieux.join(' + ');
  return '<button class="ligne-reunion" data-action="details" data-id="' + h(ev.r.id) + '"><span class="barre" style="background:' + c + '"></span>' +
    '<span class="heures"><b>' + texteHeure(ev.d) + '</b><span>' + texteHeure(ev.f) + '</span></span>' +
    '<span class="infos"><b>' + h(ev.r.objet || ev.r.salle) + '</b><span>' + h(lieux) + '</span><span>' + (moi ? '<span class="badge">Organisateur</span>' : '<span class="badge invite">Invité par ' + h(prenom(ev.r.organisateur)) + '</span>') + (typeRepetition(ev.r.serie) ? ' · répétée' : '') + '</span></span></button>';
}

function pageReglages() {
  const d = etat.d;
  const permission = 'Notification' in window ? Notification.permission : 'indisponible';
  const pushPossible = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const actives = memo.lire('push') === 'oui' && permission === 'granted';
  let html = '<header class="entete"><div class="entete-ligne" style="padding-bottom:10px"><img class="entete-logo" src="icones/icone-192.png" alt=""><div class="entete-titre"><b>Réglages</b><span>OGEBA Salle sur téléphone</span></div></div></header>' + bandeauReseau() + '<div class="page">';
  html += '<div class="carte"><div class="profil"><span class="avatar grand" style="background:' + couleurPersonne(d.moi.nom) + '">' + h(initiales(d.moi.nom)) + '</span><div><b>' + h(d.moi.nom) + '</b><span>' + h(d.moi.email || 'Adresse e-mail à renseigner sur le PC (Mon compte)') + '</span></div></div></div>';

  if (!installee()) {
    html += '<div class="titre-section">Écran d\'accueil</div><div class="carte">';
    html += '<button class="reglage" data-action="installer"><span class="icone">' + ICONES.installer + '</span><span class="texte"><b>Installer l\'application</b><span>' + (estIOS ? 'Partager, puis « Sur l\'écran d\'accueil »' : 'Une icône OGEBA Salle sur l\'écran d\'accueil') + '</span></span><span class="chevron">' + ICONES.droite + '</span></button></div>';
  }

  html += '<div class="titre-section">Notifications</div><div class="carte">';
  if (!pushPossible) {
    html += '<div class="reglage"><span class="icone">' + ICONES.cloche + '</span><span class="texte"><b>Notifications indisponibles ici</b><span>' + (estIOS && !installee() ? 'Sur iPhone, installez d\'abord l\'application sur l\'écran d\'accueil (iOS 16.4 ou plus), puis ouvrez-la depuis son icône.' : 'Ce navigateur ne permet pas les notifications. Essayez avec Chrome ou Safari.') + '</span></span></div>';
  } else {
    html += '<label class="reglage"><span class="icone">' + ICONES.cloche + '</span><span class="texte"><b>Recevoir les notifications</b><span>' + (permission === 'denied' ? 'Bloquées : autorisez-les dans les réglages du téléphone' : actives ? 'Activées sur ce téléphone' : 'Invitations, changements et rappels') + '</span></span><span class="interrupteur"><input type="checkbox" data-change="push"' + (actives ? ' checked' : '') + (permission === 'denied' ? ' disabled' : '') + '><span></span></span></label>';
    html += '<label class="reglage"><span class="icone">' + ICONES.personnes + '</span><span class="texte"><b>Me prévenir de</b><span>' + (d.reglages.tout ? 'Toutes les réservations de l\'équipe' : 'Ce qui me concerne') + '</span></span><select data-change="tout"><option value="non"' + (d.reglages.tout ? '' : ' selected') + '>Ce qui me concerne</option><option value="oui"' + (d.reglages.tout ? ' selected' : '') + '>Toute l\'équipe</option></select></label>';
    html += '<label class="reglage"><span class="icone">' + ICONES.horloge + '</span><span class="texte"><b>Rappel</b><span>Avant mes réunions</span></span><select data-change="rappel">' + RAPPELS.map(r => '<option value="' + r[0] + '"' + (d.reglages.rappel === r[0] ? ' selected' : '') + '>' + r[1] + '</option>').join('') + '</select></label>';
    if (actives) html += '<button class="reglage" data-action="essai"><span class="icone">' + ICONES.telephone + '</span><span class="texte"><b>Envoyer une notification d\'essai</b><span>Pour vérifier que tout fonctionne</span></span><span class="chevron">' + ICONES.droite + '</span></button>';
  }
  html += '</div>';

  html += '<div class="titre-section">Mon agenda</div><div class="carte"><div class="reglage"><span class="icone">' + ICONES.agenda + '</span><span class="texte"><b>Mes réunions dans mon agenda</b><span>Google Agenda, Calendrier de l\'iPhone ou Outlook se mettent à jour tout seuls.</span></span></div>' +
    '<div class="choix-agenda"><button data-action="agenda" data-cible="google">' + ICONES.google + 'Google</button><button data-action="agenda" data-cible="apple">' + ICONES.pomme + 'iPhone</button><button data-action="agenda" data-cible="outlook">' + ICONES.outlook + 'Outlook</button><button data-action="agenda" data-cible="copier">' + ICONES.copier + 'Copier le lien</button></div>' +
    '<p class="note">Le lien est personnel : il montre vos réunions et vos congés. Google Agenda peut mettre quelques heures à afficher les changements. <a href="#" data-action="agenda" data-cible="nouveau">Changer de lien</a></p></div>';

  html += '<div class="titre-section">Affichage</div><div class="carte">';
  const choixCouleurs = [['', 'Comme sur le PC'], ['salle', 'Par salle'], ['personne', 'Par personne']];
  html += '<label class="reglage"><span class="icone">' + ICONES.palette + '</span><span class="texte"><b>Couleurs</b><span>' + (etat.modeCouleurs ? 'Choisies sur ce téléphone' : 'Comme sur votre PC : ' + (modePC() === 'personne' ? 'par personne' : 'par salle')) + '</span></span><select data-change="couleurs">' +
    choixCouleurs.map(([v, t]) => '<option value="' + v + '"' + (etat.modeCouleurs === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></label>';
  html += '<label class="reglage"><span class="icone">' + ICONES.planning + '</span><span class="texte"><b>Afficher le week-end</b><span>Samedi et dimanche dans la semaine</span></span><span class="interrupteur"><input type="checkbox" data-change="weekend"' + (etat.weekend ? ' checked' : '') + '><span></span></span></label></div>';

  html += '<div class="carte"><button class="reglage" data-action="deconnecter"><span class="icone" style="background:var(--danger-clair);color:var(--danger)">' + ICONES.sortie + '</span><span class="texte"><b>Déconnecter ce téléphone</b><span>Pour le reconnecter, il faudra un nouveau code du PC</span></span></button></div>';
  html += '<div class="pied">OGEBA Salle mobile ' + VERSION + (etat.majLe ? ' · mis à jour à ' + texteHeure(etat.majLe) : '') + '</div></div>';
  return html;
}

// ---------- Connexion ----------
function ecranConnexion() {
  const codeLien = (/[#&]code=(\d{6})/.exec(location.hash) || [])[1] || '';
  const iosSafari = estIOS && !installee();
  let html = '<div class="connexion"><img class="logo" src="icones/logo-ogeba.png" alt="OGEBA"><h1>OGEBA Salle</h1><p class="intro">Le planning des salles, de la voiture et des congés, dans votre poche.</p>';
  if (iosSafari) {
    html += '<div class="encart bleu"><b>Sur iPhone, installez d\'abord l\'application</b><ol class="etapes"><li><span>Touchez ' + ICONES.partager + ' <b>Partager</b> en bas de Safari.</span></li><li><span>Choisissez <b>Sur l\'écran d\'accueil</b>, puis <b>Ajouter</b>.</span></li><li><span>Ouvrez <b>OGEBA Salle</b> depuis la nouvelle icône et tapez le code.</span></li></ol>' +
      (codeLien ? '<span>Votre code : <span class="code-garde">' + codeLien + '</span> (valable 10 minutes)</span>' : '') + '</div>';
  }
  html += '<div class="encart"><b>Connexion avec le code du PC</b><ol class="etapes"><li><span>Sur votre PC, ouvrez <b>OGEBA Salle</b>.</span></li><li><span>Cliquez sur <b>Téléphone</b> en haut de la fenêtre.</span></li><li><span>Tapez ici le code à 6 chiffres.</span></li></ol></div>';
  html += '<input class="code" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="' + (iosSafari ? '' : codeLien) + '" aria-label="Code à 6 chiffres">' +
    '<p class="message-erreur" id="erreur">' + h(etat.erreurConnexion) + '</p>' +
    '<button class="bouton" id="lier" data-action="lier">Se connecter</button>';
  if (!iosSafari && etat.installation) html += '<button class="bouton secondaire" data-action="installer">' + ICONES.installer + 'Installer l\'application</button>';
  return html + '</div>';
}

function preparerConnexion() {
  const champ = $('#code');
  if (!champ) return;
  champ.addEventListener('input', () => {
    champ.value = champ.value.replace(/\D/g, '').slice(0, 6);
    if (champ.value.length === 6) lier();
  });
  if (champ.value.length === 6) setTimeout(lier, 300);
}

async function lier() {
  const champ = $('#code'), bouton = $('#lier'), erreur = $('#erreur');
  if (!champ || champ.value.length !== 6 || lier.enCours) { if (erreur && champ && champ.value.length !== 6) erreur.textContent = 'Le code a 6 chiffres.'; return; }
  lier.enCours = true;
  bouton.disabled = true;
  bouton.textContent = 'Connexion…';
  erreur.textContent = '';
  try {
    const ua = navigator.userAgent;
    const appareil = (/iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : 'Navigateur') + (installee() ? ' · application' : ' · navigateur');
    const r = await rpc('ogeba_mobile_lier', { p_code: champ.value, p_appareil: appareil });
    if (r.erreur) throw new Error(r.erreur);
    etat.jeton = r.jeton;
    etat.erreurConnexion = '';
    memo.ecrire('jeton', r.jeton);
    memo.ecrire('nom', r.nom);
    history.replaceState(null, '', location.pathname);
    afficher();
    await charger();
    surveiller();
    toast('Bienvenue ' + prenom(r.nom) + ' !', 'ok');
    setTimeout(proposerNotifications, 900);
  } catch (e) {
    erreur.textContent = e.message;
    bouton.disabled = false;
    bouton.textContent = 'Se connecter';
    champ.select();
  } finally {
    lier.enCours = false;
  }
}

function deconnecterIci(message) {
  etat.jeton = null;
  etat.d = null;
  etat.erreurConnexion = message || '';
  memo.ecrire('jeton', null);
  memo.ecrire('donnees', null);
  memo.ecrire('push', null);
  fermerFeuilles();
  afficher();
}

// ---------- Feuilles ----------
function ouvrirFeuille(titre, corps, pied, options) {
  fermerFeuilles(true);
  const voile = document.createElement('div');
  voile.className = 'voile';
  const feuille = document.createElement('div');
  feuille.className = 'feuille';
  feuille.innerHTML = '<div class="poignee"></div><div class="feuille-tete"><h2>' + h(titre) + '</h2><button class="bouton-rond" data-action="fermer" aria-label="Fermer">' + ICONES.fermer + '</button></div><div class="feuille-corps">' + corps + '</div>' + (pied ? '<div class="feuille-pied">' + pied + '</div>' : '');
  const zone = $('#feuilles');
  zone.appendChild(voile);
  zone.appendChild(feuille);
  voile.addEventListener('click', () => fermerFeuilles());
  requestAnimationFrame(() => { voile.classList.add('ouvert'); feuille.classList.add('ouvert'); });
  document.body.style.overflow = 'hidden';
  if (options && options.surFermeture) feuille.surFermeture = options.surFermeture;
  // Glisser vers le bas pour fermer
  let y0 = null;
  const tete = feuille.querySelector('.poignee');
  feuille.querySelector('.feuille-tete').addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
  tete.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true });
  feuille.addEventListener('touchmove', e => { if (y0 != null) { const dy = Math.max(0, e.touches[0].clientY - y0); feuille.style.transform = 'translateY(' + dy + 'px)'; } }, { passive: true });
  feuille.addEventListener('touchend', e => {
    if (y0 == null) return;
    const dy = e.changedTouches[0].clientY - y0;
    y0 = null;
    feuille.style.transform = '';
    if (dy > 110) fermerFeuilles();
  });
  return feuille;
}
function fermerFeuilles(immediat) {
  const zone = $('#feuilles');
  if (!zone || !zone.children.length) return;
  const elements = [...zone.children];
  for (const el of elements) { el.classList.remove('ouvert'); if (el.surFermeture) el.surFermeture(); }
  document.body.style.overflow = '';
  if (immediat) elements.forEach(el => el.remove());
  else setTimeout(() => elements.forEach(el => el.remove()), 260);
}

let minuterieToast = null;
function toast(message, genre) {
  const t = $('#toast');
  t.textContent = message;
  t.className = 'visible' + (genre ? ' ' + genre : '');
  clearTimeout(minuterieToast);
  minuterieToast = setTimeout(() => { t.className = ''; }, 3200);
}

// ---------- Détails d'une réservation ----------
function ouvrirDetails(id) {
  const r = etat.d.reservations.find(x => x.id === id);
  if (!r) return;
  const lignes = r.groupe ? etat.d.reservations.filter(x => x.groupe === r.groupe) : [r];
  const principal = lignes.find(x => !estVehicule(x.salle)) || r;
  const moi = estMoi(principal);
  let corps, pied = '';
  if (r.conge) {
    corps = '<div class="detail-titre"><span class="barre" style="background:#16a34a"></span><div><h2>🌴 Congé</h2><p>' + h(r.organisateur) + '</p></div></div>' +
      '<div class="detail-ligne">' + ICONES.horloge + '<div class="contenu">' + h(majuscule(periodeConge(r))) + '<small>' + String(joursConge(r.d, r.f)).replace('.', ',') + ' jour' + (joursConge(r.d, r.f) > 1 ? 's' : '') + ' ouvré' + (joursConge(r.d, r.f) > 1 ? 's' : '') + '</small></div></div>';
    if (moi) pied = '<div class="boutons"><button class="bouton danger" data-action="annuler" data-id="' + h(r.id) + '">Annuler ce congé</button></div>';
  } else {
    const c = modeCouleur() === 'personne' ? couleurPersonne(principal.organisateur) : couleurSalle(principal.salle);
    const p = invites(principal);
    const rep = typeRepetition(principal.serie);
    corps = '<div class="detail-titre"><span class="barre" style="background:' + c + '"></span><div><h2>' + h(principal.objet || principal.salle) + '</h2><p>' + h(majuscule(texteJour(principal.d))) + '</p></div></div>';
    corps += '<div class="detail-ligne">' + ICONES.horloge + '<div class="contenu">' + texteHeure(principal.d) + ' – ' + texteHeure(principal.f) + '<small>' + dureeTexte(principal.f - principal.d) + '</small></div></div>';
    corps += '<div class="detail-ligne">' + ICONES.lieu + '<div class="contenu">' + lignes.map(x => '<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + couleurSalle(x.salle) + ';margin-right:7px"></span>' + h(x.salle) + '</div>').join('') + '</div></div>';
    corps += '<div class="detail-ligne">' + ICONES.personnes + '<div class="contenu"><div class="personnes">' + personne(principal.organisateur, 'Organisateur') + p.map(x => x.compte ? personne(x.nom, '') : '<div class="personne"><span class="avatar" style="background:#94a3b8">@</span><span>' + h(x.email) + '<br><small>Invité extérieur</small></span></div>').join('') + '</div></div></div>';
    if (principal.description && principal.description.trim()) corps += '<div class="detail-ligne">' + ICONES.texte + '<div class="contenu description">' + h(principal.description.trim()) + '</div></div>';
    if (rep) corps += '<div class="detail-ligne">' + ICONES.repeter + '<div class="contenu">' + h(REPETITIONS[rep] || 'Réunion répétée') + '<small>' + etat.d.reservations.filter(x => x.serie === principal.serie && !estVehicule(x.salle)).length + ' dates dans le planning</small></div></div>';
    if (moi) {
      pied = '<div class="boutons">';
      if (principal.f > new Date()) pied += '<button class="bouton secondaire" data-action="modifier" data-id="' + h(principal.id) + '">Modifier</button>';
      pied += rep ? '<div class="boutons cote"><button class="bouton danger" data-action="annuler" data-id="' + h(principal.id) + '">Annuler cette date</button><button class="bouton danger" data-action="annuler-serie" data-id="' + h(principal.id) + '">Et les suivantes</button></div>'
        : '<button class="bouton danger" data-action="annuler" data-id="' + h(principal.id) + '">Annuler la réunion</button>';
      pied += '</div>';
    } else {
      corps += '<p class="note" style="padding:12px 0 0">Seul l\'organisateur peut modifier ou annuler cette réunion.</p>';
    }
  }
  ouvrirFeuille(r.conge ? 'Congé' : (r.type === 'site' ? r.salle : 'Réunion'), corps, pied);
}
function personne(nom, role) {
  return '<div class="personne"><span class="avatar" style="background:' + couleurPersonne(nom) + '">' + h(initiales(nom)) + '</span><span>' + h(nom) + (role ? '<br><small>' + h(role) + '</small>' : '') + '</span></div>';
}
function dureeTexte(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + deux(m % 60) : '');
}

async function annuler(id, serie) {
  const r = etat.d.reservations.find(x => x.id === id);
  if (!r) return;
  const question = r.conge ? 'Annuler ce congé ?' : serie ? 'Annuler cette date et toutes les suivantes de la série ?' : 'Annuler « ' + (r.objet || r.salle) + ' » du ' + texteJour(r.d, true) + ' ?';
  if (!confirm(question)) return;
  try {
    if (serie) await rpc('ogeba_mobile_annuler_serie', { p_jeton: etat.jeton, p_serie: r.serie, p_a_partir_de: versServeur(r.d) });
    else await rpc('ogeba_mobile_annuler', { p_jeton: etat.jeton, p_id: id });
    fermerFeuilles();
    toast(r.conge ? 'Congé annulé' : 'Réunion annulée', 'ok');
    await charger(true);
  } catch (e) { toast(e.message, 'erreur'); }
}

// ---------- Réserver ----------
let form = null;

function creneauxHoraires() {
  const l = [];
  for (let m = HEURE_DEBUT * 60; m <= HEURE_FIN * 60; m += PAS) l.push(deux(Math.floor(m / 60)) + ':' + deux(m % 60));
  return l;
}
function lieuxReservables() { return etat.d.salles.filter(s => s.type !== 'vehicule'); }
function vehicules() { return etat.d.salles.filter(s => s.type === 'vehicule'); }

function ouvrirReservation(options) {
  options = options || {};
  const jour = options.jour || (etat.jour < aujourdhui() ? aujourdhui() : etat.jour);
  let debut = options.heure != null ? options.heure : null;
  if (debut == null) {
    const m = new Date();
    debut = memeJour(jour, aujourdhui()) ? Math.ceil((m.getHours() * 60 + m.getMinutes() + 1) / PAS) * PAS : 9 * 60;
  }
  debut = Math.max(HEURE_DEBUT * 60, Math.min(HEURE_FIN * 60 - PAS, debut));
  const sf = salleFiltree();
  const salleFiltre = sf && !estVehicule(sf) ? etat.d.salles.find(s => memeNom(s.nom, sf)) : null;
  form = {
    mode: 'reunion', modif: null,
    salle: salleFiltre ? salleFiltre.nom : (lieuxReservables()[0] || {}).nom,
    jour: cleJour(jour), debut: deux(Math.floor(debut / 60)) + ':' + deux(debut % 60),
    fin: (() => { const f = Math.min(HEURE_FIN * 60, debut + 60); return deux(Math.floor(f / 60)) + ':' + deux(f % 60); })(),
    objet: '', description: '', participants: new Set(), voiture: '', repetition: 0, jusqua: cleJour(ajouterJours(jour, 28)),
    congeDu: cleJour(jour), congeDuMidi: false, congeAu: cleJour(jour), congeAuMidi: false, recherche: '',
  };
  if (options.modif) {
    const r = options.modif;
    const lignes = r.groupe ? etat.d.reservations.filter(x => x.groupe === r.groupe) : [r];
    const v = lignes.find(x => estVehicule(x.salle));
    Object.assign(form, {
      mode: r.conge ? 'conge' : 'reunion', modif: { r, lignes },
      salle: r.salle, jour: cleJour(r.d), debut: texteHeure(r.d), fin: texteHeure(r.f),
      objet: r.objet || '', description: r.description || '', participants: new Set(adresses(r.participants).map(a => a.toLowerCase())),
      voiture: v ? v.salle : '',
    });
  }
  if (options.mode) form.mode = options.mode;
  const feuille = ouvrirFeuille(form.modif ? 'Modifier la réunion' : 'Réserver', '<div id="formulaire"></div>', '<button class="bouton" id="valider" data-action="valider">Réserver</button>', { surFermeture: () => { form = null; } });
  feuille.addEventListener('input', surSaisie);
  feuille.addEventListener('change', surSaisie);
  dessinerFormulaire();
}

function dessinerFormulaire() {
  const zone = $('#formulaire');
  if (!zone || !form) return;
  const heures = creneauxHoraires();
  const opt = (liste, choisi) => liste.map(x => '<option' + (x === choisi ? ' selected' : '') + '>' + x + '</option>').join('');
  let html = '';
  if (!form.modif) html += '<div class="bascule" style="margin-bottom:16px;display:flex"><button style="flex:1" class="' + (form.mode === 'reunion' ? 'actif' : '') + '" data-action="mode" data-mode="reunion">Réunion</button><button style="flex:1" class="' + (form.mode === 'conge' ? 'actif' : '') + '" data-action="mode" data-mode="conge">🌴 Congé</button></div>';
  if (form.mode === 'conge') {
    html += '<div class="champ"><span class="libelle">Du</span><div class="deux"><input type="date" data-champ="congeDu" value="' + form.congeDu + '"><select data-champ="congeDuMidi"><option value="0"' + (form.congeDuMidi ? '' : ' selected') + '>dès le matin</option><option value="1"' + (form.congeDuMidi ? ' selected' : '') + '>l\'après-midi</option></select></div></div>';
    html += '<div class="champ"><span class="libelle">Au</span><div class="deux"><input type="date" data-champ="congeAu" value="' + form.congeAu + '"><select data-champ="congeAuMidi"><option value="0"' + (form.congeAuMidi ? '' : ' selected') + '>jusqu\'au soir</option><option value="1"' + (form.congeAuMidi ? ' selected' : '') + '>jusqu\'à midi</option></select></div></div>';
    html += '<div id="verdict"></div>';
    zone.innerHTML = html;
    verifier();
    return;
  }
  html += '<div class="champ"><span class="libelle">Lieu</span><div class="lieux" id="lieux"></div></div>';
  html += '<div class="champ"><span class="libelle">Date et heure</span><input type="date" data-champ="jour" value="' + form.jour + '"><div class="plage"><select data-champ="debut" aria-label="Début">' + opt(heures.slice(0, -1), form.debut) + '</select><span>à</span><select data-champ="fin" aria-label="Fin">' + opt(heures.slice(1), form.fin) + '</select></div></div>';
  html += '<div id="verdict"></div>';
  const projets = [...new Set(etat.d.reservations.filter(r => !r.conge && r.objet && !presence(r)).map(r => r.objet.trim()))].sort((a, b) => a.localeCompare(b));
  html += '<div class="champ"><label class="libelle" for="objet">Projet</label><input type="text" id="objet" data-champ="objet" list="projets" value="' + h(form.objet) + '" placeholder="Nom du projet ou de la réunion" autocomplete="off"><datalist id="projets">' + projets.map(p => '<option value="' + h(p) + '">').join('') + '</datalist></div>';
  const voitures = vehicules();
  if (voitures.length) {
    html += '<div class="champ"><span class="libelle">Véhicule</span>';
    for (const v of voitures) html += '<label class="case-voiture"><span class="texte"><b>🚗 Prendre aussi ' + h(v.nom) + '</b><span id="etat-' + h(simplifier(v.nom)) + '">Aux mêmes heures</span></span><span class="interrupteur"><input type="checkbox" data-champ="voiture" value="' + h(v.nom) + '"' + (memeNom(form.voiture, v.nom) ? ' checked' : '') + '><span></span></span></label>';
    html += '</div>';
  }
  html += '<div class="champ"><span class="libelle">Participants</span><div class="choisis" id="choisis"></div><input class="recherche" type="text" data-champ="recherche" placeholder="Chercher un collègue ou taper une adresse e-mail" value="' + h(form.recherche) + '" autocomplete="off"><div class="collegues" id="collegues"></div></div>';
  html += '<div class="champ"><label class="libelle" for="description">Description</label><textarea id="description" data-champ="description" placeholder="Ordre du jour, lien de visio…">' + h(form.description) + '</textarea></div>';
  if (!form.modif) html += '<div class="champ"><span class="libelle">Répétition</span><select data-champ="repetition">' + REPETITIONS.map((r, i) => '<option value="' + i + '"' + (form.repetition === i ? ' selected' : '') + '>' + r + '</option>').join('') + '</select>' + (form.repetition ? '<div class="deux" style="align-items:center"><span style="color:var(--doux)">jusqu\'au</span><input type="date" data-champ="jusqua" value="' + form.jusqua + '"></div>' : '') + '</div>';
  zone.innerHTML = html;
  dessinerLieux();
  dessinerParticipants();
  verifier();
}

function dessinerLieux() {
  const zone = $('#lieux');
  if (!zone) return;
  const { d, f } = creneauForm();
  zone.innerHTML = lieuxReservables().map(s => {
    const pris = d && f ? occupants(s.nom, d, f, idsModifies()).length > 0 : false;
    return '<button class="lieu' + (memeNom(form.salle, s.nom) ? ' actif' : '') + (pris ? ' occupe' : '') + '" style="--lieu:' + h(couleurSalle(s.nom)) + '" data-action="lieu" data-salle="' + h(s.nom) + '"><i style="background:' + h(couleurSalle(s.nom)) + '"></i>' + h(s.nom) + (pris ? ' <small>occupée</small>' : '') + '</button>';
  }).join('');
}

function dessinerParticipants() {
  const choisis = $('#choisis'), liste = $('#collegues');
  if (!choisis || !liste) return;
  const collegues = etat.d.utilisateurs.filter(u => u.email && !memeNom(u.nom, etat.d.moi.nom));
  choisis.innerHTML = [...form.participants].map(a => {
    const nom = etat.d.nomParEmail.get(a) || a;
    return '<button data-action="retirer" data-email="' + h(a) + '"><span class="avatar" style="background:' + (etat.d.nomParEmail.has(a) ? couleurPersonne(nom) : '#94a3b8') + '">' + h(initiales(nom)) + '</span>' + h(etat.d.nomParEmail.has(a) ? prenom(nom) : a) + ' ✕</button>';
  }).join('');
  const q = simplifier(form.recherche);
  let html = '';
  const visibles = collegues.filter(u => !q || simplifier(u.nom).indexOf(q) >= 0 || simplifier(u.email).indexOf(q) >= 0);
  for (const u of visibles) {
    const actif = form.participants.has(u.email.trim().toLowerCase());
    const conge = congesDu(lireJour(form.jour)).some(r => memeNom(r.organisateur, u.nom));
    html += '<button class="collegue' + (actif ? ' actif' : '') + '" data-action="inviter" data-email="' + h(u.email.trim().toLowerCase()) + '"><span class="avatar" style="background:' + couleurPersonne(u.nom) + '">' + h(initiales(u.nom)) + '</span><span class="nom">' + h(u.nom) + (conge ? ' <small style="color:#16a34a">🌴 en congé</small>' : '') + '</span><span class="coche">' + (actif ? ICONES.coche : '') + '</span></button>';
  }
  if (/^[^\s@;,]+@[^\s@;,]+\.[a-z]{2,}$/i.test(form.recherche.trim()) && !form.participants.has(form.recherche.trim().toLowerCase())) {
    html = '<button class="collegue" data-action="inviter" data-email="' + h(form.recherche.trim().toLowerCase()) + '"><span class="avatar" style="background:#94a3b8">@</span><span class="nom">Inviter ' + h(form.recherche.trim()) + '</span><span class="coche"></span></button>' + html;
  }
  liste.innerHTML = html || '<div class="note" style="padding:12px">Aucun collègue ne correspond.</div>';
}

function idsModifies() { return form && form.modif ? new Set(form.modif.lignes.map(x => x.id)) : null; }
function creneauForm() {
  if (!form.jour || !/^\d{4}-\d{2}-\d{2}$/.test(form.jour)) return {};
  const j = lireJour(form.jour);
  const [hd, md] = form.debut.split(':').map(Number), [hf, mf] = form.fin.split(':').map(Number);
  return { d: new Date(j.getFullYear(), j.getMonth(), j.getDate(), hd, md), f: new Date(j.getFullYear(), j.getMonth(), j.getDate(), hf, mf) };
}
function congeForm() {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.congeDu) || !/^\d{4}-\d{2}-\d{2}$/.test(form.congeAu)) return {};
  const a = lireJour(form.congeDu), b = lireJour(form.congeAu);
  return { d: new Date(a.getFullYear(), a.getMonth(), a.getDate(), form.congeDuMidi ? 12 : 0), f: new Date(b.getFullYear(), b.getMonth(), b.getDate(), form.congeAuMidi ? 12 : 24) };
}

function surSaisie(e) {
  const el = e.target;
  const champ = el.dataset && el.dataset.champ;
  if (!champ || !form) return;
  if (champ === 'voiture') form.voiture = el.checked ? el.value : '';
  else if (champ === 'congeDuMidi' || champ === 'congeAuMidi') form[champ] = el.value === '1';
  else if (champ === 'repetition') { form.repetition = +el.value; dessinerFormulaire(); return; }
  else form[champ] = el.value;
  if (champ === 'debut') { // garde la même durée
    const { d } = creneauForm();
    if (d && form.fin <= form.debut) { const f = Math.min(HEURE_FIN * 60, d.getHours() * 60 + d.getMinutes() + 60); form.fin = deux(Math.floor(f / 60)) + ':' + deux(f % 60); const s = $('[data-champ=fin]'); if (s) s.value = form.fin; }
  }
  if (champ === 'congeDu' && form.congeAu < form.congeDu) { form.congeAu = form.congeDu; const s = $('[data-champ=congeAu]'); if (s) s.value = form.congeAu; }
  if (champ === 'recherche') { if (e.type === 'input') dessinerParticipants(); return; }
  if (champ === 'objet' || champ === 'description') return;
  if (champ === 'jour' || champ === 'debut' || champ === 'fin') { dessinerLieux(); dessinerParticipants(); }
  verifier();
}

// Bilan de disponibilité, comme dans l'application Windows. Le serveur vérifie de nouveau à l'enregistrement.
function verifier() {
  const zone = $('#verdict'), bouton = $('#valider');
  if (!zone || !form) return;
  const v = bilan();
  form.bilan = v;
  const icone = v.niveau === 'ok' ? ICONES.ok : v.niveau === 'attention' ? ICONES.attention : ICONES.non;
  zone.innerHTML = '<div class="verdict ' + v.niveau + '">' + icone + '<div><b>' + h(v.titre) + '</b>' + v.lignes.map(l => '<span>' + h(l) + '</span>').join('') + '</div></div>';
  if (bouton) {
    bouton.disabled = !v.possible || !etat.enLigne;
    bouton.textContent = !etat.enLigne ? 'Hors connexion' : form.modif ? 'Enregistrer' : form.mode === 'conge' ? 'Poser le congé' : v.dates > 1 ? 'Réserver ' + v.libres + ' date' + (v.libres > 1 ? 's' : '') : 'Réserver';
  }
  for (const vh of vehicules()) {
    const etiquette = document.getElementById('etat-' + simplifier(vh.nom));
    if (etiquette) etiquette.textContent = v.voiturePrise && memeNom(form.voiture, vh.nom) ? 'Déjà prise sur ce créneau' : (occupantsTexte(vh.nom) || 'Libre aux mêmes heures');
  }
}
function occupantsTexte(salle) {
  const { d, f } = creneauForm();
  if (!d) return '';
  const o = occupants(salle, d, f, idsModifies());
  return o.length ? 'Prise par ' + o[0].organisateur + ' (' + texteHeure(o[0].d) + '–' + texteHeure(o[0].f) + ')' : '';
}

function bilan() {
  if (form.mode === 'conge') {
    const { d, f } = congeForm();
    if (!d || f <= d) return { niveau: 'non', titre: 'La fin du congé doit être après son début.', lignes: [], possible: false };
    const autres = etat.d.reservations.filter(r => r.conge && estMoi(r) && r.d < f && d < r.f && !(idsModifies() && idsModifies().has(r.id)));
    if (autres.length) return { niveau: 'non', titre: 'Déjà en congé ' + periodeConge(autres[0]) + '.', lignes: [], possible: false };
    const n = joursConge(d, f);
    const pendant = etat.d.reservations.filter(r => !r.conge && !presence(r) && meConcerne(r) && r.d < f && d < r.f);
    const lignes = [periodeConge({ d, f })];
    if (pendant.length) lignes.push((pendant.length > 1 ? pendant.length + ' réunions' : 'Une réunion') + ' pendant ce congé : ' + pendant.slice(0, 3).map(r => (r.objet || r.salle) + ' (' + texteJour(r.d, true) + ')').join(', '));
    if (n <= 0) return { niveau: 'attention', titre: 'Aucun jour ouvré : ce sont des jours de week-end ou fériés.', lignes, possible: true };
    return { niveau: pendant.length ? 'attention' : 'ok', titre: String(n).replace('.', ',') + (n > 1 ? ' jours ouvrés' : ' jour ouvré') + ' de congé', lignes, possible: true };
  }
  const { d, f } = creneauForm();
  if (!form.salle) return { niveau: 'non', titre: 'Choisissez un lieu.', lignes: [], possible: false };
  if (!d || f <= d) return { niveau: 'non', titre: 'L\'heure de fin doit être après l\'heure de début.', lignes: [], possible: false };
  const ignorer = idsModifies();
  const jusqua = form.repetition ? lireJour(form.jusqua || form.jour) : d;
  const debuts = debutsSerie(d, form.repetition, jusqua);
  const duree = f - d;
  const lignes = [];
  let libres = 0, voiturePrise = false;
  const refusees = [];
  for (const x of debuts) {
    const y = new Date(x.getTime() + duree);
    const sp = jourSpecial(x);
    const pris = occupants(form.salle, x, y, ignorer);
    if (sp && sp.bloque) refusees.push(texteJour(x, true) + ' : ' + (sp.titre || 'jour bloqué'));
    else if (pris.length) refusees.push(texteJour(x, true) + ' : déjà réservée par ' + pris[0].organisateur + ' (' + texteHeure(pris[0].d) + '–' + texteHeure(pris[0].f) + (pris[0].objet ? ', ' + pris[0].objet : '') + ')');
    else {
      libres++;
      if (form.voiture && occupants(form.voiture, x, y, ignorer).length) voiturePrise = true;
    }
  }
  if (d < new Date() && !form.modif) lignes.push('Attention : ce créneau est déjà commencé ou passé.');
  if (debuts.length === 1) {
    if (refusees.length) return { niveau: 'non', titre: refusees[0].replace(/^[^:]+: /, majuscule(form.salle) + ' : '), lignes, possible: false, dates: 1, libres: 0 };
    if (voiturePrise) return { niveau: 'non', titre: form.voiture + ' est déjà prise sur ce créneau.', lignes: [occupantsTexte(form.voiture)], possible: false, dates: 1, libres: 0, voiturePrise };
    return { niveau: lignes.length ? 'attention' : 'ok', titre: form.salle + ' est libre' + (form.voiture ? ', avec ' + form.voiture : ''), lignes, possible: true, dates: 1, libres: 1 };
  }
  lignes.push(...refusees.slice(0, 4));
  if (refusees.length > 4) lignes.push('… et ' + (refusees.length - 4) + ' autre(s)');
  if (voiturePrise) lignes.push('La voiture est déjà prise à certaines dates : elle ne sera réservée que si elle est libre.');
  return {
    niveau: libres === 0 ? 'non' : refusees.length ? 'attention' : 'ok',
    titre: libres === debuts.length ? debuts.length + ' dates, toutes libres' : libres + ' date' + (libres > 1 ? 's' : '') + ' libre' + (libres > 1 ? 's' : '') + ' sur ' + debuts.length + (libres ? ' : les autres seront ignorées' : ''),
    lignes, possible: libres > 0, dates: debuts.length, libres, voiturePrise: false,
  };
}

async function valider() {
  if (!form || !form.bilan || !form.bilan.possible || valider.enCours) return;
  valider.enCours = true;
  const bouton = $('#valider');
  bouton.disabled = true;
  bouton.textContent = 'Enregistrement…';
  const moi = etat.d.moi.nom;
  try {
    if (form.mode === 'conge') {
      const { d, f } = congeForm();
      const conge = { id: nouvelId(), salle: 'Congé', debut: versServeur(d), fin: versServeur(f), objet: 'Congé', organisateur: moi, participants: '', serie: '', description: '', groupe: '' };
      const conflits = form.modif
        ? await rpc('ogeba_mobile_modifier', { p_jeton: etat.jeton, p_anciens: form.modif.lignes.map(x => x.id), p_reservations: [conge] })
        : await rpc('ogeba_mobile_ajouter', { p_jeton: etat.jeton, p_reservations: [conge], p_garder_libres: false });
      if (conflits && conflits.length) throw new Error('Ce congé n\'a pas pu être enregistré (jour bloqué ?).');
      fermerFeuilles();
      toast('Congé enregistré 🌴', 'ok');
    } else {
      const { d, f } = creneauForm();
      const participants = [...form.participants].join('; ');
      const debuts = form.modif ? [d] : debutsSerie(d, form.repetition, lireJour(form.jusqua || form.jour));
      const serie = form.modif ? (form.modif.r.serie || '') : (debuts.length > 1 ? form.repetition + '-' + nouvelId() : '');
      const duree = f - d;
      const lignes = [];
      for (const x of debuts) {
        const y = new Date(x.getTime() + duree);
        // Dans une série, pas de voiture pour une date où la salle est déjà prise.
        const salleLibre = !occupants(form.salle, x, y, idsModifies()).length;
        const avecVoiture = !!form.voiture && (debuts.length === 1 || salleLibre);
        // Une réunion modifiée garde son groupe (les PC l'annoncent comme « modifiée »).
        const groupe = form.modif ? (form.modif.r.groupe || form.modif.r.id) : (avecVoiture ? nouvelId() : '');
        const base = { debut: versServeur(x), fin: versServeur(y), objet: form.objet.trim(), organisateur: moi, participants, serie, description: form.description.trim(), groupe };
        lignes.push(Object.assign({ id: nouvelId(), salle: form.salle }, base));
        if (avecVoiture) lignes.push(Object.assign({ id: nouvelId(), salle: form.voiture }, base));
      }
      let conflits;
      if (form.modif) conflits = await rpc('ogeba_mobile_modifier', { p_jeton: etat.jeton, p_anciens: form.modif.lignes.map(x => x.id), p_reservations: lignes });
      else conflits = await rpc('ogeba_mobile_ajouter', { p_jeton: etat.jeton, p_reservations: lignes, p_garder_libres: debuts.length > 1 });
      conflits = conflits || [];
      const refus = lignes.filter(l => conflits.indexOf(l.id) >= 0);
      if (form.modif && refus.length) throw new Error('Ce créneau vient d\'être pris. Rien n\'a été changé.');
      if (debuts.length === 1 && refus.length) throw new Error('Ce créneau vient d\'être pris par quelqu\'un d\'autre.');
      fermerFeuilles();
      const faites = lignes.filter(l => !estVehicule(l.salle) && conflits.indexOf(l.id) < 0).length;
      toast(form && form.modif ? 'Réunion modifiée' : debuts.length > 1 ? faites + ' réunion' + (faites > 1 ? 's' : '') + ' réservée' + (faites > 1 ? 's' : '') : 'Réservé ✓', 'ok');
      etat.jour = debutJour(d);
    }
    await charger(true);
  } catch (e) {
    toast(e.message, 'erreur');
    if (bouton) { bouton.disabled = false; verifier(); }
  } finally {
    valider.enCours = false;
  }
}

// ---------- Notifications ----------
function octetsCle(b64) {
  const b = b64.replace(/-/g, '+').replace(/_/g, '/');
  const s = atob(b + '==='.slice((b.length + 3) % 4));
  return Uint8Array.from(s, c => c.charCodeAt(0));
}

async function abonner(demander) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !etat.d || !etat.d.clePush) return false;
  if (demander) {
    const p = await Notification.requestPermission();
    if (p !== 'granted') { toast('Notifications refusées. Vous pourrez les autoriser dans les réglages du téléphone.', 'erreur'); return false; }
  } else if (Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  const cle = octetsCle(etat.d.clePush);
  if (sub && sub.options && sub.options.applicationServerKey) {
    const actuelle = new Uint8Array(sub.options.applicationServerKey);
    if (actuelle.length !== cle.length || actuelle.some((x, i) => x !== cle[i])) { await sub.unsubscribe(); sub = null; }
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cle });
  const j = sub.toJSON();
  await rpc('ogeba_mobile_push', { p_jeton: etat.jeton, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_actif: true });
  memo.ecrire('push', 'oui');
  return true;
}

async function desabonner() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await rpc('ogeba_mobile_push', { p_jeton: etat.jeton, p_endpoint: sub.endpoint, p_p256dh: '', p_auth: '', p_actif: false });
      await sub.unsubscribe();
    }
  } catch (e) { /* rien */ }
  memo.ecrire('push', 'non');
}

function synchroniserNotifications() { // garde l'abonnement à jour à chaque ouverture
  if (memo.lire('push') === 'oui') abonner(false).catch(() => {});
}

function proposerNotifications() {
  if (!etat.d || memo.lire('push') || !('Notification' in window) || !('PushManager' in window) || Notification.permission === 'denied') return;
  ouvrirFeuille('Notifications', '<div class="encart bleu" style="margin-bottom:6px"><b>🔔 Être prévenu sur ce téléphone ?</b><span>Quand un collègue vous invite, déplace ou annule une réunion, et ' + (etat.d.reglages.rappel || 15) + ' minutes avant vos réunions. Comme sur le PC.</span></div>',
    '<div class="boutons"><button class="bouton" data-action="activer-push">Activer les notifications</button><button class="bouton discret" data-action="plus-tard">Plus tard</button></div>');
}

// ---------- Agenda ----------
async function lienAgenda(nouveau) {
  if (!etat.lienAgenda || nouveau) etat.lienAgenda = await rpc('ogeba_mobile_lien_agenda', { p_jeton: etat.jeton, p_nouveau: !!nouveau });
  return SUPABASE + '/functions/v1/calendrier/' + etat.lienAgenda + '.ics';
}
async function agenda(cible) {
  try {
    if (cible === 'nouveau') {
      if (!confirm('Créer un nouveau lien ? L\'ancien cessera de fonctionner, il faudra réabonner vos agendas.')) return;
      await lienAgenda(true);
      toast('Nouveau lien créé', 'ok');
      return;
    }
    const url = await lienAgenda(false);
    const webcal = url.replace(/^https:/, 'webcal:');
    if (cible === 'google') window.open('https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcal), '_blank');
    else if (cible === 'apple') location.href = webcal;
    else if (cible === 'outlook') window.open('https://outlook.live.com/calendar/0/addfromweb?url=' + encodeURIComponent(url) + '&name=' + encodeURIComponent('OGEBA Salle'), '_blank');
    else {
      try { await navigator.clipboard.writeText(url); toast('Lien copié. Collez-le dans « Ajouter un agenda depuis une URL ».', 'ok'); }
      catch (e) { prompt('Copiez ce lien :', url); }
    }
  } catch (e) { toast(e.message, 'erreur'); }
}

// ---------- Installation ----------
function installer() {
  if (etat.installation) {
    etat.installation.prompt();
    etat.installation.userChoice.finally(() => { etat.installation = null; afficher(); });
    return;
  }
  const corps = estIOS
    ? '<ol class="etapes"><li><span>Dans Safari, touchez ' + ICONES.partager + ' <b>Partager</b>.</span></li><li><span>Faites défiler et choisissez <b>Sur l\'écran d\'accueil</b>.</span></li><li><span>Touchez <b>Ajouter</b>. Ouvrez ensuite OGEBA Salle depuis son icône.</span></li></ol><p class="note" style="padding:12px 0 0">Sur iPhone, l\'application installée a sa propre connexion : il faudra taper un code du PC une fois de plus.</p>'
    : '<ol class="etapes"><li><span>Ouvrez le menu <b>⋮</b> de Chrome.</span></li><li><span>Choisissez <b>Installer l\'application</b> ou <b>Ajouter à l\'écran d\'accueil</b>.</span></li><li><span>Confirmez : l\'icône OGEBA Salle apparaît sur l\'écran d\'accueil.</span></li></ol>';
  ouvrirFeuille('Installer OGEBA Salle', corps, '');
}

// ---------- Actions ----------
const actions = {
  onglet(el) { etat.onglet = el.dataset.onglet; apresPlanning.fait = false; afficher(); window.scrollTo(0, 0); if (etat.onglet === 'planning') apresPlanning.fait = false; },
  jour(el) { etat.jour = lireJour(el.dataset.jour); etat.vue = 'jour'; memo.ecrire('vue', 'jour'); afficher(); },
  semaine(el) { etat.jour = ajouterJours(etat.jour, 7 * +el.dataset.sens); afficher(); },
  aujourdhui() { etat.jour = aujourdhui(); apresPlanning.fait = false; afficher(); },
  vue(el) { etat.vue = el.dataset.vue; memo.ecrire('vue', etat.vue); apresPlanning.fait = false; afficher(); },
  filtre(el) { etat.filtre = el.dataset.filtre; memo.ecrire('filtre', etat.filtre); afficher(); },
  modeCouleurs(el) { changerModeCouleurs(el.dataset.mode, true); },
  actualiser() { toast('Mise à jour…'); charger(); },
  details(el, e) { e.stopPropagation(); ouvrirDetails(el.dataset.id); },
  vide(el, e) {
    if (e.target.closest('.evt')) return;
    const jour = lireJour(el.dataset.jour);
    if (bloque(jour)) { const sp = jourSpecial(jour); toast((sp.titre || 'Jour bloqué') + ' : pas de réservation ce jour-là.'); return; }
    const hh = etat.vue === 'jour' ? 56 : 44;
    const y = e.clientY - el.getBoundingClientRect().top;
    const minutes = HEURE_DEBUT * 60 + Math.floor(y / hh * 60 / PAS) * PAS;
    etat.jour = jour;
    ouvrirReservation({ jour, heure: minutes });
  },
  reserver() { ouvrirReservation({ mode: /cong/i.test(salleFiltree() || '') ? 'conge' : undefined }); },
  fermer() { fermerFeuilles(); },
  mode(el) { form.mode = el.dataset.mode; dessinerFormulaire(); },
  lieu(el) { form.salle = el.dataset.salle; dessinerLieux(); verifier(); },
  inviter(el) {
    const a = el.dataset.email;
    if (form.participants.has(a)) form.participants.delete(a); else form.participants.add(a);
    if (form.recherche.indexOf('@') > 0) { form.recherche = ''; const r = $('[data-champ=recherche]'); if (r) r.value = ''; }
    dessinerParticipants();
  },
  retirer(el) { form.participants.delete(el.dataset.email); dessinerParticipants(); },
  valider() { valider(); },
  modifier(el) { const r = etat.d.reservations.find(x => x.id === el.dataset.id); if (r) ouvrirReservation({ modif: r }); },
  annuler(el) { annuler(el.dataset.id, false); },
  'annuler-serie'(el) { annuler(el.dataset.id, true); },
  lier() { lier(); },
  installer() { installer(); },
  async 'activer-push'() {
    try { if (await abonner(true)) { fermerFeuilles(); toast('Notifications activées 🔔', 'ok'); afficher(); } }
    catch (e) { toast(e.message, 'erreur'); }
  },
  'plus-tard'() { memo.ecrire('push', 'non'); fermerFeuilles(); },
  async essai() {
    try {
      const r = await fetch(SUPABASE + '/functions/v1/notifier', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ essai: etat.jeton }) });
      const j = await r.json();
      if (!r.ok || j.erreur) throw new Error(j.erreur || 'Envoi impossible');
      toast(j.envoyes ? 'Notification envoyée : elle arrive dans quelques secondes.' : 'Aucun téléphone abonné : réactivez les notifications.', j.envoyes ? 'ok' : 'erreur');
    } catch (e) { toast(e.message, 'erreur'); }
  },
  agenda(el, e) { e.preventDefault(); agenda(el.dataset.cible); },
  async deconnecter() {
    if (!confirm('Déconnecter ce téléphone d\'OGEBA Salle ?')) return;
    await desabonner();
    try { await rpc('ogeba_mobile_deconnecter', { p_jeton: etat.jeton }); } catch (e) { /* déjà déconnecté */ }
    deconnecterIci('');
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const f = actions[el.dataset.action];
  if (!f) return;
  if (el.tagName === 'A') e.preventDefault();
  f(el, e);
});

document.addEventListener('change', async e => {
  const el = e.target;
  const quoi = el.dataset && el.dataset.change;
  if (!quoi) return;
  try {
    if (quoi === 'push') {
      if (el.checked) { if (!(await abonner(true))) el.checked = false; else toast('Notifications activées 🔔', 'ok'); }
      else { await desabonner(); toast('Notifications désactivées sur ce téléphone'); }
      afficher();
    } else if (quoi === 'tout' || quoi === 'rappel') {
      const r = await rpc('ogeba_mobile_reglages', { p_jeton: etat.jeton, p_rappel: quoi === 'rappel' ? +el.value : null, p_tout: quoi === 'tout' ? el.value === 'oui' : null });
      etat.d.reglages = r;
      toast('Enregistré', 'ok');
      afficher();
    } else if (quoi === 'couleurs') changerModeCouleurs(el.value, false);
    else if (quoi === 'weekend') { etat.weekend = el.checked; memo.ecrire('weekend', el.checked ? 'oui' : 'non'); afficher(); }
  } catch (err) { toast(err.message, 'erreur'); afficher(); }
});

// Glisser à gauche ou à droite sur le planning : jour (ou semaine) suivant ou précédent.
(function () {
  let x0 = null, y0 = null;
  document.addEventListener('touchstart', e => {
    if (!e.target.closest('.grille-zone') || $('.feuille')) { x0 = null; return; }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const sens = dx < 0 ? 1 : -1;
    if (etat.vue === 'semaine') etat.jour = ajouterJours(etat.jour, 7 * sens);
    else {
      let j = ajouterJours(etat.jour, sens);
      if (!etat.weekend) while (j.getDay() === 0 || j.getDay() === 6) j = ajouterJours(j, sens);
      etat.jour = j;
    }
    afficher();
  }, { passive: true });
})();

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); etat.installation = e; if (!etat.jeton || etat.onglet === 'reglages') afficher(); });
window.addEventListener('online', () => { etat.enLigne = true; verifierVersion(); });
window.addEventListener('offline', () => { etat.enLigne = false; afficher(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) verifierVersion(); });
window.addEventListener('hashchange', allerAuJourDuLien);
setInterval(() => { if (etat.onglet === 'planning' && !$('.feuille') && etat.d) { const y = window.scrollY; afficher(); window.scrollTo(0, y); } }, 60000);

function allerAuJourDuLien() {
  const m = /[#&]jour=(\d{4}-\d{2}-\d{2})/.exec(location.hash);
  if (!m) return;
  etat.jour = lireJour(m[1]);
  etat.vue = 'jour';
  etat.onglet = 'planning';
  apresPlanning.fait = false;
  history.replaceState(null, '', location.pathname);
  afficher();
}

// ---------- Démarrage ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.jour) { location.hash = 'jour=' + e.data.jour; } });
}
if (etat.jeton) {
  const cache = memo.lire('donnees');
  if (cache) {
    try {
      etat.d = preparer(JSON.parse(cache));
      etat.majLe = new Date(+memo.lire('majLe') || Date.now());
    } catch (e) { etat.d = null; }
  }
}
allerAuJourDuLien();
afficher();
if (etat.jeton) { charger(true); surveiller(); }
