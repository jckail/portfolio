import { useEffect, useRef, useState } from 'react';

import { readingMilestone, timelineReadingBand } from '../utils/timeline-reading';

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
    const selectMilestone: IntersectionObserverCallback = () => {
      // Resolve from current geometry using the same rule as the URL. Observer
      // entries only include threshold crossings and may hold stale rectangles.
      setActive(readingMilestone(observed));
    };
    const makeObserver = () => {
      const { top, bottom } = timelineReadingBand();
      return new IntersectionObserver(selectMilestone, {
        // Percentage root margins use viewport width, so use height-based pixels.
        rootMargin: `-${top}px 0px -${window.innerHeight - bottom}px 0px`,
        threshold: Array.from({ length: 51 }, (_, index) => index / 50),
      });
    };
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
