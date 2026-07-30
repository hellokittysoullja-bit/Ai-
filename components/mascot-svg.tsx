"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import {
  ACCENT,
  EYE,
  EYE_DARK,
  EYE_L,
  EYE_R,
  EYE_RX,
  EYE_RY,
  FLAME,
  FLAME_CORE,
  FUR,
  FUR_BODY,
  FUR_LIGHT,
  INK,
  OUTLINE,
  SHEEN,
  WARM,
  WHITE,
} from "@/components/mascot-geometry";

/**
 * Рукокодный векторный маскот — живое существо, а не картинка.
 * Моргает, зрачки следят за курсором, дышит, меняет выражение.
 */

export type MascotExpression =
  "calm" | "happy" | "focused" | "sleepy" | "excited";

/* Палитра и геометрия существа живут в mascot-geometry.ts (без 'use client'),
   чтобы серверный первый кадр рисовал того же напарника. */

type MascotSvgProps = {
  expression?: MascotExpression;
  size?: number;
  label?: string;
  className?: string;
};

export function MascotSvg({
  expression = "calm",
  size = 160,
  label,
  className,
}: MascotSvgProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);
  const uid = useId();
  const [blink, setBlink] = useState(false);

  // Перф-гейт: на лендинге живёт 5+ инстансов существа — без observer
  // каждый слушал pointermove/scroll и моргал, даже стоя за кадром.
  // Глаза и таймеры работают только у видимых котов.
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const sleepy = expression === "sleepy";
  const focused = expression === "focused";
  const happy = expression === "happy";
  const excited = expression === "excited";

  /* Зрачки следят за курсором */
  const px = useSpring(0, { stiffness: 140, damping: 16 });
  const py = useSpring(0, { stiffness: 140, damping: 16 });

  useEffect(() => {
    if (reduceMotion || sleepy || !inView) {
      px.set(0);
      py.set(0);
      return;
    }
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width * 1.2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height * 1.2)));
      px.set(dx * 5);
      py.set(dy * 4);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduceMotion, sleepy, inView, px, py]);

  /* Э1 · Взгляд за скроллом: на таче pointermove мёртв — существо следило
     за курсором только на десктопе. Теперь листаешь — кот провожает
     взглядом (вниз/вверх по направлению), через полсекунды покоя глаза
     возвращаются к центру. Пружины те же, что у курсора. */
  useEffect(() => {
    if (reduceMotion || sleepy || !inView) return;
    let lastY = window.scrollY;
    let settle: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (Math.abs(dy) < 2) return;
      py.set(Math.max(-1, Math.min(1, dy / 48)) * 4.5);
      clearTimeout(settle);
      settle = setTimeout(() => py.set(0), 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(settle);
    };
  }, [reduceMotion, sleepy, inView, py]);

  /* Моргание со случайным интервалом */
  useEffect(() => {
    if (reduceMotion || sleepy || !inView) return;
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(
        () => {
          if (!alive) return;
          setBlink(true);
          t2 = setTimeout(() => {
            if (!alive) return;
            setBlink(false);
            loop();
          }, 130);
        },
        2400 + Math.random() * 3600,
      );
    };
    loop();
    return () => {
      alive = false;
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [reduceMotion, sleepy, inView]);

  const eye = (side: "l" | "r") => {
    const { x, y } = side === "l" ? EYE_L : EYE_R;
    const clipId = `${uid}-${side}`;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <ellipse cx={x} cy={y} rx={EYE_RX} ry={EYE_RY} />
          </clipPath>
        </defs>
        {/* радужка с тёмным кольцом */}
        <ellipse
          cx={x}
          cy={y}
          rx={EYE_RX}
          ry={EYE_RY}
          fill={EYE_DARK}
          stroke={OUTLINE}
          strokeWidth={3}
        />
        <ellipse
          cx={x}
          cy={y - 1}
          rx={EYE_RX - 2.5}
          ry={EYE_RY - 2.5}
          fill={EYE}
        />
        <g clipPath={`url(#${clipId})`}>
          {/* кошачий зрачок + блики, следят за курсором */}
          <motion.g style={reduceMotion ? undefined : { x: px, y: py }}>
            <ellipse
              cx={x}
              cy={y}
              rx={excited ? 7 : 5.4}
              ry={excited ? 11 : 9.5}
              fill={INK}
            />
            <circle cx={x + 5} cy={y - 7} r={3} fill={WHITE} opacity={0.95} />
            <circle cx={x - 4} cy={y + 6} r={1.4} fill={WHITE} opacity={0.55} />
          </motion.g>
          {/* прикрытые веки в фокусе: чуть опущены, но зрачки видны даже в мелком размере */}
          {focused && (
            <rect
              x={x - EYE_RX}
              y={y - EYE_RY}
              width={EYE_RX * 2}
              height={EYE_RY * 0.45}
              fill={FUR}
            />
          )}
          {/* моргание: веко опускается сверху */}
          <motion.rect
            x={x - EYE_RX - 1}
            y={y - EYE_RY - 1}
            width={EYE_RX * 2 + 2}
            height={EYE_RY * 2 + 2}
            fill={FUR}
            style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}
            animate={{ scaleY: blink ? 1 : 0 }}
            transition={{ duration: 0.07 }}
          />
        </g>
      </g>
    );
  };

  const closedEye = (side: "l" | "r") => {
    const { x, y } = side === "l" ? EYE_L : EYE_R;
    return (
      <path
        d={`M${x - 12} ${y} q12 10 24 0`}
        fill="none"
        stroke={INK}
        strokeWidth={3}
        strokeLinecap="round"
      />
    );
  };

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      animate={reduceMotion ? undefined : { scale: [1, 1.02, 1] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 4, repeat: Infinity, ease: "easeInOut" }
      }
      style={{ transformOrigin: "50% 90%" }}
    >
      {/* хвост: вопросительный знак за спиной; виляет в радости */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }}
        animate={
          reduceMotion || !(happy || excited)
            ? undefined
            : { rotate: [-5, 6, -5] }
        }
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M144 158 Q194 154 192 120 Q190 104 182 97"
          fill="none"
          stroke={OUTLINE}
          strokeWidth={17}
          strokeLinecap="round"
        />
        <path
          d="M144 158 Q194 154 192 120 Q190 104 182 97"
          fill="none"
          stroke={FUR}
          strokeWidth={13}
          strokeLinecap="round"
        />
        {/* огонёк на кончике хвоста: метафора стрика — не дать огню погаснуть */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 0 -1.6; 0 0"
            dur="1.3s"
            repeatCount="indefinite"
          />
          <path
            d="M182 103 C173 93 176 81 182 70 C188 81 191 93 182 103 Z"
            fill={FLAME}
          />
          <path
            d="M182 99 C177 92 178 84 182 76 C186 84 187 92 182 99 Z"
            fill={FLAME_CORE}
          />
        </g>
        <circle cx={188} cy={64} r={2} fill="oklch(0.78 0.16 60)">
          <animate
            attributeName="opacity"
            values="0;0.9;0"
            dur="2.2s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0; 2 -8"
            dur="2.2s"
            repeatCount="indefinite"
          />
        </circle>
      </motion.g>
      {/* уши */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        animate={reduceMotion || !excited ? undefined : { rotate: [-2, 2, -2] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <g
          stroke={OUTLINE}
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
        >
          <path
            d="M54 78 L55 60 L48 54 L56 49 L64 30 Q82 42 96 58 Z"
            fill={FUR}
          />
          <path
            d="M146 78 L145 58 L141 46 L136 49 L134 30 Q118 42 104 58 Z"
            fill={FUR}
          />
        </g>
        <path
          d="M62 66 Q63 52 67 43 Q79 50 86 57 Z"
          fill={ACCENT}
          opacity={0.85}
        />
        <path
          d="M138 66 Q137 52 133 43 Q121 50 114 57 Z"
          fill={ACCENT}
          opacity={0.85}
        />
      </motion.g>
      {/* тело + тёплый свет очага на нижней кромке меха */}
      <defs>
        <radialGradient id={`${uid}-rim`} cx="0.5" cy="1.18" r="0.72">
          <stop offset="0%" stopColor={WARM} stopOpacity="0.22" />
          <stop offset="55%" stopColor={WARM} stopOpacity="0.06" />
          <stop offset="100%" stopColor={WARM} stopOpacity="0" />
        </radialGradient>
        {/* А1 · Второй источник света: холодный лунный rim справа-сверху.
            Двухточечное освещение (тёплый ближний + холодный дальний) —
            базовый киноприём постановки кадра */}
        <radialGradient id={`${uid}-moonrim`} cx="0.92" cy="0.06" r="0.85">
          <stop offset="0%" stopColor="oklch(0.86 0.05 230)" stopOpacity="0.15" />
          <stop offset="45%" stopColor="oklch(0.86 0.05 230)" stopOpacity="0.04" />
          <stop offset="100%" stopColor="oklch(0.86 0.05 230)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-top`} cx="0.42" cy="0.2" r="0.75">
          <stop offset="0%" stopColor={SHEEN} stopOpacity="0.5" />
          <stop offset="55%" stopColor={SHEEN} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-bot`} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="52%"
            stopColor="oklch(0.15 0.012 135)"
            stopOpacity="0"
          />
          <stop
            offset="100%"
            stopColor="oklch(0.15 0.012 135)"
            stopOpacity="0.55"
          />
        </linearGradient>
        <radialGradient id={`${uid}-chest`} cx="0.5" cy="0.5" r="0.5">
          <stop
            offset="0%"
            stopColor="oklch(0.72 0.15 60)"
            stopOpacity="0.45"
          />
          <stop
            offset="60%"
            stopColor="oklch(0.72 0.15 60)"
            stopOpacity="0.16"
          />
          <stop offset="100%" stopColor="oklch(0.72 0.15 60)" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${uid}-bodyclip`}>
          <path d={FUR_BODY} />
        </clipPath>
      </defs>
      {/* щёчные пучки: рисуются до тела, тело перекрывает их основания */}
      <g
        stroke={OUTLINE}
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
        fill={FUR}
      >
        <path d="M40 102 L24 98 L40 118 Z" />
        <path d="M160 102 L176 98 L160 118 Z" />
      </g>
      {/* тело: рваный меховой силуэт с контуром + трёхтоновый объём */}
      <path
        id={`${uid}-body`}
        d={FUR_BODY}
        fill={FUR}
        stroke={OUTLINE}
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
      />
      <use href={`#${uid}-body`} fill={`url(#${uid}-top)`} />
      <use href={`#${uid}-body`} fill={`url(#${uid}-bot)`} />
      <use href={`#${uid}-body`} fill={`url(#${uid}-rim)`} />
      <use href={`#${uid}-body`} fill={`url(#${uid}-moonrim)`} />
      {/* тёплое пятно на груди */}
      <g clipPath={`url(#${uid}-bodyclip)`}>
        <ellipse
          cx={100}
          cy={142}
          rx={30}
          ry={27}
          fill={`url(#${uid}-chest)`}
        />
      </g>
      {/* усы: длинные, с лёгким провисом */}
      <g
        stroke={FUR_LIGHT}
        strokeWidth={1.6}
        strokeLinecap="round"
        opacity={0.55}
        fill="none"
      >
        <path d="M44 114 q-22 -4 -36 -12" />
        <path d="M44 122 q-23 0 -38 -4" />
        <path d="M45 130 q-21 5 -35 4" />
        <path d="M156 114 q22 -4 36 -12" />
        <path d="M156 122 q23 0 38 -4" />
        <path d="M155 130 q21 5 35 4" />
      </g>
      {/* мягкие бровки в спокойных выражениях */}
      {!focused && (
        <g
          stroke={FUR_LIGHT}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.6}
          fill="none"
        >
          <path d="M60 79 q9 -6 19 -4" />
          <path d="M140 79 q-9 -6 -19 -4" />
        </g>
      )}
      {/* брови в фокусе */}
      {focused && (
        <g
          stroke={FUR_LIGHT}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.7}
        >
          <path d="M60 80 L84 87" />
          <path d="M140 80 L116 87" />
        </g>
      )}
      {/* глаза */}
      {sleepy ? (
        <>
          {closedEye("l")}
          {closedEye("r")}
        </>
      ) : (
        <>
          {eye("l")}
          {eye("r")}
        </>
      )}
      {/* нос */}
      <path d="M96 122 L104 122 L100 128 Z" fill={ACCENT} opacity={0.95} />
      {/* рот по выражению */}
      {expression === "calm" && (
        <path
          d="M92 138 q8 7 16 0"
          fill="none"
          stroke={INK}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      )}
      {happy && (
        <path
          d="M88 136 q12 13 24 0"
          fill="none"
          stroke={INK}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
      {focused && (
        <path
          d="M94 140 L106 140"
          fill="none"
          stroke={INK}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      )}
      {sleepy && <circle cx={100} cy={140} r={3.2} fill={INK} />}
      {excited && (
        <g>
          <path d="M85 134 Q100 158 115 134 Z" fill={INK} />
          <ellipse
            cx={100}
            cy={145}
            rx={6.5}
            ry={4}
            fill={WARM}
            opacity={0.85}
          />
        </g>
      )}
      {/* штрихи румянца как в референсе, ярче в радости */}
      <g
        stroke={ACCENT}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={happy || excited ? 0.85 : 0.55}
        fill="none"
      >
        <path d="M50 117 l11 -3" />
        <path d="M52 123 l11 -2" />
        <path d="M150 117 l-11 -3" />
        <path d="M148 123 l-11 -2" />
      </g>
      {/* лапы с оранжевыми подушечками */}
      <g stroke={OUTLINE} strokeWidth={3} paintOrder="stroke">
        <ellipse cx={78} cy={166} rx={15} ry={10} fill={FUR} />
        <ellipse cx={122} cy={166} rx={15} ry={10} fill={FUR} />
      </g>
      <g fill={ACCENT} opacity={0.9}>
        <ellipse cx={78} cy={169} rx={5} ry={3.6} />
        <circle cx={71} cy={163} r={1.9} />
        <circle cx={78} cy={161} r={2} />
        <circle cx={85} cy={163} r={1.9} />
        <ellipse cx={122} cy={169} rx={5} ry={3.6} />
        <circle cx={115} cy={163} r={1.9} />
        <circle cx={122} cy={161} r={2} />
        <circle cx={129} cy={163} r={1.9} />
      </g>
      {/* zzz во сне */}
      {sleepy && (
        <g className="font-hand" fill={EYE}>
          {[
            { x: 142, y: 62, s: 13, d: 0 },
            { x: 156, y: 46, s: 17, d: 0.5 },
            { x: 172, y: 28, s: 22, d: 1 },
          ].map((z) => (
            <motion.text
              key={z.x}
              x={z.x}
              y={z.y}
              fontSize={z.s}
              initial={reduceMotion ? undefined : { opacity: 0, y: 4 }}
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [0, 0.9, 0], y: [4, -4, -10] }
              }
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: z.d,
                ease: "easeInOut",
              }}
            >
              z
            </motion.text>
          ))}
        </g>
      )}
      {/* искры в восторге */}
      {excited && (
        <g fill={EYE}>
          {[
            { x: 38, y: 56, d: 0 },
            { x: 164, y: 66, d: 0.35 },
            { x: 146, y: 26, d: 0.7 },
          ].map((sp) => (
            <motion.path
              key={sp.x}
              d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z"
              style={{ x: sp.x, y: sp.y }}
              animate={
                reduceMotion
                  ? undefined
                  : { scale: [0.5, 1.15, 0.5], opacity: [0.4, 1, 0.4] }
              }
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: sp.d,
                ease: "easeInOut",
              }}
            />
          ))}
        </g>
      )}
    </motion.svg>
  );
}
