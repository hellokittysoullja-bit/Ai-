# hallmark — scoped install (audit-only)

Vendored from [Nutlope/hallmark](https://github.com/Nutlope/hallmark) via direct `curl` of the
raw files (not paraphrased — the actual bytes).

**Only `hallmark audit` is installed and safe to use here.** This repo already has a bespoke,
deliberately-built design system (Liquid Glass material tiers, hand-drawn island SVGs, a gacha
reward economy, a color arc). hallmark's `build` / `redesign` / `study` verbs pick from 20 named
themes and 21 macrostructures meant for greenfield pages — running them against this codebase
would flatten our design toward the genre it exists to prevent, not improve it.

Files present:
- `SKILL.md` — full upstream instructions (unedited, includes routing for verbs we didn't vendor)
- `references/verbs/audit.md`, `references/anti-patterns.md`, `references/slop-test.md` (58 gates),
  `references/contract.md` — everything `audit` actually loads per `SKILL.md`

**Not present:** `references/macrostructures.md`, `references/genres/*`, the 20 theme specs,
`component-cookbook.md`, `typography.md`, `color.md`, `layout-and-space.md`, `motion.md`, `copy.md`,
`microinteractions.md`, `interaction-and-states.md`, `responsive.md`, `hero-enrichment.md`,
`export-formats.md`, `custom-theme.md`, `study.md`. If `build`/`redesign`/`study` is ever invoked,
it will try to load these and fail or improvise — don't trust that path here. Fetch the missing
files from upstream first if full build mode is ever genuinely wanted.
