/**
 * Niche Trend Queries — maps site theme to platform search queries.
 * Used by the trend crawler to find top-performing posts in the site's niche.
 */

/** Query sets per theme, with FR and EN variants */
const THEME_QUERIES: Record<string, { fr: string[]; en: string[] }> = {
  LOCAL_SERVICE: {
    fr: [
      "artisan local conseils",
      "service de proximite qualite",
      "depannage urgence domicile",
      "artisan professionnel avis",
    ],
    en: [
      "local service tips",
      "home repair professional advice",
      "handyman business tips",
      "local contractor marketing",
    ],
  },
  RIDEAU_METALLIQUE: {
    fr: [
      "rideau metallique securite commerce",
      "protection vitrine magasin",
      "securite commerces fermeture",
      "rideau de fer boutique",
    ],
    en: [
      "roller shutter security",
      "shop front protection",
      "commercial security shutters",
      "storefront security tips",
    ],
  },
  SERRURERIE: {
    fr: [
      "serrurerie conseils securite",
      "changement serrure porte",
      "securite maison serrure",
      "serrurier depannage",
    ],
    en: [
      "locksmith tips security",
      "door lock upgrade",
      "home security locks",
      "locksmith business advice",
    ],
  },
  PLOMBERIE: {
    fr: [
      "plomberie conseils entretien",
      "fuite eau reparation",
      "plombier astuces",
      "installation sanitaire",
    ],
    en: [
      "plumbing tips maintenance",
      "water leak repair DIY",
      "plumber business advice",
      "bathroom renovation plumbing",
    ],
  },
  ELECTRICITE: {
    fr: [
      "electricite securite maison",
      "installation electrique conseils",
      "electricien depannage",
      "norme electrique renovation",
    ],
    en: [
      "electrical safety tips home",
      "electrician business advice",
      "electrical installation tips",
      "home wiring upgrade",
    ],
  },
  DEMENAGEMENT: {
    fr: [
      "demenagement conseils astuces",
      "organiser demenagement",
      "demenageur professionnel",
      "cartons demenagement astuce",
    ],
    en: [
      "moving tips advice",
      "professional movers business",
      "packing tips moving",
      "relocation checklist",
    ],
  },
  NETTOYAGE: {
    fr: [
      "nettoyage professionnel entreprise",
      "proprete locaux conseils",
      "menage professionnel astuces",
      "nettoyage industriel",
    ],
    en: [
      "professional cleaning tips",
      "commercial cleaning business",
      "cleaning service marketing",
      "deep cleaning advice",
    ],
  },
  SAAS: {
    fr: [
      "SaaS marketing strategie",
      "logiciel en ligne croissance",
      "startup SaaS conseils",
      "product-led growth SaaS",
    ],
    en: [
      "SaaS growth tips",
      "B2B SaaS marketing",
      "product-led growth strategy",
      "SaaS startup advice",
    ],
  },
  ECOMMERCE: {
    fr: [
      "ecommerce vente en ligne conseils",
      "boutique en ligne marketing",
      "conversion ecommerce",
      "shopify strategie vente",
    ],
    en: [
      "ecommerce marketing tips",
      "online store growth",
      "ecommerce conversion rate",
      "dropshipping business advice",
    ],
  },
  COACHING: {
    fr: [
      "coaching developpement personnel",
      "coach professionnel conseils",
      "formation coaching business",
      "accompagnement professionnel",
    ],
    en: [
      "life coaching tips",
      "business coaching advice",
      "coaching practice marketing",
      "personal development coaching",
    ],
  },
  MENUISERIE: {
    fr: [
      "menuiserie bois artisanat",
      "menuisier professionnel conseils",
      "travail du bois astuces",
      "fabrication sur mesure bois",
    ],
    en: [
      "woodworking tips business",
      "carpentry professional advice",
      "custom furniture making",
      "woodworking shop marketing",
    ],
  },
  PEINTURE: {
    fr: [
      "peinture maison conseils",
      "peintre professionnel astuces",
      "renovation peinture interieur",
      "choix couleur peinture",
    ],
    en: [
      "painting business tips",
      "house painting advice",
      "interior painting trends",
      "painting contractor marketing",
    ],
  },
  TOITURE: {
    fr: [
      "toiture entretien conseils",
      "couvreur professionnel",
      "renovation toiture",
      "etancheite toit reparation",
    ],
    en: [
      "roofing business tips",
      "roof repair advice",
      "roofing contractor marketing",
      "roof maintenance checklist",
    ],
  },
  CLIMATISATION: {
    fr: [
      "climatisation entretien conseils",
      "installation clim pompe chaleur",
      "chauffage climatisation pro",
      "economie energie climatisation",
    ],
    en: [
      "HVAC business tips",
      "air conditioning maintenance",
      "HVAC marketing advice",
      "energy efficiency heating cooling",
    ],
  },
  VITRERIE: {
    fr: [
      "vitrerie reparation vitrage",
      "vitrier professionnel conseils",
      "remplacement vitre double vitrage",
      "miroiterie sur mesure",
    ],
    en: [
      "glass repair tips",
      "glazier business advice",
      "window replacement marketing",
      "glass installation professional",
    ],
  },
};

/** Detect the best theme key from site name + theme string */
function detectThemeKey(siteName: string, theme: string): string {
  const combined = `${siteName} ${theme}`.toLowerCase();

  const matchers: Array<[string, string[]]> = [
    ["RIDEAU_METALLIQUE", ["rideau", "drm", "shutter"]],
    ["SERRURERIE", ["serrur", "lock"]],
    ["PLOMBERIE", ["plomb", "plumbing"]],
    ["ELECTRICITE", ["electri"]],
    ["DEMENAGEMENT", ["demenag", "moving"]],
    ["NETTOYAGE", ["nettoy", "clean"]],
    ["MENUISERIE", ["menuisi", "wood", "carpent"]],
    ["PEINTURE", ["peintur", "paint"]],
    ["TOITURE", ["toitur", "roof"]],
    ["CLIMATISATION", ["climati", "hvac"]],
    ["VITRERIE", ["vitri", "glass", "glaz"]],
    ["SAAS", ["saas", "software", "tech"]],
    ["ECOMMERCE", ["commerce", "shop", "boutique", "ecommerce"]],
    ["COACHING", ["coach", "formation", "conseil"]],
  ];

  for (const [key, patterns] of matchers) {
    if (patterns.some((p) => combined.includes(p))) {
      return key;
    }
  }

  return theme.toUpperCase().replace(/\s+/g, "_");
}

export interface NicheQuery {
  platform: "twitter" | "facebook";
  query: string;
  lang: "fr" | "en";
}

/**
 * Build search queries for a site's niche.
 * Returns queries for both Twitter and Facebook in FR + EN.
 */
export function buildNicheQueries(
  siteName: string,
  theme: string,
  city?: string | null,
): NicheQuery[] {
  const themeKey = detectThemeKey(siteName, theme);
  const querySet = THEME_QUERIES[themeKey] || THEME_QUERIES.LOCAL_SERVICE!;

  const queries: NicheQuery[] = [];

  // Twitter queries — FR + EN
  for (const q of querySet.fr) {
    const localQuery = city ? `${q} ${city}` : q;
    queries.push({ platform: "twitter", query: localQuery, lang: "fr" });
  }
  for (const q of querySet.en) {
    queries.push({ platform: "twitter", query: q, lang: "en" });
  }

  // Facebook queries — FR + EN
  for (const q of querySet.fr) {
    const localQuery = city ? `${q} ${city}` : q;
    queries.push({ platform: "facebook", query: localQuery, lang: "fr" });
  }
  for (const q of querySet.en) {
    queries.push({ platform: "facebook", query: q, lang: "en" });
  }

  return queries;
}
