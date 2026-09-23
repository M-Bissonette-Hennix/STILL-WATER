# GitHub Pages Launch — STILL WATER

## Repository

Create a dedicated repository, recommended name:

`STILL-WATER`

Copy this checkpoint to the repository root.

## Local verification

```bash
npm ci --ignore-scripts
npm run verify
npm run serve
```

## Commit

```bash
git init
git add .
git commit -m "STILL WATER v0.2.0 application checkpoint"
git branch -M main
git remote add origin https://github.com/<USER>/STILL-WATER.git
git push -u origin main
```

## Pages configuration

GitHub repository:

`Settings → Pages → Build and deployment → Source → GitHub Actions`

The included `.github/workflows/pages.yml` performs:

1. Node 22 setup;
2. `npm ci --ignore-scripts`;
3. `npm run verify`;
4. static artifact upload;
5. GitHub Pages deployment.

A failing verification job blocks publication.

## Expected URL

For a user/project Pages repository:

`https://<USER>.github.io/STILL-WATER/`

The app intentionally uses relative URLs and a relative service-worker scope so a repository subpath is supported.

## Release discipline

Tag only after the Pages deployment passes and the browser verification checklist is complete.

Suggested tag for this checkpoint:

`v0.2.0`
