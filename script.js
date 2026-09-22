(() => {
  'use strict';

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stageNames = [
    { at: 0, name: 'Dormant' },
    { at: 0.1, name: 'Root system' },
    { at: 0.2, name: 'Root growth' },
    { at: 0.35, name: 'Shoot emergence' },
    { at: 0.5, name: 'First leaves' },
    { at: 0.65, name: 'Plant growth' },
    { at: 0.85, name: 'Mature plant' }
  ];

  const setProgressCopy = (progress) => {
    const percent = Math.round(progress * 100);
    const currentStage = [...stageNames].reverse().find((stage) => progress >= stage.at) || stageNames[0];
    const label = document.querySelector('.progress-stage');
    const percentLabel = document.querySelector('.progress-percent');
    const fill = document.querySelector('.progress-fill');
    if (label) label.textContent = currentStage.name;
    if (percentLabel) percentLabel.textContent = `${percent}%`;
    if (fill) gsap.set(fill, { scaleX: progress });
  };

  const preparePath = (path) => {
    if (!path || typeof path.getTotalLength !== 'function') return 0;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    return length;
  };

  const revealPath = (timeline, selector, duration, position, ease = 'none') => {
    timeline.to(selector, {
      opacity: 1,
      strokeDashoffset: 0,
      visibility: 'visible',
      duration,
      ease
    }, position);
  };

  const setMatureState = () => {
    gsap.set('.plant-art, .roots, .stem-system, .leaves, .bud', { display: 'block', visibility: 'visible', opacity: 1 });
    gsap.set('.root, .stem, .branch, .bud-stem', { visibility: 'visible', opacity: 1 });
    document.querySelectorAll('.root, .stem, .branch, .bud-stem').forEach((path) => {
      path.style.strokeDasharray = 'none';
      path.style.strokeDashoffset = '0';
    });
    gsap.set(['.leaf-set', '.leaves .leaf', '.leaves .leaf-vein', '.bud', '.soil-particles'], { display: 'block' });
    gsap.set(['.leaf', '.leaf-vein', '.bud'], { scale: 1, opacity: 1, visibility: 'visible' });
    gsap.set('.soil-particles', { opacity: 1, visibility: 'visible' });
    gsap.set(['.hero-intro', '.hero-intro-sub'], { opacity: 0, y: -30, filter: 'blur(0px)' });
    gsap.set('.hero-outro', { opacity: 1, y: 0, filter: 'blur(0px)' });
    gsap.set('.progress-fill', { scaleX: 1 });
    setProgressCopy(1);
  };

  const init = () => {
    // Keep the illustrated fallback visible if a CDN script is unavailable.
    if (!window.gsap || !window.ScrollTrigger) return;
    document.documentElement.classList.add('growth-js-ready');

    if (motionQuery.matches) {
      setMatureState();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const roots = gsap.utils.toArray('.root');
    const stems = gsap.utils.toArray('.stem, .branch, .bud-stem');
    roots.forEach(preparePath);
    stems.forEach(preparePath);
    // Keep the SVG artwork visible; animate its individual growth groups instead.
    gsap.set('.plant-art', { display: 'block', visibility: 'visible', opacity: 1 });
    gsap.set('.roots, .stem-system, .leaves', { display: 'block', visibility: 'visible', opacity: 0 });
    gsap.set('.root, .stem, .branch, .bud-stem', { opacity: 0, visibility: 'visible' });
    gsap.set('.leaf', { scale: 0, opacity: 1 });
    gsap.set('.leaf-vein', { scaleX: 0, opacity: .58 });
    gsap.set('.bud', { scale: 0, opacity: 1 });
    gsap.set('.soil-particles', { opacity: 0 });
    gsap.set('.soil-particles .particle', { y: 0, x: 0 });

    let revealCompleted = false;
    const timeline = gsap.timeline({
      defaults: { ease: 'power2.out' },
      scrollTrigger: {
        trigger: '.growth-section',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        pin: '.hero-scene',
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          setProgressCopy(self.progress);
          document.documentElement.classList.toggle('growth-started', self.progress > 0);
          document.documentElement.classList.toggle('growth-complete', self.progress >= .9);
          gsap.set('.plant-art', {
            opacity: self.progress > 0 ? 1 : 0,
            visibility: 'visible'
          });
          // Guarantee a complete plant at the end of the scroll range, even if
          // a browser skips scrub frames during a fast scroll.
          if (self.progress >= .9) {
            revealCompleted = true;
            gsap.set('.plant-art, .roots, .stem-system, .leaves, .bud', { opacity: 1, visibility: 'visible' });
            gsap.set('.root, .stem, .branch, .bud-stem', {
              opacity: 1,
              visibility: 'visible',
              strokeDasharray: 'none',
              strokeDashoffset: 0
            });
            gsap.set('.leaf, .leaf-vein, .bud', {
              opacity: 1,
              visibility: 'visible',
              scale: 1
            });
          }
        }
      }
    });

    timeline
      .addLabel('roots', 0)
      .set('.plant-art, .roots', { display: 'block', visibility: 'visible', opacity: 1 }, 'roots+=0.15')
      .to('.roots', { opacity: 1, visibility: 'visible', duration: 0.15, ease: 'none' }, 'roots+=0.15')
      .to('.hero-intro', { opacity: 0, y: -30, filter: 'blur(5px)', duration: 1.1, ease: 'power2.out' }, 'roots+=0.8')
      .to('.hero-intro-sub', { opacity: 0, y: -18, filter: 'blur(4px)', duration: 0.9, ease: 'power2.out' }, 'roots+=1')
      ;

    revealPath(timeline, '.root-main', 2.35, 'roots+=0.15');
    revealPath(timeline, '.root-left', 1.2, 'roots+=1.05');
    revealPath(timeline, '.root-right', 1.25, 'roots+=1.25');
    revealPath(timeline, '.root-fine-left', 0.65, 'roots+=1.8');
    revealPath(timeline, '.root-fine-right', 0.65, 'roots+=1.95');

    timeline
      .addLabel('sprout', 4.8)
      .set('.soil-particles, .stem-system', { display: 'block' }, 'sprout+=0.15')
      .to('.stem-system', { opacity: 1, visibility: 'visible', duration: 0.15, ease: 'none' }, 'sprout+=0.1')
      .to('.soil-particles', { opacity: 1, visibility: 'visible', duration: 0.35, ease: 'power1.out' }, 'sprout+=0.15')
      .to('.particle-1', { x: -12, y: -5, duration: 0.35, ease: 'power1.out' }, 'sprout+=0.4')
      .to('.particle-2', { x: 13, y: -3, duration: 0.35, ease: 'power1.out' }, 'sprout+=0.5')
      .to('.particle-3', { x: 9, y: -7, duration: 0.35, ease: 'power1.out' }, 'sprout+=0.55')
      .to('.particle-4', { x: -8, y: -4, duration: 0.35, ease: 'power1.out' }, 'sprout+=0.45');

    revealPath(timeline, '.stem-main', 2.1, 'sprout+=0.25', 'power1.inOut');
    revealPath(timeline, '.stem-upper', 2.45, 'sprout+=1.65', 'power1.inOut');

    timeline
      .addLabel('first-leaves', 11.1)
      .set('.leaves', { display: 'block' }, 'first-leaves')
      .set('.leaves .leaf, .leaves .leaf-vein', { visibility: 'visible' }, 'first-leaves')
      .to('.leaves', { opacity: 1, visibility: 'visible', duration: 0.15, ease: 'none' }, 'first-leaves')
      .set('.leaf', { display: 'block', visibility: 'visible', scale: 1 }, 'first-leaves')
      .set('.leaf-set-5, .leaf-set-6, .leaf-set-1', { display: 'block' }, 'first-leaves')
      .to('.leaf-5', { scale: 1, rotation: -2, opacity: 1, duration: 0.9, ease: 'back.out(1.5)' }, 'first-leaves')
      .to('.vein-5', { scaleX: 1, opacity: .58, duration: .45 }, 'first-leaves+=0.35')
      .to('.leaf-6', { scale: 1, rotation: 3, opacity: 1, duration: 1, ease: 'back.out(1.4)' }, 'first-leaves+=0.55')
      .to('.vein-6', { scaleX: 1, opacity: .58, duration: .45 }, 'first-leaves+=0.9')
      .to('.leaf-1', { scale: 1, rotation: -4, opacity: 1, duration: 1.05, ease: 'back.out(1.4)' }, 'first-leaves+=1.25')
      .to('.vein-1', { scaleX: 1, opacity: .58, duration: .45 }, 'first-leaves+=1.65');

    timeline
      .addLabel('growth', 14.2)
      .to('.branch-1', { strokeDashoffset: 0, duration: 0.85, ease: 'power1.inOut' }, 'growth')
      .to('.branch-2', { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut' }, 'growth+=0.35')
      .set('.leaf-set-2, .leaf-set-7', { display: 'block' }, 'growth+=0.55')
      .to('.leaf-2', { scale: 1, rotation: 4, opacity: 1, duration: 1.05, ease: 'back.out(1.45)' }, 'growth+=0.55')
      .to('.vein-2', { scaleX: 1, opacity: .58, duration: .45 }, 'growth+=.95')
      .to('.leaf-7', { scale: 1, rotation: -5, opacity: 1, duration: .95, ease: 'back.out(1.4)' }, 'growth+=1.05')
      .to('.vein-7', { scaleX: 1, opacity: .58, duration: .4 }, 'growth+=1.4')
      .set('.leaf-set-3, .leaf-set-4', { display: 'block' }, 'growth+=1.3')
      .to('.branch-3', { strokeDashoffset: 0, duration: 0.85, ease: 'power1.inOut' }, 'growth+=1.3')
      .to('.branch-4', { strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut' }, 'growth+=1.7')
      .to('.leaf-3', { scale: 1, rotation: -3, opacity: 1, duration: .95, ease: 'back.out(1.35)' }, 'growth+=2.0')
      .to('.vein-3', { scaleX: 1, opacity: .58, duration: .4 }, 'growth+=2.35')
      .to('.leaf-4', { scale: 1, rotation: 4, opacity: 1, duration: 1, ease: 'back.out(1.35)' }, 'growth+=2.4')
      .to('.vein-4', { scaleX: 1, opacity: .58, duration: .4 }, 'growth+=2.75');

    timeline
      .addLabel('mature', 18.1)
      .to('.plant-wrapper', { scale: 1.035, y: -8, duration: 4, ease: 'none' }, 'growth+=1.6')
      .set('.leaf-set-8', { display: 'block' }, 'mature')
      .to('.leaf-8', { scale: 1, rotation: 2, opacity: 1, duration: .95, ease: 'back.out(1.35)' }, 'mature')
      .to('.vein-8', { scaleX: 1, opacity: .58, duration: .4 }, 'mature+=.35')
      .set('.bud', { display: 'block' }, 'mature+=.6')
      .to('.bud', { scale: 1, opacity: 1, visibility: 'visible', duration: .95, ease: 'back.out(1.35)' }, 'mature+=.6')
      .to('.hero-outro', { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out' }, 'mature+=.35')
      .to('.plant-art', { rotation: .35, duration: .7, ease: 'sine.inOut', transformOrigin: '300px 850px' }, 'mature+=1.3')
      .to('.plant-art', { rotation: 0, duration: .7, ease: 'sine.inOut' }, 'mature+=2')
      .to('.leaf-3', { rotation: '+=1.2', duration: 1.8, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 'mature+=1.6')
      .to('.leaf-6', { rotation: '-=0.8', duration: 1.45, repeat: 1, yoyo: true, ease: 'sine.inOut' }, 'mature+=1.9');

    setProgressCopy(0);
    const refresh = () => ScrollTrigger.refresh();
    requestAnimationFrame(refresh);
    window.addEventListener('load', refresh, { once: true });
    document.fonts?.ready?.then(refresh);

    motionQuery.addEventListener?.('change', () => window.location.reload());
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
