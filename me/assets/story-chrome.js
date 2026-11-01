// story-chrome.js — light "story" chrome: scroll-progress bar + scroll-linked
// active nav. Progressive enhancement only: with JS off (or on failure), the
// content and the existing hash-based nav stay fully usable. Pairs with
// story-chrome.css. Loaded with `defer`, mirroring assets/theme-switch.js.
//
// Design guarantees:
//   * Decorative + additive. Only drives the progress bar fill and toggles the
//     existing `nav a.active` class — never restyles or removes content.
//   * One passive-listener rAF loop for the progress bar (no scroll thrash).
//   * A single IntersectionObserver for active-nav; one link active at a time.
//   * Fail-open: any error is swallowed so the page never breaks.
(() => {
	'use strict';

	try {
		const docEl = document.documentElement;

		/* ---------- Scroll-progress bar ---------- */
		const fill = document.querySelector('.scroll-progress__fill');

		if (fill) {
			let ticking = false;
			// Cached scroll extent. Reading scrollHeight inside the rAF callback
			// forces a layout on every scroll frame, and with Lenis writing scroll
			// position and pins mutating layout each frame, that recomputes
			// continuously. Recompute only when the document can actually change
			// height: resize, and after ScrollTrigger re-measures its pins.
			let max = 0;

			const measure = () => {
				max = docEl.scrollHeight - window.innerHeight;
			};

			const updateProgress = () => {
				ticking = false;
				const fraction = max > 0 ? window.scrollY / max : 0;
				// Clamp to 0..1 (rubber-band scrolling can overshoot on some devices).
				const clamped = fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
				fill.style.transform = 'scaleX(' + clamped + ')';
			};

			const requestProgress = () => {
				if (ticking) return;
				ticking = true;
				window.requestAnimationFrame(updateProgress);
			};

			const remeasure = () => {
				measure();
				requestProgress();
			};

			measure();
			updateProgress(); // initial paint (e.g. deep-link / restored scroll position)
			window.addEventListener('scroll', requestProgress, { passive: true });
			window.addEventListener('resize', remeasure, { passive: true });
			// Pins add scroll distance; re-measure whenever the film re-measures.
			window.ScrollTrigger?.addEventListener('refresh', remeasure);
			// Fonts and the hero frame can settle after this script runs.
			window.addEventListener('load', remeasure, { passive: true });
		}

		/* ---------- Scroll-linked active nav ---------- */
		const navLinks = new Map();
		document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
			const id = link.getAttribute('href').slice(1);
			if (id) navLinks.set(id, link);
		});

		// DOM order matters: used to pick the topmost in-view section. Mirrors the
		// nav targets in index.html, in the order they appear in the document.
		const sections = ['home', 'applicant', 'offer', 'closing', 'dossier']
			.map((id) => document.getElementById(id))
			.filter(Boolean);

		if (navLinks.size && sections.length && 'IntersectionObserver' in window) {
			const inView = new Set();

			const setActive = (id) => {
				navLinks.forEach((link, key) => {
					link.classList.toggle('active', key === id);
				});
			};

			const observer = new IntersectionObserver(
				(entries) => {
					for (const entry of entries) {
						if (entry.isIntersecting) inView.add(entry.target.id);
						else inView.delete(entry.target.id);
					}
					// Topmost in-view section owns "active". If none is in the band
					// (e.g. scrolling through a JD/CV sub-section), keep the last
					// active link rather than clearing it.
					const topmost = sections.find((section) => inView.has(section.id));
					if (topmost) setActive(topmost.id);
				},
				// Narrow horizontal band near the top third so exactly one section
				// crosses it at a time.
				{ rootMargin: '-45% 0px -50% 0px', threshold: 0 },
			);

			sections.forEach((section) => observer.observe(section));
		}
	} catch (error) {
		/* Chrome is decorative — never let an enhancement error break the page. */
	}
})();
