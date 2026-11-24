# Architecture de Talos · version 1.0

Ce document décrit l’architecture réellement déployée. Il distingue les automatisations déterministes, les appels IA et les validations humaines.

## 1. Principes de conception

- **Des connecteurs déterministes pour collecter** : une API officielle ou un navigateur automatisé est plus fiable qu’un LLM pour extraire des pages structurées.
- **Des agents IA pour interpréter et rédiger** : l’analyse, la qualification et le contrôle qualité utilisent des sorties JSON validées par des schémas Zod.
- **Des preuves plutôt que des affirmations** : les exigences conservent un extrait du document source et restent soumises à revue.
- **Une validation humaine avant engagement** : prix, capacités non validées, signature et dépôt ne sont pas automatisés.
- **Une mesure de chaque appel IA** : modèle, opération, tokens, cache, coût estimé et devise sont enregistrés.

## 2. Vue d’ensemble

```mermaid
flowchart TB
    subgraph SOURCES[Sources publiques]
        BOAMP[BOAMP · API officielle]
        AJI[AJI / MAPA · pages publiques]
        SFR[SFR Business · éligibilité]
    end

    subgraph TALOS[Plateforme Talos]
        SCHEDULER[Worker · planificateur]
        CONNECTORS[Connecteurs et normalisation]
        DB[(PostgreSQL)]
        STORAGE[(Stockage documentaire)]
        WEB[Next.js · dashboard et API]
        EXTRACT[Extraction PDF / DOCX / XLSX · OCR]
        DEMO[Orchestration de démonstration]
        AI_CLIENT[Client IA structuré · AI SDK]
    end

    DEEPSEEK[DeepSeek Flash · API externe]
    USER[Utilisateur Paritel]
    PLATFORM[Plateforme de remise de l’acheteur]

    BOAMP --> CONNECTORS
    AJI -->|Camoufox| CONNECTORS
    SCHEDULER --> CONNECTORS
    CONNECTORS --> DB
    WEB --> DB
    WEB --> STORAGE
    WEB --> EXTRACT
    EXTRACT --> STORAGE
    EXTRACT --> DB
    DEMO --> EXTRACT
    DEMO --> AI_CLIENT
    AI_CLIENT --> DEEPSEEK
    AI_CLIENT -->|Usage et coût| DB
    WEB -->|Adresse du site| SFR
    SFR -->|FTTH / FTTO et preuve| DB
    USER -->|Pilotage et validation| WEB
    WEB -->|Livrables ZIP| USER
    USER -->|Revue, signature et dépôt manuel| PLATFORM
```

Le scraping et l’IA sont donc deux couches distinctes. Camoufox exécute des scénarios navigateur ; il ne constitue pas un agent IA.

## 3. Collecte et scraping

### Planification

Le worker démarre une collecte au lancement, puis applique les intervalles suivants :

- BOAMP : toutes les **15 minutes** ;
- AJI : toutes les **60 minutes** ;
- un verrou par source évite deux exécutions simultanées ;
- chaque exécution produit une ligne `collection_runs`, y compris en cas d’erreur.

```mermaid
sequenceDiagram
    autonumber
    participant W as Worker Talos
    participant B as API BOAMP
    participant A as AJI / MAPA
    participant F as Filtres métier
    participant D as PostgreSQL
    participant U as Dashboard

    Note over W: Démarrage puis intervalles programmés
    W->>B: Avis des 60 derniers jours et mots-clés télécom
    B-->>W: Enregistrements JSON officiels
    W->>A: Camoufox · consultations publiques
    A-->>W: Références, acheteurs, échéances et liens
    W->>F: Normalisation et nettoyage HTML
    F->>F: Domaines, score, exclusions et dates
    F->>D: Insertion ou mise à jour par source + identifiant externe
    D-->>U: Nouvelles offres dédupliquées
    W->>D: Historique de collecte et santé des sources
```

### Règles de normalisation

Chaque connecteur transforme son avis dans une structure commune :

- identifiant externe et référence ;
- titre, acheteur, ville et département ;
- description et domaines ;
- URL officielle ;
- dates de publication et de remise ;
- score de pertinence et métadonnées propres à la source.

La contrainte `(source_id, external_id)` évite les doublons. Une nouvelle collecte met donc à jour l’avis existant au lieu de le recréer.

### Récupération du DCE

La collecte initiale privilégie les métadonnées de l’avis. Le DCE est récupéré à la demande ou au début de la démonstration :

```mermaid
flowchart LR
    OFFRE[Offre sélectionnée] --> CHECK{Document lisible ?}
    CHECK -->|Oui| EXTRACT[Texte déjà disponible]
    CHECK -->|Non, source AJI avec URL| BROWSER[Camoufox ouvre la consultation]
    BROWSER --> ANON[Visite anonyme si proposée]
    ANON --> DOWNLOAD[Téléchargement des pièces publiques]
    DOWNLOAD --> IMPORT[Import et déduplication SHA-256]
    IMPORT --> FORMAT{Format}
    FORMAT -->|PDF texte| PDF[unpdf]
    FORMAT -->|DOCX| DOCX[Mammoth]
    FORMAT -->|XLSX| XLSX[ExcelJS]
    PDF --> OCR{Texte suffisant ?}
    OCR -->|Non| TESSERACT[Images PDF · Tesseract français]
    OCR -->|Oui| SAVE[Texte et métadonnées en base]
    TESSERACT --> SAVE
    DOCX --> SAVE
    XLSX --> SAVE
    SAVE --> EXTRACT
    CHECK -->|Autre source sans DCE| MANUAL[Import manuel nécessaire]
```

Un document déjà présent mais précédemment en erreur peut être réanalysé sans être téléchargé une seconde fois.

## 4. Chaîne agentique de la démonstration IA

La page `Démonstration IA` pilote de vrais appels HTTP. Chaque étape visuelle ne change d’état qu’après le retour effectif de l’outil ou de l’API concernée.

```mermaid
sequenceDiagram
    autonumber
    actor U as Utilisateur Paritel
    participant UI as Démonstration IA
    participant P as Préparation Talos
    participant DCE as Documents et OCR
    participant AN as Agent Analyste
    participant Q as Qualification Paritel
    participant S as Outil SFR Business
    participant R as Agent Rédaction
    participant C as Agent Contrôleur
    participant DB as PostgreSQL et stockage

    U->>UI: Lancer la démonstration
    UI->>P: Sélection automatique ou dossier choisi
    P->>DCE: Vérifier ou récupérer le DCE
    DCE-->>P: Documents lisibles et adresse éventuelle
    P-->>UI: Offre et documents sélectionnés

    UI->>AN: Analyse du corpus documentaire
    AN->>AN: Extraction des exigences et preuves
    AN->>Q: Besoin structuré et capacités Paritel
    Q->>Q: Go / sous conditions / No-Go argumenté
    Q-->>DB: Exigences, synthèse et qualification
    DB-->>UI: Résultat réel de l’analyse

    UI->>S: Contrôle si adresse complète
    S-->>DB: FTTH / FTTO, offres et capture
    DB-->>UI: Résultat ou avertissement de vérification

    UI->>R: Exigences et capacités validées
    R-->>DB: Mémoire DOCX/PDF et matrice XLSX
    DB-->>UI: Liens des livrables générés

    UI->>C: Audit du mémoire Word produit
    C-->>DB: Écarts et validations humaines
    DB-->>UI: Verdict de contrôle qualité
    UI-->>U: Envoi simulé · aucune candidature transmise
```

### Responsabilités des agents

| Composant | Intervention | Limite volontaire |
|---|---|---|
| Orchestrateur | Sélectionne un dossier exploitable et appelle les outils dans l’ordre. | Ne choisit pas seul de déposer. |
| Agent Analyste | Résume le DCE et extrait les exigences avec preuves. | Ne doit inventer aucune exigence. |
| Qualification Paritel | Compare les besoins aux capacités connues et à leur statut de validation. | Une capacité non validée ne devient pas une promesse. |
| Outil SFR | Contrôle l’éligibilité avec un navigateur automatisé. | Ce n’est pas un LLM ; une adresse complète est nécessaire. |
| Agent Rédaction | Produit les sections du mémoire et alimente les livrables. | Aucun prix ni capacité non fournie. |
| Agent Contrôleur | Relit le mémoire Word et signale les écarts. | Ne marque pas le dossier comme déposé. |
| Utilisateur Paritel | Relit, corrige, valide, signe et dépose. | Décision finale obligatoire. |

### Robustesse des appels IA

Le client `src/modules/ai/client.ts` :

- utilise un fournisseur compatible OpenAI ;
- transmet le schéma JSON attendu dans la consigne ;
- valide la réponse avec Zod ;
- désactive le mode réflexion DeepSeek pour la démonstration afin de limiter latence et consommation ;
- limite la taille des corpus et le nombre de tokens de sortie ;
- enregistre les tokens lus en cache avec leur tarif propre ;
- journalise également les appels ayant consommé des tokens avant une erreur de validation.

## 5. Modèle de données

```mermaid
erDiagram
    SOURCES ||--o{ TENDERS : publie
    SOURCES ||--o{ COLLECTION_RUNS : synchronise
    TENDERS ||--o{ DOCUMENTS : contient
    TENDERS ||--o{ REQUIREMENTS : exige
    DOCUMENTS ||--o{ REQUIREMENTS : prouve
    TENDERS ||--o{ RESPONSES : genere
    TENDERS ||--o{ ELIGIBILITY_CHECKS : controle
    TENDERS ||--o{ AI_USAGE : mesure
    TENDERS ||--o{ ACTIVITY_EVENTS : historise

    SOURCES {
        int id
        string slug
        string name
        string status
        datetime last_sync_at
    }
    TENDERS {
        uuid id
        string external_id
        string reference
        string title
        string buyer
        string status
        string go_decision
        int score
        jsonb metadata
    }
    DOCUMENTS {
        uuid id
        uuid tender_id
        string filename
        string sha256
        string status
        text extracted_text
    }
    REQUIREMENTS {
        uuid id
        uuid tender_id
        uuid source_document_id
        string description
        boolean mandatory
        string status
        text evidence
    }
    RESPONSES {
        uuid id
        uuid tender_id
        string kind
        int version
        string status
    }
    AI_USAGE {
        uuid id
        uuid tender_id
        string operation
        string model
        int input_tokens
        int output_tokens
        int cached_tokens
        numeric cost
        string currency
    }
    ELIGIBILITY_CHECKS {
        uuid id
        uuid tender_id
        string operator
        string status
        boolean ftth_eligible
        boolean ftto_eligible
    }
```

Les documents et réponses sont conservés sur le stockage persistant ; PostgreSQL conserve leurs métadonnées et leurs relations. Les versions de réponses sont incrémentées par AO.

## 6. Cycle de vie d’un appel d’offres

```mermaid
stateDiagram-v2
    [*] --> detecte: Avis collecté ou importé
    detecte --> en_cours: Analyse ou prise en charge
    en_cours --> en_cours: Revue des exigences et génération
    en_cours --> depose: Action humaine après dépôt réel
    en_cours --> archive: Abandon ou hors périmètre
    detecte --> archive: Expiration ou hors périmètre
    depose --> gagne: Marché remporté
    depose --> perdu_non_retenu: Non retenu
    depose --> perdu_soutenance: Perdu après soutenance
    gagne --> [*]
    perdu_non_retenu --> [*]
    perdu_soutenance --> [*]
    archive --> [*]
```

La démonstration IA ne réalise pas la transition `depose`. Cette transition appartient à l’utilisateur après une remise effective.

## 7. Déploiement actuel

```mermaid
flowchart TB
    USER[Navigateur Paritel] --> INTERNET[HTTPS]
    INTERNET --> CF[Cloudflare · talos.stailee.com]
    CF --> TUNNEL[Cloudflare Tunnel sur Raspberry Pi]

    subgraph PI[Raspberry Pi · Docker Compose]
        TUNNEL --> PROXY[Proxy Next.js · authentification Basic]
        PROXY --> WEB[Conteneur web]
        WORKER[Conteneur worker] --> DB[(Conteneur PostgreSQL)]
        MIGRATE[Conteneur migrate] --> DB
        WEB --> DB
        WEB --> VOLUME1[(Volume documents)]
        WEB --> VOLUME2[(Cache Camoufox)]
        WORKER --> VOLUME1
        WORKER --> VOLUME2
    end

    WEB --> DEEPSEEK[API DeepSeek]
    WEB --> SFR[SFR Business]
    WORKER --> BOAMP[API BOAMP]
    WORKER --> AJI[AJI / MAPA]
```

### Services Docker

| Service | Rôle |
|---|---|
| `db` | PostgreSQL 18 avec volume persistant et healthcheck. |
| `migrate` | Applique les migrations avant le démarrage du web. |
| `web` | Dashboard, routes API, IA, documents et éligibilité. |
| `worker` | Planification BOAMP/AJI, activé avec le profil `workers`. |

### Volumes

- `talos-db` : données PostgreSQL ;
- `talos-storage` : DCE, réponses et preuves d’éligibilité ;
- `talos-camoufox` : cache du navigateur.

Les secrets sont fournis par `.env` sur le serveur, lu par Docker Compose, et ne sont pas copiés dans Git.

## 8. Correspondance avec le code

| Responsabilité | Emplacement |
|---|---|
| Planification | `src/workers/scheduler.ts` |
| API BOAMP | `src/modules/connectors/boamp.ts` |
| Navigateur AJI | `src/modules/connectors/aji.ts` |
| Score et exclusions | `src/modules/connectors/relevance.ts` |
| Récupération du DCE | `src/modules/documents/retrieve.ts` |
| Extraction et OCR | `src/modules/documents/extract.ts`, `src/modules/documents/ocr.ts` |
| Analyse et qualification | `src/modules/analysis/analyze.ts` |
| Client IA et usage | `src/modules/ai/client.ts` |
| Préparation de la démo | `src/modules/demo/prepare.ts` |
| Audit de la réponse | `src/modules/demo/audit.ts` |
| Génération des livrables | `src/modules/generation/generate.ts` |
| Éligibilité SFR | `src/modules/eligibility/sfr.ts` |
| Interface de démonstration | `src/components/demo-runner.tsx` |
| Authentification | `src/proxy.ts` |

## 9. Sécurité et confidentialité

- L’accès distant est protégé par authentification Basic derrière HTTPS.
- Les fichiers `.env` et les documents internes sont exclus de Git et du contexte Docker.
- GitHub Secret Scanning et Push Protection doivent rester actifs.
- La démonstration actuelle transmet des **documents publics** à DeepSeek ; une API externe ne doit pas recevoir de données internes sans autorisation.
- Les prix, documents clients, mots de passe et tokens d’infrastructure ne font pas partie du dépôt.
- La génération d’un document ne vaut ni validation juridique ni engagement commercial.

## 10. Évolution vers une IA locale

Le client IA étant compatible OpenAI, une cible locale peut remplacer DeepSeek en changeant la configuration du fournisseur, sous réserve de supporter les sorties JSON structurées et la taille de contexte nécessaire.

```mermaid
flowchart LR
    AGENTS[Agents Talos] --> CLIENT[Client IA compatible OpenAI]
    CLIENT -->|Version 1.0| DEEPSEEK[DeepSeek Flash externe]
    CLIENT -->|Cible future| LOCAL[Serveur de modèle local]
    LOCAL --> GPU[Infrastructure Paritel]
    CLIENT --> USAGE[Journalisation des tokens et opérations]
```

Le passage au local devra être validé par des mesures comparables : exactitude des exigences, validité des preuves, taux d’hallucination, latence, mémoire vidéo et coût par dossier. L’investissement matériel ne doit pas être déduit de la seule démonstration externe.
