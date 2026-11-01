// story-film.js — scroll-driven "short film" choreography.
//
// Turns each chapter into a scene whose beats rise into view as the reader
// scrolls (GSAP + ScrollTrigger), gliding on Lenis smooth scroll. The opening
// and closing scenes pin and play a scrubbed camera move during the hold.
//
// Relationship to the older reveal engine (assets/story.js):
//   * This file runs BEFORE story.js (script order in index.html).
//   * When the film activates it adds `html.film-ready`; story.js then bails and
//     story.css stops hiding [data-reveal] (its rules are scoped
//     `html.js-ready:not(.film-ready)`). GSAP owns the motion instead.
//   * When the film does NOT activate (narrow screen, reduced motion, or the
//     CDN libraries are missing) this file returns early and the existing
//     story.js reveal runs unchanged — the guaranteed fallback.
//
// Two ordering rules keep the choreography honest and must not be reshuffled:
//   1. Pins are created BEFORE reveals and carry `refreshPriority: 1`.
//      ScrollTrigger refreshes in priority-then-creation order; if a reveal is
//      measured before the pin above it has inserted its spacer, that reveal is
//      early by the full pin distance and finishes below the fold.
//   2. Reveals are per-beat and non-reversing (`once: true`), matching story.js's
//      reveal-once contract. A reversing scrub leaves beats — including the two
//      closing CTAs — at opacity 0 while still in the tab order.
//
// Fail-open: any error during setup calls failOpen(), which force-shows every
// beat with inline styles that win over both stylesheets, so content is never
// trapped hidden. Loaded with `defer`, mirroring the other enhancement scripts.
(() => {
	'use strict';

	const root = document.documentElement;
	const REVEAL = '[data-reveal]';

	// Per-scene entrance recipes. `from` values are the pre-hide state; the tween
	// lands all of them at rest. Scenes absent from this map use DEFAULT_ENTRANCE.
	//
	// The vocabulary is deliberately narrow and physical — this is a letter on a
	// desk, so beats behave like paper on a surface rather than like UI:
	//   y         the sheet drops the last few millimetres onto the desk
	//   x         the sheet is slid in from the side
	//   rotation  it lands very slightly off-square (never more than 0.6deg)
	//   blur      the camera finds focus (desktop only — see the isPhone block)
	//   scale     the camera settles, used where blur is too expensive
	// No scene combines more than two. Every scene reads differently from its
	// neighbours, which is what kills the "35 beats all doing one fade" monotony.
	const DEFAULT_ENTRANCE = {
		start: 'top 86%',
		y: 40,
		duration: 0.8,
		stagger: 0.12,
		ease: 'expo.out',
	};
	const ENTRANCE = {
		// Cold open: the copy is set down on the frame, barely off-square.
		home: { start: 'top 92%', y: 30, rotation: -0.5, duration: 0.95, stagger: 0.14, ease: 'expo.out' },
		// Notes slid onto the desk beside the photograph.
		applicant: { start: 'top 84%', y: 26, x: 18, rotation: -0.4, duration: 0.9, stagger: 0.15, ease: 'expo.out' },
		// The strongest copy on the page: almost no travel, the camera racks
		// focus onto each admission instead. Slowest cascade — restraint as
		// emphasis rather than decoration.
		honest: { start: 'top 82%', y: 14, blur: 5, duration: 1.45, stagger: 0.3, ease: 'power2.out' },
		offer: { start: 'top 86%', y: 34, duration: 0.85, stagger: 0.14, ease: 'expo.out' },
		// The vow: the stillest scene on the page. Pure dissolve, zero travel.
		shared: { start: 'top 84%', y: 0, duration: 1.3, stagger: 0.4, ease: 'power2.out' },
		// The climax. Nothing moves quickly here; the page has already stopped.
		'no-test': { start: 'top 84%', y: 18, duration: 1.35, stagger: 0.42, ease: 'power2.out' },
		dossier: { start: 'top 88%', y: 34, duration: 0.8, stagger: 0.1, ease: 'expo.out' },
		// Last frame. Longest landing on the page.
		end: { start: 'top 82%', y: 24, duration: 1.4, stagger: 0.3, ease: 'power2.out' },
	};

	// Touch scroll delivers events in bursts during momentum, so a numeric scrub
	// (which interpolates between them) is the difference between "tracks the
	// thumb" and "catches up in jumps". Pins also cost real page length on a
	// phone, so they are shortened there.
	const isPhone = window.matchMedia('(max-width: 767px)').matches;
	const isTouch = window.matchMedia('(hover: none)').matches;
	const SCRUB = isTouch ? 0.6 : 0.5;
	const PIN_END = isPhone ? '+=45%' : '+=60%';

	if (isPhone) {
		// Animating `filter` re-rasterizes the layer every frame — the one
		// technique here likely to cost frames on a mid-range Android. The focus
		// pull becomes a compositor-only scale settle instead.
		delete ENTRANCE.honest.blur;
		ENTRANCE.honest.scale = 1.015;
		ENTRANCE.honest.duration = 1.2;
		// The shell has only a 16px gutter at 390px, so a slide-in has nowhere
		// to come from.
		delete ENTRANCE.applicant.x;
	}
	// `#closing` is excluded from the batch entirely: its beats are choreographed
	// on its own pin timeline so the soft landing survives in this tier too.
	const PIN_CHOREOGRAPHED = new Set(['closing']);

	// Force every beat visible regardless of stylesheet state. Inline opacity/
	// transform beat both story.css and story-film.css (neither uses !important
	// on these properties), so this is a hard guarantee against trapped content.
	const failOpen = () => {
		document.querySelectorAll(REVEAL).forEach((el) => {
			el.style.opacity = '1';
			el.style.transform = 'none';
		});
	};

	// Activation gate. The film is a progressive enhancement on top of the
	// static reveal; only take over when all three hold:
	//   * the reader has not asked to reduce motion,
	//   * the CDN libraries actually loaded,
	//   * the head watchdog has not already given up waiting for us.
	// Otherwise return and let story.js handle the reveal as it does today.
	//
	// There is deliberately NO viewport gate any more. The film used to require
	// >=768px, which meant the phone — where this link is most likely opened —
	// got the plain fade-and-rise and none of the choreography. The recipes below
	// carry explicit phone variants instead of the whole layer switching off.
	//
	// The watchdog case is the subtle one: a CDN that is slow but ultimately
	// succeeds. By the time this runs the watchdog has un-hidden the page and the
	// reader is already reading, so activating here would hide every beat again
	// in order to animate them back in — a flash-of-disappearing-content on
	// exactly the slow connections the watchdog exists to protect.
	const motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
	const libsReady =
		typeof window.gsap !== 'undefined' &&
		typeof window.ScrollTrigger !== 'undefined' &&
		typeof window.Lenis !== 'undefined';
	const watchdogFired = root.dataset.storyWatchdog === 'fired';

	if (!motionOK || !libsReady || watchdogFired) {
		return;
	}

	try {
		const { gsap, ScrollTrigger, Lenis } = window;
		gsap.registerPlugin(ScrollTrigger);

		// Marks the page as "the film is running": disables story.css reveal and
		// activates the story-film.css pre-hide + scene layout.
		root.classList.add('film-ready');
		// Tells the head watchdog an engine claimed the page, so it stops waiting.
		root.dataset.storyEngine = 'film';

		// Smooth momentum scroll, bridged into ScrollTrigger so scrubbing tracks
		// the eased scroll position rather than raw wheel deltas. Lenis already
		// eases the input, so scrub values stay low — stacking a long Lenis
		// duration on a long scrub makes the page feel mushy to read.
		const lenis = new Lenis({ duration: 0.95, smoothWheel: true });
		lenis.on('scroll', ScrollTrigger.update);
		gsap.ticker.add((time) => lenis.raf(time * 1000));
		gsap.ticker.lagSmoothing(0);

		/* ---------- 1. Pinned scenes (created first — see header note) ---------- */

		// Cold open: the pin used to be 540px of frozen scroll with nothing
		// attached. It now drives a slow camera push-in on the hero frame while
		// the copy drifts up and dissolves, so the hold reads as a dissolve into
		// scene 2 rather than a stuck page. --hero-scale is consumed by
		// .home-hero::before (styles.css); it defaults to 1, so the other two
		// tiers are unaffected.
		const hero = document.getElementById('home');
		const heroCopy = hero && hero.querySelector('.hero-copy');
		if (hero) {
			const heroPush = gsap.timeline({
				scrollTrigger: {
					trigger: hero,
					start: 'top top',
					end: PIN_END,
					pin: true,
					pinSpacing: true,
					scrub: SCRUB,
					refreshPriority: 1,
				},
			});
			heroPush.fromTo(hero, { '--hero-scale': 1 }, { '--hero-scale': 1.07, ease: 'none' }, 0);
			if (heroCopy) {
				heroPush.to(heroCopy, { y: -48, opacity: 0.12, ease: 'power1.in' }, 0);
			}
		}

		// Closing beat. The pin's job is deliberately DECORATIVE: it scrubs a warm
		// vignette (--closing-settle) so the camera appears to settle during the
		// hold. It must never drive content opacity — a scrub is reversible, and
		// scrolling back up would leave this scene's two CTAs at opacity 0 while
		// they are still in the tab order.
		const closing = document.getElementById('closing');
		if (closing) {
			const softBeats = closing.querySelectorAll(REVEAL);
			gsap.set(softBeats, { opacity: 0, y: 40 });

			gsap.timeline({
				scrollTrigger: {
					trigger: closing,
					start: 'top top',
					end: PIN_END,
					pin: true,
					pinSpacing: true,
					scrub: 1.2,
					refreshPriority: 1,
				},
			}).fromTo(closing, { '--closing-settle': 0 }, { '--closing-settle': 1, ease: 'none' });

			// The content reveal is separate and non-reversing, matching every other
			// scene. It keeps the longer, softer landing story.css reserves for
			// [data-reveal="soft"], which the old shared scene tween threw away.
			ScrollTrigger.create({
				trigger: closing,
				start: 'top 80%',
				once: true,
				onEnter: () => {
					gsap.to(softBeats, {
						opacity: 1,
						y: 0,
						ease: 'power2.out',
						duration: 1.25,
						stagger: 0.28,
						onStart: () =>
							softBeats.forEach((el) => {
								el.style.willChange = 'opacity, transform';
							}),
						// Same handoff back to CSS as the batch loop — these beats
						// skip that loop, so without it the closing panel keeps a
						// residual inline transform and loses its hover lift.
						onComplete: () =>
							softBeats.forEach((el) => {
								el.classList.add('beat-in');
								el.style.willChange = '';
								el.style.opacity = '';
								el.style.transform = '';
							}),
					});
				},
			});
		}

		/* ---------- 2. Đêm dần xuống · the night falls ---------- */

		// The single continuous transformation across all nine scenes, and the
		// reason the page reads as one evening rather than nine slides. The room
		// gets later as she scrolls, starting from the hour on HER OWN device — so
		// if she opens this at 1am it is already deep night, and a friend she shows
		// it to tomorrow afternoon sees a different room. Nothing leaves the device
		// and there is no backend; it is just her clock.
		//
		// Deliberately drives ONE custom property on ONE element. Writing a scrubbed
		// value onto :root would invalidate every element that inherits it, every
		// frame; scoping it to .nightfall keeps the recalculation to one subtree.
		//
		// It must never touch the palette tokens — she may have explicitly chosen
		// light or dark, and overriding that would be a bug, not a feature.
		const nightfall = document.querySelector('.nightfall');
		if (nightfall) {
			// Where the evening starts, by local hour. Daytime still opens softly
			// lit rather than at zero, because the room has a lamp in it either way.
			const hour = new Date().getHours();
			const startNight =
				hour >= 1 && hour < 5
					? 0.72 // small hours
					: hour < 16
						? 0.12 // daytime
						: hour < 19
							? 0.22 // late afternoon
							: hour < 21
								? 0.34 // early evening
								: hour < 23
									? 0.48 // night
									: 0.62; // near midnight

			// Always leave headroom so the arc is felt rather than saturating early.
			const endNight = Math.min(0.96, startNight + 0.46);

			gsap.fromTo(
				nightfall,
				{ '--night': startNight },
				{
					'--night': endNight,
					ease: 'none',
					scrollTrigger: {
						trigger: document.body,
						start: 'top top',
						end: 'bottom bottom',
						scrub: SCRUB,
					},
				},
			);
		}

		/* ---------- 3. Scene 2 set-piece: the photograph is picked up ---------- */

		// The one place on this page where a "turn" is physically motivated. The
		// hero frame establishes a desk with a letter on it; this is a photograph
		// lying on that same desk, and she lifts it to look at his face.
		//
		// It hinges on its OWN BOTTOM EDGE through 68 degrees — not 180. It never
		// passes the plane, so there is no back face, no backface-visibility and
		// no two-sided markup. That mechanical limit is exactly what makes it read
		// as an object obeying gravity rather than as a card-flip transition.
		//
		// The scrub is deliberate: she controls the rise with her thumb, which is
		// the difference between watching an animation and handling an object. It
		// is safe against the non-reversing invariant because it drives TRANSFORM
		// ONLY — the portrait is foreshortened but never invisible, contains
		// nothing focusable, and its accessible name is unaffected by transforms.
		const portrait = document.querySelector('#applicant .portrait');
		if (portrait) {
			gsap.set(portrait, {
				transformOrigin: '50% 100%',
				transformPerspective: 900,
				rotationX: 68,
				scale: 0.94,
				y: 8,
				force3D: true,
			});

			gsap.to(portrait, {
				rotationX: 0,
				scale: 1,
				y: 0,
				ease: 'none',
				scrollTrigger: {
					trigger: '#applicant',
					start: 'top 80%',
					end: 'top 28%',
					scrub: SCRUB,
					invalidateOnRefresh: true,
					onToggle: (self) => {
						portrait.style.willChange = self.isActive ? 'transform' : '';
					},
					// Once it is up it stays up: picked up once, mirroring the
					// reveal-once contract every other beat honours. kill(false)
					// leaves the inline transform as-is, so the resting state is
					// set explicitly first.
					onLeave: (self) => {
						gsap.set(portrait, { rotationX: 0, scale: 1, y: 0 });
						portrait.style.willChange = '';
						self.kill(false);
					},
				},
			});
		}

		/* ---------- 4. Per-beat entrances (non-reversing) ---------- */

		// One batch per scene so each can carry its own tempo, and so a tall scene
		// times its lower half correctly — a single scene-level trigger never can.
		gsap.utils.toArray('[data-scene]').forEach((scene) => {
			if (PIN_CHOREOGRAPHED.has(scene.id)) return;

			const beats = scene.querySelectorAll(REVEAL);
			if (!beats.length) return;

			const recipe = ENTRANCE[scene.id] || DEFAULT_ENTRANCE;

			const from = { opacity: 0, y: recipe.y ?? 40 };
			if (recipe.x) from.x = recipe.x;
			if (recipe.rotation) from.rotation = recipe.rotation;
			if (recipe.scale) from.scale = recipe.scale;
			if (recipe.blur) from.filter = 'blur(' + recipe.blur + 'px)';
			gsap.set(beats, from);

			const to = {
				opacity: 1,
				y: 0,
				ease: recipe.ease,
				duration: recipe.duration,
				stagger: recipe.stagger,
			};
			if (recipe.x) to.x = 0;
			if (recipe.rotation) to.rotation = 0;
			if (recipe.scale) to.scale = 1;
			if (recipe.blur) to.filter = 'blur(0px)';

			ScrollTrigger.batch(beats, {
				start: recipe.start,
				once: true,
				onEnter: (batch) => {
					gsap.to(batch, {
						...to,
						// Promote only for the life of the tween. A blanket
						// will-change on every beat holds compositor layers for
						// the whole session and costs more than it saves.
						onStart: () =>
							batch.forEach((el) => {
								el.style.willChange = recipe.blur
									? 'opacity, transform, filter'
									: 'opacity, transform';
							}),
						// Hand the element back to CSS. GSAP otherwise leaves a
						// residual inline `transform: translate(0px, 0px)`, and an
						// inline transform outranks any stylesheet rule — which
						// silently killed `.panel:hover`'s lift in this tier. The
						// `.beat-in` class stops the pre-hide rule from matching,
						// so clearing the inline styles cannot re-hide the beat.
						onComplete: () =>
							batch.forEach((el) => {
								el.classList.add('beat-in');
								el.style.willChange = '';
								el.style.opacity = '';
								el.style.transform = '';
								el.style.filter = '';
							}),
					});
				},
			});
		});

		/* ---------- 5. Anchor jumps travel with the film's camera ---------- */

		// Native `scroll-behavior: smooth` bypasses Lenis: a nav click warps the
		// page in ~24 frames with a completely different easing signature from
		// wheel scrolling. Route in-page links through Lenis instead, offset by
		// the real sticky-header height so headings never land behind it.
		// The skip link is deliberately left alone — its native behaviour also
		// moves keyboard focus, which lenis.scrollTo does not.
		const header = document.querySelector('.site-header');
		document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach((link) => {
			link.addEventListener('click', (event) => {
				const hash = link.getAttribute('href');
				if (!hash || hash === '#') return;

				const target = document.querySelector(hash);
				if (!target) return;

				event.preventDefault();
				lenis.scrollTo(target, {
					offset: header ? -header.offsetHeight : 0,
					duration: 1.4,
				});
				// Keep the URL shareable without triggering a second native jump.
				history.replaceState(null, '', hash);
			});
		});

		/* ---------- 6. Measurement ---------- */

		// Pins change total scroll height; recompute all triggers once now and on
		// full load (fonts/images can shift layout after this script runs).
		ScrollTrigger.refresh();
		window.addEventListener('load', () => ScrollTrigger.refresh(), { passive: true });

		// Safety net (mirrors story.js): if the opening scene's beats are still
		// hidden shortly after load while in view, something went wrong building
		// the timelines — force everything open.
		window.addEventListener(
			'load',
			() => {
				window.setTimeout(() => {
					const firstBeat = document.querySelector('[data-scene] ' + REVEAL);
					if (!firstBeat) return;
					const hidden = parseFloat(getComputedStyle(firstBeat).opacity) === 0;
					const rect = firstBeat.getBoundingClientRect();
					const inView = rect.top < window.innerHeight && rect.bottom > 0;
					if (hidden && inView) failOpen();
				}, 400);
			},
			{ passive: true },
		);
	} catch (error) {
		// Any failure: reveal everything so content is never trapped hidden.
		// The page stays perfectly readable, which is exactly why this used to be
		// silent — and exactly why a broken timeline could sit here unnoticed.
		// Report it: a visitor loses nothing, and a real failure stops hiding.
		failOpen();
		console.error('[story-film] disabled after setup error:', error);
	}
})();
