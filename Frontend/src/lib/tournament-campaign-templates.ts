import type { TournamentCampaignManifest, CampaignCause } from "./hooks/useTournamentCampaign";

export interface CampaignTemplate {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  manifest: TournamentCampaignManifest;
  isPreset?: boolean;
  createdAt?: string;
}

export const PRESET_TEMPLATES: CampaignTemplate[] = [
  {
    id: "preset-nike-31",
    name: "Nike 31 · Speed & Youth Sports Fund",
    category: "Athletics & Sportswear",
    badge: "⚡ Nike 31 Athletics",
    description: "High-octane midnight obsidian with neon volt accents, funding free athletic gear and community courts for youth sports.",
    isPreset: true,
    manifest: {
      identity: {
        campaignTitle: "Nike 31 Speed Championship",
        sponsorName: "Nike",
        disclosureLabel: "Powered by",
        demoDisclaimer: "Official CountDown 31 Tournament Partner",
      },
      theme: {
        primaryColor: "#ffffff",
        secondaryColor: "#ccff00",
        backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        mobileBackgroundImage: "/assets/barnaby/barnaby-field.jpg",
        overlayOpacity: 0.75,
      },
      logoTile: {
        enabled: true,
        logoText: "NIKE",
        animationPreset: "pulse",
        desktopEnabled: true,
        mobileEnabled: true,
      },
      featurePanel: {
        enabled: true,
        headline: "JUST PLAY. NEVER STOP.",
        body: "Precision moves, lightning reflexes, and unstoppable endurance. Level up your game and empower young athletes worldwide.",
      },
      cause: {
        enabled: true,
        label: "Youth Sports Access",
        title: "All-Star Gear & Safe Playgrounds Fund",
        message: "Providing professional shoes, basketballs, and renovated playgrounds for children in underserved neighborhoods.",
        beneficiaryName: "Global Youth Athletic Alliance",
        targetAmount: 50000,
        raisedAmount: 31200,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Fuel NextGen Athletes",
        ctaUrl: "https://nike.com/community",
      },
    },
  },
  {
    id: "preset-adidas-31",
    name: "Adidas 31 · Ocean Plastic & Play",
    category: "Athletics & Sustainable Gear",
    badge: "🌊 Adidas 31 Performance",
    description: "Deep sea obsidian with vibrant cyan stripes, dedicated to turning upcycled ocean plastics into community sports pitches.",
    isPreset: true,
    manifest: {
      identity: {
        campaignTitle: "Adidas 31 Open Cup",
        sponsorName: "Adidas",
        disclosureLabel: "Presented by",
        demoDisclaimer: "Official CountDown 31 Tournament Partner",
      },
      theme: {
        primaryColor: "#ffffff",
        secondaryColor: "#38bdf8",
        backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        mobileBackgroundImage: "/assets/barnaby/barnaby-field.jpg",
        overlayOpacity: 0.72,
      },
      logoTile: {
        enabled: true,
        logoText: "ADIDAS",
        animationPreset: "turntable",
        desktopEnabled: true,
        mobileEnabled: true,
      },
      featurePanel: {
        enabled: true,
        headline: "IMPOSSIBLE IS NOTHING",
        body: "Every move makes an impact. Compete at the highest level while transforming recycled materials into premier sporting grounds.",
      },
      cause: {
        enabled: true,
        label: "Clean Oceans",
        title: "Recycled Ocean Plastics To Turf Pitches",
        message: "Intercepting coastal plastic waste and recycling it into high-performance community football and sports courts.",
        beneficiaryName: "Ocean Play Preservation Trust",
        targetAmount: 35000,
        raisedAmount: 21800,
        currency: "EUR",
        showProgress: true,
        ctaLabel: "Join the Ocean Movement",
        ctaUrl: "https://adidas.com/sustainability",
      },
    },
  },
  {
    id: "preset-moomorrow",
    name: "MooMorrow Pasture Charity",
    category: "Agriculture & Dairy",
    badge: "🥛 Dairy & Pasture",
    description: "Classic green pasture arena with cow mascot animations and direct support for sustainable local dairy farmers.",
    isPreset: true,
    manifest: {
      identity: {
        campaignTitle: "Moomorrow Cup 2026",
        sponsorName: "Moomorrow Farms",
        disclosureLabel: "Presented by",
        demoDisclaimer: "Official CountDown 31 Tournament Partner",
      },
      theme: {
        primaryColor: "#fff4cf",
        secondaryColor: "#8cff65",
        backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        mobileBackgroundImage: "/assets/barnaby/barnaby-field.jpg",
        overlayOpacity: 0.65,
      },
      logoTile: {
        enabled: true,
        logoText: "MOO MORROW",
        animationPreset: "turntable",
        desktopEnabled: true,
        mobileEnabled: true,
      },
      featurePanel: {
        enabled: true,
        headline: "FRESH FROM THE PASTURE",
        body: "Power your next move with pure dairy energy. Every round supports sustainable family farms and healthy school lunches.",
      },
      cause: {
        enabled: true,
        label: "Farm to Table",
        title: "Support Local Dairy Farmers",
        message: "Every move supports sustainable pasture farming and fresh milk donations to local elementary schools.",
        beneficiaryName: "Green Meadow Farmers Trust",
        targetAmount: 25000,
        raisedAmount: 14200,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Support Farmers",
        ctaUrl: "https://example.org/farms",
      },
    },
  },
  {
    id: "preset-cyber-neon",
    name: "Cyber Neon 31 · Code For Tomorrow",
    category: "Gaming & Technology",
    badge: "⚡ Cyberpunk & Tech",
    description: "High-voltage neon grid arena funding open-access coding laptops and STEM workshops for underprivileged youth.",
    isPreset: true,
    manifest: {
      identity: {
        campaignTitle: "Neon Overdrive Invitational",
        sponsorName: "CyberPulse Systems",
        disclosureLabel: "Powered by",
        demoDisclaimer: "CyberPulse Tournament Series 2026",
      },
      theme: {
        primaryColor: "#67e8f9",
        secondaryColor: "#f43f5e",
        backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        mobileBackgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        overlayOpacity: 0.78,
      },
      logoTile: {
        enabled: true,
        logoText: "CYBERPULSE",
        animationPreset: "pulse",
        desktopEnabled: true,
        mobileEnabled: true,
      },
      featurePanel: {
        enabled: true,
        headline: "CODE THE FUTURE",
        body: "Empowering the next generation of software engineers and innovators with hands-on robotics and coding labs.",
      },
      cause: {
        enabled: true,
        label: "Tech Education",
        title: "Coding Laptops for Underprivileged Classrooms",
        message: "Providing laptops, internet access, and interactive coding kits to high-need schools across the country.",
        beneficiaryName: "Global Tech Access Foundation",
        targetAmount: 50000,
        raisedAmount: 34800,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Donate a Laptop",
        ctaUrl: "https://example.org/tech",
      },
    },
  },
  {
    id: "preset-golden-oasis",
    name: "Golden Oasis · Clean Water Wells",
    category: "Eco & Clean Water",
    badge: "💧 Water Relief",
    description: "Luxurious desert oasis aesthetic funding solar-powered drinking water wells in drought-affected villages.",
    isPreset: true,
    manifest: {
      identity: {
        campaignTitle: "Oasis Championship 2026",
        sponsorName: "Oasis Pure Water",
        disclosureLabel: "Sponsored by",
        demoDisclaimer: "Clean Water Global Challenge",
      },
      theme: {
        primaryColor: "#fde047",
        secondaryColor: "#10b981",
        backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        mobileBackgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        overlayOpacity: 0.68,
      },
      logoTile: {
        enabled: true,
        logoText: "OASIS PURE",
        animationPreset: "float",
        desktopEnabled: true,
        mobileEnabled: true,
      },
      featurePanel: {
        enabled: true,
        headline: "WATER IS LIFE",
        body: "Every point scored accelerates clean water infrastructure and sanitation for rural communities in need.",
      },
      cause: {
        enabled: true,
        label: "Clean Water",
        title: "Solar Well Construction Initiative",
        message: "Building solar-powered deep water wells to provide over 100,000 people with safe, clean drinking water for life.",
        beneficiaryName: "Oasis Clean Water Project",
        targetAmount: 30000,
        raisedAmount: 21900,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Fund a Well",
        ctaUrl: "https://example.org/water",
      },
    },
  },
  {
    id: "preset-obsidian-core",
    name: "Obsidian Core · Wildlife Rescue",
    category: "Wildlife & Nature",
    badge: "🌋 Wildlife Rescue",
    description: "Intense volcanic obsidian aesthetic supporting endangered species rehabilitation and rainforest preservation.",
    isPreset: true,
    manifest: {
      identity: {
        campaignTitle: "Obsidian Core Clash",
        sponsorName: "Apex Wildlife Gear",
        disclosureLabel: "Presented by",
        demoDisclaimer: "Apex Conservation League",
      },
      theme: {
        primaryColor: "#fb923c",
        secondaryColor: "#ef4444",
        backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        mobileBackgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        overlayOpacity: 0.74,
      },
      logoTile: {
        enabled: true,
        logoText: "APEX WILD",
        animationPreset: "turntable",
        desktopEnabled: true,
        mobileEnabled: true,
      },
      featurePanel: {
        enabled: true,
        headline: "PROTECT THE WILD",
        body: "Safeguarding critical wildlife corridors and forest sanctuaries for endangered animals worldwide.",
      },
      cause: {
        enabled: true,
        label: "Wildlife Care",
        title: "Endangered Habitat Guardians",
        message: "Funding round-the-clock wildlife rangers and trauma care for rescued animals in critical biodiversity hotspots.",
        beneficiaryName: "Global Wildlife Guardians",
        targetAmount: 40000,
        raisedAmount: 27500,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Adopt an Animal",
        ctaUrl: "https://example.org/wildlife",
      },
    },
  },
  {
    id: "preset-candy-carnival",
    name: "Candy Carnival · Children's Joy",
    category: "Healthcare & Children",
    badge: "🍭 Children's Smiles",
    description: "Vibrant sweet confectionery style funding pediatric hospital play therapy rooms and children's art recovery kits.",
    isPreset: true,
    manifest: {
      identity: {
        campaignTitle: "Candy Cup Bonanza",
        sponsorName: "SugarPop Confections",
        disclosureLabel: "Delivered by",
        demoDisclaimer: "Children's Joy Campaign 2026",
      },
      theme: {
        primaryColor: "#f472b6",
        secondaryColor: "#facc15",
        backgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        mobileBackgroundImage: "/assets/barnaby/barnaby-pasture-arena.jpg",
        overlayOpacity: 0.62,
      },
      logoTile: {
        enabled: true,
        logoText: "SUGARPOP",
        animationPreset: "pulse",
        desktopEnabled: true,
        mobileEnabled: true,
      },
      featurePanel: {
        enabled: true,
        headline: "SPREAD SMILES",
        body: "Bringing art kits, books, and interactive play rooms to children during hospital recovery.",
      },
      cause: {
        enabled: true,
        label: "Pediatric Care",
        title: "Hospital Art & Play Therapy Rooms",
        message: "Designing and equipping joyful play therapy spaces in children's hospitals to support emotional healing.",
        beneficiaryName: "Children's Hospital Joy Fund",
        targetAmount: 20000,
        raisedAmount: 16400,
        currency: "USD",
        showProgress: true,
        ctaLabel: "Send a Toy Box",
        ctaUrl: "https://example.org/kids",
      },
    },
  },
];

const STORAGE_KEY = "cd31_tournament_custom_templates_v1";

export function getStoredCampaignTemplates(): CampaignTemplate[] {
  if (typeof window === "undefined") return PRESET_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const custom: CampaignTemplate[] = raw ? JSON.parse(raw) : [];
    return [...PRESET_TEMPLATES, ...custom];
  } catch (err) {
    console.error("Error reading stored templates:", err);
    return PRESET_TEMPLATES;
  }
}

export function saveCustomCampaignTemplate(
  name: string,
  category: string,
  manifest: TournamentCampaignManifest
): CampaignTemplate {
  const newTemplate: CampaignTemplate = {
    id: `custom-${Date.now()}`,
    name: name.trim() || manifest.identity.campaignTitle || "Custom Campaign Template",
    category: category.trim() || "Custom Brand",
    badge: "✨ Custom Template",
    description: `Custom campaign featuring ${manifest.identity.sponsorName} with ${manifest.cause?.enabled ? `charity cause "${manifest.cause.label}"` : "branded sponsor panel"}.`,
    manifest,
    isPreset: false,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const custom: CampaignTemplate[] = raw ? JSON.parse(raw) : [];
      custom.unshift(newTemplate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch (err) {
      console.error("Error saving custom template:", err);
    }
  }

  return newTemplate;
}

export function deleteCustomCampaignTemplate(templateId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const custom: CampaignTemplate[] = JSON.parse(raw);
    const filtered = custom.filter((t) => t.id !== templateId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Error deleting custom template:", err);
  }
}
