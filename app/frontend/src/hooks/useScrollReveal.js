import { useEffect, useRef } from 'react';

/**
 * useScrollReveal – attaches IntersectionObserver to a ref and adds
 * the 'visible' class when the element enters the viewport.
 *
 * @param {object} options
 * @param {number} options.threshold  – 0–1, default 0.15
 * @param {string} options.rootMargin – default '0px 0px -60px 0px'
 * @param {boolean} options.once     – only trigger once (default true)
 */
export function useScrollReveal({
  threshold  = 0.15,
  rootMargin = '0px 0px -60px 0px',
  once       = true,
} = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove('visible');
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}

/**
 * useStaggerReveal – reveals children with staggered delays.
 * Adds 'visible' class to the container; CSS handles child delays.
 */
export function useStaggerReveal(options = {}) {
  return useScrollReveal({ threshold: 0.1, ...options });
}
