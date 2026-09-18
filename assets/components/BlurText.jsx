// Adapted from the supplied React Bits BlurText component.
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const buildKeyframes = (from, steps) => {
  const keys = new Set([...Object.keys(from), ...steps.flatMap(s => Object.keys(s))]);
  return Object.fromEntries([...keys].map(k => [k, [from[k], ...steps.map(s => s[k])]]));
};

export default function BlurText({
  text = '', delay = 120, className = '', animateBy = 'words', direction = 'top',
  threshold = 0.1, rootMargin = '0px', animationFrom, animationTo,
  easing = t => t, onAnimationComplete, stepDuration = 0.35, startDelay = 0
}) {
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');
  const [inView, setInView] = useState(false);
  const ref = useRef(null);
  const reduceMotion = useReducedMotion();
  const words = useRef([]);

  useEffect(() => {
    if (!ref.current) return;
    if (reduceMotion || !('IntersectionObserver' in window)) { setInView(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setInView(true);
      observer.disconnect();
    }, { threshold, rootMargin });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold, rootMargin, reduceMotion]);

  const defaultFrom = useMemo(() => ({
    filter: 'blur(10px)', opacity: 0, y: direction === 'top' ? -50 : 50
  }), [direction]);
  const defaultTo = useMemo(() => [
    { filter: 'blur(5px)', opacity: 0.5, y: direction === 'top' ? 5 : -5 },
    { filter: 'blur(0px)', opacity: 1, y: 0 }
  ], [direction]);
  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const stepCount = toSnapshots.length + 1;
  const times = Array.from({ length: stepCount }, (_, i) => i / Math.max(1, stepCount - 1));

  // A span preserves the surrounding h1 and the headline's two-line structure.
  return (
    <span ref={ref} className={`blur-text ${className}`}>
      <span className="blur-text-accessible">{text}</span>
      {elements.map((segment, index) => (
        <React.Fragment key={index}>
          <motion.span
            ref={el => { words.current[index] = el; }}
            className="blur-text-word" aria-hidden="true"
            initial={reduceMotion ? false : fromSnapshot}
            animate={reduceMotion ? toSnapshots[toSnapshots.length - 1] : inView ? buildKeyframes(fromSnapshot, toSnapshots) : fromSnapshot}
            transition={reduceMotion ? { duration: 0 } : {
              duration: stepDuration * (stepCount - 1), times,
              delay: startDelay + index * delay / 1000, ease: easing
            }}
            onAnimationComplete={() => {
              // Release the filter layer when the entrance ends; only the intro
              // needs blur, and the rest of the page keeps scrolling afterwards.
              if (inView || reduceMotion) words.current[index]?.classList.add('blur-text-revealed');
              if (index === elements.length - 1) onAnimationComplete?.();
            }}
          >{segment === ' ' ? '\u00A0' : segment}</motion.span>
          {animateBy === 'words' && index < elements.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </span>
  );
}
