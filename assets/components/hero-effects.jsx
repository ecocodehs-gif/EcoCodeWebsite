import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import BorderGlow from './BorderGlow';
import BlurText from './BlurText';
import './hero-effects.css';

const brandGlow = {
  glowColor: '142 69 58', colors: ['#4ade80', '#16a34a', '#14532d'],
  edgeSensitivity: 25, glowIntensity: 0.85, glowRadius: 20,
  coneSpread: 25, animated: true, fillOpacity: 0.12
};

// Keep readable HTML in index.html; enhance only these small React islands.
// Flush mounts before the existing GSAP runtime measures and stages the page.
const buttonHost = document.getElementById('start-building-glow');
if (buttonHost) {
  flushSync(() => createRoot(buttonHost).render(
    <BorderGlow {...brandGlow} as="a" href="#join" backgroundColor="#16a34a" borderRadius={8}
      className="start-building-button text-white font-bold py-3 px-8 transition">
      Start Building
    </BorderGlow>
  ));
}

const reposHost = document.getElementById('view-repos-glow');
if (reposHost) {
  const href = reposHost.querySelector('a').getAttribute('href');
  flushSync(() => createRoot(reposHost).render(
    <BorderGlow {...brandGlow} as="a" href={href} backgroundColor="#1f2937" borderRadius={8}
      className="view-repos-button text-white font-bold py-3 px-8 transition">
      <span className="flex items-center justify-center">
        <i className="fa-brands fa-github mr-2 text-xl" aria-hidden="true" /> View our Repos
      </span>
    </BorderGlow>
  ));
}

document.querySelectorAll('[data-border-glow]').forEach(host => {
  const content = host.innerHTML;
  host.className = 'why-software-glow';
  flushSync(() => createRoot(host).render(
    <BorderGlow {...brandGlow} backgroundColor="#f9fafb" borderRadius={12}
      className="text-center p-6 border-glow-feature">
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </BorderGlow>
  ));
});

const headline = document.getElementById('hero-headline');
if (headline) {
  flushSync(() => createRoot(headline).render(
    <>
      <BlurText text="Code for Community." delay={120} direction="top" className="font-display font-bold" />
      <br />
      <BlurText text="Build for the Planet." delay={120} direction="top" startDelay={0.3} className="text-brand-light font-serif font-normal" />
    </>
  ));
}
