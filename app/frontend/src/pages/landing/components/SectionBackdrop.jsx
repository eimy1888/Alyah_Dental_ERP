import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

/**
 * SectionBackdrop — deep-parallax 4K dental image background.
 *
 * Props:
 *  image      — 4K Unsplash URL
 *  overlay    — CSS colour/gradient wash laid on top of the image
 *  opacity    — image visibility 0–1  (default 0.55)
 *  speed      — parallax travel px   (default 120)
 *  position   — CSS object-position  (default 'center')
 *  saturate   — CSS saturate()       (default 1.3)
 *  brightness — CSS brightness()     (default 0.7)
 */
export default function SectionBackdrop({
  image,
  overlay    = 'rgba(248,250,255,0.55)',
  opacity    = 0.55,
  speed      = 120,
  position   = 'center',
  saturate   = 1.3,
  brightness = 0.7,
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useSpring(
    useTransform(scrollYProgress, [0, 1], [speed, -speed]),
    { stiffness: 60, damping: 28 }
  );

  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [1.10, 1.05, 1.10]),
    { stiffness: 60, damping: 28 }
  );

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* 4K parallax image — fully visible at given opacity */}
      <motion.img
        src={image}
        alt=""
        className="absolute -inset-y-24 inset-x-0 h-[calc(100%+12rem)] w-full object-cover"
        style={{
          y,
          scale,
          opacity,
          objectPosition: position,
          filter: `saturate(${saturate}) brightness(${brightness})`,
          willChange: 'transform',
        }}
        loading="lazy"
      />

      {/* Colour wash — keep low alpha so image shows through */}
      <div className="absolute inset-0" style={{ background: overlay }} />
    </div>
  );
}
