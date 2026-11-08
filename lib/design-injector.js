/**
 * UI UX Pro Max v2.0 — Injecteur de design
 * Relie system-prompt.js + sector-palettes.js
 * Produit le prompt final pour Groq
 */

const { UI_UX_PRO_MAX_SYSTEM_PROMPT } = require('./system-prompt');
const { detectSectorPalette } = require('./sector-palettes');

/**
 * Construit le prompt complet pour Groq
 * @param {string} clientDescription - Demande du client
 * @param {Object} options - Options supplémentaires
 * @returns {Object} { systemPrompt, userPrompt, palette, metadata }
 */
function buildDesignPrompt(clientDescription, options = {}) {
  
  // 1. Détection secteur + palette
  const palette = detectSectorPalette(clientDescription);
  
  // 2. Construction du system prompt enrichi
  const systemPrompt = `${UI_UX_PRO_MAX_SYSTEM_PROMPT}

=== PALETTE ASSIGNÉE : ${palette.label} (${palette.id}) ===
Couleurs : ${JSON.stringify(palette.colors, null, 2)}
Typographie : Display "${palette.typography.display}", Body "${palette.typography.body}"
Effets : ${JSON.stringify(palette.effects, null, 2)}

Applique cette palette EXACTEMENT. Ne dévie pas.`;

  // 3. Construction du user prompt structuré
  const userPrompt = `Crée un site web premium pour : "${clientDescription}"

CONTRAINTES SPÉCIFIQUES :
- Mobile-first strict (375px base)
- Structure : Hero → Services/Features → Testimonials → CTA → Contact/Footer
- CTA principal visible sans scroll (above the fold)
- Icônes SVG Lucide uniquement (aucun emoji)
- Textes en français, ton professionnel chaleureux
- ${options.specificInstructions || ''}

Génère le HTML complet avec Tailwind CSS (CDN) prêt à l'emploi.`;

  return {
    systemPrompt,
    userPrompt,
    palette,
    metadata: {
      sector: palette.id,
      version: '2.0.0',
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Post-traitement : validation anti-patterns
 * @param {string} html - HTML généré par l'IA
 * @returns {Object} { clean, violations[], html }
 */
function validateOutput(html) {
  const violations = [];
  
  // Détection dégradés interdits
  const forbiddenGradients = /linear-gradient\((?:[^)]*(?:purple|pink|fuchsia|violet|magenta))/gi;
  if (forbiddenGradients.test(html)) {
    violations.push('Dégradé violet/rose détecté — remplacer par palette assignée');
  }
  
  // Détection emojis
  const emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojis = html.match(emojiPattern);
  if (emojis) {
    violations.push(`Emojis détectés : ${emojis.join(', ')} — remplacer par SVG Lucide`);
  }
  
  // Détection tailles fixes problématiques
  const fixedFontSize = /font-size:\s*(?:[2-9]\d|1\d\d)px/g;
  if (fixedFontSize.test(html)) {
    violations.push('Taille de police fixe > 20px — utiliser clamp()');
  }
  
  return {
    clean: violations.length === 0,
    violations,
    html: html
  };
}

module.exports = {
  buildDesignPrompt,
  validateOutput
};
