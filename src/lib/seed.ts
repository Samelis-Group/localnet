import { AVATAR_COLORS, DEFAULT_PERMISSIONS } from './format'
import type { Activity, Announcement, AppSnapshot, ChatMessage, LibraryFile, Network, Transfer, User } from './types'

const now = Date.now()
const min = 60_000
const hour = 60 * min
const day = 24 * hour

const makeUser = (id: string, name: string, email: string, role: User['role'], device: string, colorIndex: number): User => ({
  id,
  name,
  email,
  role,
  color: AVATAR_COLORS[colorIndex],
  joinedAt: now - (30 + colorIndex * 4) * day,
  lastSeen: now - colorIndex * 17 * min,
  blocked: false,
  permissions: DEFAULT_PERMISSIONS[role],
  device,
})

export const seedUsers: User[] = [
  makeUser('me', 'Alex Martin', 'alex@localnet.lan', 'admin', 'Cet appareil', 0),
  makeUser('u-sophie', 'Sophie Diallo', 'sophie@localnet.lan', 'member', 'Firefox · Linux', 1),
  makeUser('u-karim', 'Karim Benali', 'karim@localnet.lan', 'member', 'Chrome · Windows', 2),
  makeUser('u-lea', 'Léa Moreau', 'lea@localnet.lan', 'guest', 'Safari · macOS', 3),
  makeUser('u-thomas', 'Thomas Petit', 'thomas@localnet.lan', 'member', 'Chrome · Android', 4),
]

export const seedNetworks: Network[] = [
  {
    id: 'n-campus',
    name: 'Campus-OpenLab',
    code: 'CAMPUS-7K4',
    description: 'Réseau principal du laboratoire ouvert',
    createdAt: now - 48 * day,
    membersCount: 5,
    encryption: true,
    discovery: true,
    groups: [
      { id: 'g-enseignants', name: 'Enseignants', color: '#01a275', memberIds: ['me', 'u-sophie'] },
      { id: 'g-etudiants', name: 'Étudiants', color: '#3b82f6', memberIds: ['u-karim', 'u-lea', 'u-thomas'] },
    ],
  },
  {
    id: 'n-biblio',
    name: 'Bibliothèque commune',
    code: 'BIBLIO-2M9',
    description: 'Ressources documentaires partagées',
    createdAt: now - 21 * day,
    membersCount: 12,
    encryption: true,
    discovery: false,
    groups: [{ id: 'g-docs', name: 'Documentalistes', color: '#a97bff', memberIds: ['me', 'u-sophie'] }],
  },
  {
    id: 'n-design',
    name: 'Équipe design',
    code: 'DESIGN-5X1',
    description: 'Maquettes et assets du projet',
    createdAt: now - 5 * day,
    membersCount: 3,
    encryption: true,
    discovery: true,
    groups: [],
  },
]

type SeedFile = Omit<LibraryFile, 'createdAt' | 'hash' | 'starred' | 'demoContent'> & {
  age: number
  content?: string
}

const seedFileData: SeedFile[] = [
  { id: 'f-guide', name: 'Guide_de_demarrage.md', size: 2840, mime: 'text/markdown', category: 'documents', folder: 'Documentation', tags: ['guide', 'débutant'], ownerId: 'me', downloads: 48, description: 'Tout pour prendre en main LocalNet en 10 minutes.', age: 2 * hour, canDownload: true, canView: true, content: '# Bienvenue sur LocalNet\n\nVotre réseau. Vos fichiers. Votre communauté.\n\n## Démarrer\n\n1. Connectez un appareil au même réseau local.\n2. Ouvrez l\'interface web sur le port 4173.\n3. Déposez vos fichiers dans la zone de transfert.\n\nAucune connexion Internet n\'est nécessaire.' },
  { id: 'f-charte', name: 'Charte_graphique.pdf', size: 4_820_000, mime: 'application/pdf', category: 'documents', folder: 'Design', tags: ['charte', 'design'], ownerId: 'u-sophie', downloads: 23, description: 'Couleurs, typographies et règles d’usage de la marque.', age: 5 * hour, canDownload: true, canView: true },
  { id: 'f-cours', name: 'Support_TP_Reseau.pdf', size: 2_140_000, mime: 'application/pdf', category: 'documents', folder: 'Cours', tags: ['réseau', 'TP'], ownerId: 'u-karim', downloads: 91, description: 'Support de travaux pratiques sur les réseaux locaux.', age: 1 * day, canDownload: true, canView: true },
  { id: 'f-logo', name: 'logo-localnet.svg', size: 12_400, mime: 'image/svg+xml', category: 'images', folder: 'Design', tags: ['logo', 'assets'], ownerId: 'me', downloads: 67, description: 'Logo officiel en format vectoriel.', age: 8 * hour, canDownload: true, canView: true },
  { id: 'f-photo', name: 'Atelier_collaboration.jpg', size: 3_460_000, mime: 'image/jpeg', category: 'images', folder: 'Événements', tags: ['photo', 'atelier'], ownerId: 'u-lea', downloads: 12, description: 'Photo de l’atelier de collaboration de la semaine dernière.', age: 2 * day, canDownload: true, canView: true },
  { id: 'f-video', name: 'Presentation_projet.mp4', size: 128_400_000, mime: 'video/mp4', category: 'videos', folder: 'Médias', tags: ['vidéo', 'présentation'], ownerId: 'u-thomas', downloads: 8, description: 'Vidéo de présentation du projet (3 min 42).', age: 3 * day, canDownload: true, canView: false },
  { id: 'f-audio', name: 'Podcast_episode_04.mp3', size: 24_800_000, mime: 'audio/mpeg', category: 'audio', folder: 'Médias', tags: ['podcast'], ownerId: 'u-sophie', downloads: 15, description: 'Épisode 4 : construire un réseau communautaire.', age: 4 * day, canDownload: true, canView: true },
  { id: 'f-archive', name: 'Assets_design_v2.zip', size: 86_200_000, mime: 'application/zip', category: 'archives', folder: 'Design', tags: ['assets', 'archive'], ownerId: 'me', downloads: 31, description: 'Tous les assets graphiques de la version 2.', age: 6 * day, canDownload: true, canView: false },
  { id: 'f-code', name: 'script-backup.sh', size: 4820, mime: 'text/x-shellscript', category: 'code', folder: 'Outils', tags: ['script', 'sauvegarde'], ownerId: 'u-karim', downloads: 44, description: 'Script de sauvegarde automatique des bibliothèques.', age: 7 * day, canDownload: true, canView: true, content: '#!/usr/bin/env bash\nset -euo pipefail\n\necho "Sauvegarde LocalNet..."\ncp -r /srv/localnet/data /backup/localnet-$(date +%F)\necho "Terminé."' },
  { id: 'f-biblio', name: 'Catalogue_2026.csv', size: 184_000, mime: 'text/csv', category: 'documents', folder: 'Bibliothèque', tags: ['catalogue', 'données'], ownerId: 'u-sophie', downloads: 19, description: 'Catalogue complet des ressources de la bibliothèque.', age: 9 * day, canDownload: true, canView: true },
  { id: 'f-plan', name: 'Plan_du_local.svg', size: 8_200, mime: 'image/svg+xml', category: 'images', folder: 'Documentation', tags: ['plan', 'local'], ownerId: 'me', downloads: 5, description: 'Plan schématique de la salle et des points d’accès.', age: 11 * day, canDownload: false, canView: true, content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"><rect width="100" height="60" fill="#060b14"/><rect x="10" y="10" width="35" height="18" fill="#01a275"/><rect x="55" y="10" width="35" height="18" fill="#3b82f6"/><rect x="10" y="36" width="80" height="14" fill="#a97bff"/></svg>' },
  { id: 'f-note', name: 'Notes_reunion.txt', size: 1240, mime: 'text/plain', category: 'documents', folder: 'Réunions', tags: ['notes', 'réunion'], ownerId: 'u-lea', downloads: 7, description: 'Notes de la réunion hebdomadaire.', age: 12 * day, canDownload: true, canView: true, content: 'Réunion du mercredi\n\n- Découverte des appareils : OK\n- Transferts reprisables : OK\n- Prochaine étape : messagerie de groupe' },
]

export const seedFiles: LibraryFile[] = seedFileData.map(({ age, content, ...file }) => ({
  ...file,
  createdAt: now - age,
  hash: undefined,
  starred: false,
  demoContent: content,
  canView: file.canView ?? true,
}))

export const seedTransfers: Transfer[] = [
  { id: 't-1', fileId: 'f-charte', fileName: 'Charte_graphique.pdf', size: 4_820_000, direction: 'upload', peerId: 'u-sophie', peerName: 'Sophie Diallo', status: 'done', offset: 4_820_000, speed: 0, startedAt: now - 5 * hour, endedAt: now - 5 * hour + 18_000 },
  { id: 't-2', fileId: 'f-cours', fileName: 'Support_TP_Reseau.pdf', size: 2_140_000, direction: 'download', peerId: 'u-karim', peerName: 'Karim Benali', status: 'done', offset: 2_140_000, speed: 0, startedAt: now - day, endedAt: now - day + 9_000 },
  { id: 't-3', fileId: 'f-archive', fileName: 'Assets_design_v2.zip', size: 86_200_000, direction: 'upload', peerId: 'me', peerName: 'Cet appareil', status: 'done', offset: 86_200_000, speed: 0, startedAt: now - 6 * day, endedAt: now - 6 * day + 132_000 },
  { id: 't-4', fileId: 'f-video', fileName: 'Presentation_projet.mp4', size: 128_400_000, direction: 'download', peerId: 'u-thomas', peerName: 'Thomas Petit', status: 'paused', offset: 46_800_000, speed: 0, startedAt: now - 2 * day },
]

export const seedMessages: ChatMessage[] = [
  { id: 'm-1', authorId: 'u-sophie', authorName: 'Sophie Diallo', color: AVATAR_COLORS[1], text: 'Bonjour ! La charte graphique est en ligne dans la bibliothèque 👋', createdAt: now - 2 * hour, room: 'general' },
  { id: 'm-2', authorId: 'u-karim', authorName: 'Karim Benali', color: AVATAR_COLORS[2], text: 'Parfait, je récupère le support de TP pour le cours de demain.', createdAt: now - 96 * min, room: 'general' },
  { id: 'm-3', authorId: 'me', authorName: 'Alex Martin', color: AVATAR_COLORS[0], text: 'N’oubliez pas : tout fonctionne sans Internet 😉', createdAt: now - 74 * min, room: 'general' },
  { id: 'm-4', authorId: 'u-thomas', authorName: 'Thomas Petit', color: AVATAR_COLORS[4], text: 'La vidéo de présentation est en cours de transfert, elle arrivera bientôt.', createdAt: now - 38 * min, room: 'general' },
]

export const seedAnnouncements: Announcement[] = [
  { id: 'a-1', title: 'Maintenance du serveur local', body: 'Le serveur sera brièvement redémarré ce soir à 20h. Les transferts repris automatiquement.', authorId: 'me', createdAt: now - 3 * hour, pinned: true },
  { id: 'a-2', title: 'Nouvelle bibliothèque ouverte', body: 'La ressource « Catalogue 2026.csv » vient d’être publiée par Sophie.', authorId: 'u-sophie', createdAt: now - 9 * day, pinned: false },
]

export const seedActivities: Activity[] = [
  { id: 'ac-1', type: 'upload', label: 'Charte_graphique.pdf ajouté à la bibliothèque', createdAt: now - 5 * hour, actorId: 'u-sophie' },
  { id: 'ac-2', type: 'member', label: 'Thomas Petit a rejoint le réseau', createdAt: now - 8 * hour, actorId: 'u-thomas' },
  { id: 'ac-3', type: 'network', label: 'Réseau « Équipe design » créé', createdAt: now - 5 * day, actorId: 'me' },
  { id: 'ac-4', type: 'message', label: 'Nouveau message dans #general', createdAt: now - 38 * min, actorId: 'u-thomas' },
  { id: 'ac-5', type: 'download', label: 'Support_TP_Reseau.pdf téléchargé 3 fois', createdAt: now - day, actorId: 'u-karim' },
  { id: 'ac-6', type: 'security', label: 'Accès invité refusé sur Plan_du_local.svg', createdAt: now - 2 * day, actorId: 'u-lea' },
  { id: 'ac-7', type: 'admin', label: 'Permissions de Léa Moreau mises à jour', createdAt: now - 3 * day, actorId: 'me' },
]

export function createSeedSnapshot(): AppSnapshot {
  return {
    users: seedUsers,
    networks: seedNetworks,
    files: seedFiles,
    transfers: seedTransfers,
    messages: seedMessages,
    announcements: seedAnnouncements,
    activities: seedActivities,
    settings: {
      theme: 'dark',
      networkName: 'Campus-OpenLab',
      autoDiscover: true,
      autoAccept: true,
      chunkSize: 2,
      concurrency: 2,
      serverUrl: '',
      notifications: true,
      compactMode: false,
      advancedMode: false,
      displayName: '',
    },
  }
}
