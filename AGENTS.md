# Working on GitHub Desktop

Follow the repository's [contribution guidance](.github/CONTRIBUTING.md)
and [development instructions](.github/copilot-instructions.md).
These instructions supplement those guides; they do not change contribution
eligibility or merge requirements.

## Preparing team-authored pull requests

Before preparing or updating a team-authored PR, use the
[prepare-team-pr skill](.agents/skills/prepare-team-pr/SKILL.md).
Follow its authorization checks, evidence collection, review assessment,
and ownership requirements.

Read the current [PR template](.github/pull_request_template.md).
Preserve its sections and generate or update the skill's
`Team-authored review` section in the PR body, not in the template.

## Commit every change as you go

This checkout is a personal working copy, not an upstream contribution. Keep
history granular and always green:

- **Commit as soon as a change works.** Do not leave finished work uncommitted
  or batch unrelated edits into one "wip" commit.
- **One logical change per commit**, with a conventional, descriptive subject
  (for example `fix: handle missing electron in start script`) and a body
  explaining *why* when the change is not obvious.
- **Verify before committing.** Run the narrowest relevant check first
  (`npm test -- <pattern>`, `npm run lint:src -- <file>`, `npm run tsc`),
  then commit. Never commit code that fails a check you just ran.
- **Commit the fix, not the noise.** Leave out build output (`out/`),
  `node_modules/`, logs, and editor or OS artifacts. `.gitignore` should cover
  them; extend it instead of committing them.
- **Never commit secrets.** No tokens, passwords, cookies, or personal data —
  not even in tests or fixtures. Use obvious placeholders.
- Amend or rebase only your own unpushed commits; never rewrite commits that
  were already pushed or that you did not author.

## Check for vulnerabilities on every change

Every time you touch code — not only dependencies — audit for new CVEs and
fix what is actionable in the same change set or the immediate follow-up commit.

Run this before committing code changes and again before finishing a task:

```shellsession
npm audit                     # top-level and app/ dependency graph
npm audit --omit=dev          # production-only surface
npm ls <flagged-package>      # find who pulls in a vulnerable transitive dep
npm outdated                  # is a fixed version already published?
```

Also:

- **Check the advisory, not just the count.** Look up the CVE/GHSA for any
  finding and decide whether the vulnerable code path is reachable in Desktop
  (for example, a dev-only `tar` DoS in a script is different from an Electron
  or Electron builder issue that ships to users).
- **Prefer the smallest fix.** Update the transitive dependency with an
  `overrides` entry in the relevant `package.json`, or bump the direct
  dependency, rather than a broad upgrade. Regenerate the lockfile with
  `npm install` (never hand-edit `package-lock.json`).
- **Check Electron's Chromium line.** Electron ships its Chromium security
  patches; if the project is more than one major behind the latest Electron,
  note it in the commit body.
- **Verify the fix.** Re-run `npm audit` and the affected tests, then record
  the before/after in the commit body: `npm audit: 3 high -> 0 high`.
- **Follow the rules of the road.** For new upstream findings in released
  versions, follow [SECURITY.md](SECURITY.md) (private advisory reporting), not
  public issues.
