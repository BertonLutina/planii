/** Pays proposés à l'inscription (code ISO 3166-1 alpha-2). */
export interface Country {
  code: string
  name: string
  nameEn: string
}

export const COUNTRIES: Country[] = [
  { code: 'fr', name: 'France', nameEn: 'France' },
  { code: 'be', name: 'Belgique', nameEn: 'Belgium' },
  { code: 'ch', name: 'Suisse', nameEn: 'Switzerland' },
  { code: 'lu', name: 'Luxembourg', nameEn: 'Luxembourg' },
  { code: 'ca', name: 'Canada', nameEn: 'Canada' },
  { code: 'mc', name: 'Monaco', nameEn: 'Monaco' },
  { code: 'ma', name: 'Maroc', nameEn: 'Morocco' },
  { code: 'dz', name: 'Algérie', nameEn: 'Algeria' },
  { code: 'tn', name: 'Tunisie', nameEn: 'Tunisia' },
  { code: 'sn', name: 'Sénégal', nameEn: 'Senegal' },
  { code: 'ci', name: 'Côte d’Ivoire', nameEn: 'Ivory Coast' },
  { code: 'cm', name: 'Cameroun', nameEn: 'Cameroon' },
  { code: 'cd', name: 'RD Congo', nameEn: 'DR Congo' },
  { code: 'cg', name: 'Congo', nameEn: 'Congo' },
  { code: 'ga', name: 'Gabon', nameEn: 'Gabon' },
  { code: 'mg', name: 'Madagascar', nameEn: 'Madagascar' },
  { code: 'mu', name: 'Maurice', nameEn: 'Mauritius' },
  { code: 're', name: 'La Réunion', nameEn: 'Réunion' },
  { code: 'gp', name: 'Guadeloupe', nameEn: 'Guadeloupe' },
  { code: 'mq', name: 'Martinique', nameEn: 'Martinique' },
  { code: 'gf', name: 'Guyane', nameEn: 'French Guiana' },
  { code: 'yt', name: 'Mayotte', nameEn: 'Mayotte' },
  { code: 'nc', name: 'Nouvelle-Calédonie', nameEn: 'New Caledonia' },
  { code: 'pf', name: 'Polynésie française', nameEn: 'French Polynesia' },
  { code: 'gb', name: 'Royaume-Uni', nameEn: 'United Kingdom' },
  { code: 'ie', name: 'Irlande', nameEn: 'Ireland' },
  { code: 'us', name: 'États-Unis', nameEn: 'United States' },
  { code: 'de', name: 'Allemagne', nameEn: 'Germany' },
  { code: 'nl', name: 'Pays-Bas', nameEn: 'Netherlands' },
  { code: 'es', name: 'Espagne', nameEn: 'Spain' },
  { code: 'pt', name: 'Portugal', nameEn: 'Portugal' },
  { code: 'it', name: 'Italie', nameEn: 'Italy' },
  { code: 'gr', name: 'Grèce', nameEn: 'Greece' },
  { code: 'ru', name: 'Russie', nameEn: 'Russia' },
  { code: 'br', name: 'Brésil', nameEn: 'Brazil' },
  { code: 'mx', name: 'Mexique', nameEn: 'Mexico' },
  { code: 'ar', name: 'Argentine', nameEn: 'Argentina' },
  { code: 'cl', name: 'Chili', nameEn: 'Chile' },
  { code: 'co', name: 'Colombie', nameEn: 'Colombia' },
  { code: 'pe', name: 'Pérou', nameEn: 'Peru' },
  { code: 'tz', name: 'Tanzanie', nameEn: 'Tanzania' },
  { code: 'ke', name: 'Kenya', nameEn: 'Kenya' },
  { code: 'za', name: 'Afrique du Sud', nameEn: 'South Africa' },
  { code: 'ae', name: 'Émirats arabes unis', nameEn: 'United Arab Emirates' },
  { code: 'sa', name: 'Arabie saoudite', nameEn: 'Saudi Arabia' },
  { code: 'jp', name: 'Japon', nameEn: 'Japan' },
  { code: 'cn', name: 'Chine', nameEn: 'China' },
  { code: 'in', name: 'Inde', nameEn: 'India' },
  { code: 'au', name: 'Australie', nameEn: 'Australia' },
  { code: 'nz', name: 'Nouvelle-Zélande', nameEn: 'New Zealand' },
]

export function countryName(code: string, lang = 'fr') {
  const c = COUNTRIES.find((x) => x.code === code)
  if (!c) return code
  return lang === 'en' ? c.nameEn : c.name
}
