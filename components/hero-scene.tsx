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
 * Первый кадр сайта: ночная сцена, которая рендерится на сервере и живёт
 * без JavaScript. Всё движение — SMIL-анимации внутри SVG: звёзды мерцают,
 * свет очага пульсирует, существо дышит и моргает до гидрации React.
 *
 * Колор-скрипт кадра:
 * - ночь холодная (сине-бирюзовый верх неба → зелёный горизонт);
 * - единственный тёплый источник (hue 65) — очаг вокруг существа;
 * - лайм зарезервирован за глазами и интерактивом.
 * Глубина — три плана: луна/звёзды → лес/холмы/дымка → силуэт травы у кромки.
 */

/**
 * Двухъярусная ель дальнего плана: силуэт с изломом вместо голого
 * треугольника (одиночный треугольник читается «программистским артом»).
 * Два перекрывающихся яруса + ствол — минимум геометрии, максимум
 * узнаваемости. Цвет наследуется от родительской группы.
 */
function Pine({
  cx,
  base,
  h,
  w,
}: {
  cx: number;
  base: number;
  h: number;
  w: number;
}) {
  return (
    <g>
      <rect x={cx - 1.6} y={base - 4} width={3.2} height={6} rx={1.6} />
      <path
        d={`M${cx} ${base - h} L${cx + w * 0.62} ${base - h * 0.42} L${cx - w * 0.62} ${base - h * 0.42} Z`}
      />
      <path
        d={`M${cx} ${base - h * 0.66} L${cx + w} ${base} L${cx - w} ${base} Z`}
      />
    </g>
  );
}

/** [cx, cy, r, dur, begin, минимальная и пиковая яркость] */
const STARS: ReadonlyArray<
  readonly [number, number, number, number, number, number, number]
> = [
  [70, 90, 1.5, 3.4, 0, 0.3, 0.75],
  [160, 210, 1, 4.6, 0.6, 0.25, 0.6],
  [250, 60, 1.3, 2.9, 1.1, 0.3, 0.78],
  [340, 155, 0.9, 5.2, 0.2, 0.22, 0.55],
  [424, 84, 1.6, 3.8, 1.6, 0.32, 0.82],
  [512, 196, 1, 4.1, 0.9, 0.22, 0.6],
  [560, 64, 1.2, 3.1, 2.1, 0.3, 0.72],
  [700, 210, 1.1, 4.8, 0.4, 0.26, 0.64],
  [748, 58, 1.3, 3.6, 1.3, 0.3, 0.74],
  [118, 330, 0.9, 5.5, 0.7, 0.2, 0.52],
  [642, 306, 1, 4.3, 1.8, 0.22, 0.56],
  // Звёзды в мобильной полосе видимости (x≈192–608 при slice-кропе):
  // без них телефон видит почти пустое небо — атмосфера оставалась за кадром
  [230, 40, 1.2, 3.7, 0.5, 0.28, 0.7],
  [300, 105, 0.9, 4.4, 1.4, 0.22, 0.58],
  [352, 60, 1, 4.7, 2.3, 0.24, 0.6],
  [452, 40, 1.1, 3.2, 0.9, 0.28, 0.72],
  [508, 132, 0.8, 5.1, 2, 0.2, 0.52],
  [246, 176, 1, 4, 0.3, 0.24, 0.6],
  // сдвинута с (584,96): попадала внутрь диска луны на (590,110)
  [652, 190, 1.3, 3.5, 1.7, 0.3, 0.75],
  [418, 210, 0.8, 5.4, 1.1, 0.2, 0.5],
  [382, 262, 0.8, 3.9, 2.4, 0.2, 0.52],
  [42, 224, 1.1, 4.4, 1, 0.24, 0.62],
  [722, 294, 0.9, 5, 0.3, 0.22, 0.54],
  [282, 332, 1, 3.5, 1.5, 0.22, 0.57],
  [208, 128, 1.2, 3.3, 0.8, 0.26, 0.67],
  [470, 302, 0.9, 5.3, 1.2, 0.22, 0.54],
  // Дозасветка верхней трети мобильной полосы: небо над существом не должно
  // читаться пустым чёрным полем на первом экране
  [160, 84, 1.2, 3.8, 0.6, 0.28, 0.7],
  [396, 96, 0.9, 4.6, 1.9, 0.22, 0.58],
  // Десктопная полоса (вертикальный кроп показывает y 200–700): без этих
  // звёзд небо над заголовком на 1280×800 стояло пустым
  [150, 252, 1.1, 4.1, 0.8, 0.26, 0.66],
  [338, 298, 0.9, 4.9, 1.6, 0.2, 0.55],
  [516, 236, 1.0, 3.7, 0.4, 0.24, 0.62],
  [92, 438, 0.8, 5.8, 0.5, 0.16, 0.44],
  [696, 420, 0.9, 4.9, 1.7, 0.18, 0.47],
  [356, 402, 0.7, 5.6, 2.2, 0.16, 0.42],
  [540, 366, 0.8, 4.2, 0.1, 0.16, 0.44],
];

export function HeroScene() {
  return (
    <svg
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 800 900"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          {/* Чуть светлее и насыщеннее оригинала: на OLED-телефонах
              холодный верх неба тонул в чёрном и градиент не считывался */}
          <stop offset="0%" stopColor="oklch(0.145 0.032 215)" />
          <stop offset="45%" stopColor="oklch(0.165 0.02 170)" />
          <stop offset="100%" stopColor="oklch(0.21 0.018 135)" />
        </linearGradient>
        <radialGradient id="hs-warm" cx="0.5" cy="0.5" r="0.3">
          <stop offset="0%" stopColor={WARM} stopOpacity="0.12" />
          <stop offset="55%" stopColor={WARM} stopOpacity="0.04" />
          <stop offset="100%" stopColor={WARM} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hs-vig" cx="0.5" cy="0.48" r="0.78">
          <stop offset="0%" stopColor="oklch(0 0 0)" stopOpacity="0" />
          <stop offset="72%" stopColor="oklch(0 0 0)" stopOpacity="0" />
          <stop offset="100%" stopColor="oklch(0 0 0)" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="hs-hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.2 0.014 140)" />
          <stop offset="100%" stopColor="oklch(0.185 0.01 135)" />
        </linearGradient>
        <linearGradient id="hs-hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.245 0.016 132)" />
          <stop offset="100%" stopColor="oklch(0.2 0.01 130)" />
        </linearGradient>
        <linearGradient id="hs-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.6 0.02 150)" stopOpacity="0" />
          <stop
            offset="55%"
            stopColor="oklch(0.6 0.02 150)"
            stopOpacity="0.085"
          />
          <stop offset="100%" stopColor="oklch(0.6 0.02 150)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="800" height="900" fill="url(#hs-sky)" />

      {/* Луны в пейзажном SVG больше НЕТ — и это принципиально. Slice-кроп
          делает позицию внутри сцены зависимой от пропорций вьюпорта: на
          мобильном 844 луна резалась правым краем, на десктопе 1280×800
          уходила за верх кадра (видимая полоса y 200–700). Небесный якорь
          живёт отдельным слоем <Moon/>, привязанным к углу вьюпорта
          (hero.tsx) — виден всегда, ни в кота, ни за кадр не уезжает. */}

      {/* звёзды: каждая мерцает в своём ритме */}
      <g fill="oklch(0.92 0.01 210)">
        {STARS.map(([x, y, r, dur, begin, lo, hi], i) => (
          <circle key={i} cx={x} cy={y} r={r} opacity={(lo + hi) / 2}>
            <animate
              attributeName="opacity"
              values={`${lo};${hi};${lo}`}
              dur={`${dur}s`}
              begin={`${begin}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>

      {/* падающая звезда: редкая — предвестник rare-находок в мире */}
      <g opacity="0">
        <line
          x1="0"
          y1="0"
          x2="46"
          y2="30"
          stroke="oklch(0.92 0.01 210)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="300 70; 160 166"
          keyTimes="0;1"
          dur="14s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0;0;0.75;0;0"
          keyTimes="0;0.63;0.66;0.7;1"
          dur="14s"
          repeatCount="indefinite"
        />
      </g>

      {/* тёплый свет очага вокруг существа */}
      <rect width="800" height="900" fill="url(#hs-warm)">
        <animate
          attributeName="opacity"
          values="0.85;1;0.85"
          dur="4.5s"
          repeatCount="indefinite"
        />
      </rect>

      {/* дальний план: холм + лес по краям (центр остаётся существу) */}
      <path
        d="M0 700 Q160 668 360 682 Q580 696 800 664 L800 900 L0 900 Z"
        fill="url(#hs-hill-back)"
      />
      {/* Лес дальнего плана: двухъярусные ели с изломом силуэта — голые
          треугольники читались как «программистский арт» с первого взгляда.
          Высоты и ширины варьируются: настоящий лес не растёт по линейке.
          Мобильные группы (x 218–296 и 540–598) держат горизонт в видимой
          полосе телефона, центр остаётся существу. */}
      {/* Центральных групп леса больше нет: на высоких мобильных вьюпортах
          (844+) они вставали «на строку» заметки и чипов — силуэты за текстом
          читались мусором. Мобильный горизонт держат земля и травяная кромка;
          фланговые ели остаются глубиной для десктопного кадра. */}
      <g fill="oklch(0.165 0.014 145)">
        <Pine cx={50} base={694} h={46} w={15} />
        <Pine cx={78} base={692} h={56} w={18} />
        <Pine cx={104} base={690} h={38} w={13} />
        <Pine cx={680} base={676} h={44} w={15} />
        <Pine cx={708} base={674} h={54} w={17} />
        <Pine cx={734} base={672} h={34} w={12} />
        <Pine cx={762} base={672} h={28} w={10} />
      </g>
      {/* дымка у горизонта — воздушная перспектива (усилена:
          на телефонах 0.055 не считывалась вовсе) */}
      <rect x="0" y="620" width="800" height="140" fill="url(#hs-mist)" />

      {/* ближний холм */}
      <path
        d="M0 762 Q210 726 430 742 Q640 756 800 730 L800 900 L0 900 Z"
        fill="url(#hs-hill-front)"
      />
      <g
        stroke="oklch(0.32 0.03 132)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      >
        <path d="M120 758 q2 -10 7 -13" />
        <path d="M133 760 q1 -8 5 -11" />
        <path d="M300 744 q2 -10 7 -13" />
        <path d="M545 752 q2 -10 7 -13" />
        <path d="M660 742 q2 -9 6 -12" />
      </g>

      {/* Светлячков в сцене больше нет — окончательно. Три захода они
          создавали «жёлтые битые пиксели» возле текста и CTA на разных
          вьюпортах: позиция точечного яркого объекта в slice-сцене
          непредсказуема. Живой свет мира — очаг, огонёк хвоста и луна. */}

      {/* Травяных штрихов в сцене больше НЕТ: на низких вьюпортах (SE 667)
          нижняя кромка slice-сцены поднимается под чат — стебли вылезали
          «царапинами» за пузырём. Точечные объекты в slice-сцене
          непредсказуемы (тот же урок, что луна и светлячки). Травяная
          кромка живёт в ground-continuation слое у самого низа hero
          (hero.tsx) — там она всегда под контентом. */}
      <rect
        x="0"
        y="884"
        width="800"
        height="16"
        fill="oklch(0.15 0.014 135)"
      />

      {/* Шов с LandingBackdrop под сценой намеренно без fade: низ холма
          oklch(0.2 0.01 130) и верх фона (~0.19 0.016 155) перцептивно
          неразличимы — растворение только съело бы траву у кромки. */}

      {/* киношная виньетка */}
      <rect width="800" height="900" fill="url(#hs-vig)" />
    </svg>
  );
}

/**
 * Пятно тёплого света на земле под существом: гарантированная «земля»
 * на любом вьюпорте + мягкая тень под лапами (дышит в противофазе).
 */
export function GroundPool({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 360 120"
      width={360}
      height={120}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="gp-pool" cx="0.5" cy="0.4" r="0.62">
          <stop offset="0%" stopColor="oklch(0.285 0.032 95)" />
          <stop
            offset="55%"
            stopColor="oklch(0.23 0.016 130)"
            stopOpacity="0.65"
          />
          <stop
            offset="100%"
            stopColor="oklch(0.2 0.012 130)"
            stopOpacity="0"
          />
        </radialGradient>
        <filter id="gp-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      <ellipse cx={180} cy={52} rx={176} ry={46} fill="url(#gp-pool)" />
      <ellipse
        cx={180}
        cy={22}
        rx={48}
        ry={6.5}
        fill="oklch(0.09 0.01 130)"
        opacity={0.3}
        filter="url(#gp-soft)"
      >
        <animate
          attributeName="rx"
          values="48;44.5;48"
          dur="4.6s"
          repeatCount="indefinite"
        />
      </ellipse>
      <g
        stroke="oklch(0.38 0.045 132)"
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
        opacity={0.7}
      >
        <path d="M96 40 q2 -10 7 -13" />
        <path d="M108 43 q1 -8 5 -11" />
        <path d="M250 38 q2 -10 7 -13" />
        <path d="M263 41 q1 -8 5 -11" />
        <path d="M160 62 q2 -9 6 -12" />
        <path d="M214 66 q-2 -9 -6 -12" />
      </g>
    </svg>
  );
}

/**
 * Луна — небесный якорь, привязанный к углу ВЬЮПОРТА, а не к пейзажной
 * сцене: slice-кроп сцены делает позицию зависимой от пропорций экрана
 * (на мобильном резалась краем, на десктопе уходила за кадр). Отдельный
 * компактный SVG: гало дышит на SMIL, диск с кратерами тёплой кости.
 */
export function Moon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="moon-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="oklch(0.85 0.03 95)" stopOpacity="0.22" />
          <stop offset="55%" stopColor="oklch(0.85 0.03 95)" stopOpacity="0.07" />
          <stop offset="100%" stopColor="oklch(0.85 0.03 95)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#moon-halo)">
        <animate
          attributeName="opacity"
          values="0.85;1;0.85"
          dur="7s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="60" cy="60" r="21" fill="oklch(0.84 0.035 95)" opacity="0.9" />
      <g fill={INK} opacity="0.12">
        <circle cx="53" cy="53" r="5" />
        <circle cx="68" cy="66" r="3.4" />
        <circle cx="57" cy="71" r="2.2" />
      </g>
    </svg>
  );
}

function StaticEye({ x, y, clipId }: { x: number; y: number; clipId: string }) {
  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={x} cy={y} rx={EYE_RX} ry={EYE_RY} />
        </clipPath>
      </defs>
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
        <ellipse cx={x} cy={y} rx={5.4} ry={9.5} fill={INK} />
        <circle cx={x + 5} cy={y - 7} r={3} fill={WHITE} opacity={0.95} />
        <circle cx={x - 4} cy={y + 6} r={1.4} fill={WHITE} opacity={0.55} />
        {/* моргание чистым SMIL: живое ещё до гидрации */}
        <rect
          x={x - EYE_RX - 1}
          y={y - EYE_RY - 1}
          width={EYE_RX * 2 + 2}
          height={0}
          fill={FUR}
        >
          <animate
            attributeName="height"
            values={`0;${EYE_RY * 2 + 2};0;0`}
            keyTimes="0;0.02;0.04;1"
            begin="2.8s"
            dur="5.2s"
            repeatCount="indefinite"
          />
        </rect>
      </g>
    </g>
  );
}

/**
 * Статичный напарник для серверного первого кадра: та же геометрия, что у
 * интерактивного маскота: рваный меховой силуэт с контуром, трёхтоновый
 * объём, надорванное ухо, огонёк на хвосте, подушечки лап. Дыхание,
 * моргание, покачивание хвоста и пляска огонька — на SMIL, без JS.
 */
export function MascotStatic({
  size = 200,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ms-rim" cx="0.5" cy="1.18" r="0.72">
          <stop offset="0%" stopColor={WARM} stopOpacity="0.28" />
          <stop offset="55%" stopColor={WARM} stopOpacity="0.08" />
          <stop offset="100%" stopColor={WARM} stopOpacity="0" />
        </radialGradient>
        {/* А1: холодный лунный rim — второй источник света (кино-постановка) */}
        <radialGradient id="ms-moonrim" cx="0.92" cy="0.06" r="0.85">
          <stop offset="0%" stopColor="oklch(0.86 0.05 230)" stopOpacity="0.15" />
          <stop offset="45%" stopColor="oklch(0.86 0.05 230)" stopOpacity="0.04" />
          <stop offset="100%" stopColor="oklch(0.86 0.05 230)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ms-top" cx="0.42" cy="0.2" r="0.75">
          <stop offset="0%" stopColor={SHEEN} stopOpacity="0.5" />
          <stop offset="55%" stopColor={SHEEN} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ms-bot" x1="0" y1="0" x2="0" y2="1">
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
        <radialGradient id="ms-chest" cx="0.5" cy="0.5" r="0.5">
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
        <clipPath id="ms-bodyclip">
          <path d={FUR_BODY} />
        </clipPath>
      </defs>
      <g>
        {/* дыхание */}
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 0; 0 -2.5; 0 0"
          dur="4.6s"
          repeatCount="indefinite"
        />
        {/* хвост с огоньком: метафора стрика — не дать огню погаснуть */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="-3 148 156; 4 148 156; -3 148 156"
            dur="5.4s"
            repeatCount="indefinite"
          />
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
          <circle cx={176} cy={62} r={1.4} fill="oklch(0.85 0.14 85)">
            <animate
              attributeName="opacity"
              values="0;0.8;0"
              dur="2.8s"
              begin="0.9s"
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -2 -9"
              dur="2.8s"
              begin="0.9s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
        {/* уши: рваный контур, левое с надорванной кромкой (история персонажа) */}
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
          id="ms-body"
          d={FUR_BODY}
          fill={FUR}
          stroke={OUTLINE}
          strokeWidth={3}
          strokeLinejoin="round"
          paintOrder="stroke"
        />
        <use href="#ms-body" fill="url(#ms-top)" />
        <use href="#ms-body" fill="url(#ms-bot)" />
        <use href="#ms-body" fill="url(#ms-rim)" />
        <use href="#ms-body" fill="url(#ms-moonrim)" />
        {/* тёплое пятно на груди */}
        <g clipPath="url(#ms-bodyclip)">
          <ellipse cx={100} cy={142} rx={30} ry={27} fill="url(#ms-chest)" />
        </g>
        {/* бровки */}
        <path
          d="M60 79 q9 -6 19 -4"
          fill="none"
          stroke={FUR_LIGHT}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.7}
        />
        <path
          d="M140 79 q-9 -6 -19 -4"
          fill="none"
          stroke={FUR_LIGHT}
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.7}
        />
        <StaticEye x={EYE_L.x} y={EYE_L.y} clipId="ms-eye-l" />
        <StaticEye x={EYE_R.x} y={EYE_R.y} clipId="ms-eye-r" />
        {/* штрихи румянца как в референсе */}
        <g
          stroke={ACCENT}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.6}
          fill="none"
        >
          <path d="M50 117 l11 -3" />
          <path d="M52 123 l11 -2" />
          <path d="M150 117 l-11 -3" />
          <path d="M148 123 l-11 -2" />
        </g>
        {/* усы */}
        <g
          stroke="oklch(0.5 0.02 135)"
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.6}
          fill="none"
        >
          <path d="M44 114 q-22 -4 -36 -12" />
          <path d="M44 122 q-23 0 -38 -4" />
          <path d="M45 130 q-21 5 -35 4" />
          <path d="M156 114 q22 -4 36 -12" />
          <path d="M156 122 q23 0 38 -4" />
          <path d="M155 130 q21 5 35 4" />
        </g>
        {/* нос и рот */}
        <path d="M96 122 L104 122 L100 128 Z" fill={ACCENT} opacity={0.95} />
        <path
          d="M92 138 q8 7 16 0"
          fill="none"
          stroke={INK}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* лапы с подушечками */}
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
      </g>
    </svg>
  );
}
