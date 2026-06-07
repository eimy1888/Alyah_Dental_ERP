import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

export default function ParallaxImageBand({
  image,
  height = '600px',
  speed = 0.25,
  overlay = 'linear-gradient(135deg, rgba(6,13,26,0.75) 0%, rgba(15,39,68,0.6) 100%)',
  label,
  sublabel,
  flip = false,
}) {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const imageY = useSpring(useTransform(scrollYProgress, [0, 1], [`-${speed * 90}px`, `${speed * 90}px`]), {
    stiffness: 70,
    damping: 28,
  });
  const contentY = useSpring(useTransform(scrollYProgress, [0, 1], [36, -36]), {
    stiffness: 70,
    damping: 28,
  });
  return (
    <section
      ref={sectionRef}
      className="parallax-cinema-band relative isolate overflow-hidden"
      style={{ minHeight: `clamp(340px, ${height}, 560px)` }}
    >
      <motion.div className="absolute -inset-y-16 inset-x-0 will-change-transform" style={{ y: imageY }}>
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-full w-full object-cover object-center"
        />
      </motion.div>

      <div className="absolute inset-0" style={{ background: overlay }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_80%_70%,rgba(96,165,250,0.18),transparent_32%)]" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:30px_30px]" />

      {(label || sublabel) && (
        <div className="relative z-10 flex min-h-[inherit] items-center">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              className={`max-w-2xl ${flip ? 'ml-auto text-right' : ''}`}
              style={{ y: contentY }}
              initial={{ opacity: 0, filter: 'blur(12px)' }}
              whileInView={{ opacity: 1, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              {label && (
                <h2 className="text-balance text-4xl font-black leading-tight tracking-tight text-white drop-shadow-2xl sm:text-5xl lg:text-6xl">
                  {label}
                </h2>
              )}
              {sublabel && (
                <p className="mt-4 text-lg font-medium leading-8 text-white/74 drop-shadow-xl">
                  {sublabel}
                </p>
              )}
              <motion.div
                className={`mt-7 h-1 w-24 rounded-full bg-gradient-to-r from-blue-300 to-cyan-200 shadow-[0_0_22px_rgba(96,165,250,0.75)] ${flip ? 'ml-auto' : ''}`}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: flip ? 'right' : 'left' }}
              />
            </motion.div>
          </div>
        </div>
      )}

    </section>
  );
}
