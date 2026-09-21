// Page runtime: compiled with npm run build; uses the existing React and GSAP globals.
        /* =================================================================
           Smooth scrolling, scroll reveals and the timeline progress.
           Defensive by design: if gsap is missing, or the browser has no
           IntersectionObserver, nothing ever gets hidden — the page just
           renders without the motion.
           ================================================================= */
        (function () {
            // The nav island stays at opacity 0 until something shows it (see
            // #site-nav in theme.css). Only the home hero's reveal drives that,
            // so this page opts in up front — set before the gsap guard so a
            // missing gsap can't leave the logo and menu button invisible.
            document.documentElement.classList.add('nav-visible');

            const gsap = window.gsap;
            if (!gsap) return;

            const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

            // Lower = tighter and more responsive, higher = floatier.
            const SMOOTH_SCROLL = 0.35;

            // Keep native scrolling on phones and touch devices, including landscape.
            const nativeScroll = window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches;
            const smoother = reduceMotion || nativeScroll ? null : ScrollSmoother.create({
                wrapper: '#smooth-wrapper',
                content: '#smooth-content',
                smooth: SMOOTH_SCROLL,
                effects: false
            });

            /* ---- Keep fixed navigation readable once it leaves the hero ---- */
            const updateNavSurface = self => {
                document.documentElement.classList.toggle('nav-pills', self.progress > 0);
            };
            ScrollTrigger.create({
                trigger: '#top',
                start: 'bottom 64px',
                end: 'max',
                onToggle: updateNavSurface,
                onRefresh: updateNavSurface
            });

            /* ---- Scroll progress bar ---- */
            if (!reduceMotion) {
                gsap.to('#scroll-progress', {
                    scaleX: 1,
                    ease: 'none',
                    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 }
                });
            }

            /* ---- Scroll reveals ----
               IntersectionObserver decides *when*: it needs no layout math, so it
               can't end up with stale positions the way ScrollTrigger can while the
               Tailwind CDN is still injecting styles (that's what left cards stuck
               invisible). gsap only does the easing. */
            const staged = [];

            const stage = el => {
                const dir = el.dataset.reveal;
                const from = dir === 'left' ? { x: -48 } : dir === 'right' ? { x: 48 } : { y: 40 };
                gsap.set(el, { autoAlpha: 0, ...from });
                staged.push(el);
            };

            if (!reduceMotion) {
                document.querySelectorAll('[data-reveal]').forEach(stage);
                document.querySelectorAll('[data-reveal-group]').forEach(group => {
                    Array.from(group.children).forEach((child, i) => {
                        child.dataset.revealDelay = (i * 0.12).toFixed(2);
                        stage(child);
                    });
                });
            }

            if (staged.length && !('IntersectionObserver' in window)) {
                gsap.set(staged, { autoAlpha: 1, x: 0, y: 0 });
            } else if (staged.length) {
                const revealObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (!entry.isIntersecting) return;
                        const el = entry.target;
                        observer.unobserve(el);
                        gsap.to(el, {
                            autoAlpha: 1,
                            x: 0,
                            y: 0,
                            duration: 0.9,
                            delay: parseFloat(el.dataset.revealDelay || '0'),
                            ease: 'power3.out',
                            overwrite: 'auto',
                            clearProps: 'transform'
                        });
                    });
                }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

                staged.forEach(el => revealObserver.observe(el));
            }

            /* ---- Aurora layers only animate while their section is on screen ---- */
            if ('IntersectionObserver' in window) {
                const auroraObserver = new IntersectionObserver(entries => {
                    entries.forEach(entry => entry.target.classList.toggle('is-paused', !entry.isIntersecting));
                }, { rootMargin: '150px' });

                document.querySelectorAll('.aurora-bars').forEach(layer => auroraObserver.observe(layer));
            }

            /* ---- Sprint section: scroll-driven zoom, then a fade to dark ----
               (no-op on pages without a #sprint section) */
            const sprint = document.querySelector('#sprint');
            if (sprint) {
                const stage = sprint.querySelector('.sprint-stage');
                const overlay = sprint.querySelector('.sprint-overlay');
                const rail = sprint.querySelector('.timeline-progress');
                const phases = gsap.utils.toArray(sprint.querySelectorAll('.sprint-phase'));
                const dots = gsap.utils.toArray(sprint.querySelectorAll('.phase-dot'));

                // Small enough that the whole timeline is on screen to start with, capped so
                // the push is still obvious when the stage already fits.
                const pushStart = () => Math.min(0.82, gsap.utils.clamp(0.45, 1, (window.innerHeight - 130) / Math.max(1, stage.offsetHeight)));

                // How far past natural size the timeline travels as you scroll into it.
                const PUSH_TO = 1.22;

                // How far the camera travels *down* the timeline. That is the distance the
                // zoomed stage overflows the viewport, so the descent starts on the heading
                // and finishes looking at the last phase with the earlier ones passed. The
                // stage moves the opposite way on screen (up) for the camera to go down.
                // Flip the sign to send the camera the other way.
                const travelDown = peak => {
                    const scaled = stage.offsetHeight * peak;
                    // How far the zoomed stage hangs out of the frame; negative so the stage
                    // moves up as the camera goes down. 0 when the frame already shows it all.
                    return Math.min(0, window.innerHeight - (sprint.offsetHeight + scaled) / 2);
                };

                // Room the stage has inside its own section before it starts lifting out of
                // it and showing background underneath. Only matters unpinned, where the
                // section is scrolling through the viewport instead of held in place.
                const slackRoom = peak => Math.max(0, (sprint.offsetHeight - stage.offsetHeight * peak) / 2);

                // Flip to false if the sprint should stay dark once you scroll through it.
                const RETURN_TO_LIGHT = true;

                // motion: null (reduced motion — dark fade only) or { from, peak, travel }
                const build = (pinned, motion) => {
                    const tl = gsap.timeline({
                        defaults: { ease: 'none' },
                        scrollTrigger: {
                            trigger: sprint,
                            // Unpinned, the range has to end before the last of the page's
                            // scroll: an end past the maximum scroll position leaves the
                            // timeline stuck mid-fade (a half-dark backdrop that never clears).
                            start: pinned ? 'top top' : 'top 70%',
                            end: pinned ? '+=160%' : 'bottom 80%',
                            scrub: 1,
                            pin: pinned,
                            anticipatePin: 1,
                            invalidateOnRefresh: true
                        }
                    });

                    // Dimmed first, then each phase lights up as the rail reaches it.
                    gsap.set(phases, { opacity: pinned ? 0.42 : 1 });
                    gsap.set(dots, { opacity: 0.45, scale: 0.8 });

                    if (motion) {
                        // Push in fast, then descend the timeline for most of the pin.
                        tl.fromTo(stage, { scale: motion.from }, { scale: motion.peak, duration: 1.4, ease: 'power2.out' }, 0);
                        tl.fromTo(stage, { y: 0 }, { y: motion.travel, duration: 3.9, ease: 'power1.inOut' }, 0.5);
                    }

                    tl.to(overlay, { opacity: 1, duration: 1.3 }, 0.4)
                        .fromTo(rail, { scaleY: 0 }, { scaleY: 1, duration: 2.6 }, 1.0);

                    phases.forEach((phase, i) => {
                        const at = 1.2 + i * 0.6;
                        tl.to(phase, { opacity: 1, duration: 0.35 }, at);
                        if (dots[i]) {
                            tl.to(dots[i], { opacity: 1, scale: motion ? 1.35 : 1, duration: 0.35, ease: 'power2.out' }, at);
                        }
                    });

                    // Pull back out to natural size and position while the light returns, so
                    // nothing is left scaled or offset once the pin is done.
                    if (motion) {
                        tl.to(stage, { scale: 1, y: 0, duration: 1.2, ease: 'power2.inOut' }, 4.4);
                    }

                    if (RETURN_TO_LIGHT) {
                        tl.to(overlay, { opacity: 0, duration: 1.2 }, 4.4);
                    }

                    // Two class flips with a CSS colour transition, rather than tweening text
                    // colours every frame. The flip follows the overlay's *actual* opacity
                    // (with hysteresis) so the copy is never dark-on-dark or light-on-light
                    // while the backdrop is mid-fade.
                    let themed = false;
                    tl.eventCallback('onUpdate', () => {
                        const o = Number(gsap.getProperty(overlay, 'opacity')) || 0;
                        if (!themed && o > 0.62) {
                            themed = true;
                            sprint.classList.add('is-dark');
                        } else if (themed && RETURN_TO_LIGHT && o < 0.35) {
                            themed = false;
                            sprint.classList.remove('is-dark');
                        }
                    });

                    return () => sprint.classList.remove('is-dark');
                };

                const mm = gsap.matchMedia();

                // Reduced motion: still fades to dark, but nothing scales or pins.
                mm.add('(prefers-reduced-motion: reduce)', () => build(false, null));

                // Roomy viewport: pin the section, push the timeline in well past natural size
                // and descend it as you scroll.
                mm.add('(min-width: 1024px) and (min-height: 700px) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () =>
                    build(true, { from: pushStart, peak: () => PUSH_TO, travel: () => travelDown(PUSH_TO) }));

                // Keep a gentle zoom on small screens, ending at natural size so
                // the timeline remains readable without clipping or pinning.
                mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference), (max-height: 699px) and (prefers-reduced-motion: no-preference), (pointer: coarse) and (prefers-reduced-motion: no-preference)', () =>
                    build(false, { from: () => 0.94, peak: () => 1, travel: () => 0 }));
            }

            /* ---- In-page anchors go through the smoother, closing the nav first ---- */
            document.addEventListener('click', event => {
                const link = event.target.closest('a[href^="#"]');
                if (!link) return;

                const hash = link.getAttribute('href');
                const target = hash && hash.length > 1 ? document.querySelector(hash) : null;
                if (!target) return;

                event.preventDefault();

                const openToggle = document.querySelector('.staggered-menu-wrapper[data-open] .sm-toggle');
                if (openToggle) openToggle.click();

                if (smoother) smoother.scrollTo(target, true);
                else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            });

            /* ---- Re-measure once the CDN styles and the icon font have settled ---- */
            window.addEventListener('load', () => ScrollTrigger.refresh());
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => ScrollTrigger.refresh());
            }

            // The nav island (next script block) needs the smoother to pause scrolling.
            window.ecoSite = { smoother };
        })();

        /* =================================================================
           StaggeredMenu (React Bits) — mounted as an island into #site-nav
           ================================================================= */
        (function () {
            const { useCallback, useLayoutEffect, useRef, useState } = React;
            const { gsap } = window;

            const StaggeredMenu = ({
                position = 'right',
                colors = ['#B497CF', '#5227FF'],
                items = [],
                socialItems = [],
                displaySocials = true,
                displayItemNumbering = true,
                className,
                logoUrl = '/src/assets/logos/reactbits-gh-white.svg',
                menuButtonColor = '#fff',
                openMenuButtonColor = '#fff',
                accentColor = '#5227FF',
                changeMenuColorOnOpen = true,
                isFixed = false,
                closeOnClickAway = true,
                onMenuOpen,
                onMenuClose
            }) => {
                const [open, setOpen] = useState(false);
                const openRef = useRef(false);
                const panelRef = useRef(null);
                const preLayersRef = useRef(null);
                const preLayerElsRef = useRef([]);
                const plusHRef = useRef(null);
                const plusVRef = useRef(null);
                const iconRef = useRef(null);
                const textInnerRef = useRef(null);
                const textWrapRef = useRef(null);
                const [textLines, setTextLines] = useState(['Menu', 'Close']);

                const openTlRef = useRef(null);
                const closeTweenRef = useRef(null);
                const spinTweenRef = useRef(null);
                const textCycleAnimRef = useRef(null);
                const colorTweenRef = useRef(null);
                const toggleBtnRef = useRef(null);
                const busyRef = useRef(false);
                const itemEntranceTweenRef = useRef(null);

                useLayoutEffect(() => {
                    const ctx = gsap.context(() => {
                        const panel = panelRef.current;
                        const preContainer = preLayersRef.current;
                        const plusH = plusHRef.current;
                        const plusV = plusVRef.current;
                        const icon = iconRef.current;
                        const textInner = textInnerRef.current;
                        if (!panel || !plusH || !plusV || !icon || !textInner) return;

                        let preLayers = [];
                        if (preContainer) {
                            preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
                        }
                        preLayerElsRef.current = preLayers;

                        const offscreen = position === 'left' ? -100 : 100;
                        gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
                        if (preContainer) {
                            gsap.set(preContainer, { xPercent: 0, opacity: 1 });
                        }
                        gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
                        gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
                        gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
                        gsap.set(textInner, { yPercent: 0 });
                        if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
                    });
                    return () => ctx.revert();
                }, [menuButtonColor, position]);

                const buildOpenTimeline = useCallback(() => {
                    const panel = panelRef.current;
                    const layers = preLayerElsRef.current;
                    if (!panel) return null;

                    openTlRef.current?.kill();
                    if (closeTweenRef.current) {
                        closeTweenRef.current.kill();
                        closeTweenRef.current = null;
                    }
                    itemEntranceTweenRef.current?.kill();

                    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
                    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
                    const socialTitle = panel.querySelector('.sm-socials-title');
                    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

                    const offscreen = position === 'left' ? -100 : 100;
                    const layerStates = layers.map(el => ({ el, start: offscreen }));
                    const panelStart = offscreen;

                    if (itemEls.length) {
                        gsap.set(itemEls, { yPercent: 140, rotate: 10 });
                    }
                    if (numberEls.length) {
                        gsap.set(numberEls, { '--sm-num-opacity': 0 });
                    }
                    if (socialTitle) {
                        gsap.set(socialTitle, { opacity: 0 });
                    }
                    if (socialLinks.length) {
                        gsap.set(socialLinks, { y: 25, opacity: 0 });
                    }

                    const tl = gsap.timeline({ paused: true });

                    layerStates.forEach((ls, i) => {
                        tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
                    });
                    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
                    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
                    const panelDuration = 0.65;
                    tl.fromTo(
                        panel,
                        { xPercent: panelStart },
                        { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
                        panelInsertTime
                    );

                    if (itemEls.length) {
                        const itemsStartRatio = 0.15;
                        const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
                        tl.to(
                            itemEls,
                            {
                                yPercent: 0,
                                rotate: 0,
                                duration: 1,
                                ease: 'power4.out',
                                stagger: { each: 0.1, from: 'start' }
                            },
                            itemsStart
                        );
                        if (numberEls.length) {
                            tl.to(
                                numberEls,
                                {
                                    duration: 0.6,
                                    ease: 'power2.out',
                                    '--sm-num-opacity': 1,
                                    stagger: { each: 0.08, from: 'start' }
                                },
                                itemsStart + 0.1
                            );
                        }
                    }

                    if (socialTitle || socialLinks.length) {
                        const socialsStart = panelInsertTime + panelDuration * 0.4;
                        if (socialTitle) {
                            tl.to(
                                socialTitle,
                                {
                                    opacity: 1,
                                    duration: 0.5,
                                    ease: 'power2.out'
                                },
                                socialsStart
                            );
                        }
                        if (socialLinks.length) {
                            tl.to(
                                socialLinks,
                                {
                                    y: 0,
                                    opacity: 1,
                                    duration: 0.55,
                                    ease: 'power3.out',
                                    stagger: { each: 0.08, from: 'start' },
                                    onComplete: () => {
                                        gsap.set(socialLinks, { clearProps: 'opacity' });
                                    }
                                },
                                socialsStart + 0.04
                            );
                        }
                    }

                    openTlRef.current = tl;
                    return tl;
                }, []);

                const playOpen = useCallback(() => {
                    if (busyRef.current) return;
                    busyRef.current = true;
                    const tl = buildOpenTimeline();
                    if (tl) {
                        tl.eventCallback('onComplete', () => {
                            busyRef.current = false;
                        });
                        tl.play(0);
                    } else {
                        busyRef.current = false;
                    }
                }, [buildOpenTimeline]);

                const playClose = useCallback(() => {
                    openTlRef.current?.kill();
                    openTlRef.current = null;
                    itemEntranceTweenRef.current?.kill();

                    const panel = panelRef.current;
                    const layers = preLayerElsRef.current;
                    if (!panel) return;

                    const all = [...layers, panel];
                    closeTweenRef.current?.kill();
                    const offscreen = position === 'left' ? -100 : 100;
                    closeTweenRef.current = gsap.to(all, {
                        xPercent: offscreen,
                        duration: 0.32,
                        ease: 'power3.in',
                        overwrite: 'auto',
                        onComplete: () => {
                            const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
                            if (itemEls.length) {
                                gsap.set(itemEls, { yPercent: 140, rotate: 10 });
                            }
                            const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
                            if (numberEls.length) {
                                gsap.set(numberEls, { '--sm-num-opacity': 0 });
                            }
                            const socialTitle = panel.querySelector('.sm-socials-title');
                            const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
                            if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
                            if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
                            busyRef.current = false;
                        }
                    });
                }, [position]);

                const animateIcon = useCallback(opening => {
                    const icon = iconRef.current;
                    if (!icon) return;
                    spinTweenRef.current?.kill();
                    if (opening) {
                        spinTweenRef.current = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
                    } else {
                        spinTweenRef.current = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
                    }
                }, []);

                const animateColor = useCallback(
                    opening => {
                        const btn = toggleBtnRef.current;
                        if (!btn) return;
                        colorTweenRef.current?.kill();
                        if (changeMenuColorOnOpen) {
                            const targetColor = opening ? openMenuButtonColor : menuButtonColor;
                            colorTweenRef.current = gsap.to(btn, {
                                color: targetColor,
                                delay: 0.18,
                                duration: 0.3,
                                ease: 'power2.out'
                            });
                        } else {
                            gsap.set(btn, { color: menuButtonColor });
                        }
                    },
                    [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]
                );

                React.useEffect(() => {
                    if (toggleBtnRef.current) {
                        if (changeMenuColorOnOpen) {
                            const targetColor = openRef.current ? openMenuButtonColor : menuButtonColor;
                            gsap.set(toggleBtnRef.current, { color: targetColor });
                        } else {
                            gsap.set(toggleBtnRef.current, { color: menuButtonColor });
                        }
                    }
                }, [changeMenuColorOnOpen, menuButtonColor, openMenuButtonColor]);

                const animateText = useCallback(opening => {
                    const inner = textInnerRef.current;
                    if (!inner) return;
                    textCycleAnimRef.current?.kill();

                    const currentLabel = opening ? 'Menu' : 'Close';
                    const targetLabel = opening ? 'Close' : 'Menu';
                    const cycles = 3;
                    const seq = [currentLabel];
                    let last = currentLabel;
                    for (let i = 0; i < cycles; i++) {
                        last = last === 'Menu' ? 'Close' : 'Menu';
                        seq.push(last);
                    }
                    if (last !== targetLabel) seq.push(targetLabel);
                    seq.push(targetLabel);
                    setTextLines(seq);

                    gsap.set(inner, { yPercent: 0 });
                    const lineCount = seq.length;
                    const finalShift = ((lineCount - 1) / lineCount) * 100;
                    textCycleAnimRef.current = gsap.to(inner, {
                        yPercent: -finalShift,
                        duration: 0.5 + lineCount * 0.07,
                        ease: 'power4.out'
                    });
                }, []);

                const toggleMenu = useCallback(() => {
                    const target = !openRef.current;
                    openRef.current = target;
                    setOpen(target);
                    if (target) {
                        onMenuOpen?.();
                        playOpen();
                    } else {
                        onMenuClose?.();
                        playClose();
                    }
                    animateIcon(target);
                    animateColor(target);
                    animateText(target);
                }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

                const closeMenu = useCallback(() => {
                    if (openRef.current) {
                        openRef.current = false;
                        setOpen(false);
                        onMenuClose?.();
                        playClose();
                        animateIcon(false);
                        animateColor(false);
                        animateText(false);
                    }
                }, [playClose, animateIcon, animateColor, animateText, onMenuClose]);

                React.useEffect(() => {
                    if (!open) return;
                    const savedOverflow = document.body.style.overflow;
                    document.body.style.overflow = 'hidden';
                    const handleEscape = event => {
                        if (event.key === 'Escape') {
                            closeMenu();
                            toggleBtnRef.current?.focus();
                        }
                    };
                    document.addEventListener('keydown', handleEscape);
                    return () => {
                        document.body.style.overflow = savedOverflow;
                        document.removeEventListener('keydown', handleEscape);
                    };
                }, [open, closeMenu]);

                React.useEffect(() => {
                    if (!closeOnClickAway || !open) return;

                    const handleClickOutside = event => {
                        if (
                            panelRef.current &&
                            !panelRef.current.contains(event.target) &&
                            toggleBtnRef.current &&
                            !toggleBtnRef.current.contains(event.target)
                        ) {
                            closeMenu();
                        }
                    };

                    document.addEventListener('mousedown', handleClickOutside);
                    return () => {
                        document.removeEventListener('mousedown', handleClickOutside);
                    };
                }, [closeOnClickAway, open, closeMenu]);

                return (
                    <div
                        className={(className ? className + ' ' : '') + 'staggered-menu-wrapper' + (isFixed ? ' fixed-wrapper' : '')}
                        style={accentColor ? { ['--sm-accent']: accentColor } : undefined}
                        data-position={position}
                        data-open={open || undefined}
                    >
                        <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
                            {(() => {
                                const raw = colors && colors.length ? colors.slice(0, 4) : ['#1e1e22', '#35353c'];
                                let arr = [...raw];
                                if (arr.length >= 3) {
                                    const mid = Math.floor(arr.length / 2);
                                    arr.splice(mid, 1);
                                }
                                return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
                            })()}
                        </div>
                        <header className="staggered-menu-header" aria-label="Main navigation header">
                            <div className="sm-logo" aria-label="Logo">
                                <a className="sm-logo-link" href="index.html">
                                    <img
                                        src={logoUrl || '/src/assets/logos/reactbits-gh-white.svg'}
                                        alt="EcoCode Incubator"
                                        className="sm-logo-img"
                                        draggable={false}
                                        width={134}
                                        height={34}
                                    />
                                </a>
                            </div>
                            <button
                                ref={toggleBtnRef}
                                className="sm-toggle"
                                aria-label={open ? 'Close menu' : 'Open menu'}
                                aria-expanded={open}
                                aria-controls="staggered-menu-panel"
                                onClick={toggleMenu}
                                type="button"
                            >
                                <span ref={textWrapRef} className="sm-toggle-textWrap" aria-hidden="true">
                                    <span ref={textInnerRef} className="sm-toggle-textInner">
                                        {textLines.map((l, i) => (
                                            <span className="sm-toggle-line" key={i}>
                                                {l}
                                            </span>
                                        ))}
                                    </span>
                                </span>
                                <span ref={iconRef} className="sm-icon" aria-hidden="true">
                                    <span ref={plusHRef} className="sm-icon-line" />
                                    <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" />
                                </span>
                            </button>
                        </header>

                        <aside id="staggered-menu-panel" ref={panelRef} className="staggered-menu-panel" aria-hidden={!open} inert={open ? undefined : ''}>
                            <div className="sm-panel-inner">
                                <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
                                    {items && items.length ? (
                                        items.map((it, idx) => (
                                            <li className="sm-panel-itemWrap" key={it.label + idx}>
                                                <a className="sm-panel-item" href={it.link} onClick={closeMenu} aria-label={it.ariaLabel} data-index={idx + 1}>
                                                    <span className="sm-panel-itemLabel">{it.label}</span>
                                                </a>
                                            </li>
                                        ))
                                    ) : (
                                        <li className="sm-panel-itemWrap" aria-hidden="true">
                                            <span className="sm-panel-item">
                                                <span className="sm-panel-itemLabel">No items</span>
                                            </span>
                                        </li>
                                    )}
                                </ul>
                                {displaySocials && socialItems && socialItems.length > 0 && (
                                    <div className="sm-socials" aria-label="Social links">
                                        <h3 className="sm-socials-title">Socials</h3>
                                        <ul className="sm-socials-list" role="list">
                                            {socialItems.map((s, i) => (
                                                <li key={s.label + i} className="sm-socials-item">
                                                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                                                        {s.label}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                );
            };

            const SOCIALS = {
                discord: 'https://discord.gg/rBKjsqp62f',
                github: 'https://github.com/ecocodehs-gif',
                instagram: 'https://www.instagram.com/ecocode.hs/'
            };

            // Pitch-an-idea form; also linked from this page's CTA button.
            const PITCH_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSe8jXCI5PJqd5-YQhOikwNoQyigVHh08dyGxh6m30CbZzfGGw/viewform?usp=publish-editor';

            const menuItems = [
                { label: 'Home', ariaLabel: 'Back to the home page', link: 'index.html' },
                { label: 'Projects', ariaLabel: 'View our target projects', link: 'projects.html' },
                { label: 'Pitch an Idea', ariaLabel: 'Pitch your project idea', link: PITCH_FORM }
            ];

            const socialItems = [
                { label: 'Discord', link: SOCIALS.discord },
                { label: 'GitHub', link: SOCIALS.github },
                { label: 'Instagram', link: SOCIALS.instagram }
            ];

            const smoother = window.ecoSite && window.ecoSite.smoother;

            ReactDOM.createRoot(document.getElementById('site-nav')).render(
                <StaggeredMenu
                    position="right"
                    isFixed
                    items={menuItems}
                    socialItems={socialItems}
                    displaySocials
                    displayItemNumbering
                    colors={['#22c55e', '#14532d']}
                    menuButtonColor="#f8fafc"
                    openMenuButtonColor="#4ade80"
                    changeMenuColorOnOpen
                    accentColor="#4ade80"
                    logoUrl="assets/eco-logo-pixel.svg"
                    onMenuOpen={() => smoother && smoother.paused(true)}
                    onMenuClose={() => smoother && smoother.paused(false)}
                />
            );
        })();
