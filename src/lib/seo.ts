type SeoEntry = { title: string; description: string; robots?: string }

const SITE = 'https://localnet.samelis.org'
const DEFAULT: SeoEntry = {
  title: 'LocalNet — Partage de fichiers en réseau local simple et rapide',
  description: 'Partagez des fichiers entre appareils sur le même Wi-Fi, sans Internet. Simple, rapide, public ou privé.',
}

const ROUTES: Record<string, SeoEntry> = {
  '/bibliotheque': { title: 'Bibliothèque partagée — LocalNet', description: 'Ajoutez et partagez des fichiers en réseau local en quelques clics.' },
  '/reseaux': { title: 'Appareils connectés — LocalNet', description: 'Voir les appareils connectés et partager par QR code ou lien local.' },
  '/transferts': { title: 'Transferts — LocalNet', description: 'Suivez les transferts de fichiers en cours sur votre réseau local.', robots: 'noindex,nofollow' },
  '/membres': { title: 'Membres — LocalNet', description: 'Gestion des membres LocalNet.', robots: 'noindex,nofollow' },
  '/messages': { title: 'Messages — LocalNet', description: 'Messagerie locale LocalNet.', robots: 'noindex,nofollow' },
  '/administration': { title: 'Administration — LocalNet', description: 'Administration LocalNet.', robots: 'noindex,nofollow' },
  '/parametres': { title: 'Paramètres — LocalNet', description: 'Paramètres LocalNet.', robots: 'noindex,nofollow' },
  '/tableau-de-bord': { title: 'Tableau de bord — LocalNet', description: 'Tableau de bord LocalNet.', robots: 'noindex,nofollow' },
}

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute('content', content)
}

export function applySeo(pathname: string) {
  const route = pathname.startsWith('/partage/') ? { title: 'Fichier partagé — LocalNet', description: 'Téléchargez un fichier partagé sur LocalNet.', robots: 'noindex,nofollow' } : (ROUTES[pathname] ?? DEFAULT)
  document.title = route.title
  const url = `${SITE}${pathname === '/' ? '/' : pathname}`
  upsertMeta('meta[name="description"]', 'name', 'description', route.description)
  upsertMeta('meta[name="robots"]', 'name', 'robots', route.robots ?? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1')
  upsertMeta('meta[property="og:title"]', 'property', 'og:title', route.title)
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', route.description)
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', url)
  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', route.title)
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', route.description)
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
  canonical.href = url
}
