# AGENT.md — Let Me Vote

Non-partisan election comparison platform. Data-driven: all content lives in `election.json`, rendered dynamically by `app.js`.

## Architecture

```
index.html       → Minimal shell (5KB). Containers, header, script/style refs. No data.
style.css        → All styling. Dark/light theme. Responsive. Don't touch unless redesigning.
app.js           → Rendering engine + interactive logic. Reads election.json, builds full UI.
election.json    → ALL election data. Every fact, every candidate, every topic. THE source of truth.
```

**Golden rule**: to change content (candidates, positions, facts, results), edit `election.json` only. Never hardcode data in `index.html` or `app.js`.

## election.json Schema

### Top-level structure

```json
{
  "meta": { "title", "subtitle", "dates", "last_updated", "verified_date" },
  "candidates": [...],
  "results": { "r1": {...}, "r2": {...} },
  "eliminations": { "intro", "entries": [...], "conclusion" },
  "eliminated_ids": ["id1", "id2"],
  "topics": [...],
  "synthese": { "r1": [...], "r2": [...] },
  "footer": { "text", "sources": [...] }
}
```

### Sourcing rule (CRITICAL)

Every factual claim **must** have sources and a verification date:

```json
{
  "text": "1 000 policiers municipaux supplémentaires",
  "sources": [
    {
      "url": "https://example.com/source",
      "name": "Site de campagne Grégoire",
      "accessed_date": "2026-03-24"
    }
  ],
  "verified_date": "2026-03-24"
}
```

- `sources` is an **array** (a claim can have multiple sources)
- `accessed_date` = when you checked the source. Use today's date.
- `verified_date` = when the fact was verified. Use today's date.
- Empty `sources: []` is allowed for self-evident facts (e.g. party affiliation) but avoid it.

### Adding a candidate

Add to `candidates[]`:

```json
{
  "id": "dupont",                    // Unique slug, used everywhere as key
  "name": "Jean Dupont",
  "party": "Parti Exemple",
  "color": "#FF5733",               // Brand color (hex)
  "initials": "JD",                 // 2 chars, shown in avatar circle
  "r1_pct": 15.23,                  // Round 1 result (%)
  "r1_voix": 124000,                // Round 1 votes
  "r2_pct": null,                   // null if eliminated
  "r2_voix": null,
  "eliminated": true,               // true if not in R2
  "elimination_reason": "Retrait"   // Only if eliminated
}
```

Then add their positions in **every** topic's `dimensions[].positions`, `candidate_tags`, `analysis`, and `sources_per_candidate`. The rendering engine iterates `candidates[]` for column headers — a missing key means an empty cell.

### Adding a topic

Add to `topics[]`:

```json
{
  "id": "education",                // Unique slug
  "name": "Éducation",
  "icon": "📚",
  "stats": [
    {
      "value": "850",
      "label": "écoles publiques à Paris",
      "source": { "url": "...", "name": "...", "accessed_date": "..." },
      "verified_date": "2026-03-24"
    }
  ],
  "candidate_tags": {
    "gregoire": { "text": "✅ Compétence municipale", "class": "tag-ok" },
    "dati": { "text": "⚠️ Coût non budgété", "class": "tag-warn" }
    // ... one entry per candidate
  },
  "dimensions": [
    {
      "label": "🏫 Création d'écoles",
      "positions": {
        "gregoire": {
          "text": "<strong>10 nouvelles écoles</strong> d'ici 2032",
          "sources": [{ "url": "...", "name": "...", "accessed_date": "..." }],
          "verified_date": "2026-03-24"
        }
        // ... one entry per candidate
      }
    }
  ],
  "analysis": {
    "gregoire": "Éclairage factuel text...",
    // ... per candidate
  },
  "sources_per_candidate": {
    "gregoire": [{ "url": "...", "label": "Programme officiel" }],
    // ...
  }
}
```

**Don't forget** to also add the topic to `synthese.r1[]` and `synthese.r2[]` (see below).

### Adding election results

`results.r1` and `results.r2` each have:

```json
{
  "title": "📊 Résultats officiels du 1er tour — 15 mars 2026",
  "display_order": ["gregoire", "dati", "chikirou"],   // Order shown in banner
  "participation_pct": 58.89,
  "votants": 815296,
  "source": { "url": "...", "name": "...", "accessed_date": "..." },
  // R2 only:
  "winner": "gregoire",
  "suffrages_exprimes": 847432,
  "conseil_de_paris": { "gregoire": 103, "dati": 51, "chikirou": 9, "total": 163 }
}
```

### Adding synthese (convergences / divergences)

`synthese.r1[]` = all candidates (1er tour), `synthese.r2[]` = triangulaire (2nd tour).

```json
{
  "topic_id": "securite",
  "topic_name": "Sécurité",
  "topic_icon": "🛡️",
  "convergences": [
    "Tous reconnaissent la sécurité comme priorité n°1",
    "Consensus sur l'augmentation des effectifs"
  ],
  "divergences": [
    "Armement : Grégoire et Chikirou contre, les 4 autres pour",
    "Effectifs : de 1 000 (Grégoire) à 8 000 (Knafo)"
  ]
}
```

### Eliminations

```json
{
  "eliminations": {
    "intro": "<strong>2nd tour</strong> : seules les listes ≥10% peuvent se maintenir.",
    "entries": [
      {
        "id": "mariani",           // Must match candidates[].id
        "emoji": "🔴",
        "reason": "<strong>éliminé</strong> (1,61% < 10%)",
        "tag": "Éliminé",
        "tag_class": "eliminated"  // CSS class: "eliminated" or "withdrawn"
      }
    ],
    "conclusion": "→ <strong>Triangulaire</strong> : Grégoire, Dati, Chikirou."
  },
  "eliminated_ids": ["knafo", "mariani", "bournazel"]
}
```

`eliminated_ids` controls which candidates are hidden in tour 2 views.

## Tag classes

| Class | Meaning | Visual |
|-------|---------|--------|
| `tag-ok` | Feasible / within competence | ✅ Green |
| `tag-warn` | Cost unclear / partial competence | ⚠️ Orange |
| `tag-danger` | Outside competence / legally uncertain | ❌ Red |

## app.js — How rendering works

1. `fetch('election.json')` on page load
2. `renderCandidateCards()` — builds the candidate grid from `candidates[]`
3. `renderResultsBanner()` — builds R1/R2 result banners from `results`
4. `renderEliminationsBanner()` — shows who's out for R2
5. `renderTopics()` — iterates `topics[]`, builds comparison tables, stats, ranking panels
6. `renderSynthese()` — builds convergence/divergence sections
7. Interactive init — drag-and-drop, anonymous mode, tour toggle, theme, leaderboard

**All interactive logic** (anonymous mode, drag-and-drop, leaderboard scoring, touch support, localStorage persistence) lives in `app.js` and doesn't depend on specific data — it reads candidate IDs and topic IDs dynamically from the loaded JSON.

## Interactive features

| Feature | How it works |
|---------|-------------|
| **Anonymous mode** | Shuffles candidate names to letters (A-F), reorders columns alphabetically. Default ON. |
| **Tour toggle** | Switches between R1 (6 candidates) and R2 (3 candidates). Hides eliminated candidates. |
| **Drag-and-drop ranking** | Per-topic ranking slots. Chips draggable (mouse + touch). Saved to localStorage. |
| **Weighted leaderboard** | User adjusts sliders (0-10) per topic. Score = weighted average of ranks. |
| **Theme toggle** | Light/dark. Saved to localStorage. |
| **Candidate filter** | Click a card to highlight that candidate's column across all tables. |

## Adapting for a new election

1. Create a new `election.json` (or rename the current one to `paris-2026.json`)
2. Update `meta` with the new election info
3. Replace `candidates[]` with the new candidates
4. Replace `topics[]` with relevant policy areas
5. Update `results` (can be empty initially, filled after election day)
6. Update `synthese` once all positions are gathered
7. `app.js` handles the rest — no code changes needed unless you add new UI features

The engine is designed to be **election-agnostic**. The only Paris-2026-specific content is in `election.json`.

## Git workflow

- **Branch**: `main`
- **Always use feature branches** (e.g. `feat/add-topic-education`, `fix/source-correction`)
- **Never commit directly to main**
- Pull latest main before merging
- Never force push

## Quality checklist

Before committing changes to `election.json`:

- [ ] Every factual claim has `sources[]` with at least one entry
- [ ] Every source has `url`, `name`, and `accessed_date`
- [ ] Every claim has `verified_date`
- [ ] All candidate IDs in `positions`, `candidate_tags`, `analysis` match `candidates[].id`
- [ ] Topic added to both `topics[]` AND `synthese.r1[]` / `synthese.r2[]`
- [ ] JSON is valid (run `python3 -c "import json; json.load(open('election.json'))"`)
- [ ] No personal opinions or editorial judgments in the data — factual only
