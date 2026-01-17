import type { SpringOptions } from 'motion/react';
import { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface TiltedCardProps {
  children: React.ReactNode;
  containerHeight?: React.CSSProperties['height'];
  containerWidth?: React.CSSProperties['width'];
  cardHeight?: React.CSSProperties['height'];
  cardWidth?: React.CSSProperties['width'];
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showMobileWarning?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
  className?: string;
}

const springValues: SpringOptions = {
  damping: 30,
  stiffness: 100,
  mass: 2
};

export default function TiltedCard({
  children,
  containerHeight = '400px',
  containerWidth = '100%',
  cardHeight = '400px',
  cardWidth = '100%',
  scaleOnHover = 1.05,
  rotateAmplitude = 12,
  showMobileWarning = true,
  showTooltip = true,
  tooltipText = 'Interactive card - move your mouse around',
  className = ''
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1
  });

  const [lastY, setLastY] = useState(0);

  function handleMouse(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude;
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude;

    rotateX.set(rotationX);
    rotateY.set(rotationY);

    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);

    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  return (
    <figure
      ref={ref}
      className={`relative w-full h-full [perspective:800px] flex flex-col items-center justify-center ${className}`}
      style={{
        height: containerHeight,
        width: containerWidth
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showMobileWarning && (
        <div className="absolute top-4 text-center text-xs text-emerald-400/60 block sm:hidden px-4">
          Interactive on desktop
        </div>
      )}

      <motion.div
        className="relative [transform-style:preserve-3d] rounded-2xl overflow-hidden"
        style={{
          width: cardWidth,
          height: cardHeight,
          rotateX,
          rotateY,
          scale
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full will-change-transform [transform:translateZ(0)]">
          {children}
        </div>

        {/* Subtle hover glow effect */}
        <motion.div 
          className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl"
          style={{
            opacity: opacity
          }}
        />
      </motion.div>

      {showTooltip && tooltipText && (
        <motion.figcaption
          className="pointer-events-none absolute left-0 top-0 rounded-lg bg-emerald-950/90 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-100 opacity-0 z-[3] hidden sm:block backdrop-blur-sm shadow-lg"
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption
          }}
        >
          {tooltipText}
        </motion.figcaption>
      )}
    </figure>
  );
}