Work a bead issue end-to-end: read it, implement it, verify quality checks, commit, and close the issue.

## Usage

```
/beadworker <id>
```

## Steps

1. **Read the issue** — run `bd show $ARGUMENTS` and understand the full scope of the work before touching any code.

2. **Check worktree status** — if there are changes to tracked files, exit immediately. Otherwise, make sure you are on `main` and up-to-date with `origin/main` before continuing
   ```
   git checkout main && git pull
   ```

3. **Claim the issue** — run `bd update $ARGUMENTS --claim` so it's marked in-progress.

4. **Implement the work** — follow all conventions in CLAUDE.md. Make changes incrementally and verify as you go.

5. **Run quality checks** — all four must pass with zero errors before committing:
   ```
   npm run typecheck
   npm run lint
   npm run format:check
   npm test
   ```
   Fix any failures before proceeding.

6. **Commit** — use Conventional Commits. Do not include the bead ID in the commit message or branch name. The message should describe the change, not the ticket:
   ```
   feat: <what you built>
   ```

7. **Close the issue** — run `bd close $ARGUMENTS` with a comment that names the branch and briefly describes what was done:
   ```
   bd close $ARGUMENTS --comment "Implemented on branch <branch-name>: <one-sentence summary of changes>"
   ```
