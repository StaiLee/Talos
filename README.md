<p align="center">
  <img src="public/logo-paritel.svg" alt="Paritel" width="220" />
</p>

# Talos

**Plateforme Paritel de veille, d’analyse et de préparation des réponses aux appels d’offres.**

Talos collecte des consultations publiques, récupère leurs documents, évalue leur pertinence pour Paritel, contrôle l’éligibilité fibre et produit un projet de réponse contrôlable. La version 1.0 comprend une démonstration agentique réelle utilisant DeepSeek, du DCE jusqu’à la simulation de remise.

> **Principe directeur :** Talos prépare et contrôle. Paritel valide, signe et dépose. Aucune candidature n’est transmise automatiquement.

## Fonctionnalités

- **Veille BOAMP** via l’API officielle, avec recherche par mots-clés et mise à jour toutes les 15 minutes.
- **Collecte AJI / MAPA** avec Camoufox, navigation publique et récupération du DCE.
- **Qualification métier** par domaines, score de pertinence, exclusion de travaux hors périmètre et archivage des avis expirés.
- **Pipeline commercial** : nouveaux, en cours et archives, avec suivi des décisions et des dépôts réels.
- **Lecture documentaire** des PDF, DOCX et XLSX, avec OCR français pour les PDF scannés.
- **Analyse IA** des exigences, preuves textuelles, critères, lots et sous-traitance.
- **Adéquation Paritel** entre les demandes du client et les capacités validées ou à vérifier.
- **Éligibilité SFR Business** par adresse, avec résultats FTTH/FTTO, offres et capture de preuve.
- **Génération documentaire** : mémoire DOCX/PDF, matrice XLSX et dossier ZIP.
- **Démonstration IA guidée** avec analyse, qualification, rédaction et contrôle qualité par DeepSeek.
- **Suivi de consommation** par opération et par AO : tokens, cache, modèle, devise et coût estimé.

## Démarrer une démonstration IA

1. Ouvrir le dashboard Talos avec les identifiants configurés.
2. Aller dans **Démonstration IA**.
3. Choisir une offre ou conserver la sélection automatique.
4. Cliquer sur **Lancer la démonstration**.
5. Suivre les états des agents, consulter les preuves et l’audit, puis télécharger les livrables.

La démonstration effectue au maximum trois appels IA : `analyse_dce`, `redaction_memoire` et `controle_qualite_demo`. L’étape finale est un **envoi simulé** : aucun dépôt n’est effectué et l’offre n’est pas marquée comme déposée.

Les documents publics transmis au modèle le sont uniquement pour l’analyse configurée. N’envoyez pas de documents internes ou confidentiels vers une API externe sans validation de Paritel.

## Architecture

```mermaid
flowchart LR
    BOAMP[BOAMP · API] --> WORKER[Worker Talos]
    AJI[AJI · Camoufox] --> WORKER
    WORKER --> DB[(PostgreSQL)]
    DB --> WEB[Dashboard Next.js]
    WEB --> DOCS[Extraction · OCR]
    DOCS --> ANALYSE[Agent Analyste]
    ANALYSE --> QUALIF[Agent Qualification]
    QUALIF --> REDACTION[Agent Rédaction]
    REDACTION --> AUDIT[Agent Contrôleur]
    AUDIT --> REVUE[Validation humaine Paritel]
    REVUE --> DEPOT[Dépôt manuel sur la plateforme]
```

La documentation détaillée contient les schémas de collecte, de séquence agentique, de données et de déploiement : **[docs/architecture.md](docs/architecture.md)**.

## Stack technique

- **Application :** Next.js 16, React 19, TypeScript, Tailwind CSS.
- **Données :** PostgreSQL 18 et Drizzle ORM.
- **Automatisation navigateur :** Camoufox et Playwright.
- **IA :** AI SDK avec fournisseur compatible OpenAI ; DeepSeek Flash dans la démonstration actuelle.
- **Documents :** unpdf, Mammoth, ExcelJS, docx, PDFKit, Tesseract.js et fflate.
- **Exploitation :** Docker Compose, Raspberry Pi, Cloudflare Tunnel et authentification Basic.

## Installation locale

### Prérequis

- Node.js 24 et npm ;
- Docker avec le plugin Compose ;
- Linux avec les dépendances Firefox pour utiliser Camoufox hors Docker.

### Initialisation

```bash
npm ci
cp .env.example .env
./node_modules/.bin/camoufox fetch
```

Sous Linux, les dépendances système du navigateur peuvent être installées avec la commande Playwright adaptée à votre environnement :

```bash
./node_modules/.bin/playwright-core install-deps firefox
```

Configurer ensuite `.env`, puis démarrer PostgreSQL :

```bash
docker compose up -d db
export DATABASE_URL="postgresql://talos:talos@localhost:5432/talos"
npm run db:migrate
npm run db:seed
npm run dev
```

Le dashboard est disponible sur `http://localhost:3000`.

### Environnement Docker complet

```bash
docker compose --profile workers up -d --build
```

Cette commande démarre PostgreSQL, applique les migrations, lance le dashboard et le worker de collecte.

## Configuration

| Variable | Utilité |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL utilisée par l’application et les scripts. |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL pour Docker Compose. |
| `STORAGE_DIR` | Répertoire des documents et des réponses générées. |
| `TALOS_AUTH_USER` | Utilisateur du dashboard. |
| `TALOS_AUTH_PASSWORD` | Mot de passe du dashboard ; obligatoire en exposition distante. |
| `AI_BASE_URL` | Endpoint compatible OpenAI, par exemple `https://api.deepseek.com`. |
| `AI_API_KEY` | Clé du fournisseur IA ; jamais commitée. |
| `AI_MODEL` / `AI_MODEL_FAST` | Modèles principal et rapide. |
| `AI_CURRENCY` | Devise de tarification, par exemple `USD` pour DeepSeek. |
| `AI_INPUT_PRICE_PER_MTOK` | Prix d’un million de tokens d’entrée hors cache. |
| `AI_CACHED_INPUT_PRICE_PER_MTOK` | Prix d’un million de tokens lus en cache. |
| `AI_OUTPUT_PRICE_PER_MTOK` | Prix d’un million de tokens de sortie. |
| `BOAMP_PAGE_SIZE` | Nombre maximal d’avis récupérés par collecte BOAMP. |
| `AJI_ENABLED` | Active ou désactive la collecte AJI du worker. |
| `AJI_MAX_PAGES` | Nombre de pages AJI parcourues par collecte. |

Les coûts affichés sont des **estimations** calculées à partir de l’usage retourné par l’API et des tarifs configurés. Les consoles de facturation du fournisseur restent la référence pour les notes de frais.

## Commandes utiles

| Commande | Action |
|---|---|
| `npm run dev` | Démarre Next.js en développement. |
| `npm run build` | Construit l’application de production. |
| `npm run typecheck` | Vérifie les types TypeScript. |
| `npm run lint` | Exécute ESLint. |
| `npm run db:generate` | Génère une migration Drizzle après modification du schéma. |
| `npm run db:migrate` | Applique les migrations. |
| `npm run db:seed` | Initialise les sources et les données de référence. |
| `npm run collect:boamp` | Lance une collecte BOAMP ponctuelle. |
| `npm run collect:aji` | Lance une collecte AJI ponctuelle. |
| `npm run worker` | Démarre le planificateur de collecte. |
| `npm run clean:text` | Nettoie les textes déjà enregistrés. |

## Structure du projet

```text
src/
├── app/                  # Pages du dashboard et routes HTTP
├── components/           # Interface et parcours utilisateur
├── lib/                  # Base de données, constantes et utilitaires
└── modules/
    ├── ai/               # Client IA structuré et suivi de consommation
    ├── analysis/         # Extraction et qualification du DCE
    ├── connectors/       # BOAMP, AJI, pertinence et nettoyage
    ├── demo/             # Préparation et audit de la démonstration
    ├── documents/        # Import, stockage, extraction et OCR
    ├── eligibility/      # Contrôle SFR Business
    └── generation/       # Mémoire, PDF et matrice de conformité
```

## Sécurité et secrets

- `.env`, `storage/`, les documents sources Paritel et les fichiers OCR sont exclus de Git et des images Docker.
- `.env.example` ne contient que des valeurs fictives ou des valeurs locales non sensibles.
- Les identifiants du dashboard, la clé IA, les mots de passe et les tokens Cloudflare ne doivent jamais être commités.
- GitHub Secret Scanning et Push Protection doivent rester activés.
- Une clé accidentellement publiée doit être **révoquée puis remplacée**, même si le commit est rapidement supprimé.
- Le dépôt ne doit contenir ni tarifs internes, ni dossiers clients, ni données d’authentification.

## Limites de la version 1.0

- La collecte automatique couvre actuellement **BOAMP et AJI**.
- L’IA de démonstration utilise une **API DeepSeek externe**, pas encore un modèle local.
- Orange Business et Helios nécessitent leurs accès ou le réseau interne Paritel.
- Les capacités Paritel non validées ne doivent pas devenir des engagements contractuels.
- Les prix, signatures, validations juridiques et le dépôt final restent humains.
- La réponse générée est un **projet de travail**, jamais un dossier prêt à signer sans revue.

## Références

- [Architecture détaillée et schémas](docs/architecture.md)
- [Tarification DeepSeek](https://api-docs.deepseek.com/quick_start/pricing)
