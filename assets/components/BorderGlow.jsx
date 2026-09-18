// Adapted from the supplied React Bits BorderGlow component.
import React, { useRef, useCallback, useEffect } from 'react';
import './BorderGlow.css';

function parseHSL(hslStr) {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 40, s: 80, l: 80 };
  return { h: parseFloat(match[1]), s: parseFloat(match[2]), l: parseFloat(match[3]) };
}

function buildGlowVars(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const opacities = [100, 60, 50, 40, 30, 20, 10];
  const keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  const vars = {};
  for (let i = 0; i < opacities.length; i++) {
    vars[`--glow-color${keys[i]}`] = `hsl(${base} / ${Math.min(opacities[i] * intensity, 100)}%)`;
  }
  return vars;
}

const GRADIENT_POSITIONS = ['80% 55%', '69% 34%', '8% 6%', '41% 38%', '86% 85%', '82% 18%', '51% 4%'];
const GRADIENT_KEYS = ['--gradient-one', '--gradient-two', '--gradient-three', '--gradient-four', '--gradient-five', '--gradient-six', '--gradient-seven'];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildGradientVars(colors) {
  const vars = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    vars[GRADIENT_KEYS[i]] = `radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`;
  }
  vars['--gradient-base'] = `linear-gradient(${colors[0]} 0 100%)`;
  return vars;
}

function isLightColor(color) {
  const value = color.trim().replace('#', '');
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(value)) return false;
  const hex = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 > 180;
}

function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
const BorderGlow = ({
  children,
  as: Tag = 'div',
  href,
  className = '',
  edgeSensitivity = 30,
  glowColor = '40 80 80',
  backgroundColor = '#120F17',
  borderRadius = 28,
  glowRadius = 40,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ['#c084fc', '#f472b6', '#38bdf8'],
  fillOpacity = 0.5,
}) => {
  const cardRef = useRef(null);

  const pointerFrame = useRef(null);
  const latestPointer = useRef(null);
  const handlePointerMove = useCallback(e => {
    if (e.pointerType === 'touch') return;
    latestPointer.current = { x: e.clientX, y: e.clientY };
    if (pointerFrame.current !== null) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = null;
      const card = cardRef.current;
      if (!card) return;
      // One layout read per frame, even when pointer events arrive faster.
      const rect = card.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = latestPointer.current.x - rect.left - cx;
      const dy = latestPointer.current.y - rect.top - cy;
      const edge = Math.min(1, Math.max(Math.abs(dx) / Math.max(cx, 1), Math.abs(dy) / Math.max(cy, 1)));
      const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360;
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(2));
      card.style.setProperty('--cursor-angle', `${angle.toFixed(2)}deg`);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(pointerFrame.current), []);

  useEffect(() => {
    if (!animated || !cardRef.current || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return;
    const card = cardRef.current;
    let frame;
    let started;
    const sweep = now => {
      started ??= now;
      const t = Math.min((now - started) / 1800, 1);
      card.classList.add('sweep-active');
      card.style.setProperty('--cursor-angle', `${110 + 355 * easeOutCubic(t)}deg`);
      card.style.setProperty('--edge-proximity', `${100 * Math.min(t / 0.15, 1, (1 - t) / 0.25)}`);
      if (t < 1) frame = requestAnimationFrame(sweep);
      else card.classList.remove('sweep-active');
    };
    // Cards sweep when first seen, rather than while still below the hero.
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      frame = requestAnimationFrame(sweep);
    }, { threshold: 0.2 });
    observer.observe(card);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); card.classList.remove('sweep-active'); };
  }, [animated]);

  const glowVars = buildGlowVars(glowColor, glowIntensity);
  const lightSurface = isLightColor(backgroundColor);

  return (
    <Tag
      href={href}
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={`border-glow-card${lightSurface ? ' border-glow-card--light' : ''} ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': edgeSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': coneSpread,
        '--fill-opacity': fillOpacity,
        ...glowVars,
        ...buildGradientVars(colors),
      }}
    >
      <span className="edge-light" aria-hidden="true" />
      <div className="border-glow-inner">
        {children}
      </div>
    </Tag>
  );
};

export default BorderGlow;


