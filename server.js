// ======================================
// PROMPT2SITE — Moteur de génération de sites
// Phase 3 : système d'abonnement par codes
// ======================================
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 VERROU CLÉ GROQ
const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log('🔑 Clé Groq : ' + (GROQ_API_KEY
  ? '✅ PRÉSENTE (' + GROQ_API_KEY.length + ' caractères)'
  : '❌ ABSENTE — mode démo actif'));

// 💳 SYSTÈME D'ABONNEMENT
const ACTIVATION_CODES = (process.env.ACTIVATION_CODES || '')
  .split(',').map(c => c.trim()).filter(Boolean);
console.log('💳 Codes d\'activation : ' + ACTIVATION_CODES.length + ' configuré(s)');

function isValidCode(code) {
  return code && ACTIVATION_CODES.includes(code.trim());
}

// ⏱️ TIMEOUT : coupe tout appel API après 60 secondes
const _fetch = globalThis.fetch;
globalThis.fetch = function(url, opts) {
  opts = opts || {};
  const ctrl = new AbortController();
  const t = setTimeout(function(){ ctrl.abort(); }, 60000);
  if (!opts.signal) opts.signal = ctrl.signal;
  return _fetch(url, opts).finally(function(){ clearTimeout(t); });
};

app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== PROMPT SYSTÈME GÉNÉRATION — DESKTOP-FIRST OBLIGATOIRE ==========
const GENERATION_SYSTEM = `Tu es le moteur de génération de sites web de Prompt2Site.
Tu DOIS générer UN SEUL fichier HTML complet avec Tailwind CSS (CDN).

RÈGLES ABSOLUES (aucune exception) :
1. DESKTOP-FIRST : conçois TOUJOURS comme pour un écran d'ordinateur large (1920px), puis adapte au mobile avec les préfixes md: et lg:. La richesse visuelle de la version PC doit être 100% présente sur mobile.
2. CONTENEUR : toutes les sections utilisent la classe "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8".
3. TYPOGRAPHIE : titres en "text-4xl md:text-5xl" minimum, textes en "text-lg". Jamais de texte minuscule.
4. GRILLE PRODUITS : minimum 3 colonnes sur grand écran ("grid md:grid-cols-3 lg:grid-cols-4"), passage en 1-2 colonnes sur mobile UNIQUEMENT via les breakpoints.
5. INTERDICTIONS STRICTES : ne jamais supprimer d'images, d'arrière-plans, de sections ou de boutons sur mobile. Tout élément du desktop DOIT exister sur mobile.
6. STRUCTURE OBLIGATOIRE dans cet ordre : header sticky avec navigation → hero 2 colonnes avec grand titre + boutons CTA → section produits en grille → section à propos → footer complet avec contact + WhatsApp.
7. Chaque produit a : image, nom, description, prix, bouton "Commander" qui ouvre wa.me.
8. Couleurs : respecte la demande du client. Accent jaune (#facc15) par défaut.
9. Réponds UNIQUEMENT avec le code HTML complet, sans texte avant ou après, sans \`\`\`.`;

// Puis dans ta route de génération, utilise :
// { role: 'system', content: GENERATION_SYSTEM }

// -------- PROMPT UTILISATEUR --------
function buildUserPrompt(body) {
  let productsText = '';
  if (body.produits && body.produits.length > 0) {
    productsText = '\n🛍️ PRODUITS À AFFICHER — crée une grille produits avec EXACTEMENT ces noms, prix et descriptions :\n';
    body.produits.forEach((p, i) => {
      productsText += (i + 1) + '. ' + p.nom + ' — ' + p.prix;
      if (p.desc) productsText += ' — ' + p.desc;
      if (p.image) productsText += '\n   Photo : utiliser <img src="' + p.image + '"> pour ce produit';
      productsText += '\n';
    });
    productsText += 'Règle images : utilise les vraies URLs fournies en <img src="...">. Si un produit n\'a pas d\'image, utilise un emoji pertinent à la place.';
  }

  return `Génère un site web complet selon ce brief :

🎯 Type de site : ${body.type || 'Non précisé'}
📝 Nom du projet : ${body.nom || 'Non précisé'}
🎨 Style visuel : ${body.style || 'Moderne'} | Couleurs : ${body.couleurs || 'Au choix de l\'IA'}
👥 Cible : ${body.cible || 'Grand public'}
📋 Sections souhaitées : ${body.sections || 'Accueil, Services, Contact'}
✨ Fonctionnalités : ${body.fonctionnalites || 'Navigation fluide, formulaires'}${productsText}
📄 Détails supplémentaires : ${body.details || 'Aucun'}

Génère maintenant le fichier HTML complet.`;
}

// -------- NETTOYAGE + VÉRIFICATION IA --------
function cleanHtml(raw) {
  const h = raw.replace(/```html/gi, '').replace(/```/g, '').trim();
  if (h.length > 300000) throw new Error('Réponse IA trop longue');
  if (!/<html|<!doctype/i.test(h)) throw new Error('Réponse IA invalide (pas de HTML)');
  return h;
}

// -------- MODE DÉMO --------
function demoSite(body) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${body.nom || 'Mon Site'}</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-gray-900 text-white font-sans">
<header class="p-6 text-center bg-gradient-to-r from-purple-600 to-blue-500">
<h1 class="text-4xl font-bold">🚀 ${body.nom || 'Mon Site'}</h1>
<p class="mt-2 text-lg">⚠️ MODE DÉMO — Ajoute ta clé GROQ_API_KEY sur Render pour la vraie génération IA</p>
</header>
<main class="p-8 max-w-4xl mx-auto">
<h2 class="text-2xl font-bold mb-4">Brief reçu :</h2>
<ul class="list-disc pl-6 space-y-2 text-gray-300">
<li>Type : ${body.type || '-'}</li><li>Style : ${body.style || '-'}</li>
<li>Cible : ${body.cible || '-'}</li><li>Sections : ${body.sections || '-'}</li>
</ul></main></body></html>`;
}

// -------- ROUTE : ACTIVATION --------
app.post('/api/activate', (req, res) => {
  const { code } = req.body || {};
  if (isValidCode(code)) {
    console.log('✅ Code activé : ' + code);
    return res.json({ success: true });
  }
  res.json({ success: false, error: 'Code invalide. Vérifie ou contacte l\'administrateur.' });
});

// -------- VÉRIFICATION ACCÈS (abonnement) --------
function checkAccess(req, res) {
  if (isValidCode(req.body?.code)) return true;
  res.json({ success: false, paywall: true, error: 'Abonnement requis' });
  return false;
}

// -------- ROUTE : GÉNÉRATION --------
app.post('/api/generate', async (req, res) => {
  const body = req.body || {};

  if (!checkAccess(req, res)) return;

  if (!GROQ_API_KEY) {
    console.log('⚠️ Mode démo utilisé (pas de clé Groq)');
    return res.json({ success: true, html: demoSite(body), demo: true });
  }

  try {
    console.log('🚀 Génération en cours pour : ' + (body.nom || 'projet sans nom'));
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
              { role: 'system', content: GENERATION_SYSTEM },
  { role: 'user', content: buildUserPrompt(body) }
],
   
        temperature: 0.7,
        max_tokens: 8000
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.log('❌ Erreur Groq :', JSON.stringify(data.error || data));
      return res.status(500).json({ success: false, error: 'Erreur Groq : ' + (data.error?.message || 'inconnue') });
    }
    const html = cleanHtml(data.choices[0].message.content);
    console.log('✅ Site généré (' + html.length + ' caractères)');
    res.json({ success: true, html, demo: false });
  } catch (err) {
    console.log('❌ Erreur serveur :', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------- ROUTE : MODIFICATION --------
app.post('/api/modify', async (req, res) => {
  const { html, request } = req.body || {};
  if (!checkAccess(req, res)) return;
  if (!html || !request) return res.status(400).json({ success: false, error: 'Données manquantes' });
  if (!GROQ_API_KEY) return res.json({ success: false, error: 'Mode démo : modification impossible' });

  try {
    console.log('✏️ Modification demandée : ' + request);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Tu es un développeur web expert. Tu reçois un fichier HTML complet ET une demande de modification. Tu renvoies le fichier HTML COMPLET modifié, sans aucun texte avant ou après.' },
          { role: 'user', content: 'HTML ACTUEL :\n' + html + '\n\nMODIFICATION DEMANDÉE : ' + request + '\n\nRéponds avec le HTML complet modifié uniquement.' }
        ],
        temperature: 0.4,
        max_tokens: 8000
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ success: false, error: 'Erreur Groq : ' + (data.error?.message || 'inconnue') });
    const newHtml = cleanHtml(data.choices[0].message.content);
    console.log('✅ Site modifié (' + newHtml.length + ' caractères)');
    res.json({ success: true, html: newHtml });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------- ROUTE : AMÉLIORATION DU BRIEF --------
app.post('/api/improve', async (req, res) => {
  const body = req.body || {};
  if (!GROQ_API_KEY) return res.json({ success: false, error: 'Mode démo' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Tu es un conseiller web expert. Tu reçois le brief d\'un client pour un site web. Tu proposes 3 à 5 améliorations concrètes et pertinentes pour rendre le site plus efficace. Réponds en français, sous forme de liste courte.' },
          { role: 'user', content: JSON.stringify(body) }
        ],
        temperature: 0.7,
        max_tokens: 600
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ success: false, error: 'Erreur Groq' });
    res.json({ success: true, suggestions: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------- ROUTE : SANTÉ --------
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});
// ------ ROUTE : MODE EXPRESS (S3 Jour 2) ------
// Reçoit un texte libre (description + menu + liens photos) et renvoie tout structuré
app.post('/api/parse-menu', async (req, res) => {
  const { menu } = req.body || {};
  if (!menu || typeof menu !== 'string' || !menu.trim()) {
    return res.status(400).json({ success: false, error: 'Texte manquant' });
  }
  if (!GROQ_API_KEY) return res.json({ success: false, error: 'Mode démo' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Tu es un assistant qui structure le brief d\'un commerçant. Tu reçois un texte libre (peut mélanger : présentation du business, menu/liste de produits avec prix, liens de photos URL, coordonnées) et tu réponds UNIQUEMENT avec un JSON valide (aucun texte avant ni après) au format exact : {"infos":{"nom":"","slogan":"","type":"","couleurs":"","cible":"","details":""},"produits":[{"nom":"","prix":"","desc":"","photo":""}]}. Règles STRICTES : 1. "type" : choisis UNIQUEMENT parmi : Boutique e-commerce, Salle de sport, Salon de coiffure, Salon de beauté, Restaurant / Fast-food / Café, Site vitrine entreprise, Clinique / Cabinet médical, Agence immobilière, Transport / Livraison, École / Formation, Portfolio, Landing page, Blog, Événement, Autre. 2. Prix EXACTEMENT comme écrits (ex "1500 FD"). Pas de prix → "Sur demande". 3. "photo" : l\'URL si présente sur la ligne du produit, sinon "". 4. desc : 5-10 mots max. 5. Ne traduis rien, garde le texte original. 6. Si une info est absente du texte, mets "".' },
          { role: 'user', content: menu }
        ],
        temperature: 0.2,
        max_tokens: 2500
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ success: false, error: 'Erreur Groq : ' + (data.error?.message || 'inconnue') });
    const raw = data.choices[0].message.content.trim();
    const jsonText = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    res.json({ success: true, data: JSON.parse(jsonText) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ==== SEMAINE 1 : GÉNÉRATION D'APK ANDROID ====
// ------ ROUTE : MODE EXPRESS PAR PHOTO ------
// Recoit une photo de menu et renvoie tout structure via Groq Vision
app.post('/api/parse-menu-image', async (req, res) => {
  const { image } = req.body || {};
  if (!image || typeof image !== 'string' || !image.startsWith('data:image')) {
    return res.status(400).json({ success: false, error: 'Image manquante' });
  }
  if (!GROQ_API_KEY) return res.json({ success: false, error: 'Mode démo' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
                                   model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          { role: 'system', content: 'Tu es un assistant qui structure le brief d\'un commercant. Tu recois une photo de menu ou de carte. Reponds UNIQUEMENT avec un JSON valide (sans texte avant ni apres) de cette forme : {"infos":{"type":"Restaurant / Fast-food / Café","nom":"...","slogan":"","couleurs":"","cible":"","details":"adresse, telephone, horaires..."},"produits":[{"nom":"...","prix":"...","desc":"","photo":""}]} . Dans "type", choisis UNE valeur parmi : Boutique e-commerce, Salle de sport, Salon de coiffure, Salon de beauté, Restaurant / Fast-food / Café, Site vitrine entreprise, Clinique / Cabinet médical, Agence immobilière, Transport / Livraison, École / Formation, Portfolio, Landing page, Blog, Événement, Autre. Extrais les vrais noms et prix visibles sur la photo, n\'invente rien.' },
          { role: 'user', content: [
              { type: 'text', text: 'Lis cette photo et extrais le menu en JSON.' },
              { type: 'image_url', image_url: { url: image } }
          ]}
        ],
        temperature: 0.2,
        max_tokens: 2500
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ success: false, error: 'Erreur Groq : ' + (data.error?.message || 'inconnue') });
    const raw = data.choices[0].message.content.trim();
    const jsonText = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    res.json({ success: true, data: JSON.parse(jsonText) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ------ ROUTE : DICTÉE VOCALE (Whisper Groq) — PHASE 2 ------
// Reçoit un audio en base64 et renvoie le texte transcrit
app.post('/api/transcribe', async (req, res) => {
  const { audio } = req.body || {};
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ success: false, error: 'Audio manquant' });
  }
  if (!GROQ_API_KEY) return res.json({ success: false, error: 'Mode démo' });
  try {
    const buffer = Buffer.from(audio, 'base64');
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'audio/webm' }), 'dictation.webm');
    form.append('model', 'whisper-large-v3');
    form.append('language', 'fr');
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY },
      body: form
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ success: false, error: 'Erreur Groq : ' + (data.error?.message || 'inconnue') });
    console.log('🎤 Dictée reçue (' + buffer.length + ' octets) → ' + (data.text || '').length + ' caractères');
    res.json({ success: true, text: data.text || '' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const apkBuilder = require('./lib/github-apk');
apkBuilder.registerRoutes(app, checkAccess);
const produitsRoutes = require('./lib/produits');
produitsRoutes.registerRoutes(app);

// ========== PREWARM (anti cold-start) ==========
app.get('/api/warm', (req, res) => {
  res.json({ status: 'hot', ts: Date.now() });
});

// ------ LANCEMENT ------
app.listen(PORT, () => {
  console.log('🌐 Prompt2Site démarré sur le port ' + PORT);
});
