// ======================================
// PROMPT2SITE — Usine à APK via GitHub Actions
// Remplace Expo (2h) par la compile native (~5 min)
// Sites clients servis par notre propre serveur
// Couleur de l'app détectée automatiquement
// ======================================
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO = process.env.GITHUB_REPO || 'sad77fouadali-arch/prompt2site-apk-template';

console.log('🤖 Usine APK GitHub : ' + (GH_TOKEN ? '✅ PRÊTE' : '❌ GITHUB_TOKEN manquant'));

const builds = {};

// Couleurs Tailwind → hex (pour détecter la couleur du site généré)
const TAILWIND_COLORS = {
  'red-600': '#DC2626', 'orange-600': '#EA580C', 'amber-600': '#D97706',
  'green-600': '#16A34A', 'emerald-600': '#059669', 'teal-600': '#0D9488',
  'cyan-600': '#0891B2', 'sky-600': '#0284C7', 'blue-600': '#2563EB',
  'indigo-600': '#4F46E5', 'violet-600': '#7C3AED', 'purple-600': '#9333EA',
  'fuchsia-600': '#C026D3', 'pink-600': '#DB2777', 'rose-600': '#E11D48'
};

function extractThemeColor(html) {
  const m = html.match(/(red|orange|amber|yellow|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-600/);
  if (m) return TAILWIND_COLORS[m[1] + '-600'] || '#6A0DAD';
  const h = html.match(/#[0-9a-fA-F]{6}/);
  return h ? h[0] : '#6A0DAD';
}

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + GH_TOKEN,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function slugify(text) {
  return (text || 'site').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'site';
}

async function ghFetch(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    const t = await r.text();
    throw new Error('GitHub API ' + r.status + ' : ' + t.slice(0, 300));
  }
  const text = await r.text();
  return text ? JSON.parse(text) : {};
}

function registerRoutes(app, checkAccess) {

  // Sert les sites des clients en vrai HTML (cache mémoire + GitHub en secours)
  const sites = {};
  app.get('/sites/:slug', async (req, res) => {
    const slug = req.params.slug;
    if (sites[slug]) { res.type('html').send(sites[slug]); return; }
    try {
      const r = await fetch('https://raw.githubusercontent.com/' + GH_REPO + '/main/sites/' + slug + '.html');
      if (!r.ok) return res.status(404).send('Site introuvable');
      const html = await r.text();
      sites[slug] = html;
      res.type('html').send(html);
    } catch (e) {
      res.status(500).send('Erreur de chargement');
    }
  });

  // Lance la compilation d'un APK personnalisé
  app.post('/api/generate-apk', async (req, res) => {
    if (!checkAccess(req, res)) return;
    const { html, nom } = req.body || {};
    if (!html) return res.status(400).json({ success: false, error: 'HTML manquant' });
    if (!GH_TOKEN) return res.status(500).json({ success: false, error: 'GITHUB_TOKEN non configuré' });

    const appName = (nom || 'Mon App').slice(0, 30);
    const slug = slugify(appName);
    const themeColor = extractThemeColor(html);

    try {
      // 1. Publie le site du client dans le repo (dossier sites/)
      const filePath = 'sites/' + slug + '.html';
      await ghFetch('https://api.github.com/repos/' + GH_REPO + '/contents/' + filePath, {
        method: 'PUT',
        headers: Object.assign({}, ghHeaders(), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          message: 'site: ' + appName,
          content: Buffer.from(html).toString('base64')
        })
      });

      // 2. URL publique du site du client (notre propre serveur)
      const targetUrl = 'https://prompt2site-nvms.onrender.com/sites/' + slug;

      // 3. Déclenche la compilation APK
      await ghFetch('https://api.github.com/repos/' + GH_REPO + '/actions/workflows/build-apk.yml/dispatches', {
        method: 'POST',
        headers: Object.assign({}, ghHeaders(), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ref: 'main',
          inputs: { app_name: appName, theme_color: themeColor, target_url: targetUrl }
        })
      });

      // 4. Retrouve le run lancé
      await new Promise(function(r){ setTimeout(r, 3000); });
      const runs = await ghFetch('https://api.github.com/repos/' + GH_REPO + '/actions/runs?per_page=5', { headers: ghHeaders() });
      const run = (runs.workflow_runs || []).find(function(w){ return w.name === 'Build Client APK'; });
      if (!run) throw new Error('Run introuvable après dispatch');

      const buildId = run.id.toString();
      builds[buildId] = { nom: appName };
      console.log('🤖 Build APK lancé : ' + appName + ' (run ' + buildId + ') — couleur ' + themeColor);
      res.json({ success: true, buildId: buildId });
    } catch (err) {
      console.log('❌ Erreur generate-apk :', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Suivi du build
  app.get('/api/apk-status/:id', async (req, res) => {
    if (!GH_TOKEN) return res.status(500).json({ success: false, error: 'GITHUB_TOKEN manquant' });
    try {
      const run = await ghFetch('https://api.github.com/repos/' + GH_REPO + '/actions/runs/' + req.params.id, { headers: ghHeaders() });
      if (run.status !== 'completed') {
        return res.json({ success: true, status: run.status });
      }
      if (run.conclusion === 'success') {
        return res.json({ success: true, status: 'finished', downloadUrl: '/api/apk-download/' + req.params.id });
      }
      res.json({ success: true, status: 'errored', error: 'Compilation échouée (voir logs GitHub Actions)' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Téléchargement de l'APK (passe-parole serveur)
  app.get('/api/apk-download/:id', async (req, res) => {
    if (!GH_TOKEN) return res.status(500).json({ success: false, error: 'GITHUB_TOKEN manquant' });
    try {
      const arts = await ghFetch('https://api.github.com/repos/' + GH_REPO + '/actions/runs/' + req.params.id + '/artifacts', { headers: ghHeaders() });
      const art = (arts.artifacts || [])[0];
      if (!art) return res.status(404).json({ success: false, error: 'Aucun artefact' });
      const r = await fetch('https://api.github.com/repos/' + GH_REPO + '/actions/artifacts/' + art.id + '/zip', { headers: ghHeaders() });
      if (!r.ok) return res.status(500).json({ success: false, error: 'Téléchargement artefact impossible' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="' + ((builds[req.params.id] || {}).nom || 'app') + '-apk.zip"');
      res.send(Buffer.from(await r.arrayBuffer()));
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

module.exports = { registerRoutes: registerRoutes };
