// Prompt2Site Mobile — grille tarifaire officielle
// Aucun ancien tarif unique de 10 000 DJF ne doit être réintroduit.

const MOBILE_OFFERS = {
  currency: 'DJF',
  preview: {
    price: 0,
    free: true,
    simulated: true
  },
  offers: [
    {
      id: 'standard',
      name: 'Standard',
      amount: 25000,
      features: [
        'Fichier APK Android signé',
        'Catalogue de produits',
        'Bouton WhatsApp',
        'Mode hors ligne de base'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      amount: 50000,
      features: [
        'Base de données',
        'Comptes utilisateurs',
        'Notifications',
        'Aide à la publication sur le Play Store'
      ]
    },
    {
      id: 'entreprise',
      name: 'Entreprise',
      amount: null,
      startingAt: 120000,
      quoteRequired: true,
      features: [
        'Intégrations d’API avancées',
        'Fonctionnalités spécifiques',
        'Devis personnalisé'
      ]
    }
  ]
};

// Les numéros restent dans les variables d'environnement du serveur.
function getPaymentMethods() {
  return [
    {
      id: 'waafi',
      label: 'Waafi',
      number: process.env.WAAFI_PAYMENT_NUMBER || null,
      configured: Boolean(process.env.WAAFI_PAYMENT_NUMBER)
    },
    {
      id: 'dahabplus',
      label: 'DahabPlus',
      number: process.env.DAHABPLUS_PAYMENT_NUMBER || null,
      configured: Boolean(process.env.DAHABPLUS_PAYMENT_NUMBER)
    }
  ];
}

module.exports = {
  MOBILE_OFFERS,
  getPaymentMethods
};
