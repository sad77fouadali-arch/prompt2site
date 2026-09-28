// ============================================
// PROMPT2SITE — Moteur de génération de sites
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

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- SYSTEM PROMPT (le cerveau du moteur) ----------
const SYSTEM_PROMPT = `Tu agis comme un Générateur de Site Web Révolutionnaire. Ton but est de créer un site web complet, moderne et fonctionnel en un seul essai, à partir du brief détaillé de l'utilisateur.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT avec le code HTML complet, sans aucun texte avant ou après.
2. Intègre le design via le CDN Tailwind CSS (https://cdn.tailwindcss.com).
3. Intègre toute la logique JavaScript en pur JS à la fin du fichier.
4. Le site doit être responsive (mobile + desktop), en français.
5. Utilise des émojis à la place des images.
6. Sois créatif : animations CSS, effets hover, sections bien structurées.
7. Si c'est un e-commerce : panier dynamique en JavaScript avec sidebar.
8. Le code doit être prêt à enregistrer sous index.html et fonctionner immédiatement.`;

// ---------- CONSTRUCTION DU PROMPT UTILISATEUR ----------
function buildUserPrompt(body) {
  return `Génère un site web complet selon ce brief :

🎯 Type de site : ${body.type || 'Non précisé'}
📝 Nom du projet : ${body.nom || 'Non précisé'}
🎨 Style visuel : ${body.style || 'Moderne'} | Couleurs : ${body.couleurs || 'Au choix de l\'IA'}
👥 Cible : ${body.cible || 'Grand public'}
🏗️ Sections souhaitées : ${body.sections || 'Accueil, Services, Contact'}
✨ Fonctionnalités : ${body.fonctionnalites || 'Navigation fluide, formulaires'}
📄 Détails supplémentaires : ${body.details || 'Aucun'}

Génère maintenant le fichier HTML complet.`;
}

// ---------- NETTOYAGE DE LA RÉPONSE IA ----------
function cleanHtml(raw) {
  return raw
    .replace(/```html/gi, '')
    .replace(/```/g, '')
    .trim();
}

// ---------- MODE DÉMO (si pas de clé Groq) ----------
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

// ---------- ROUTE : GÉNÉRATION ----------
app.post('/api/generate', async (req, res) => {
  const body = req.body || {};

  // Mode démo si pas de clé
  if (!GROQ_API_KEY) {
    console.log('⚠️ Mode démo utilisé (pas de clé Groq)');
    return res.json({ success: true, html: demoSite(body), demo: true });
  }

  try {
    console.log('🚀 Génération en cours pour : ' + (body.nom || 'projet sans nom'));
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
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

// ---------- ROUTE : SANTÉ ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', groq: !!GROQ_API_KEY, service: 'Prompt2Site v1.0' });
});

// ---------- LANCEMENT ----------
app.listen(PORT, () => {
  console.log('🌐 Prompt2Site démarré sur le port ' + PORT);
});
