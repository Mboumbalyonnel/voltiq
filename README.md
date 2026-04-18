# VoltIQ — Assistant IA de gestion de la consommation electrique en Tunisie

VoltIQ est une plateforme web gratuite et open source permettant aux utilisateurs tunisiens
de gerer intelligemment leur consommation electrique. Elle integre les vrais tarifs STEG 2024
et un chatbot bilingue (francais / arabe tunisien) base sur un modele Mistral 7B fine-tune.

---

## Architecture du projet

```
voltiq/
├── voltiq_dataset.json        # Dataset 300 paires Q/R pour fine-tuning (a remplir)
├── voltiq_finetuning.py       # Script Google Colab LoRA fine-tuning (a remplir)
├── main.py                    # Backend FastAPI (a remplir)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── vercel.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── App.css
        ├── utils/
        │   └── steg.js        # Calculs tarifaires STEG (tranches cumulatives)
        └── modules/
            ├── AuditAppareils.jsx
            ├── AnalyseFacture.jsx
            ├── Chatbot.jsx
            └── Simulateur.jsx
```

---

## Tarifs STEG integres (2024)

Les tranches sont cumulatives, appliquees comme l'impot progressif :

| Tranche | Plage         | Tarif (DT/kWh) |
|---------|---------------|----------------|
| T1      | 0 – 100 kWh   | 0.081          |
| T2      | 101 – 200 kWh | 0.162          |
| T3      | 201 – 500 kWh | 0.257          |
| T4      | > 500 kWh     | 0.332          |

- TVA : 19 %
- TCL : 1 %
- Redevance fixe : 2.200 DT/mois

---

## Modules

### 1. Audit Appareils
L'utilisateur saisit ses appareils (nom, puissance en watts, heures d'utilisation par jour).
Le systeme calcule la consommation en kWh/mois, le cout mensuel reel avec les tranches STEG,
et genere des recommandations personnalisees.

### 2. Analyse Facture
L'utilisateur entre les donnees de sa facture STEG (kWh, montant paye, periode, mois precedent optionnel).
Le systeme compare le montant declare avec le calcul STEG attendu, detecte les anomalies
(ecart > 15 %), et propose un plan d'action concret.

### 3. Chatbot IA
Questions libres en francais ou en darija tunisien. Le backend appelle le modele Mistral 7B
fine-tune heberge sur Hugging Face. Un systeme de fallback local repond si le backend
est indisponible, avec les informations tarifaires cles.

### 4. Simulateur Achat
L'utilisateur entre un appareil (puissance, heures, prix d'achat) et optionnellement
une alternative. Le systeme calcule et compare le cout total reel sur 1, 3 et 5 ans,
incluant l'electricite selon les tarifs STEG.

---

## Installation et lancement — Frontend

### Prerequis
- Node.js 18+
- npm ou yarn

### Etapes

```bash
# 1. Se placer dans le repertoire frontend
cd voltiq/frontend

# 2. Installer les dependances
npm install

# 3. Creer le fichier d'environnement
cp .env.example .env
# Editer .env et renseigner VITE_API_URL=http://localhost:8000

# 4. Lancer en developpement
npm run dev

# 5. Build pour la production
npm run build
```

### Variables d'environnement

Creer un fichier `.env` dans `frontend/` :

```
VITE_API_URL=http://localhost:8000
```

En production sur Vercel, definir cette variable dans le dashboard Vercel.

---

## Installation — Backend FastAPI

### Prerequis
- Python 3.10+
- pip

### Etapes

```bash
# 1. Creer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows : venv\Scripts\activate

# 2. Installer les dependances
pip install fastapi uvicorn python-dotenv huggingface_hub transformers

# 3. Creer le fichier d'environnement
cp .env.example .env
# Renseigner HF_MODEL_ID, SUPABASE_URL, SUPABASE_KEY

# 4. Lancer le serveur
uvicorn main:app --reload --port 8000
```

### Variables d'environnement backend

```
HF_MODEL_ID=votre-username/voltiq-mistral-7b
HF_API_TOKEN=hf_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
```

---

## Fine-tuning du modele IA

### Prerequis
- Compte Google Colab (GPU gratuit T4)
- Compte Hugging Face avec token d'ecriture

### Etapes

1. Ouvrir `voltiq_finetuning.py` dans Google Colab
2. Activer le GPU : Runtime > Change runtime type > GPU T4
3. Renseigner votre `HF_TOKEN` et `HF_USERNAME` dans la cellule de configuration
4. Executer toutes les cellules dans l'ordre
5. Le modele est automatiquement pousse sur Hugging Face a la fin

Le fine-tuning utilise la technique LoRA (Low-Rank Adaptation) qui ne met a jour
qu'une fraction des parametres, permettant d'utiliser Mistral 7B gratuitement sur Colab.

**Duree estimee** : 45 a 90 minutes selon la disponibilite du GPU Colab.

---

## Deploiement en production

### Frontend sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Depuis le dossier frontend
cd voltiq/frontend
vercel --prod
```

Configurer la variable d'environnement `VITE_API_URL` dans le dashboard Vercel
en pointant vers l'URL de votre backend.

Mettre a jour `vercel.json` avec l'URL de votre backend deploye.

### Backend sur Railway (gratuit)

1. Creer un compte sur railway.app
2. New Project > Deploy from GitHub
3. Selectionner le repository VoltIQ
4. Configurer les variables d'environnement dans Railway
5. L'URL generee par Railway est a utiliser dans `vercel.json` et `VITE_API_URL`

### Base de donnees Supabase

1. Creer un projet sur supabase.com (plan gratuit)
2. Executer le schema SQL suivant dans l'editeur SQL Supabase :

```sql
create table factures (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  kwh numeric not null,
  montant_paye numeric,
  montant_calcule numeric,
  periode text,
  user_id text
);

create table appareils (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp default now(),
  nom text not null,
  puissance_w numeric not null,
  heures_jour numeric not null,
  kwh_mois numeric not null,
  user_id text
);
```

---

## Stack technique

| Composant         | Technologie          | Gratuit  |
|-------------------|----------------------|----------|
| Frontend          | React + Vite         | Oui      |
| Backend           | FastAPI (Python)     | Oui      |
| Base de donnees   | Supabase             | Oui      |
| Hebergement front | Vercel               | Oui      |
| Hebergement back  | Railway              | Oui      |
| Modele IA de base | Mistral 7B           | Oui      |
| Fine-tuning       | LoRA sur Colab T4    | Oui      |
| Hebergement IA    | Hugging Face         | Oui      |

---

## Contribuer

Ce projet a ete construit dans le cadre d'un hackathon 24h.
Les contributions sont les bienvenues pour enrichir le dataset,
ameliorer les calculs ou ajouter de nouveaux modules.

---

## Licence

MIT License — Libre d'utilisation et de modification.
# voltiq
