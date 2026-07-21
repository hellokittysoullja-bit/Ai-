import { AppBackdrop } from "@/components/app-backdrop";

/**
 * /app layout — bare pass-through + один общий фон.
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
 * AppBackdrop — fixed и вне потока: не задевает вёрстку вложенных экранов,
 * не перемонтируется при переходах между табами (без него был обрыв между
 * ночной сценой лендинга и плоским чёрным /app).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppBackdrop />
      {children}
    </>
  );
}
