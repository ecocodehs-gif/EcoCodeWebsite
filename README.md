# EcoCodeWebsite

Static site: serve the repository root with any HTTP server.

The home page enhances its static HTML with React Bits BorderGlow and BlurText.
Edit the effect sources in `assets/components/` and page behavior in
`assets/pages/`, then run:

```sh
npm install
npm run build
```

Commit the generated `assets/hero-effects.js`, `assets/hero-effects.css`,
`assets/index-runtime.js`, `assets/projects-runtime.js`, and license file
alongside the source. No build step is needed on the static host.
The effects reuse the page's React 18 runtime and respect reduced-motion settings.
