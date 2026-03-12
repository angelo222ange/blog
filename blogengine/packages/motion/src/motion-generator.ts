/**
 * Generate motion video slide content from a topic using OpenAI.
 * Returns structured MotionSlide[] ready for Remotion rendering.
 *
 * V2: Context-aware — receives full site info (theme, city, business type)
 * so the AI generates content relevant to the actual business, not generic stats.
 */
import OpenAI from "openai";
import type { MotionSlide, MotionVideoConfig } from "./types.js";
import { getTemplate, MOTION_TEMPLATES } from "./templates/presets.js";

const MOTION_SYSTEM_PROMPT = `Tu es un expert en motion design pour les reseaux sociaux.
Tu crees des slides pour des videos courtes (15-45 secondes) qui captent l'attention.

REGLES ABSOLUES:
- Ecris en francais
- Chaque slide a un titre COURT (max 8 mots) et un sous-titre explicatif
- Le hook (premiere slide) doit etre PERCUTANT, controversant ou intriguant
- Utilise des chiffres quand possible (les stats attirent l'oeil)
- Le CTA final doit etre actionnable et mentionner la marque
- Pas d'emoji
- Style copywriting: phrases courtes, percutantes, factuelles
- Le highlight est un mot-cle ou chiffre a mettre en evidence (optionnel)

REGLE CONTEXTE CRITIQUE:
- Tu dois IMPERATIVEMENT rester dans le contexte du metier / secteur d'activite du projet
- Si le projet est un service de rideau metallique, TOUS les contenus doivent parler de rideaux metalliques
- JAMAIS de stats generiques type "95% des entreprises echouent" ou "la digitalisation est un defi" si le sujet n'est pas la tech/digital
- Les stats doivent etre SPECIFIQUES au secteur : ex. pour rideau metallique "30% des cambriolages passent par un rideau defaillant"
- Le probleme doit etre un vrai probleme que le client cible rencontre dans CE secteur

Pour chaque slide, fournis aussi un "imagePrompt" : une description EN ANGLAIS de l'image de fond ideale pour cette slide.
Le imagePrompt doit etre precis et en rapport direct avec le contenu de la slide et le metier.

TYPES DE SLIDES:
- hook: Accroche qui arrete le scroll
- problem: Probleme identifie par le public cible (specifique au secteur)
- value: Solution, conseil, benefice concret
- proof: Preuve sociale, stat sectorielle, temoignage
- stat: Chiffre choc specifique au secteur
- quote: Citation inspirante liee au metier
- cta: Appel a l'action avec mention de la marque

Tu dois retourner un JSON avec la structure:
{
  "slides": [
    {
      "slideType": "hook|problem|value|proof|stat|quote|cta",
      "title": "Titre court",
      "subtitle": "Sous-titre explicatif (optionnel)",
      "highlight": "Mot-cle ou chiffre (optionnel)",
      "imagePrompt": "Professional photo of... (EN ANGLAIS, precis, specifique au contenu)"
    }
  ]
}`;

// Business context descriptions per site theme/name pattern
const BUSINESS_CONTEXTS: Record<string, string> = {
  "rideau": "Service de depannage, reparation et installation de rideaux metalliques pour commerces et locaux professionnels. Clients: commercants, restaurateurs, gestionnaires de locaux. Produits: rideaux metalliques a lames, grilles extensibles, moteurs tubulaires, serrures de rideau.",
  "drm": "Service de depannage, reparation et installation de rideaux metalliques pour commerces et locaux professionnels. Clients: commercants, restaurateurs, gestionnaires de locaux. Produits: rideaux metalliques a lames, grilles extensibles, moteurs tubulaires, serrures de rideau.",
  "serrurier": "Service de serrurerie : ouverture de porte, changement de serrure, installation de verrous, blindage de porte. Clients: particuliers et professionnels. Interventions d'urgence 24h/24.",
  "plomb": "Service de plomberie : debouchage, fuite d'eau, installation sanitaire, chauffe-eau. Clients: particuliers et syndics. Interventions rapides.",
  "electri": "Service d'electricite : mise aux normes, depannage, installation tableau electrique, eclairage. Clients: particuliers et entreprises.",
  "demenag": "Service de demenagement : demenagement particuliers et entreprises, garde-meuble, monte-meuble. Clients: particuliers et societes.",
  "nettoy": "Service de nettoyage professionnel : nettoyage de bureaux, vitres, fin de chantier, parties communes. Clients: entreprises, syndics, commerces.",
  "saas": "Plateforme SaaS / logiciel en ligne. Clients: entreprises, startups, professionnels. Focus: productivite, automatisation, ROI.",
};

function getBusinessContext(siteName: string, siteTheme: string): string {
  const name = siteName.toLowerCase();
  for (const [key, context] of Object.entries(BUSINESS_CONTEXTS)) {
    if (name.includes(key)) return context;
  }
  if (siteTheme === "SAAS") return BUSINESS_CONTEXTS["saas"]!;
  return "";
}

export type GenerateOptions = {
  topic: string;
  templateId?: string;
  slideCount?: number;
  brandName?: string;
  apiKey: string;
  // V2: Site context for relevant content
  siteTheme?: string;
  city?: string | null;
  siteName?: string;
  keywords?: string[];
};

export async function generateMotionSlides(
  options: GenerateOptions
): Promise<MotionVideoConfig> {
  const { topic, templateId, slideCount, brandName, apiKey, siteTheme, city, siteName, keywords } = options;

  const template = templateId ? getTemplate(templateId) : undefined;
  const targetSlides = slideCount || template?.defaultSlides.length || 5;

  const openai = new OpenAI({ apiKey });

  const templateHint = template
    ? `\nUtilise le format "${template.name}": ${template.description}\nStructure des slides attendue: ${template.defaultSlides.map((s) => s.slideType).join(" -> ")}`
    : `\nCree ${targetSlides} slides avec une structure narrative logique.`;

  // Build rich context about the business
  const businessContext = getBusinessContext(siteName || brandName || "", siteTheme || "");
  const contextBlock = [
    brandName ? `Marque: ${brandName}` : "",
    city ? `Ville: ${city}` : "",
    siteTheme ? `Type: ${siteTheme}` : "",
    keywords?.length ? `Mots-cles du secteur: ${keywords.join(", ")}` : "",
    businessContext ? `\nCONTEXTE METIER (IMPORTANT - reste dans ce secteur):\n${businessContext}` : "",
  ].filter(Boolean).join("\n");

  const userPrompt = `Genere les slides pour une video motion design sur le sujet suivant:
"${topic}"

${contextBlock}
${templateHint}

Nombre de slides: ${targetSlides}

RAPPEL: Tous les contenus (stats, problemes, solutions) doivent etre SPECIFIQUES au metier decrit ci-dessus. Pas de contenu generique.
Chaque slide doit avoir un "imagePrompt" en anglais decrivant l'image de fond ideale.

Retourne UNIQUEMENT le JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: MOTION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(raw);
  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error("Invalid response format: missing slides array");
  }

  // Merge AI content with template styling
  const baseSlides = template?.defaultSlides || [];
  const slides: MotionSlide[] = parsed.slides.map(
    (aiSlide: any, i: number) => {
      const baseStyle: Partial<MotionSlide> = baseSlides[i] || baseSlides[baseSlides.length - 1] || {};
      const defaults = {
        backgroundColor: "#0f172a",
        textColor: "#ffffff",
        accentColor: "#3b82f6",
        animation: "fade-in" as const,
        durationFrames: 90,
      };

      return {
        slideType: aiSlide.slideType || baseStyle.slideType || "value",
        title: String(aiSlide.title || "").trim(),
        subtitle: aiSlide.subtitle ? String(aiSlide.subtitle).trim() : undefined,
        highlight: aiSlide.highlight ? String(aiSlide.highlight).trim() : undefined,
        imagePrompt: aiSlide.imagePrompt ? String(aiSlide.imagePrompt).trim() : undefined,
        backgroundColor: baseStyle.backgroundColor || defaults.backgroundColor,
        textColor: baseStyle.textColor || defaults.textColor,
        accentColor: baseStyle.accentColor || defaults.accentColor,
        animation: baseStyle.animation || defaults.animation,
        durationFrames: baseStyle.durationFrames || defaults.durationFrames,
      };
    }
  );

  const totalFrames = slides.reduce((sum, s) => sum + s.durationFrames, 0);

  console.log(
    `[motion] Generated ${slides.length} slides (${(totalFrames / 30).toFixed(1)}s) for: "${topic}"`
  );

  return {
    fps: 30,
    width: 1080,
    height: 1080,
    slides,
    transition: template?.defaultTransition || "fade",
    transitionDurationFrames: 15,
    brandName,
    brandColor: "#3b82f6",
    watermark: false,
    outputFormat: "mp4",
  };
}

export { MOTION_TEMPLATES };
