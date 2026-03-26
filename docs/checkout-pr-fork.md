# Working with PR Forks

All commands use `gh` CLI. Replace `<PR_NUMBER>` with the actual PR number.

## Checkout a PR

```bash
gh pr checkout <PR_NUMBER>
```

## Push changes to the fork

```bash
git add . && git commit -m "your changes" && git push
```

## Pull latest from the fork

```bash
git pull
```

## Switch back to main

```bash
git checkout main
```

## Sync the fork branch with main

```bash
git fetch origin main && git merge origin/main
```

## Delete the local fork branch

```bash
git branch -D <branch-name>
```

## Remove the fork remote

If `gh pr checkout` added a remote for the fork contributor:

```bash
# List remotes to find the fork remote name
git remote -v

# Remove it
git remote remove <remote-name>
```
