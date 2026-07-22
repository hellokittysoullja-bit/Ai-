import { AppBackdrop } from "@/components/app-backdrop";
import { AppNav } from "@/components/app-nav";

/**
 * /app layout — bare pass-through + общий фон и общая нижняя навигация.
 *
 * Почему нет app-header:
 * — Header с «← назад» убивает native feel (это сайт, не компаньон).
 * — Exit affordance на уровне глаз сокращает session length ~18% (Nielsen Norman).
 * — iOS/Android back gesture решает навигацию системно.
 * — В Genshin Impact нет кнопки «← Back to website». Причина та же.
 *
 * Если в будущем нужны настройки — выносим в отдельный /app/settings экран,
 * доступный через иконку в AppNav, а не в шапке над компаньоном.
 *
 * AppBackdrop и AppNav — fixed и вне потока, оба здесь, а не внутри
 * page.tsx каждого экрана: не задевают вёрстку вложенных экранов, не
 * перемонтируются при переходах между табами (без AppBackdrop здесь был
 * обрыв между ночной сценой лендинга и плоским чёрным /app).
 *
 * AppNav переехал сюда из трёх отдельных page.tsx не для красоты кода —
 * там он был потомком <main className="app-page-enter">, а у entry-анимации
 * `animation: app-page-in ... both` конечный кадр `transform: translateY(0)`
 * технически НЕ `none` — по спецификации это создаёт новый containing
 * block для position:fixed потомков. AppNav висел не у настоящего низа
 * вьюпорта, а у низа <main>, которое на «холодных» экранах короче экрана —
 * снизу оставалась настоящая пустота, которую нечем было прикрыть.
 * Здесь AppNav — сосед {children}, не потомок transform'нутого <main>,
 * поэтому фиксируется по-настоящему.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppBackdrop />
      {children}
      <AppNav />
    </>
  );
}
