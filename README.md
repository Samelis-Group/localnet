# LocalNet

LocalNet est une application web de partage de fichiers en réseau local, pensée pour être simple pour les non-techniciens: ouvrir le lien, ajouter un fichier, cliquer sur la personne (ou “Tout le monde”), et partager.

Le projet conserve l’identité visuelle Samelis (palette, polices, style glass) et fonctionne en mode LAN avec un serveur Node/WebSocket optionnel embarqué.

## Fonctionnalités

- **Partage LAN simple**: ajout de fichiers puis envoi direct vers un appareil connecté ou vers tout le monde.
- **Visibilité des fichiers**: `Public` ou `Privé` (destinataires sélectionnés), avec filtrage côté serveur selon le pair.
- **Auto-connexion**: détection automatique du serveur (`settings.serverUrl`, puis `location.origin`, puis `VITE_LOCALNET_SERVER`).
- **Transferts**: upload avec progression (XHR), téléchargement/aperçu, suppression.
- **Multi-appareils**: présence des pairs via WebSocket et synchronisation de la bibliothèque distante.
- **QR code / lien**: partage d’un fichier via page `/partage/:id`.
- **Mode avancé masqué**: navigation simple par défaut; modules avancés (appareils, transferts, membres, messages, admin, dashboard, paramètres détaillés) derrière le réglage `advancedMode`.
- **PWA**: service worker Vite PWA; requêtes `/api/*` et `/ws` en `NetworkOnly`.
- **Thème clair/sombre**: bascule light/dark avec Mantine + variables CSS.
- **Fallback local**: stockage local IndexedDB quand le partage LAN n’est pas disponible.

## Stack technique

- **Frontend**: React 19, TypeScript, Vite 7, React Router 7
- **UI**: Mantine 8, Tabler Icons, Lucide React, CSS custom Samelis
- **État/données**: Zustand, IndexedDB (`idb`)
- **Backend LAN**: Node.js `server/index.mjs`, HTTP + WebSocket (`ws`)
- **PWA**: `vite-plugin-pwa`
- **Qualité**: ESLint, TypeScript strict build (`tsc -b`)

## Structure du projet

```text
.
├── server/
│   ├── index.mjs            # Serveur HTTP/WS LAN, API fichiers, diffusion bibliothèque
│   └── data/                # Runtime local (db.json + fichiers uploadés) - ignoré par git
├── src/
│   ├── app/                 # Router, ErrorBoundary
│   ├── components/          # Layout, UI, fichiers, toaster, QR
│   ├── features/            # Écrans: library, share, networks, transfers, etc.
│   ├── lib/                 # store, transport, lan, transfer, types, db, presence
│   ├── styles/global.css    # Styles globaux + compat + thème
│   ├── theme.ts             # Thème Mantine Samelis
│   └── main.tsx             # Boot app, transport, sync, PWA
├── public/                  # Icônes/fonts statiques
├── .env.example
├── package.json
└── vite.config.ts
```

## Démarrage

### Prérequis

- Node.js 20+ recommandé
- npm ou yarn

### Installation

```bash
npm install
```

### Développement UI

```bash
npm run dev
```

Lance Vite en mode dev. Pour le partage LAN réel entre appareils, utiliser plutôt le mode build + serveur ci-dessous.

### Partage LAN recommandé

```bash
npm run build
npm run server
```

Puis ouvrir sur les appareils du même Wi-Fi:

```text
http://<IP_LAN_DE_L_HOTE>:4173
```

Le serveur sert `dist/`, expose l’API `/api/*` et le WebSocket `/ws`.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Démarre Vite en dev (host exposé) |
| `npm run build` | Build TypeScript + Vite |
| `npm run preview` | Prévisualise le build Vite |
| `npm run typecheck` | Vérification TypeScript sans émission |
| `npm run lint` | ESLint |
| `npm run server` | Serveur LAN Node/WS (`server/index.mjs`) |

## Configuration

Copier `.env.example` en `.env` si besoin:

```bash
cp .env.example .env
```

Variables:

| Variable | Défaut | Description |
|---|---:|---|
| `VITE_LOCALNET_SERVER` | vide | URL serveur LAN explicite (ex: `http://192.168.1.20:4173`) |
| `PORT` | `4173` | Port du serveur LAN |
| `HOST` | `0.0.0.0` | Interface d’écoute du serveur LAN |
| `LOCALNET_MAX_FILE` | `536870912` | Taille max upload (octets, 512 Mo par défaut) |

## API serveur LAN

Base: même origine que l’app (`http://<host>:4173`).

### HTTP

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/health` | État du serveur |
| `GET` | `/api/files?peer=<peerId>` | Liste des fichiers visibles par le pair |
| `POST` | `/api/files` | Upload d’un fichier (corps binaire streamé) |
| `GET` | `/api/files/:id?peer=<peerId>` | Métadonnées d’un fichier |
| `DELETE` | `/api/files/:id?peer=<peerId>` | Supprime un fichier autorisé |
| `GET/HEAD` | `/api/files/:id/blob?peer=<peerId>` | Téléchargement/aperçu du binaire |

Headers utilisés lors de l’upload:

- `X-File-Name`, `X-File-Mime`, `X-File-Folder`, `X-File-Category`
- `X-Owner-Name`, `X-Owner-Id`, `X-Owner-Peer-Id`
- `X-File-Description`, `X-File-Visibility`, `X-File-Allowed`

### WebSocket

- Endpoint: `/ws?peer=<peerId>`
- Événements: `library:snapshot`, `library:add`, `library:update`, `library:remove`
- Les fichiers `restricted` ne sont diffusés qu’aux pairs autorisés/propriétaire.

## Modèle de données (résumé)

`LibraryFile` (frontend):

- identité: `id`, `name`, `size`, `mime`, `category`, `folder`
- propriété: `ownerId`, `ownerName`, `ownerPeerId`
- partage: `visibility` (`public`/`restricted`), `allowedPeerIds`, `allowedNames`
- métadonnées: `tags`, `createdAt`, `downloads`, `description`, `hash`, `starred`
- source: `remote` (fichier serveur) ou local

`Settings` inclut notamment: `serverUrl`, `autoDetectServer`, `displayName`, `advancedMode`, `theme`.

## Sécurité & limites connues

- **Pas d’authentification forte LAN**: conçu pour un réseau local de confiance.
- **Identité de pair session-based**: `peerId` stocké en `sessionStorage`; l’accès restreint repose sur le `peer` fourni par le client (pas une preuve cryptographique).
- **Fichiers privés**: le destinataire doit être connecté au moment de l’envoi pour être ciblé par pair.
- **Métadonnées avancées**: certaines mutations locales avancées ne sont pas toutes synchronisées côté serveur.
- **`server/data/`** contient des données runtime (uploads/db locale) et ne doit pas être commité.

## Validation recommandée

Checklist manuelle avant livraison:

1. `npm run build && npm run server`
2. Ouvrir sur 2 appareils du même Wi-Fi.
3. Vérifier auto-connexion / statut.
4. Envoyer un fichier public à tous.
5. Envoyer un fichier privé à un destinataire.
6. Vérifier visibilité propriétaire/destinataire uniquement.
7. Tester multi-fichiers, vidéo, progression, téléchargement.
8. Vérifier thème clair/sombre et layout mobile.

## Licence

AGPL-3.0-or-later (voir `package.json`).
