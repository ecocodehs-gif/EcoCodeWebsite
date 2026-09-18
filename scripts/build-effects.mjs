import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { cp, mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);

// Reuse the page's React 18 UMD runtime, including Motion's hooks, rather than
// shipping a second React copy. Source components retain standard imports.
const globals = {
  react: { global: 'React', exports: Object.keys(require('react')) },
  'react-dom': { global: 'ReactDOM', exports: Object.keys(require('react-dom')) },
  'react-dom/client': { global: 'ReactDOM', exports: ['createRoot', 'hydrateRoot'] }
};
await build({
  entryPoints: ['assets/components/hero-effects.jsx'],
  bundle: true, minify: true, format: 'iife', target: ['es2020'],
  outfile: 'assets/hero-effects.js', legalComments: 'linked',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{
    name: 'existing-react-runtime',
    setup(build) {
      build.onResolve({ filter: /^(react|react-dom|react-dom\/client)$/ }, args => ({ path: args.path, namespace: 'page-global' }));
      build.onLoad({ filter: /.*/, namespace: 'page-global' }, args => {
        const runtime = globals[args.path];
        return { contents: `const runtime = window.${runtime.global}; export default runtime; export const { ${runtime.exports.join(', ')} } = runtime;`, loader: 'js' };
      });
    }
  }]
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
await Promise.all([
  cp('index.html', 'public/index.html'),
  cp('projects.html', 'public/projects.html'),
  cp('assets/theme.css', 'public/assets/theme.css'),
  cp('assets/hero-effects.css', 'public/assets/hero-effects.css'),
  cp('assets/hero-effects.js', 'public/assets/hero-effects.js'),
  cp('assets/hero-effects.js.LEGAL.txt', 'public/assets/hero-effects.js.LEGAL.txt'),
  cp('assets/index-runtime.js', 'public/assets/index-runtime.js'),
  cp('assets/projects-runtime.js', 'public/assets/projects-runtime.js'),
  cp('assets/eco-logo.svg', 'public/assets/eco-logo.svg')
]);
