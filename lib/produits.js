// ======================================
// PROMPT2SITE — Produits des clients + Admin
// Stockage : GitHub (persistant) + cache mémoire
// Sécurité : email + mot de passe par client (variable Render CLIENT_LOGINS)
// ======================================
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO = process.env.GITHUB_REPO || 'sad77fouadali-arch/prompt2site-apk-template';

// Format CLIENT_LOGINS : "slug:email:mdp;slug2:email2:mdp2"
const CLIENTS = (process.env.CLIENT_LOGINS || '').split(';').filter(Boolean).map(function(s){
  const p = s.split(':');
  return { slug: (p[0] || '').trim(), email: (p[1] || '').trim().toLowerCase(), password: (p[2] || '').trim() };
});
console.log('🛍️  Produits clients : ' + CLIENTS.length + ' compte(s) configuré(s)');

const cache = {};

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + GH_TOKEN,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function authClient(req) {
  const e = (req.headers['x-email'] || '').toLowerCase();
  const p = req.headers['x-password'] || '';
  return CLIENTS.find(function(c){ return c.email === e && c.password === p; }) || null;
}

async function loadProducts(slug) {
  if (cache[slug]) return cache[slug];
  try {
    const r = await fetch('https://raw.githubusercontent.com/' + GH_REPO + '/main/sites/' + slug + '.produits.json');
    if (r.ok) {
      const j = JSON.parse(await r.text());
      cache[slug] = j;
      return j;
    }
  } catch (e) {}
  return [];
}

async function saveProducts(slug, liste, message) {
  const path = 'sites/' + slug + '.produits.json';
  let sha = null;
  try {
    const info = await fetch('https://api.github.com/repos/' + GH_REPO + '/contents/' + path, { headers: ghHeaders() });
    if (info.ok) sha = (await info.json()).sha;
  } catch (e) {}
  const body = { message: message || 'produits ' + slug, content: Buffer.from(JSON.stringify(liste, null, 2)).toString('base64') };
  if (sha) body.sha = sha;
  const r = await fetch('https://api.github.com/repos/' + GH_REPO + '/contents/' + path, {
    method: 'PUT',
    headers: Object.assign({}, ghHeaders(), { 'Content-Type': 'application/json' }),
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('Sauvegarde GitHub impossible (' + r.status + ')');
  cache[slug] = liste;
}

function registerRoutes(app) {

  // Lecture publique (le site et l'app affichent les produits)
  app.get('/api/products/:slug', async (req, res) => {
    const liste = await loadProducts(req.params.slug);
    res.json({ success: true, products: liste });
  });

  // Connexion cliente
  app.post('/api/client-login', (req, res) => {
    const c = authClient(req);
    if (!c) return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    res.json({ success: true, slug: c.slug });
  });

  // Ajout d'un produit (protégé)
  app.post('/api/products/:slug', async (req, res) => {
    const c = authClient(req);
    if (!c || c.slug !== req.params.slug) return res.status(401).json({ success: false, error: 'Non autorisé' });
    const b = req.body || {};
    if (!b.nom || !b.prix) return res.status(400).json({ success: false, error: 'Nom et prix requis' });
    const liste = await loadProducts(c.slug);
    liste.push({ nom: String(b.nom).slice(0, 80), prix: String(b.prix).slice(0, 20), desc: String(b.desc || '').slice(0, 200), image: String(b.image || '').slice(0, 300) });
    try {
      await saveProducts(c.slug, liste, 'ajout: ' + b.nom);
      res.json({ success: true, products: liste });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Suppression d'un produit (protégé)
  app.delete('/api/products/:slug/:index', async (req, res) => {
    const c = authClient(req);
    if (!c || c.slug !== req.params.slug) return res.status(401).json({ success: false, error: 'Non autorisé' });
    const liste = await loadProducts(c.slug);
    const i = parseInt(req.params.index, 10);
    if (isNaN(i) || i < 0 || i >= liste.length) return res.status(400).json({ success: false, error: 'Index invalide' });
    liste.splice(i, 1);
    try {
      await saveProducts(c.slug, liste, 'suppression produit');
      res.json({ success: true, products: liste });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
}

module.exports = { registerRoutes: registerRoutes };
