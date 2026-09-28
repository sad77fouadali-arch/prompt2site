// ============================================
// PROMPT2SITE — Moteur de génération de sites
// Phase 3 : système d'abonnement par codes
// ============================================
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

app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- SYSTEM PROMPT ----------
const SYSTEM_PROMPT = `Tu agis comme un Générateur de Site Web Révolutionnaire. Ton but est de créer un site web complet, moderne et fonctionnel en un seul essai, à partir du brief détaillé de l'utilisateur.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec le code HTML complet, sans aucun texte avant ou après.
2. Intègre le design via le CDN Tailwind CSS (https://cdn.tailwindcss.com).
3. Intègre toute la logique JavaScript en pur JS à la fin du fichier.
4. Le site doit être responsive (mobile + desktop), en français.
5. Utilise des émojis à la place des images sauf si des URLs d'images sont fournies dans le brief.
6. Sois créatif : animations CSS, effets hover, sections bien structurées.
7. Si c'est un e-commerce : panier dynamique en JavaScript avec sidebar.
8. Le code doit être prêt à enregistrer sous index.html et fonctionner immédiatement.`;

// ---------- PROMPT UTILISATEUR ----------
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
    productsText += 'Règle images : utilise les vraies URLs fournies en <img src="...">. Si un produit n\'a pas d\'image, mets un bel emoji à la place.\n';
  }

  return `Génère un site web complet selon ce brief :

🎯 Type de site : ${body.type || 'Non précisé'}
📝 Nom du projet : ${body.nom || 'Non précisé'}
🎨 Style visuel : ${body.style || 'Moderne'} | Couleurs : ${body.couleurs || 'Au choix de l\'IA'}
👥 Cible : ${body.cible || 'Grand public'}
🏗️ Sections souhaitées : ${body.sections || 'Accueil, Services, Contact'}
✨ Fonctionnalités : ${body.fonctionnalites || 'Navigation fluide, formulaires'}${productsText}
📄 Détails supplémentaires : ${body.details || 'Aucun'}

Génère maintenant le fichier HTML complet.`;
}

// ---------- NETTOYAGE ----------
function cleanHtml(raw) {
  return raw.replace(/```html/gi, '').replace(/```/g, '').trim();
}

// ---------- MODE DÉMO ----------
function demoSite(body) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${body.nom || 'Mon Site'}</title><script src="https://cdn.tailwindcss.com"><\/script></head>
<body class="bg-gray-900 text-white font-sans">
<header class="p-6 text-center bg-gradient-to-r from-purple-600 to-blue-500">
<h1 class="text-4xl font-bold">🚀 ${body.nom || 'Mon Site'}</h1>
<p class="mt-2 text-lg">⚠️ MODE DÉMO — Ajoute ta clé GROQ_API_KEY sur Render pour la vraie génération IA</p>
</header>
<main class="p-8 max-w-4xl mx-auto">
<h2 class="text-2xl font-bold mb-4">Brief reçu :</h2>
<ul class="list-disc pl-6 space-y-2 text-gray-300">
<li>Type : ${body.type || '—'}</li><li>Style : ${body.style || '—'}</li>
<li>Cible : ${body.cible || '—'}</li><li>Sections : ${body.sections || '—'}</li>
</ul></main></body></html>`;
}

// ---------- ROUTE : ACTIVATION ----------
app.post('/api/activate', (req, res) => {
  const { code } = req.body || {};
  if (isValidCode(code)) {
    console.log('✅ Code activé : ' + code);
    return res.json({ success: true });
  }
  res.json({ success: false, error: 'Code invalide. Vérifie ou contacte l\'administrateur.' });
});

// ---------- VÉRIFICATION ACCÈS (abonnement) ----------
function checkAccess(req, res) {
  if (isValidCode(req.body?.code)) return true;
  res.json({ success: false, paywall: true, error: 'Abonnement requis' });
  return false;
}

// ---------- ROUTE : GÉNÉRATION ----------
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
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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

// ---------- ROUTE : MODIFICATION ----------
app.post('/api/modify', async (req, res) => {
  const { html, request } = req.body || {};
  if (!checkAccess(req, res)) return;
  if (!html || !request) return res.status(400).json({ success: false, error: 'Données manquantes' });
  if (!GROQ_API_KEY) return res.json({ success: false, error: 'Mode démo : modification impossible' });

  try {
    console.log('💬 Modification demandée : ' + request);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Tu es un développeur web expert. Tu reçois un fichier HTML complet ET une demande de modification. Applique UNIQUEMENT la modification demandée sans rien casser d\'autre. Réponds UNIQUEMENT avec le fichier HTML complet modifié, sans aucun texte avant ou après.' },
          { role: 'user', content: 'HTML ACTUEL :\n' + html + '\n\nMODIFICATION DEMANDÉE : ' + request + '\n\nRéponds avec le fichier HTML complet modifié.' }
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

// ---------- ROUTE : AMÉLIORATION DU BRIEF ----------
app.post('/api/improve', async (req, res) => {
  const body = req.body || {};
  if (!GROQ_API_KEY) return res.json({ success: false, error: 'Mode démo' });
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Tu es un conseiller web expert. Tu reçois le brief d\'un client pour un site web. Réponds avec 3 à 5 suggestions courtes et concrètes (une par ligne, commençant par "💡 ") pour améliorer ce brief : sections manquantes, fonctionnalités utiles, éléments oubliés. Réponds UNIQUEMENT avec les suggestions, en français, maximum 5 lignes.' },
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

// ---------- ROUTE : SANTÉ ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', groq: !!GROQ_API_KEY, codes: ACTIVATION_CODES.length, service: 'Prompt2Site v1.2' });
});

// ---------- LANCEMENT ----------
app.listen(PORT, () => {
  console.log('🌐 Prompt2Site démarré sur le port ' + PORT);
});
