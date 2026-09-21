/* GradientWaves hero backdrop island.
   Its own bundle rather than part of hero-effects.js because projects.html needs
   the waves but not the headline/BorderGlow islands (and their motion
   dependency). Both pages already load the React UMD runtime.
   Defensive by design, like the page runtimes: no WebGL2, reduced-motion
   preference, or a missing host element simply leaves the hero's existing
   backdrop in place. */
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import GradientWaves from './GradientWaves';

// Painted in the palette the heroes already use: the haze is the brand navy the
// backdrop fades into, the waves ride through brand green and crest in brand
// light — the same greens as the aurora bars.
const palette = {
  horizonColor: '#0f172a',
  waveColor: '#16a34a',
  crestColor: '#4ade80'
};

const mountWaves = host => {
  const strength = parseFloat(host.dataset.wavesOpacity || '1');
  createRoot(host).render(
    <GradientWaves
      {...palette}
      speed={0.4}
      amplitude={2.5}
      waveScale={0.6}
      waveRatio={0.9}
      swell={35}
      turbulence={20}
      tilt={1.11}
      zoom={1.0}
      height={5.5}
      fogDepth={15}
      detail="medium"
      brightness={1.0}
      opacity={Number.isFinite(strength) ? strength : 1}
      mouseInteraction
      parallaxStrength={0.5}
      grain
      grainIntensity={0.05}
    />
  );
};

const hosts = document.querySelectorAll('[data-gradient-waves]');

if (hosts.length) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasWebGL2 = (() => {
    try {
      return !!document.createElement('canvas').getContext('webgl2');
    } catch (_) {
      return false;
    }
  })();

  if (!reduceMotion && hasWebGL2) {
    hosts.forEach(host => {
      // The main hero keeps the waves hidden until its planet sequence finishes
      // (index-runtime.js sets .is-revealed at the same time it starts the
      // fade-in). Waiting for that flag means no WebGL context and no raymarch
      // loop spins up behind a layer nobody can see yet.
      const gated = host.closest('.reveal-hero');
      if (gated && !gated.classList.contains('is-revealed')) {
        const observer = new MutationObserver(() => {
          if (!gated.classList.contains('is-revealed')) return;
          observer.disconnect();
          flushSync(() => mountWaves(host));
        });
        observer.observe(gated, { attributes: true, attributeFilter: ['class'] });
      } else {
        flushSync(() => mountWaves(host));
      }
    });
  } else {
    // Nothing to paint: drop the empty layer so it can't swallow the backdrop.
    hosts.forEach(host => host.setAttribute('hidden', ''));
  }
}
