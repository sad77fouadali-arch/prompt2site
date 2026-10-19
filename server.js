// ======================================
// PROMPT2SITE — Moteur de génération de sites
// Phase 3 : système d'abonnement par codes
// + Formulaire de personnalisation (secteur, objectif, pages, coordonnées)
// ======================================
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 VERROU CLÉ GROQ
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('❌ CONFIG MANQUANTE : GROQ_API_KEY absente. La génération IA renverra un message propre aux utilisateurs.');
} else if (GROQ_API_KEY.length < 50) {
  console.error('⚠️ CONFIG SUSPECTE : GROQ_API_KEY trop courte (' + GROQ_API_KEY.length + ' caracteres). Verifie qu elle commence par gsk_.');
} else {
  console.log('🔑 Clé Groq : ✅ PRÉSENTE (' + GROQ_API_KEY.length + ' caracteres)');
}
const MSG_SERVICE_INDISPONIBLE = 'Le service est temporairement indisponible, réessaie dans quelques minutes.';

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

const GENERATION_SYSTEM = `Tu es le moteur de génération de sites web de Prompt2Site.
Tu DOIS générer UN SEUL fichier HTML complet avec Tailwind CSS (CDN).

=== RÈGLES ABSOLUES (aucune exception) ===
1. DESKTOP-FIRST : conçois TOUJOURS comme pour un écran large (1920px), puis adapte au mobile avec les préfixes md: et lg:. La richesse visuelle PC doit être 100% présente sur mobile.
2. CONTENEUR : toutes les sections utilisent "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8".
3. TYPOGRAPHIE : titres en "text-4xl md:text-5xl" minimum, textes en "text-lg". Jamais de texte minuscule.
4. GRILLE PRODUITS : minimum 3 colonnes sur grand écran ("grid md:grid-cols-3 lg:grid-cols-4"), 1-2 colonnes sur mobile UNIQUEMENT via breakpoints.
5. INTERDICTION MOBILE : ne jamais supprimer d'images, d'arrière-plans, de sections ou de boutons sur mobile.
6. STRUCTURE : header sticky avec navigation + footer complet avec coordonnées + WhatsApp.
7. Chaque produit a : image, nom, description, prix, bouton "Commander" qui ouvre wa.me.
8. COULEURS : maximum 3 couleurs (60% neutre fond / 30% couleur marque / 10% accent boutons). Accent jaune (#facc15) par défaut si non précisé.
9. Réponds UNIQUEMENT avec le code HTML complet, sans texte avant ou après, sans balises de code.
10. N'INVENTE JAMAIS de prix, d'adresse, d'horaires ou de promesses. Info manquante : omet la section ou écris [A CONFIRMER].
11. Rédige TOUT le site dans la langue demandée (français par défaut).
12. Les APPELS À L'ACTION suivent l'objectif du brief (réservation/demande/vente/présentation). Un bouton WhatsApp visible en permanence.
13. Si une adresse est fournie : intégrer une carte Google Maps en iframe + lien "Ouvrir dans Google Maps".

=== QUALITÉ PRO — ANIMATIONS (obligatoire) ===
14. Dans le <style>, ajoute un bloc : .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1), transform 0.6s cubic-bezier(0.22,1,0.36,1); } .reveal.visible { opacity: 1; transform: none; } et des variantes .d1 { transition-delay: 0.1s } .d2 { transition-delay: 0.2s } .d3 { transition-delay: 0.3s }
15. Avant </body>, ajoute un script IntersectionObserver qui observe tous les .reveal et ajoute .visible quand ils entrent à l'écran (threshold 0.15, unobserve après apparition).
16. Ajoute class="reveal" sur chaque section et class="reveal d1/d2/d3" sur les éléments en cascade (cartes d'une grille).
17. Boutons et cartes : hover:scale-[1.03] transition duration-200 et ombres douces (hover:shadow-xl). UNE SEULE animation spectaculaire maximum (le héros). Interdictions : rebonds, rotations, clignotements.
18. Dans le <style>, ajoute : @media (prefers-reduced-motion: reduce) { .reveal { opacity: 1 !important; transform: none !important; transition: none !important; } }

=== QUALITÉ PRO — DESIGN ===
19. Dans <head>, charge Google Fonts : une police display forte pour les titres (Poppins ou Montserrat, graisses 700/800) + Inter pour le corps. Applique-les via style="font-family:..." ou une classe CSS.
20. Ombres douces uniquement (shadow-md/shadow-lg max). Jamais d'ombres noires dures.
21. Images : rounded-2xl, proportions identiques dans une même grille (aspect-[4/3] object-cover).
22. Espacements généreux : sections en py-16 md:py-24. Rien de collé.
23. Boutons : principal plein couleur accent + secondaire contour, mêmes arrondis partout (rounded-xl ou rounded-2xl).

=== ANTI-GÉNÉRIQUE (obligatoire) ===
24. PHRASES INTERDITES : "Bienvenue sur notre site", "Nous sommes passionnés", "solutions innovantes", "votre satisfaction est notre priorité", "services de qualité", et tout slogan creux de carte de visite.
25. Chaque phrase doit être FACTUELLE : nom du business, quartier, spécialités, prix réels du brief.
26. Ton : phrases courtes, directes, vouvoiement, chaleureux comme un commerçant de quartier. Zéro jargon.
27. Structure narrative : promesse claire en haut -> preuves (produits, prix, photos) -> confiance (adresse, horaires) -> contact WhatsApp présent dans CHAQUE grande section.

=== STYLE SIGNATURE "ÉCLATANT" ===
28. Si le brief concerne un restaurant, fast-food, café, pâtisserie, snack ou boutique alimentaire : applique le style ÉCLATANT : grands titres qui prennent la largeur (text-5xl md:text-7xl, un mot-clé en couleur accent), au moins 2 sections avec fond chaud (crème #fef3c7, caramel #d97706 clair, rose poudré, ou couleur de la marque), badges sticker ronds avec bordure épaisse blanche pour "Fait maison", "Best-seller" ou le prix star, photo vedette en grande taille avec ombre douce et légère rotation (entre -2deg et 2deg).
29. Le site doit donner FAIM ou ENVIE : mots gourmands, gros plans visuels, ambiance vivante.`;

// -------- PROMPT UTILISATEUR --------
function buildUserPrompt(body) {
  const nom = body.nom || body.businessName || 'Non précisé';
  const secteur = body.secteur || body.type || 'Non précisé';
  const objectif = body.objectif || '';
  const typeSite = body.typeSite || '';
  const langue = body.langue || 'français';

  // Appels à l'action selon l'objectif
  let cta = '';
  if (/réservation|reservation/i.test(objectif)) {
    cta = '\n🎯 APPELS À L\'ACTION : boutons principaux « Demander une disponibilité » et « Réserver ».';
  } else if (/demandes|devis/i.test(objectif)) {
    cta = '\n🎯 APPELS À L\'ACTION : boutons principaux « Demander un devis » et « Nous contacter ».';
  } else if (/vendre|produits/i.test(objectif)) {
    cta = '\n🎯 APPELS À L\'ACTION : boutons principaux « Commander » et « Commander sur WhatsApp ».';
  } else {
    cta = '\n🎯 APPELS À L\'ACTION : boutons principaux « Découvrir nos services » et « Nous contacter sur WhatsApp ».';
  }

  // WhatsApp du client → tous les boutons pointent vers lui
  const wa = String(body.whatsapp || '').replace(/\D/g, '');
  let waRule = '';
  if (wa) {
    waRule = '\n📱 NUMÉRO WHATSAPP DU CLIENT : ' + wa + ' — TOUS les boutons de contact/commande/réservation DOIVENT ouvrir https://wa.me/' + wa;
  }

  // Coordonnées à afficher (ne jamais inventer)
  let coordonnees = '';
  const coord = [];
  if (body.telephone) coord.push('Téléphone : ' + body.telephone);
  if (body.adresse) coord.push('Adresse : ' + body.adresse);
  if (body.email) coord.push('E-mail : ' + body.email);
  if (coord.length) coordonnees = '\n📍 COORDONNÉES À AFFICHER (exactement, sans en inventer d\'autres) : ' + coord.join(' | ');

  // Logo / photos fournies par URL
  let medias = '';
  if (body.logo) medias += '\n🖼️ LOGO : utiliser <img src="' + body.logo + '"> dans le header.';
  if (body.photos) medias += '\n📸 PHOTOS : utiliser ces URLs réelles en <img src="..."> : ' + body.photos;

  // Pages souhaitées
  let pages = '';
  if (Array.isArray(body.pages) && body.pages.length) {
    pages = body.pages.join(', ');
  } else if (body.sections) {
    pages = body.sections;
  } else {
    pages = 'Accueil, Services, Contact';
  }
  const typeSiteText = typeSite === 'multi'
    ? 'Site de PLUSIEURS PAGES (avec navigation vers chaque page demandée)'
    : 'Page UNIQUE (toutes les sections défilent sur une seule page, navigation par ancres)';

  // Fonctionnalités
  let foncts = '';
  if (Array.isArray(body.fonctionnalites) && body.fonctionnalites.length) {
    foncts = body.fonctionnalites.join(', ');
  } else if (body.fonctionnalites) {
    foncts = body.fonctionnalites;
  } else {
    foncts = 'Navigation fluide, formulaires';
  }

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

🎯 Secteur d'activité : ${secteur}
📝 Nom du projet : ${nom}
🎨 Style visuel : ${body.style || 'Moderne'} | Couleurs : ${body.couleurs || 'Au choix de l\'IA'}
⭐ Objectif du site : ${objectif || 'Présenter l\'entreprise'}
📐 Type de site : ${typeSiteText}
📄 Pages/sections souhaitées : ${pages}
👥 Cible : ${body.cible || body.target || 'Grand public'}
🌐 Langue du site : ${langue}
✨ Fonctionnalités : ${foncts}${cta}${waRule}${coordonnees}${medias}${productsText}
📄 Description de l'activité : ${body.description || body.details || 'Aucune'}
📄 Autres précisions : ${body.precisions || 'Aucune'}

Génère maintenant le fichier HTML complet.`;
}

// -------- NETTOYAGE + VÉRIFICATION IA --------
function cleanHtml(raw) {
  const h = raw.replace(/```html/gi, '').replace(/```/g, '').trim();
  if (h.length > 300000) throw new Error('Réponse IA trop longue');
  if (!/<html|<!doctype/i.test(h)) throw new Error('Réponse IA invalide (pas de HTML)');
  return h;
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

  const hasCode = isValidCode(body.code);
  if (!hasCode && body.preview !== true) {
    return res.json({ success: false, paywall: true, error: 'Abonnement requis' });
  }

  if (!GROQ_API_KEY) {
    console.error('❌ Génération refusée : GROQ_API_KEY absente (vérifie Render)');
    return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
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
      console.error('❌ Erreur Groq (' + response.status + ') :', JSON.stringify(data.error || data));
      return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
    }
    const html = cleanHtml(data.choices[0].message.content);
    console.log('✅ Site généré (' + html.length + ' caractères)');
    res.json({ success: true, html, preview: !hasCode });
  } catch (err) {
    console.log('❌ Erreur serveur :', err.message);
    res.status(500).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
});

// -------- ROUTE : MODIFICATION --------
app.post('/api/modify', async (req, res) => {
  const { html, request } = req.body || {};
  if (!checkAccess(req, res)) return;
  if (!html || !request) return res.status(400).json({ success: false, error: 'Données manquantes' });
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY absente sur cette route');
    return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }

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
    if (!response.ok) {
      console.error('❌ Erreur Groq (' + response.status + ') :', JSON.stringify(data.error || data));
      return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
    }
    const newHtml = cleanHtml(data.choices[0].message.content);
    console.log('✅ Site modifié (' + newHtml.length + ' caractères)');
    res.json({ success: true, html: newHtml });
  } catch (err) {
    res.status(500).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
});

// -------- ROUTE : AMÉLIORATION DU BRIEF --------
app.post('/api/improve', async (req, res) => {
  const body = req.body || {};
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY absente sur cette route');
    return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
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
    if (!response.ok) {
      console.error('❌ Erreur Groq (' + response.status + ') :', JSON.stringify(data.error || data));
      return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
    }
    res.json({ success: true, suggestions: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
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
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY absente sur cette route');
    return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'Tu es un assistant qui structure le brief d\'un commerçant. Tu reçois un texte libre (peut mélanger : présentation du business, menu/liste de produits avec prix, liens de photos URL, coordonnées) et tu réponds UNIQUEMENT avec un JSON valide (aucun texte avant ni après) au format exact : {"infos":{"nom":"","slogan":"","type":"","couleurs":"","cible":"","details":""},"produits":[{"nom":"","prix":"","desc":"","photo":""}]}. Règles STRICTES : 1. "type" : choisis UNIQUEMENT parmi : Tourisme, Hôtel, Restaurant / Fast-food / Café, Boutique, École / Formation, Beauté / Coiffure, Santé / Clinique, Autre. 2. Prix EXACTEMENT comme écrits (ex "1500 FD"). Pas de prix → "Sur demande". 3. "photo" : l\'URL si présente sur la ligne du produit, sinon "". 4. desc : 5-10 mots max. 5. Ne traduis rien, garde le texte original. 6. Si une info est absente du texte, mets "".' },
          { role: 'user', content: menu }
        ],
        temperature: 0.2,
        max_tokens: 2500
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Erreur Groq (' + response.status + ') :', JSON.stringify(data.error || data));
      return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
    }
    const raw = data.choices[0].message.content.trim();
    const jsonText = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    res.json({ success: true, data: JSON.parse(jsonText) });
  } catch (err) {
    res.status(500).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
});

// ------ ROUTE : MODE EXPRESS PAR PHOTO ------
// Reçoit une photo de menu et renvoie tout structuré via Groq Vision
app.post('/api/parse-menu-image', async (req, res) => {
  const { image } = req.body || {};
  if (!image || typeof image !== 'string' || !image.startsWith('data:image')) {
    return res.status(400).json({ success: false, error: 'Image manquante' });
  }
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY absente sur cette route');
    return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: 'Tu es un assistant qui structure le brief d\'un commerçant à partir d\'une photo de menu, carte ou flyer. Tu réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, de cette forme exacte : {"infos":{"type":"...","nom":"...","slogan":"","couleurs":"","cible":"","details":"adresse, téléphone, horaires..."},"produits":[{"nom":"...","prix":"...","desc":"","photo":""}]}. Règles obligatoires : 1. LISTE EXHAUSTIVE : extrais TOUS les produits et services visibles sur la photo, un par un, sans en oublier aucun. 2. "desc" reprend la catégorie exacte du produit. 3. Dans "type", choisis UNE valeur parmi : Tourisme, Hôtel, Restaurant / Fast-food / Café, Boutique, École / Formation, Beauté / Coiffure, Santé / Clinique, Autre. 4. Extrais les vrais noms et prix exactement comme ils sont écrits, n\'invente rien.' },
          { role: 'user', content: [
              { type: 'text', text: 'Extrais TOUT le contenu visible de cette photo en respectant le format JSON. Ne néglige aucun produit, aucun prix.' },
              { type: 'image_url', image_url: { url: image } }
            ]}
        ],
        temperature: 0.2,
        max_tokens: 4000
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('❌ Erreur Groq (' + response.status + ') :', JSON.stringify(data.error || data));
      return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
    }
    const raw = data.choices[0].message.content.trim();
    const jsonText = raw.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    res.json({ success: true, data: JSON.parse(jsonText) });
  } catch (err) {
    res.status(500).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
});

// ------ ROUTE : DICTÉE VOCALE (Whisper Groq) — PHASE 2 ------
// Reçoit un audio en base64 et renvoie le texte transcrit
app.post('/api/transcribe', async (req, res) => {
  const { audio } = req.body || {};
  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({ success: false, error: 'Audio manquant' });
  }
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY absente sur cette route');
    return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
  }
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
    if (!response.ok) {
      console.error('❌ Erreur Groq (' + response.status + ') :', JSON.stringify(data.error || data));
      return res.status(503).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
    }
    console.log('🎤 Dictée reçue (' + buffer.length + ' octets) → ' + (data.text || '').length + ' caractères');
    res.json({ success: true, text: data.text || '' });
  } catch (err) {
    res.status(500).json({ success: false, error: MSG_SERVICE_INDISPONIBLE });
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

