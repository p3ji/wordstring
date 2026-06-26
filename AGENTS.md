# wordstring — Agent Guide

> Single source of truth for *how to work on this repo*. Both Claude and Antigravity read this file (`CLAUDE.md` and `GEMINI.md` just point here). Keep it short.

**Brain note (goals, backlog, full context):** `H:\My Drive\Brain2\Projects\wordstring.md`
**GitHub:** https://github.com/p3ji/wordstring

## Run / build / test
- **Run:** open `index.html` directly, or for full PWA/offline behaviour serve it: `python -m http.server 8000` → http://localhost:8000
- **Regenerate word DB:** `node generate_words.js` (writes `words.js`)
- **Validate words:** `node test_words.js`
- No build step (static HTML/CSS/JS).

## Decision Routing (When you update the notes)

When a chat session produces bugs, decisions, or changes, **route them here:**

| What was decided | Write it in AGENTS.md | Write it in Brain2 |
|---|---|---|
| Bug found | → Open Bugs | — |
| New feature / phase added | → Pending Features | → Additional Requirements |
| Fundamental principle changed | — | → Evergreen Requirements + Architecture Notes |
| Operational gotcha / convention | → Conventions & gotchas | — |
| Architecture decision (why X over Y) | — | → Architecture & Design Notes |
| Code changed | (git commit only) | — |

**End-of-session instruction to agents:**  
> "Update the project notes with what we decided today."

## Conventions & gotchas
- Offline-first PWA: after changing any asset or logic, **bump the cache version** referenced in `index.html` and `sw.js`, or changes won't show for installed users.
- Theme is "Sewing / Yarn / String" — keep new UI consistent with it.

## Open Bugs
*(Log bugs here as discovered)*
- *(none logged)*

## Pending Features / Decisions
*(Log decisions and new feature requests here)*
- Confirm word-database coverage and difficulty curve
- Verify PWA install + offline behaviour

## Do NOT
- Hand-edit the generated `words.js` — regenerate it instead.
- Commit the `session-export-*.zip` archive.
