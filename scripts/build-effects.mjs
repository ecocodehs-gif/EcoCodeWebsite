import { build } from 'esbuild';
import { createRequire } from 'node:module';
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
