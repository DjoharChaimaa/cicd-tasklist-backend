# Cicd Tasklist Backend

Backend Node.js/Express pour l’application Tasklist.

## Description

Ce projet implémente l’API REST pour gérer les tâches. Il utilise Express, TypeScript et Prisma pour accéder à la base de données.

## Prérequis

- Node.js 20+ recommandé
- npm
- Base de données supportée par Prisma (SQLite, PostgreSQL, MySQL, etc.)

## Installation

```bash
npm install
```

## Configuration

Le projet charge les variables d’environnement avec `dotenv`. Par défaut, le serveur écoute sur le port `3001`.

Créez un fichier `.env` si nécessaire et définissez les variables suivantes :

```env
PORT=3001
DATABASE_URL=""
```

> Ajustez `DATABASE_URL` en fonction du fournisseur de base de données utilisé.

## Développement

Lancer le serveur en mode développement avec rechargement automatique :

```bash
npm run dev
```

Le backend sera disponible sur `http://localhost:3001` par défaut.

## Build

Compiler le code TypeScript en JavaScript :

```bash
npm run build
```

## Exécution

Après compilation, démarrez l’application :

```bash
npm run start
```

## Tests

Exécuter les tests unitaires :

```bash
npm run test
```

Exécuter les tests e2e :

```bash
npm run test:e2e
```

Exécuter les tests unitaires avec couverture :

```bash
npm run test:coverage
```

Exécuter les tests e2e avec couverture :

```bash
npm run test:e2e:coverage
```

## Prisma

Générer le client Prisma :

```bash
npm run prisma:generate
```

Appliquer les migrations de schéma Prisma :

```bash
npm run prisma:migrate
```

## Structure du projet

- `src/server.ts` : point d’entrée du serveur
- `src/app.ts` : configuration de l’application Express
- `src/routes/task.routes.ts` : routes des tâches
- `src/controllers/task.controller.ts` : logique des endpoints
- `src/services/task.service.ts` : services métiers des tâches
- `src/lib/prisma.ts` : client Prisma
- `src/__tests__/` : tests unitaires et e2e

## Runbook – Erreur Docker Buildx (SBOM / Provenance)

---

## 1. Sujet du runbook

Ce runbook traite d’un problème de Docker Buildx en CI/CD lié à l’activation des attestations de build (SBOM et provenance) qui échouent avec le driver Docker.

---

## 2. Problème traité

Ce runbook couvre le problème suivant en pipeline CI/CD ou local :

> Le build Docker échoue lorsque `--sbom=true` ou `--provenance=true` est activé avec Buildx.

Erreur typique :

```text
ERROR: failed to build: Attestation is not supported for the docker driver.
```

---

## 3. Symptômes

Les symptômes observés sont :

- Build Docker qui échoue en CI/CD (Jenkins, GitHub Actions, local)
- Message d’erreur :

```text
Attestation is not supported for the docker driver
```

- Échec uniquement lorsque :

```text
--sbom=true
--provenance=true
```

- Le build fonctionne si ces options sont désactivées
- Buildx utilise le driver `docker` au lieu de `docker-container`

---

## 4. Qui doit utiliser ce runbook ?

Ce runbook est destiné à :

- DevOps engineers
- Software engineers utilisant Docker + CI/CD
- Maintainers de pipelines Jenkins / GitHub Actions
- Toute personne buildant des images Docker avec Buildx

---

## 5. Quand faut-il l’appliquer ?

### À appliquer immédiatement si :

- Le pipeline CI/CD échoue sur une étape `docker buildx build`
- L’erreur mentionne "Attestation is not supported"
- Le build fonctionnait avant mais casse après ajout de SBOM/provenance

### À appliquer en analyse rapide (J+0)

Dès la première occurrence en CI/CD, car :

- bloque le pipeline
- empêche le push d’image Docker

---

## 6. Quand ne faut-il surtout pas l’appliquer ?

Ne pas appliquer ce runbook si :

- Le problème est lié à :
  - Dockerfile invalide
  - erreur de dépendances Node/Python/Java
  - problème d’auth registry (DockerHub login)
- Le build fonctionne déjà avec attestation activée
- Le builder est déjà correctement configuré avec `docker-container` et aucun error n’apparaît

---

## 7. Étapes de résolution

### Étape 1 – Identifier le builder actif

```bash
docker buildx ls
```

Vérifier si le driver est :

- `docker` → problème
- `docker-container` → OK

### Étape 2 – Solution rapide (désactiver attestations)

Si urgence CI/CD :

```bash
docker buildx build \
  --platform linux/amd64 \
  --tag :latest \
  --sbom=false \
  --provenance=false \
  --push \
  .
```

Permet de débloquer le pipeline immédiatement

### Étape 3 – Solution correcte (recommandée)

Créer un builder compatible :

```bash
docker buildx create \
  --name mybuilder \
  --driver docker-container \
  --use
```

### Étape 4 – Initialiser le builder

```bash
docker buildx inspect --bootstrap
```

### Étape 5 – Vérifier le builder actif

```bash
docker buildx ls
```

Doit afficher :

```text
mybuilder * docker-container
```

### Étape 6 – Relancer le build avec attestations

```bash
docker buildx build \
  --platform linux/amd64 \
  --tag :latest \
  --sbom=true \
  --provenance=true \
  --push \
  .
```

---

## Résultat attendu

- Build Docker réussi
- Image pushée vers registry
- SBOM et provenance générés correctement
- Pipeline CI/CD stable

---

## Résumé

Ce problème est causé par :

> L’utilisation du driver Docker incompatible avec les attestations BuildKit.

Solutions :

- Fix rapide → désactiver SBOM/provenance
- Fix propre → utiliser `docker-container` builder

## Notes

- L’API expose ses routes sur `/api/tasks`.
- Le frontend doit appeler le backend avec la base URL appropriée, par exemple `http://localhost:3001/api/tasks`.
- Assurez-vous que la base de données est configurée avant de lancer les migrations.
