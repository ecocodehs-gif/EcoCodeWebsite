/** @type {import('tailwindcss').Config} */
// Precompiled with `npm run build:css` and committed, so pages no longer run
// the Tailwind Play CDN's in-browser compiler (a big source of main-thread
// work on phones). Content paths mirror every file the CDN used to scan.
module.exports = {
    content: ['./index.html', './projects.html', './assets/**/*.jsx', './assets/**/*.js', './scripts/**/*.mjs'],
    theme: {
        extend: {
            colors: {
                brand: {
                    light: '#4ade80', // green-400
                    DEFAULT: '#16a34a', // green-600
                    dark: '#14532d', // green-900
                    nav: '#0f172a', // slate-900
                }
            }
        }
    },
    corePlugins: {
        // GSAP ScrollSmoother needs to control scrolling itself (see theme.css).
        smoothScroll: false
    },
    plugins: []
};
