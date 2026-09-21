/** @type {import('tailwindcss').Config} */
// Precompiled with `npm run build:css` and committed, so pages no longer run
// the Tailwind Play CDN's in-browser compiler (a big source of main-thread
// work on phones). Content paths mirror every file the CDN used to scan.
module.exports = {
    content: ['./index.html', './projects.html', './assets/**/*.jsx', './assets/**/*.js', './scripts/**/*.mjs'],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Instrument Serif"', 'serif'],
                // Everything that isn't display/serif text. Instrument Sans' 
                // variable weight axis stops at 700, so `font-extrabold` 
                // clamps to a real 700 (see assets/theme.css).
                sans: [
                    '"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif',
                    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'
                ],
                // Hero headline face. Outfit's variable weight axis runs
                // 100–900, so every weight up to 900 is real, not synthesized.
                display: ['"Outfit"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
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
