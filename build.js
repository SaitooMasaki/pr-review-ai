const esbuild = require('esbuild');
const isWatch = process.argv.includes('--watch');

const sharedConfig = {
  bundle: true,
  target: 'chrome120',
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
};

async function build() {
  // Service Worker (iife)
  const ctx1 = await esbuild.context({
    ...sharedConfig,
    entryPoints: ['src/background/service-worker.js'],
    outfile: 'dist/service-worker.js',
    format: 'iife',
  });

  // Content Script (iife)
  const ctx2 = await esbuild.context({
    ...sharedConfig,
    entryPoints: ['src/content/github-pr.js'],
    outfile: 'dist/github-pr.js',
    format: 'iife',
  });

  // Popup Script (iife) ← 追加：moduleロード問題を回避
  const ctx3 = await esbuild.context({
    ...sharedConfig,
    entryPoints: ['src/popup/popup.js'],
    outfile: 'dist/popup.js',
    format: 'iife',
  });

  // Panel CSS
  const ctx4 = await esbuild.context({
    ...sharedConfig,
    entryPoints: ['src/styles/panel.css'],
    outfile: 'dist/panel.css',
  });

  if (isWatch) {
    await ctx1.watch();
    await ctx2.watch();
    await ctx3.watch();
    await ctx4.watch();
    console.log('Watching for changes...');
  } else {
    await ctx1.rebuild(); ctx1.dispose();
    await ctx2.rebuild(); ctx2.dispose();
    await ctx3.rebuild(); ctx3.dispose();
    await ctx4.rebuild(); ctx4.dispose();
    console.log('Build complete!');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
