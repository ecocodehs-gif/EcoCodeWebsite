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
`assets/index-runtime.js`, `assets/projects-runtime.js`,
`assets/tailwind.compiled.css`, and license file alongside the source. No
build step is needed on the static host. The effects reuse the page's React 18
runtime and respect reduced-motion settings.

Tailwind is precompiled the same way (the Play CDN's in-browser compiler was
the main source of scroll jank on the projects page, so pages link
`assets/tailwind.compiled.css` and must never load `cdn.tailwindcss.com`).
Class names in the HTML and JSX sources are picked up by the build; anything
constructed dynamically in JS strings is invisible to the compiler — extend
the safelist in `tailwind.config.js` if you need one of those.
