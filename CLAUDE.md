# biblical-earth: instrucciones para agentes

Atlas bíblico en español: mapa y línea de tiempo. Sitio estático en `site/`, datos en YAML en `data/`, publicado en GitHub Pages.

## Construir y comprobar

```bash
pip install -r requirements.txt
python3 scripts/build.py        # data/ -> site/data.json, site/data.js, dist/ (SQLite) y docs/investigacion/registro/
python3 scripts/validate.py     # esquema, fuentes, fechas, calendario; debe dar 0 errores
python3 scripts/validate.py --links
python3 scripts/revisar.py --fallar
python3 -m http.server -d site  # y abrir http://localhost:8000
```

## Dónde está cada cosa

- Esquema de los datos y protocolo de investigación: [docs/investigacion/README.md](docs/investigacion/README.md).
- Módulos del sitio (`site/js/*.js`, scripts clásicos que comparten `window.BE`): [site/README.md](site/README.md).
- Scripts: [scripts/README.md](scripts/README.md). Decisiones tomadas: [docs/decisiones.md](docs/decisiones.md).

## Reglas de la casa

- Todo en español con tildes correctas.
- De jw.org y wol.jw.org se enlaza, nunca se copia: palabras propias, 40 palabras como máximo por campo, ninguna racha de 8 palabras igual a la fuente.
- Cada hecho lleva `fuentes`, `razon`, `consultado` y `estado`. Gana la publicación más reciente de jw.org.
- Los subtítulos de vídeo y sus nombres de fichero nunca entran en el repositorio.
- Sin nombres de personas reales, rutas de casa ni datos privados en nada que se publique.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
