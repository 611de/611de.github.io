// story.js — scroll-reveal "chapters" choreography.
//
// Reveals each section as the reader scrolls to it (fade + gentle rise), with a
// staggered cascade inside grouped containers. Pairs with story.css, which owns
// the hidden state and the motion tokens.
//
// Design guarantees:
//   * Enhancement only. If IntersectionObserver is missing, we bail early and
//     leave every element fully visible (story.css only hides under .js-ready).
//   * Reveal-once semantics: elements unobserve after their first entrance.
//   * No continuous scroll math — a single IntersectionObserver does the work.
//   * Fail-open: any error force-reveals everything so content is never stuck.
// Loaded with `defer`, mirroring assets/theme-switch.js.
(() => {
	'use strict';

	const REVEAL_ATTR = 'data-reveal';
	const GROUP_ATTR = 'data-reveal-group';
	const VISIBLE_CLASS = 'is-visible';
	// Cap the stagger index so late items in long lists don't lag noticeably.
	const MAX_STAGGER_INDEX = 6;
	// Fallback stagger step (ms) if the CSS token can't be read.
	const FALLBACK_STAGGER_MS = 90;

	const root = document.documentElement;

	// The scroll-driven film (story-film.js, which runs before this script) owns
	// the motion when active — it sets `html.film-ready`. Bail so the two engines
	// never animate the same beats. story.css also disables its reveal under
	// `.film-ready`, so leaving early here changes nothing for those visitors.
	if (root.classList.contains('film-ready')) {
		return;
	}

	// No IntersectionObserver → skip the whole enhancement. Because story.css
	// hides content only under `html.js-ready` (never added here in that case),
	// everything stays visible.
	if (!('IntersectionObserver' in window)) {
		return;
	}

	// The head watchdog gave up waiting for an engine (slow or stalled CDN) and
	// already un-hid the page. Re-adding `js-ready` here would hide every beat a
	// second time and reveal it again — a visible flash on exactly the slow
	// connections the watchdog exists to protect. Leave the page as it is.
	if (root.dataset.storyWatchdog === 'fired') {
		return;
	}

	// Defensive: the controller sets html.js-ready pre-paint, but re-add it here
	// so the hidden state is guaranteed even if that inline setter was skipped.
	root.classList.add('js-ready');
	// Tells the head watchdog an engine claimed the page, so it stops waiting.
	root.dataset.storyEngine = 'reveal';

	const revealAll = () => {
		document
			.querySelectorAll('[' + REVEAL_ATTR + ']')
			.forEach((el) => el.classList.add(VISIBLE_CLASS));
	};

	try {
		const staggerMs = readStaggerMs();
		const groups = Array.from(document.querySelectorAll('[' + GROUP_ATTR + ']'));

		// Pre-compute stagger delays for grouped reveal descendants. Inline
		// transition-delay is robust and lets the same element live in any group.
		for (const group of groups) {
			const items = group.querySelectorAll('[' + REVEAL_ATTR + ']');
			items.forEach((item, index) => {
				const step = Math.min(index, MAX_STAGGER_INDEX);
				item.style.transitionDelay = step * staggerMs + 'ms';
			});
		}

		const reveal = (el) => el.classList.add(VISIBLE_CLASS);

		const observer = new IntersectionObserver(
			(entries, obs) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;

					const target = entry.target;
					if (target.hasAttribute(GROUP_ATTR)) {
						// Reveal the whole chapter at once; inline delays create the cascade.
						target.querySelectorAll('[' + REVEAL_ATTR + ']').forEach(reveal);
					} else {
						reveal(target);
					}
					// Reveal once, then stop watching.
					obs.unobserve(target);
				}
			},
			{
				// Trigger a touch before the element is fully in view so the entrance
				// reads as anticipatory rather than late.
				rootMargin: '0px 0px -10% 0px',
				threshold: 0.15,
			},
		);

		// Observe each group container plus any standalone reveal not inside a group.
		// Groups already in view at load (e.g. the hero) fire immediately, giving the
		// on-load staggered entrance without special-casing.
		for (const group of groups) {
			observer.observe(group);
		}
		const standalone = document.querySelectorAll(
			'[' + REVEAL_ATTR + ']:not([' + GROUP_ATTR + '] [' + REVEAL_ATTR + '])',
		);
		for (const el of standalone) {
			observer.observe(el);
		}

		// Safety net: after full load, force-reveal anything still hidden that is
		// actually within (or above) the viewport — covers rare cases where the
		// observer callback never fired for an in-view element.
		window.addEventListener(
			'load',
			() => {
				window.setTimeout(() => {
					const stillHidden = document.querySelectorAll(
						'[' + REVEAL_ATTR + ']:not(.' + VISIBLE_CLASS + ')',
					);
					for (const el of stillHidden) {
						const rect = el.getBoundingClientRect();
						const inOrAboveView = rect.top < window.innerHeight;
						if (inOrAboveView) reveal(el);
					}
				}, 200);
			},
			{ passive: true },
		);
	} catch {
		// Any failure: reveal everything so content is never trapped hidden.
		revealAll();
	}

	/** Read --reveal-stagger from :root as a number of milliseconds. */
	function readStaggerMs() {
		const raw = getComputedStyle(root).getPropertyValue('--reveal-stagger').trim();
		const parsed = parseFloat(raw);
		return Number.isFinite(parsed) ? parsed : FALLBACK_STAGGER_MS;
	}
})();
