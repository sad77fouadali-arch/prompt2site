// ============================================================
// PROMPT2SITE — Générateur d'APK Android (Semaine 1)
// Principe : le serveur NE COMPILE RIEN. Il crée un mini-projet
// Expo (WebView affichant le site généré) et le soumet à
// EAS Build (cloud Expo). Expo renvoie le lien de l'APK.
// ============================================================
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Builds suivis en mémoire (perdus si le serveur redémarre — toléré,
// le build continue dans le cloud Expo de toute façon)
const trackedBuilds = new Map();

function run(cmd, args, cwd, timeoutMs) {
  return new Promise(function(resolve, reject) {
    execFile(cmd, args, { cwd: cwd, timeout: timeoutMs || 180000, maxBuffer: 16 * 1024 * 1024 },
      function(err, stdout, stderr) {
        if (err) return reject(new Error((stderr || '') + ' | ' + err.message));
        resolve(stdout);
      });
  });
}

// Échappe le HTML pour l'injecter dans un template JS sans casser les backticks
function escapeForJs(html) {
  return html
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

// Crée un projet Expo minimal : une seule WebView qui affiche le site du client
function createExpoProject(html, siteName) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2s-app-'));

  const appJs =
    "import React from 'react';\n" +
    "import { View, StyleSheet } from 'react-native';\n" +
    "import { WebView } from 'react-native-webview';\n" +
    "import { StatusBar } from 'expo-status-bar';\n\n" +
    "const SITE_HTML = `" + escapeForJs(html) + "`;\n\n" +
    "export default function App() {\n" +
    "  return (\n" +
    "    <View style={styles.container}>\n" +
    "      <WebView\n" +
    "        originWhitelist={['*']}\n" +
    "        source={{ html: SITE_HTML }}\n" +
    "        style={{ flex: 1 }}\n" +
    "        javaScriptEnabled={true}\n" +
    "        domStorageEnabled={true}\n" +
    "        setSupportMultipleWindows={false}\n" +
    "      />\n" +
    "      <StatusBar style=\"auto\" />\n" +
    "    </View>\n" +
    "  );\n" +
    "}\n\n" +
    "const styles = StyleSheet.create({ container: { flex: 1 } });\n";

  const appJson = {
    expo: {
      owner: 'prompt2site-djibouti',
      name: (siteName || 'Mon Application').toString().trim().slice(0, 30),
      slug: 'prompt2site-apps',
      extra: { eas: { projectId: '96ef6a63-5dee-40aa-b1b6-75ade4c2eef5' } },
      version: '1.0.0',
      orientation: 'portrait',
      userInterfaceStyle: 'automatic',
      android: {
        package: 'com.prompt2site.client' + Date.now(),
        versionCode: 1
      }
    }
  };

  const pkg = {
    name: 'p2s-client-app',
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: { start: 'expo start' },
        dependencies: {
      expo: '~48.0.0',
      react: '18.2.0',
      'react-native': '0.71.14',
      'react-native-webview': '12.1.0'
    }

  };

  const easJson = {    cli: { version: '>= 13.0.0', appVersionSource: 'remote' },
  build: {
    apk: {
      distribution: 'internal',
      android: { buildType: 'apk' }
    }
  }
};


  fs.writeFileSync(path.join(dir, 'App.js'), appJs);
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify(appJson, null, 2));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(dir, 'eas.json'), JSON.stringify(easJson, null, 2));
     try { require('child_process').execSync('npm install --package-lock-only --no-audit --no-fund', { cwd: dir, stdio: 'ignore', timeout: 120000 }); } catch (e) {}
  return dir;

}

// Soumet le projet à EAS Build et retourne l'ID du build cloud
    async function submitToEas(projectDir) {
  process.env.EAS_BUILD_SKIP_LOCKFILE_CHECK = '1';
  return await new Promise(function(resolve, reject) {
    var spawn = require('child_process').spawn;
        var child = spawn('npx', ['eas-cli@24.8.0', 'build', '--platform', 'android',
      '--profile', 'apk', '--non-interactive', '--json'], { cwd: projectDir, env: process.env });
    var buf = '';
        child.stdout.on('data', function(d) {
      buf += d.toString();
      var m = buf.match(/\/builds\/([0-9a-f-]{36})/);
      if (m) { resolve({ id: m[1], status: 'queued' }); child.kill(); }
    });

        child.stderr.on('data', function(d) { buf += d.toString(); });
        child.on('close', function() {
      console.error('EAS OUTPUT:', buf.slice(-800));
      var m2 = buf.match(/\/builds\/([0-9a-f-]{36})/);
      if (m2) resolve({ id: m2[1], status: 'queued' });
      else reject(new Error('EAS build termine sans ID de build.'));
    });

    child.on('error', reject);
  });
}


// Interroge EAS sur l'état d'un build et l'URL de l'APK terminé
async function fetchBuildStatus(buildId) {
  const out = await run('npx', ['eas-cli@24.8.0', 'build:list','--platform', 'android',
    '--limit', '15', '--json'], process.cwd(), 60000);
  const list = JSON.parse(out);
  const build = list.find(function(b) { return b.id === buildId; });
  if (!build) throw new Error('Build introuvable chez Expo.');
  var url = null;
  if (build.artifacts && build.artifacts.buildUrl) url = build.artifacts.buildUrl;
  return { status: build.status, downloadUrl: url };
}

function registerRoutes(app, checkAccess) {

  // LANCE la génération de l'APK
  app.post('/api/generate-apk', async function(req, res) {
    var body = req.body || {};
    if (!checkAccess(req, res)) return;
    if (!body.html || typeof body.html !== 'string') {
      return res.status(400).json({ success: false, error: 'HTML du site manquant.' });
    }
    if (body.html.length > 800000) {
      return res.status(400).json({ success: false, error: 'Site trop volumineux pour une app (max 800 Ko).' });
    }
    if (!process.env.EXPO_TOKEN) {
      return res.status(500).json({ success: false, error: 'EXPO_TOKEN non configuré sur le serveur.' });
    }
    try {
              var projectDir = createExpoProject(body.html, body.nom);
      var build = await submitToEas(projectDir);
      trackedBuilds.set(build.id, Date.now());
      try { fs.rmSync(projectDir, { recursive: true, force: true }); } catch (e) {}
      res.json({ success: true, buildId: build.id, status: build.status });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // SUIT l'avancement du build (le frontend interroge cette route toutes les 15 sec)
  app.get('/api/apk-status/:id', async function(req, res) {
    try {
      var info = await fetchBuildStatus(req.params.id);
      res.json({ success: true, status: info.status, downloadUrl: info.downloadUrl });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

}

module.exports = { registerRoutes: registerRoutes };

