import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { cp, mkdir, readdir, stat } from 'node:fs/promises';
const require = createRequire(import.meta.url);

// Reuse the page's React 18 UMD runtime, including Motion's hooks, rather than
// shipping a second React copy. Source components retain standard imports.
const globals = {
  react: { global: 'React', exports: Object.keys(require('react')) },
  'react-dom': { global: 'ReactDOM', exports: Object.keys(require('react-dom')) },
  'react-dom/client': { global: 'ReactDOM', exports: ['createRoot', 'hydrateRoot'] }
};
const existingReactRuntime = {
  name: 'existing-react-runtime',
  setup(build) {
    build.onResolve({ filter: /^(react|react-dom|react-dom\/client)$/ }, args => ({ path: args.path, namespace: 'page-global' }));
    build.onLoad({ filter: /.*/, namespace: 'page-global' }, args => {
      const runtime = globals[args.path];
      return { contents: `const runtime = window.${runtime.global}; export default runtime; export const { ${runtime.exports.join(', ')} } = runtime;`, loader: 'js' };
    });
  }
};

await build({
  entryPoints: ['assets/components/hero-effects.jsx'],
  bundle: true, minify: true, format: 'iife', target: ['es2020'],
  outfile: 'assets/hero-effects.js', legalComments: 'linked',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [existingReactRuntime]
});

// GradientWaves island, bundled separately: projects.html needs the hero waves
// but not the headline/BorderGlow islands or their motion dependency.
await build({
  entryPoints: ['assets/components/hero-waves.jsx'],
  bundle: true, minify: true, format: 'iife', target: ['es2020'],
  outfile: 'assets/hero-waves.js', legalComments: 'linked',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [existingReactRuntime]
});

// Compile the former inline Babel scripts ahead of time. Static hosts serve JS
// directly, so visitors no longer download or run the JSX compiler.
for (const page of ['index', 'projects']) {
  await build({
    entryPoints: [`assets/pages/${page}.jsx`],
    outfile: `assets/${page}-runtime.js`,
    minify: true, target: ['es2020'],
    jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment'
  });
}

// Vercel's default static output directory is `public`. Keep the source files
// at the repository root for local static hosting, then assemble the deploy
// directory after all generated assets have been written.
await mkdir('public', { recursive: true });
// Clean stale reveal frames before copying fresh ones
import { rm } from 'node:fs/promises';
const revealDest = 'public/assets/reveal/frames';
try { await rm(revealDest, { recursive: true, force: true }); } catch(_) {}
const revealDir = 'assets/reveal';
const revealEntries = (await readdir(revealDir, { withFileTypes: true }));
const cpRecursive = async (src, dest) => {
    const s = await stat(src);
    if (s.isDirectory()) {
        await mkdir(dest, { recursive: true });
        const entries = await readdir(src, { withFileTypes: true });
        await Promise.all(entries.map(e => cpRecursive(`${src}/${e.name}`, `${dest}/${e.name}`)));
    } else {
        await cp(src, dest);
    }
};
const revealPromises = revealEntries.map(e => cpRecursive(`${revealDir}/${e.name}`, `public/assets/reveal/${e.name}`));
await Promise.all([
  cp('index.html', 'public/index.html'),
  cp('projects.html', 'public/projects.html'),
  cp('assets/theme.css', 'public/assets/theme.css'),
  // theme.css points at these files with stylesheet-relative url() values.
  cp('assets/Outfit-VariableFont_wght.ttf', 'public/assets/Outfit-VariableFont_wght.ttf'),
  cp('assets/InstrumentSans-VariableFont_wdth,wght.ttf', 'public/assets/InstrumentSans-VariableFont_wdth,wght.ttf'),
  cp('assets/tailwind.compiled.css', 'public/assets/tailwind.compiled.css'),
  cp('assets/hero-effects.css', 'public/assets/hero-effects.css'),
  cp('assets/hero-effects.js', 'public/assets/hero-effects.js'),
  cp('assets/hero-effects.js.LEGAL.txt', 'public/assets/hero-effects.js.LEGAL.txt'),
  cp('assets/hero-waves.css', 'public/assets/hero-waves.css'),
  cp('assets/hero-waves.js', 'public/assets/hero-waves.js'),
  cp('assets/index-runtime.js', 'public/assets/index-runtime.js'),
  cp('assets/projects-runtime.js', 'public/assets/projects-runtime.js'),
   cp('assets/eco-logo.svg', 'public/assets/eco-logo.svg'),
   cp('assets/eco-logo-pixel.svg', 'public/assets/eco-logo-pixel.svg'),
   ...revealPromises
]);
