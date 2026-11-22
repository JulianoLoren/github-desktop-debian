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

## Build the Debian package and bump the version on every task

Every finished code task must end with a version bump and a `.deb` build in the
same working session, so this checkout always has an installable package that
matches the source.

1. **Bump the version first, before building.** The single source of truth is
   `version` in `app/package.json`. Use semver where the change type fits:
   `patch` for fixes, `minor` for features, `major` for breaking changes. The
   build scripts derive `dist/` names and update checks from this field, so do
   not edit generated output by hand. `app/` is not an npm workspace, so npm's
   `version` command cannot target it — edit the field directly:

   ```shellsession
   node -e "const f='app/package.json',p=require('./'+f),[a,b,c]=p.version.split('.');p.version=\`\${a}.\${b}.\${+c+1}\`;require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
   ```

   Commit the version bump together with the change that motivated it, or as
   its own commit directly before the build.

2. **Build the distribution.** The Linux target is produced by the regular
   packaging step; the `.deb` is made from that output.

   ```shellsession
   npm run build:prod
   ```

   The app is packaged to `dist/desktop-linux-x64/`.

3. **Produce the `.deb`** from the packaged output into `dist/`, using
   `dpkg-deb` directly so there is no extra toolchain to install. The version
   must equal `app/package.json`, and the architecture comes from
   `dpkg --print-architecture`.

   ```shellsession
   VERSION=$(node -p "require('./app/package.json').version")
   ARCH=$(dpkg --print-architecture)
   STAGE=$(mktemp -d)
   mkdir -p "$STAGE/DEBIAN" "$STAGE/opt/GitHubDesktop" "$STAGE/usr/bin" \
            "$STAGE/usr/share/applications" "$STAGE/usr/share/icons/hicolor/512x512/apps"
   cp -a dist/desktop-linux-x64/. "$STAGE/opt/GitHubDesktop/"
   ln -s /opt/GitHubDesktop/desktop "$STAGE/usr/bin/github-desktop"
   cp app/static/linux/icon-logo.png "$STAGE/usr/share/icons/hicolor/512x512/apps/github-desktop.png"
   cat > "$STAGE/DEBIAN/control" <<EOF
   Package: github-desktop
   Version: $VERSION
   Section: vcs
   Priority: optional
   Architecture: $ARCH
   Maintainer: Local build
   Depends: libsecret-1-0, libxss1, libgtk-3-0, libnotify4, libnss3
   Description: GitHub Desktop (local Linux build)
   EOF
   cat > "$STAGE/usr/share/applications/github-desktop.desktop" <<EOF
   [Desktop Entry]
   Name=GitHub Desktop
   Exec=github-desktop %U
   Icon=github-desktop
   Type=Application
   Categories=Development;VCS;
   Terminal=false
   EOF
   dpkg-deb --build --root-owner-group "$STAGE" \
     "dist/github-desktop_${VERSION}_${ARCH}.deb"
   rm -rf "$STAGE"
   ```

   Follow [Desktop Entry](https://specifications.freedesktop.org/desktop-entry-spec/latest/)
   for launch arguments. Keep the archive contents in `/opt/GitHubDesktop` so the
   binary can find its bundled `resources`.

4. **Verify before reporting done.** Install or inspect the package and confirm
   it opens a window on this Ubuntu:

   ```shellsession
   dpkg-deb --info dist/github-desktop_<version>_amd64.deb
   sudo dpkg -i dist/github-desktop_<version>_amd64.deb
   github-desktop   # confirm the window opens, then quit
   ```

5. **Never commit build output.** `dist/`, `out/` and `*.deb` are ignored; the
   `.deb` is a local artifact, not a source change. Only the version bump and
   source edits are committed.
