# BriefAI — Votre journaliste personnel

L'IA recherche des articles d'actualité, les synthétise comme un journaliste et vous les lit à voix haute.

---

## Prérequis

- Node.js 18+
- npm
- g++ (pour le client C++)
- 3 clés API dans le fichier `.env`

---

## Installation

```bash
npm install
```

Fichier `.env` à la racine :

```
OPENROUTER_API_KEY=sk-or-v1-...
TAVILY_API_KEY=tvly-...
ELEVENLABS_API_KEY=...
```

---

## Lancer le serveur

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`.

---

## Utilisation — API

### Texte seul

```bash
curl -X POST http://localhost:3000/brief \
  -H "Content-Type: application/json" \
  -d '{"topic":"conflit commercial USA Chine"}'
```

Réponse :
```json
{
  "brief": "...",
  "sources": [{ "title": "...", "url": "..." }],
  "model": "anthropic/claude-sonnet-4-5"
}
```

### Audio seul (texte → MP3)

```bash
curl -X POST http://localhost:3000/audio \
  -H "Content-Type: application/json" \
  -d '{"text":"Votre texte ici"}' \
  --output output.mp3
```

### Texte + Audio en un seul appel

```bash
curl -X POST http://localhost:3000/brief-with-audio \
  -H "Content-Type: application/json" \
  -d '{"topic":"intelligence artificielle"}' > result.json
```

Réponse : même que `/brief` + champ `audio_b64` (MP3 encodé en base64).

---

## Utilisation — Client C++

### Compilation (Windows, MinGW)

```bash
cd client
g++ -std=c++17 -o briefai.exe client.cpp -lws2_32
```

### Lancement

```bash
# Avec un sujet en argument
briefai.exe "guerre en Ukraine"

# Mode interactif (demande le sujet)
briefai.exe
```

Le brief s'affiche dans le terminal et `brief.mp3` se joue automatiquement.

---

## Changer la voix

Dans `src/index.ts`, ligne de la route `/audio`, remplacez l'ID de voix :

```typescript
// Ligne à modifier :
'https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID_ICI'
```

### Trouver une voix française naturelle

1. Aller sur [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)
2. Filtrer par langue `French`
3. Écouter et choisir une voix
4. Cliquer sur la voix → copier l'**ID** (format : `abc123...`)
5. Remplacer dans le code et relancer `npm run dev`

### Voix recommandées (naturelles, français)

| Voix | Style | ID |
|------|-------|----|
| Voix actuelle | Français | `YxrwjAKoUKULGd0g8K9Y` ← actuelle |

> Le modèle `eleven_multilingual_v2` est déjà le plus naturel disponible.

---

## Paramètres optionnels

### Changer le ton du brief

```bash
curl -X POST http://localhost:3000/brief \
  -H "Content-Type: application/json" \
  -d '{"topic":"...", "tone":"analytique"}'
```

Valeurs disponibles : `factuel` (défaut) · `analytique` · `vulgarisé`

### Changer le modèle LLM

Dans `.env`, ou directement dans `src/index.ts` :

```typescript
model: 'anthropic/claude-sonnet-4-5'   // qualité
model: 'google/gemini-flash-1.5'       // plus rapide
model: 'openai/gpt-4o'                 // alternative
```

---

## Architecture

```
Client (C++ ou curl)
     │
     ▼
Hono Server (TypeScript) — localhost:3000
     │
     ├── Tavily API       → recherche web + extraction articles
     ├── OpenRouter       → Claude (synthèse journaliste)
     └── ElevenLabs       → text-to-speech MP3
```
