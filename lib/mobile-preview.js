// Prompt2Site Mobile — génération locale d'un aperçu simulé.
// Cette brique ne déclenche ni paiement, ni compilation Android.

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 2000;

const baseScreens = [
  {
    id: 'home',
    title: 'Accueil',
    role: 'Présenter l’activité et les actions principales'
  }
];

const businessModules = {
  commerce: {
    screens: [
      { id: 'catalog', title: 'Catalogue', role: 'Parcourir les produits' },
      { id: 'product', title: 'Produit', role: 'Consulter le détail d’un produit' },
      { id: 'cart', title: 'Panier', role: 'Préparer une commande' },
      { id: 'checkout', title: 'Commande', role: 'Confirmer la commande' }
    ],
    collections: ['products', 'carts', 'orders', 'customers'],
    features: ['Catalogue', 'Panier', 'Commandes']
  },
  restaurant: {
    screens: [
      { id: 'menu', title: 'Menu', role: 'Parcourir les plats disponibles' },
      { id: 'dish', title: 'Plat', role: 'Consulter le détail d’un plat' },
      { id: 'cart', title: 'Panier', role: 'Préparer une commande' },
      { id: 'tracking', title: 'Suivi', role: 'Suivre la préparation et la livraison' }
    ],
    collections: ['dishes', 'carts', 'orders', 'customers'],
    features: ['Menu', 'Panier', 'Commandes', 'Suivi de livraison']
  },
  services: {
    screens: [
      { id: 'services', title: 'Services', role: 'Présenter les prestations' },
      { id: 'booking', title: 'Réservation', role: 'Demander un rendez-vous' },
      { id: 'requests', title: 'Mes demandes', role: 'Suivre les demandes envoyées' }
    ],
    collections: ['services', 'bookings', 'customers'],
    features: ['Prestations', 'Réservations', 'Suivi des demandes']
  },
  general: {
    screens: [
      { id: 'presentation', title: 'Présentation', role: 'Expliquer l’activité' },
      { id: 'contact', title: 'Contact', role: 'Contacter l’entreprise' }
    ],
    collections: ['contents', 'messages'],
    features: ['Présentation', 'Contact']
  }
};

function normalizeDescription(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim();
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectBusinessType(description) {
  const text = description.toLowerCase();

  if (containsAny(text, [
    'restaurant',
    'menu',
    'plat',
    'fast-food',
    'livraison de repas'
  ])) {
    return 'restaurant';
  }

  if (containsAny(text, [
    'boutique',
    'produit',
    'catalogue',
    'panier',
    'vêtement',
    'vetement',
    'commande'
  ])) {
    return 'commerce';
  }

  if (containsAny(text, [
    'service',
    'rendez-vous',
    'réservation',
    'reservation',
    'devis'
  ])) {
    return 'services';
  }

  return 'general';
}

function createMobilePreview(input) {
  const description = normalizeDescription(input);

  if (description.length < MIN_DESCRIPTION_LENGTH) {
    const error = new Error(
      'Décris ton application en au moins 10 caractères.'
    );
    error.statusCode = 400;
    throw error;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    const error = new Error(
      'La description ne doit pas dépasser 2 000 caractères.'
    );
    error.statusCode = 400;
    throw error;
  }

  const businessType = detectBusinessType(description);
  const business = businessModules[businessType];

  const screens = [
    ...baseScreens,
    ...business.screens,
    {
      id: 'account',
      title: 'Compte',
      role: 'Consulter les informations du client'
    }
  ];

  return {
    simulated: true,
    previewOnly: true,
    businessType,
    application: {
      workingName: 'Aperçu mobile',
      language: 'fr',
      market: 'Djibouti',
      currency: 'DJF'
    },
    navigation: screens.map((screen) => ({
      id: screen.id,
      title: screen.title
    })),
    screens,
    data: {
      collections: ['app_settings', ...business.collections],
      offlineFirst: true,
      syncWhenOnline: true
    },
    customerFeatures: {
      features: business.features,
      payments: ['Waafi', 'DahabPlus', 'Paiement à la livraison'],
      location: 'Quartiers comme repères, GPS facultatif',
      whatsapp: true
    }
  };
}

module.exports = {
  createMobilePreview
};
