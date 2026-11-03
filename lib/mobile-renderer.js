// Prompt2Site Mobile — rendu HTML5/Tailwind original et simulé.

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

const BUSINESS_CONTENT = {
  commerce: {
    headline: 'Vos produits, accessibles partout.',
    description: 'Catalogue, panier et commandes dans une interface simple.'
  },
  restaurant: {
    headline: 'Votre menu dans la poche de vos clients.',
    description: 'Plats, commandes et suivi de livraison dans un seul parcours.'
  },
  services: {
    headline: 'Vos services et rendez-vous, simplifiés.',
    description: 'Prestations, réservations et suivi des demandes clients.'
  },
  general: {
    headline: 'Votre activité présentée clairement.',
    description: 'Une application simple pour informer et rester en contact.'
  }
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => (
    HTML_ENTITIES[character]
  ));
}

function renderMobileHtml(preview) {
  if (
    !preview ||
    preview.simulated !== true ||
    !Array.isArray(preview.screens) ||
    preview.screens.length === 0
  ) {
    const error = new Error('Blueprint mobile invalide.');
    error.statusCode = 400;
    throw error;
  }

  const content = BUSINESS_CONTENT[preview.businessType] || BUSINESS_CONTENT.general;
  const applicationName = escapeHtml(
    preview.application?.workingName || 'Aperçu mobile'
  );
  const features = preview.customerFeatures?.features || [];
  const payments = preview.customerFeatures?.payments || [];

  const featureHtml = features.map((feature) => (
    `<span class="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">${escapeHtml(feature)}</span>`
  )).join('');

  const panels = preview.screens.map((screen, index) => {
    const id = escapeHtml(screen.id);
    const title = escapeHtml(screen.title);
    const role = escapeHtml(screen.role);
    const nextScreen = preview.screens[index + 1];
    const target = escapeHtml(nextScreen ? nextScreen.id : preview.screens[0].id);
    const actionLabel = nextScreen ? 'Continuer' : 'Retour à l’accueil';

    const homeContent = index === 0 ? `
      <div class="rounded-3xl bg-emerald-400 p-5 text-slate-950">
        <p class="text-xs font-bold uppercase tracking-widest">Aperçu simulé</p>
        <h2 class="mt-3 text-2xl font-extrabold">${escapeHtml(content.headline)}</h2>
        <p class="mt-2 text-sm leading-6">${escapeHtml(content.description)}</p>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">${featureHtml}</div>
      <p class="mt-4 text-xs leading-5 text-slate-400">
        Paiements prévus dans le projet : ${escapeHtml(payments.join(', '))}.
        Aucun paiement réel dans cet aperçu.
      </p>
    ` : '';

    return `
      <section data-screen-panel="${id}" class="${index === 0 ? '' : 'hidden'} px-5 pb-28 pt-5">
        <p class="text-xs font-semibold uppercase tracking-widest text-emerald-300">Écran ${index + 1}</p>
        <h1 class="mt-2 text-3xl font-bold text-white">${title}</h1>
        ${homeContent}
        <div class="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p class="text-sm leading-6 text-slate-300">${role}</p>
          <p class="mt-3 text-xs text-slate-500">Contenu de démonstration, sans données réelles.</p>
        </div>
        <button type="button" data-screen-target="${target}" class="mt-5 w-full rounded-2xl bg-white px-4 py-3 font-bold text-slate-950">
          ${actionLabel}
        </button>
      </section>
    `;
  }).join('');

  const navigation = preview.screens.map((screen, index) => {
    const id = escapeHtml(screen.id);
    const title = escapeHtml(screen.title);
    const activeClasses = index === 0
      ? 'bg-emerald-400 text-slate-950'
      : 'text-slate-400';

    return `
      <button type="button" data-nav-target="${id}" data-screen-target="${id}" class="${activeClasses} shrink-0 rounded-xl px-3 py-2 text-xs font-semibold">
        ${title}
      </button>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${applicationName} — aperçu simulé</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 font-sans">
  <main class="flex min-h-screen items-center justify-center p-3">
    <div class="relative h-[740px] w-full max-w-[390px] overflow-y-auto rounded-[36px] border-8 border-slate-800 bg-slate-950 shadow-2xl">
      <header class="sticky top-0 z-10 border-b border-slate-800 bg-slate-950 px-5 py-4">
        <p class="font-bold text-white">${applicationName}</p>
        <p class="text-xs text-emerald-300">Djibouti · mode hors ligne prévu</p>
      </header>
      ${panels}
      <nav class="sticky bottom-0 flex gap-2 overflow-x-auto border-t border-slate-800 bg-slate-950 p-3">
        ${navigation}
      </nav>
    </div>
  </main>
  <script>
    (function () {
      function showScreen(id) {
        document.querySelectorAll('[data-screen-panel]').forEach(function (panel) {
          panel.classList.toggle('hidden', panel.dataset.screenPanel !== id);
        });

        document.querySelectorAll('[data-nav-target]').forEach(function (button) {
          const active = button.dataset.navTarget === id;
          button.classList.toggle('bg-emerald-400', active);
          button.classList.toggle('text-slate-950', active);
          button.classList.toggle('text-slate-400', !active);
        });
      }

      document.querySelectorAll('[data-screen-target]').forEach(function (button) {
        button.addEventListener('click', function () {
          showScreen(button.dataset.screenTarget);
        });
      });
    }());
  </script>
</body>
</html>`;
}

module.exports = {
  renderMobileHtml
};
