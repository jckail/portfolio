import { useEffect, useRef, useState } from 'react';

interface TimelineTarget { id: string; label: string }

/** Observe the reading band, including experience items mounted by lazy sections. */
export function useTimelineNavigation() {
  const sentinel = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState('');
  const [targets, setTargets] = useState<TimelineTarget[]>([]);
  useEffect(() => {
    const marker = sentinel.current;
    if (!marker) return;
    const visibility = new IntersectionObserver(([entry]) => {
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    visibility.observe(marker);
    const observed = new Set<HTMLElement>();
    const readingTop = () => Math.min(140, window.innerHeight * 0.25);
    const readingBottom = () => Math.max(readingTop() + 1, window.innerHeight * 0.45);
    const selectMilestone: IntersectionObserverCallback = entries => {
      const bounds = entries[0]?.rootBounds;
      const top = bounds?.top ?? readingTop();
      const bottom = bounds?.bottom ?? readingBottom();
      let winner: HTMLElement | undefined;
      let greatestOverlap = 0;
      // Entries contain only targets that crossed a threshold. Their cached
      // rectangles become stale while other items scroll, so measure the small
      // observed set once per callback instead of ranking historical entries.
      for (const item of observed) {
        const rect = item.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(rect.bottom, bottom) - Math.max(rect.top, top));
        if (overlap > greatestOverlap) { greatestOverlap = overlap; winner = item; }
      }
      if (winner) setActive(winner.id);
    };
    const makeObserver = () => new IntersectionObserver(selectMilestone, {
      // Pixel margins track viewport height. Percentage root margins use width
      // per the IntersectionObserver spec, collapsing the band on wide screens.
      rootMargin: `-${readingTop()}px 0px -${window.innerHeight - readingBottom()}px 0px`,
      threshold: Array.from({ length: 51 }, (_, index) => index / 50),
    });
    let milestones = makeObserver();
    const resize = () => {
      milestones.disconnect();
      milestones = makeObserver();
      for (const item of observed) milestones.observe(item);
    };
    window.addEventListener('resize', resize, { passive: true });
    const discover = () => {
      const nodes = [...document.querySelectorAll<HTMLElement>('[data-timeline-label]')];
      let changed = false;
      for (const node of nodes) {
        if (!observed.has(node)) { observed.add(node); milestones.observe(node); changed = true; }
      }
      for (const node of observed) {
        if (!node.isConnected) { observed.delete(node); milestones.unobserve(node); changed = true; }
      }
      if (changed) setTargets(nodes.map(node => ({ id: node.id, label: node.dataset.timelineLabel ?? '' })));
    };
    discover();
    // Chat streaming and modal markup also mutate the body. Only rediscover
    // when a subtree containing career items was mounted or removed.
    const mutations = new MutationObserver(records => {
      const changed = records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node instanceof Element && (node.matches('[data-timeline-label]') || node.querySelector('[data-timeline-label]'))
      ));
      if (changed) discover();
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { visibility.disconnect(); milestones.disconnect(); mutations.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  return { sentinel, visible, active, targets };
}
