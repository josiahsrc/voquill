# Releases

| Branch       | Releases to  | Trigger     |
|--------------|--------------|-------------|
| `main`       | `dev`        | Push (auto) |
| `prod`       | `prod`       | Push (auto) |
| `enterprise` | `enterprise` | Push (auto) |

Pushing to any of the above runs `.github/workflows/release.yml`, which
detects which folders changed (`cli/`, `apps/desktop/`, `apps/docs/`,
`apps/web/`, `enterprise/admin/`, `enterprise/gateway/`) and releases only
those components.

## Release notes

- `prod.txt` — desktop release notes shipped to the `dev` and `prod` channels.
- `enterprise.txt` — desktop release notes shipped to the `enterprise` and
  `enterprise-dev` channels.

## Promote dev → prod

[![Promote to prod](https://img.shields.io/badge/%E2%86%92%20Open%20promotion%20PR-prod%20%E2%86%90%20main-2ea44f?style=for-the-badge&logo=github)](https://github.com/voquill/voquill/compare/prod...main?expand=1)

## Promote dev → enterprise

[![Promote to enterprise](https://img.shields.io/badge/%E2%86%92%20Open%20promotion%20PR-enterprise%20%E2%86%90%20main-5a2ea4?style=for-the-badge&logo=github)](https://github.com/voquill/voquill/compare/enterprise...main?expand=1)

Clicking opens a pre-filled PR comparing `main` against the target branch
(that's what's about to ship). Review the diff, title it (e.g.
`Release 2026-04-19`), and merge. Merging auto-releases the changed
components on that channel.

## Rollback

```bash
git push --force-with-lease origin <old-sha>:prod        # or :enterprise
```

Re-releases whatever components differ between the bad and good SHAs.
