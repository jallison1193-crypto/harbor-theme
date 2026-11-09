# Agent notes: harbor-theme

Two themes for Harbor in one repo: **Fathom** (liquid glass) and **Projector** (in progress). `README.md` covers what each theme does and the project layout. `docs/projector-plan.md` is the Projector plan and its milestones.

## Commands
- Build: `npm run build` (both), `npm run build:fathom` or `npm run build:projector`. Output goes to `dist/`. The build validates the way Harbor's importer does, so a failed build means Harbor would reject the theme.
- Test bench: `npm run preview` (serves on port 5179), then open `http://127.0.0.1:5179/preview/`. Add `?theme=projector` for Projector. The `bench` and `mockups` servers are also in `.claude/launch.json`.
- Frame timing: in the bench console, run `await __perf.run("balanced")` (or `"off"`, `"lite"`, `"full"`) with the window visible and focused.

## Done means
1. The build passes for the theme you changed.
2. The bench loads it with no console errors, and unloading leaves nothing behind (the bench panel reports leftovers).
3. Visual change: a screenshot of the affected page at half scale. Performance change: `__perf.run` numbers before and after.

Report the commands you ran and what they showed.

## Rules
- Animate only `transform` and `opacity`, and keep effects drawn once then moved or faded (see "Performance" in the README).
- Fathom's rules that depend on Harbor's internal class names stay grouped in section 12 of `fathom/src/theme.css`.
- One thread per Projector milestone. Threads running in parallel own different files.
