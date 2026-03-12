import type { ExistingArticle } from "@blogengine/core";

interface PromptContext {
  site: {
    name: string;
    domain: string;
    city?: string;
    department?: string;
    phone?: string;
    theme: "LOCAL_SERVICE" | "SAAS";
  };
  existingArticles: ExistingArticle[];
  sitePages?: string[];
  topicHint?: string;
  newsContext?: string;
  currentYear: number;
}

// Map des departements vers leurs regions et infos
const DEPARTMENT_INFO: Record<string, { region: string; name: string; neighbors: string[] }> = {
  "33": { region: "Nouvelle-Aquitaine", name: "Gironde", neighbors: ["Merignac", "Pessac", "Talence", "Begles", "Cenon", "Lormont", "Le Bouscat", "Bruges"] },
  "34": { region: "Occitanie", name: "Herault", neighbors: ["Lattes", "Castelnau-le-Lez", "Perols", "Grabels", "Juvignac", "Saint-Jean-de-Vedas"] },
  "06": { region: "Provence-Alpes-Cote d'Azur", name: "Alpes-Maritimes", neighbors: ["Cannes", "Antibes", "Grasse", "Cagnes-sur-Mer", "Saint-Laurent-du-Var", "Menton"] },
  "31": { region: "Occitanie", name: "Haute-Garonne", neighbors: ["Blagnac", "Colomiers", "Tournefeuille", "Ramonville", "Balma", "L'Union", "Muret"] },
  "75": { region: "Ile-de-France", name: "Paris", neighbors: ["Boulogne-Billancourt", "Neuilly-sur-Seine", "Levallois-Perret", "Vincennes", "Montreuil", "Saint-Denis"] },
  "94": { region: "Ile-de-France", name: "Val-de-Marne", neighbors: ["Creteil", "Vitry-sur-Seine", "Champigny-sur-Marne", "Ivry-sur-Seine", "Maisons-Alfort"] },
  "69": { region: "Auvergne-Rhone-Alpes", name: "Rhone", neighbors: ["Villeurbanne", "Venissieux", "Caluire-et-Cuire", "Bron", "Vaulx-en-Velin"] },
  "13": { region: "Provence-Alpes-Cote d'Azur", name: "Bouches-du-Rhone", neighbors: ["Aix-en-Provence", "Martigues", "Aubagne", "La Ciotat", "Salon-de-Provence"] },
};

export function buildUserPrompt(ctx: PromptContext): string {
  const { site, existingArticles, sitePages, topicHint, newsContext, currentYear } = ctx;

  const existingList = existingArticles.length > 0
    ? existingArticles
        .map((a) => `- "${a.title}" (${a.category || "sans categorie"}) [${a.date}] - mots-cles: ${(a.keywords || []).join(", ")}`)
        .join("\n")
    : "Aucun article existant sur ce site.";

  const deptInfo = site.department ? DEPARTMENT_INFO[site.department] : null;

  const localContext = site.city
    ? `## CONTEXTE GEOGRAPHIQUE COMPLET
- Ville principale : ${site.city}
- Departement : ${deptInfo?.name || "non precise"} (${site.department})
- Region : ${deptInfo?.region || "non precisee"}
- Communes environnantes : ${deptInfo?.neighbors?.join(", ") || "non precisees"}
${site.phone ? `- Telephone de l'entreprise : ${site.phone} (utilise CE numero exact, ne l'invente PAS)` : "- Telephone : NON FOURNI. Ne mets AUCUN numero de telephone dans l'article."}

OBLIGATION : cet article est pour un site de SERVICE LOCAL. Tu DOIS :
- Mentionner "${site.city}" dans le titre
- Mentionner "${site.city}" dans l'intro
- Mentionner "${site.city}" dans au moins 3 sections sur 6
- Mentionner "${site.city}" dans le TLDR
- Mentionner "${site.city}" dans la conclusion
- Mentionner "${deptInfo?.name || "le departement"} (${site.department})" au moins 2 fois
- Mentionner "${deptInfo?.region || "la region"}" au moins 1 fois
- Citer au moins 2 communes de : ${deptInfo?.neighbors?.join(", ") || "la peripherie"}`
    : `## CONTEXTE
- Site national / pas de localisation specifique.
- Ne PAS mentionner de ville specifique sauf si pertinent pour le contenu.`;

  const pagesContext = sitePages && sitePages.length > 0
    ? `## PAGES EXISTANTES DU SITE (pour le maillage interne ET anti-cannibalisation)
Utilise ces URLs pour les liens internes :
${sitePages.map((p) => `- ${p}`).join("\n")}

## ANTI-CANNIBALISATION SEO - REGLE CRITIQUE
Ces pages existent deja sur le site et ciblent des requetes specifiques.
Tu NE DOIS PAS creer un article de blog qui cible la meme requete principale qu'une page existante.

Exemples de cannibalisation a EVITER :
- Page existante : /installation-rideau-metallique -> NE PAS faire un article "Installation Rideau Metallique a ${site.city || "..."} en ${currentYear}"
- Page existante : /depannage-rideau-metallique -> NE PAS faire un article "Depannage Rideau Metallique a ${site.city || "..."}"
- Page existante : /prix-rideau-metallique -> NE PAS faire un article "Prix Rideau Metallique ${currentYear}"

A la place, cible une SOUS-REQUETE ou un ANGLE DIFFERENT :
- Page /installation existe -> article "Comment Preparer l'Installation de votre Rideau Metallique" ou "Les 5 Erreurs a Eviter lors de l'Installation"
- Page /depannage existe -> article "Rideau Metallique Bloque : 7 Causes et Solutions Rapides"
- Page /prix existe -> article "Comment Reduire le Cout de votre Rideau Metallique sans Sacrifier la Qualite"

Le but de l'article de blog est de capter du trafic sur des requetes LONGUE TRAINE (informationnelles, comparatives, probleme/solution) et de REDIRIGER ce trafic vers les pages commerciales via le maillage interne. L'article NE DOIT PAS concurrencer les pages existantes.`
    : `## MAILLAGE INTERNE
Aucune page specifique fournie. Utilise des URLs logiques :
- /contact (page de contact)
- /depannage (page depannage si service local)
- /installation (page installation si pertinent)
- / (page d'accueil)`;

  const topicSection = topicHint
    ? `## SUJET IMPOSE
L'article DOIT traiter de : "${topicHint}"
Si un article similaire existe deja dans la liste ci-dessous, trouve un angle COMPLETEMENT DIFFERENT (autre intention de recherche, autre public cible, autre format).`
    : `## CHOIX DU SUJET
Analyse les articles existants ET les pages du site ci-dessous et choisis un sujet qui :
1. N'est PAS deja couvert par un article existant (ni de pres ni de loin)
2. NE CIBLE PAS la meme requete principale qu'une page commerciale du site (anti-cannibalisation)
3. Correspond a une requete LONGUE TRAINE informationnelle avec du volume de recherche
4. Apporte une valeur UNIQUE que le lecteur ne trouvera pas ailleurs
5. Sert de porte d'entree pour rediriger vers les pages commerciales du site

INTERDIT : cibler directement "installation X", "depannage X", "prix X" si ces pages existent deja sur le site.
PRIVILEGIER : les angles probleme/solution, guide pratique, erreurs a eviter, comparatif, saisonnier.

Formats qui rankent le mieux SANS cannibaliser les pages commerciales :
- "Comment [resoudre un probleme specifique] a ${site.city || "..."} en ${currentYear}" (intention informationnelle)
- "Les X erreurs a eviter quand [action]" (engagement fort, longue traine)
- "X vs Y : Comparatif ${currentYear} pour Bien Choisir" (intention comparative)
- "[Probleme specifique] ? X Causes et Solutions Rapides" (intention urgente, longue traine)
- "Pourquoi [phenomene] et Comment y Remedier a ${site.city || "..."}" (informationnel)
- "Guide Complet : [sujet technique precis] en ${currentYear}" (informationnel approfondi)
- "[Sujet] en [saison/periode] : Ce qu'il Faut Savoir" (saisonnier)`;

  return `## INFORMATIONS DU SITE
- Nom commercial : ${site.name}
- Domaine : ${site.domain || "non defini"}
- Secteur : ${site.theme === "SAAS" ? "SaaS / Application web / Service en ligne" : "Artisan / Service local / Depannage"}

${localContext}

${topicSection}

${pagesContext}

## ARTICLES DEJA PUBLIES (INTERDICTION de dupliquer un sujet existant)
${existingList}

${newsContext || ""}

## PARAMETRES
- Annee en cours : ${currentYear}
- Date de publication : ${new Date().toISOString().split("T")[0]}
- Langue : Francais (France)

## RAPPEL FINAL - TRES IMPORTANT
- MINIMUM 2500 mots au total (intro 100 mots + 6 sections de 300+ mots chacune + conclusion 100 mots)
- EXACTEMENT 6 sections, chacune avec 4-5 PARAGRAPHES DEVELOPPES (pas des phrases courtes)
- EXACTEMENT 5 FAQ avec reponses de 3-4 phrases
- EXACTEMENT 10 keywords
- Au moins 1 section avec "list", au moins 1 section avec "table"
- JSON valide UNIQUEMENT en reponse, rien d'autre
- Si une section fait moins de 300 mots, DEVELOPPE-LA avec des exemples concrets, des chiffres, des comparaisons, des cas pratiques reels

Genere l'article maintenant. ECRIS LONG. Chaque section = 4-5 paragraphes de 3-4 phrases.`;
}
