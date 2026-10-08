import type { AppLocale } from "@/lib/appearance";

const dictionaries = {
  fr: {
    brand: "Campagnes",
    nav: {
      overview: "Vue d'ensemble",
      contacts: "Contacts",
      campaigns: "Campagnes",
      media: "Médias",
      templates: "Templates",
      team: "Équipe",
      settings: "Paramètres",
    },
    menu: {
      organisations: "Organisations",
      branches: "Mes succursales",
      siege: "Administration siège",
      signOut: "Déconnexion",
    },
    settings: {
      title: "Paramètres",
      subtitle: "Réglages de l'organisation",
      whatsappTitle: "WhatsApp",
      whatsappBody:
        "La connexion Klambo est gérée au siège pour toutes les succursales.",
      connected: "Connecté",
      notConfigured: "Non configuré",
      openWhatsapp: "Ouvrir Siège → WhatsApp",
      askAdmin: "Contactez un administrateur siège pour configurer la clé API.",
      appearance: "Apparence",
      appearanceDesc:
        "Couleurs et langue de cette organisation. Rouge, blanc et bleu sont les valeurs par défaut.",
      colors: "Couleurs",
      red: "Rouge",
      white: "Blanc",
      blue: "Bleu",
      language: "Langue",
      languageDesc: "Français, anglais ou portugais (Portugal).",
      save: "Enregistrer",
      saving: "Enregistrement…",
      saved: "Apparence enregistrée",
      reset: "Couleurs par défaut",
    },
  },
  en: {
    brand: "Campaigns",
    nav: {
      overview: "Overview",
      contacts: "Contacts",
      campaigns: "Campaigns",
      media: "Media",
      templates: "Templates",
      team: "Team",
      settings: "Settings",
    },
    menu: {
      organisations: "Organisations",
      branches: "My branches",
      siege: "Head-office admin",
      signOut: "Sign out",
    },
    settings: {
      title: "Settings",
      subtitle: "Organisation preferences",
      whatsappTitle: "WhatsApp",
      whatsappBody: "The Klambo connection is managed at head office for every branch.",
      connected: "Connected",
      notConfigured: "Not configured",
      openWhatsapp: "Open head office → WhatsApp",
      askAdmin: "Ask a head-office administrator to configure the API key.",
      appearance: "Appearance",
      appearanceDesc:
        "Colours and language for this organisation. Red, white and blue are the defaults.",
      colors: "Colours",
      red: "Red",
      white: "White",
      blue: "Blue",
      language: "Language",
      languageDesc: "French, English or Portuguese (Portugal).",
      save: "Save",
      saving: "Saving…",
      saved: "Appearance saved",
      reset: "Default colours",
    },
  },
  pt: {
    brand: "Campanhas",
    nav: {
      overview: "Visão geral",
      contacts: "Contactos",
      campaigns: "Campanhas",
      media: "Multimédia",
      templates: "Modelos",
      team: "Equipa",
      settings: "Definições",
    },
    menu: {
      organisations: "Organizações",
      branches: "As minhas sucursais",
      siege: "Administração da sede",
      signOut: "Terminar sessão",
    },
    settings: {
      title: "Definições",
      subtitle: "Preferências da organização",
      whatsappTitle: "WhatsApp",
      whatsappBody:
        "A ligação Klambo é gerida na sede para todas as sucursais.",
      connected: "Ligado",
      notConfigured: "Não configurado",
      openWhatsapp: "Abrir sede → WhatsApp",
      askAdmin: "Contacte um administrador da sede para configurar a chave API.",
      appearance: "Aparência",
      appearanceDesc:
        "Cores e idioma desta organização. Vermelho, branco e azul são os valores predefinidos.",
      colors: "Cores",
      red: "Vermelho",
      white: "Branco",
      blue: "Azul",
      language: "Idioma",
      languageDesc: "Francês, inglês ou português (Portugal).",
      save: "Guardar",
      saving: "A guardar…",
      saved: "Aparência guardada",
      reset: "Cores predefinidas",
    },
  },
};

export type Messages = (typeof dictionaries)["fr"];

export function messagesFor(locale: AppLocale): Messages {
  return dictionaries[locale] as Messages;
}
