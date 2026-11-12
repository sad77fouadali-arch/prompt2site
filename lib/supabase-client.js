/**
 * Client Supabase — Prompt2Site
 * Sauvegarde des projets générés dans la base sécurisée
 * Utilise fetch natif (aucune dépendance npm à installer)
 */

// Variables lues à chaque appel (pas au chargement)
function getConfig() {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SECRET_KEY
  };
}

/**
 * Sauvegarde un projet généré dans la table projets
 * Non-bloquant : en cas d'erreur, on log sans casser la génération
 * @param {Object} projet - { nom, description, secteur, palette_id, html_content, statut }
 * @returns {Promise<Object|null>} - le projet inséré ou null
 */
async function sauvegarderProjet(projet) {
  const config = getConfig();
  if (!config.url || !config.key) {
    console.log('⚠️ Supabase non configuré — sauvegarde ignorée');
    return null;
  }

  try {
    const response = await fetch(config.url + '/rest/v1/projets', {
      method: 'POST',
    headers: {
  'apikey': config.key,
  'Content-Type': 'application/json',
  'Authorization': 'Bearer ' + config.key,
  'Prefer': 'return=representation'
},  
      body: JSON.stringify({
        nom_projet: projet.nom || 'Projet sans nom',
        description: projet.description || null,
        secteur: projet.secteur || null,
        palette_id: projet.palette_id || null,
        html_content: projet.html_content || null,
        slug: projet.slug || null,
        statut: projet.statut || 'apercu'
      })
    });

    if (!response.ok) {
      const erreur = await response.text();
      console.error('❌ Supabase sauvegarde échouée (' + response.status + '):', erreur);
      return null;
    }

    const data = await response.json();
    console.log('💾 Projet sauvegardé dans Supabase:', data[0].id);
    return data[0];
  } catch (err) {
    console.error('❌ Supabase erreur réseau:', err.message);
    return null;
  }
}

module.exports = { sauvegarderProjet };
