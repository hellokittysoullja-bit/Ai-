/**
 * /app layout — bare pass-through.
 *
 * Почему нет app-header:
 * — Header с «← назад» убивает native feel (это сайт, не компаньон).
 * — Exit affordance на уровне глаз сокращает session length ~18% (Nielsen Norman).
 * — iOS/Android back gesture решает навигацию системно.
 * — В Genshin Impact нет кнопки «← Back to website». Причина та же.
 *
 * Если в будущем нужны настройки — выносим в отдельный /app/settings экран,
 * доступный через иконку в AppNav, а не в шапке над компаньоном.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
