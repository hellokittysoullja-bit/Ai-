"use client";

/**
 * ПРЕДПРОСМОТР НОВОЙ АРХИТЕКТУРЫ ЭКРАНА «ДОМ / ПЕРЕПИСКА».
 *
 * Не продакшн-экран: статичная сборка всех состояний из ревизии Red Team,
 * чтобы увидеть реальную геометрию (высоты, отступы, вес объектов) до того,
 * как переписывать home-screen.tsx / companion-chat.tsx.
 *
 * 1  дела нет (quick replies под сообщением)
 * 1b quick reply выбран → превратился в отправленное сообщение
 * 2  дело выбрано (карточка первого движения)
 * 3  фокус идёт (session-dock, чат молчит)
 * 4  возврат (event-card роста)
 * 5  карточка ушла выше → sticky-контекст
 * 6  ушёл вверх по истории → кнопка возврата вниз с badge
 * 7  loading — skeleton по будущей геометрии
 * 8  «Напарник думает» + постепенный ответ
 * 9  композер: focus-ring
 * 10 композер: есть текст → send активен
 * 11 композер: sending, текст сохранён
 * 12 композер: error → «Не отправилось»
 * 13 композер: offline
 * 14 группировка реплик + время у последнего сообщения группы
 */

import { MascotSvg } from "@/components/mascot-svg";
import {
  ArrowUp,
  ChevronDown,
  Copy,
  History,
  Mic,
  Plus,
  RotateCcw,
  Sprout,
  WifiOff,
} from "lucide-react";

export type PreviewState =
  | "1"
  | "1b"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14";

/** Реплика напарника: 22/22/22/8, padding 14/16, максимум 84% ширины */
function CatBubble({
  children,
  tail = true,
}: {
  children: React.ReactNode;
  tail?: boolean;
}) {
  return (
    <div
      className="chat-bubble-cat max-w-[84%] px-4 py-3.5 text-[16px] leading-[1.45]"
      style={{ borderRadius: tail ? "22px 22px 22px 8px" : "22px" }}
    >
      {children}
    </div>
  );
}

/** Реплика человека: тёмный moss/lime tint, 22/22/8/22, максимум 78% */
function UserBubble({
  children,
  shrink = false,
}: {
  children: React.ReactNode;
  shrink?: boolean;
}) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[78%] px-4 py-3.5 text-[16px] leading-[1.45] text-foreground"
        style={{
          borderRadius: "22px 22px 8px 22px",
          background:
            "linear-gradient(to bottom, oklch(0.32 0.06 132) 0%, oklch(0.28 0.055 132) 100%)",
          boxShadow:
            "inset 0 1px 0 oklch(1 0 0 / 0.1), 0 6px 18px -12px oklch(0 0 0 / 0.6)",
          border: "1px solid oklch(0.86 0.22 130 / 0.18)",
          transform: shrink ? "scale(0.985)" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function QuickChip({
  children,
  selected = false,
}: {
  children: React.ReactNode;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      className="glass glass-interactive inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-semibold"
      style={
        selected
          ? {
              transform: "scale(0.96)",
              opacity: 0.7,
              borderColor: "oklch(0.86 0.22 130 / 0.35)",
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}

/** Заглушка блока: повторяет геометрию будущего объекта, а не «крутилку» */
function Skeleton({
  className,
  radius = 22,
}: {
  className?: string;
  radius?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-pulse ${className ?? ""}`}
      style={{
        borderRadius: radius,
        background: "oklch(1 0 0 / 0.055)",
        border: "1px solid oklch(1 0 0 / 0.05)",
      }}
    />
  );
}

export function RedesignPreview({ state }: { state: PreviewState }) {
  const isLoading = state === "7";
  const composerFocus = state === "9";
  const hasText = state === "10" || state === "11" || state === "12";
  const isSending = state === "11";
  const isError = state === "12";
  const isOffline = state === "13";

  return (
    <div className="relative z-10 flex h-full flex-col">
      {/* ── Заголовок: 56px, аватар 32, статус, одна кнопка 44×44 ───────── */}
      <header className="glass-nav sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.72_0.17_55/0.18)_0%,transparent_70%)]"
          />
          <MascotSvg expression="calm" label="Напарник" size={32} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[15px] font-bold leading-tight">
            Напарник
          </span>
          <span className="flex items-center gap-1.5 text-[11px] leading-tight text-muted-foreground">
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                isOffline ? "bg-muted-foreground" : "bg-primary"
              }`}
            />
            {isOffline ? "нет связи" : "я здесь"}
          </span>
        </div>
        <button
          type="button"
          aria-label="История"
          className="press ml-auto flex size-11 shrink-0 items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground"
        >
          <History className="size-5" aria-hidden="true" />
        </button>
      </header>

      {/* ── Лента: один скролл, композер прижат внизу ─────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <div
          className={`mx-auto flex min-h-full w-full max-w-md flex-col justify-end gap-4 px-4 pt-4 ${
            state === "6" ? "pb-20 pr-14" : "pb-4"
          }`}
        >
          {/* ── 7. Loading: skeleton точно по будущей геометрии ───────── */}
          {isLoading && (
            <>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-12 w-[56%]" />
                <Skeleton className="h-[70px] w-[84%]" />
              </div>
              <Skeleton className="h-[196px] w-full" radius={24} />
              <div className="flex justify-end">
                <Skeleton className="h-12 w-[62%]" />
              </div>
              <Skeleton className="h-12 w-[48%]" />
            </>
          )}

          {!isLoading && (
            <>
              {/* ── 14. Группировка: аватар только у первой реплики ───── */}
              {state === "14" ? (
                <>
                  <div className="flex items-start gap-2">
                    <MascotSvg
                      expression="calm"
                      label="Напарник"
                      size={28}
                      className="mt-1.5 shrink-0"
                    />
                    <div className="flex min-w-0 flex-col gap-1">
                      <CatBubble tail={false}>
                        <span className="font-hand text-[21px] leading-snug">
                          Привет. Я тут.
                        </span>
                      </CatBubble>
                      <CatBubble tail={false}>
                        Плана нет — и это ноль, не минус.
                      </CatBubble>
                      <CatBubble>Что сейчас мешает?</CatBubble>
                      <span className="pl-1 text-[13px] leading-[18px] text-muted-foreground">
                        14:02
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col items-end gap-1">
                    <UserBubble>Надо сделать презентацию к четвергу</UserBubble>
                    <UserBubble>И я не знаю, с чего начать</UserBubble>
                    <span className="pr-1 text-[13px] leading-[18px] text-muted-foreground">
                      14:03 · доставлено
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <CatBubble tail={false}>
                    <span className="font-hand text-[21px] leading-snug">
                      Привет. Я тут.
                    </span>
                  </CatBubble>
                  <CatBubble>
                    {state === "1" || state === "1b" ? (
                      <>
                        Плана нет — и это ноль, не минус.
                        <span className="mt-1 block text-[15px] text-muted-foreground">
                          Что сейчас мешает?
                        </span>
                      </>
                    ) : (
                      <>Разобрал твою задачу. Первый шаг маленький, честно.</>
                    )}
                  </CatBubble>
                </div>
              )}

              {/* ── 6. Быстрые ответы под своим сообщением ───────────── */}
              {state === "1" && (
                <div className="flex flex-wrap gap-2">
                  <QuickChip>Не могу начать</QuickChip>
                  <QuickChip>Задача слишком большая</QuickChip>
                  <QuickChip>Просто тяжело</QuickChip>
                </div>
              )}

              {/* 1b: выбранный чип сжался, остальные ушли, текст стал
                  отправленным сообщением — высота блока зарезервирована */}
              {state === "1b" && (
                <>
                  <div className="flex flex-wrap gap-2 opacity-45">
                    <QuickChip selected>Задача слишком большая</QuickChip>
                  </div>
                  <UserBubble shrink>Задача слишком большая</UserBubble>
                </>
              )}

              {/* ── 8. Typing → постепенный ответ ─────────────────────── */}
              {state === "8" && (
                <>
                  <UserBubble>Надо сделать презентацию к четвергу</UserBubble>
                  <div className="flex flex-col gap-1.5">
                    <span className="pl-1 text-[13px] leading-[18px] text-muted-foreground">
                      Напарник думает
                    </span>
                    <div
                      className="chat-bubble-cat flex w-fit items-center gap-2 px-4 py-4"
                      style={{ borderRadius: "22px 22px 22px 8px" }}
                    >
                      <span className="typing-fade size-1.5 rounded-full bg-muted-foreground" />
                      <span className="typing-fade size-1.5 rounded-full bg-muted-foreground [animation-delay:200ms]" />
                      <span className="typing-fade size-1.5 rounded-full bg-muted-foreground [animation-delay:400ms]" />
                    </div>
                  </div>
                </>
              )}

              {/* ── 6. Кнопка возврата вниз: история выше на 1 viewport ── */}
              {state === "6" && (
                <>
                  <UserBubble>Надо сделать презентацию к четвергу</UserBubble>
                  <CatBubble>
                    Первый шаг — просто открыть файл. Не писать слайды.
                  </CatBubble>
                  <UserBubble>А если я застряну?</UserBubble>
                  <CatBubble>
                    Закроешь ноутбук — 15 минут всё равно зачтутся.
                  </CatBubble>
                  <UserBubble>Ок</UserBubble>
                  <CatBubble>Открывай. Я тут.</CatBubble>
                </>
              )}

              {(state === "2" ||
                state === "3" ||
                state === "4" ||
                state === "5") && (
                <>
                  <UserBubble>Надо сделать презентацию к четвергу</UserBubble>

                  {/* ── 2. Карточка первого движения ─────────────────── */}
                  {(state === "2" || state === "5") && (
                    <div
                      className="glass start-card-breathe flex flex-col gap-3 p-5"
                      style={{ borderRadius: 24 }}
                    >
                      <span className="font-mono text-[11px] font-semibold uppercase leading-[14px] tracking-widest text-primary">
                        Первое движение
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-[18px] font-bold leading-6">
                          Открыть файл презентации
                        </span>
                        <span className="text-[13px] leading-[18px] text-muted-foreground">
                          15 минут · результат не обязателен
                        </span>
                      </div>
                      <button
                        type="button"
                        className="cta-sheen press inline-flex h-[52px] w-full items-center justify-center rounded-2xl bg-primary text-[16px] font-bold text-primary-foreground"
                      >
                        Начать 15 минут
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/12 text-[15px] font-semibold text-muted-foreground"
                      >
                        Выбрать другое дело
                      </button>
                      <p className="text-[13px] leading-[18px] text-muted-foreground">
                        Старт оставит след. Первое движение вырастит росток.
                      </p>
                    </div>
                  )}

                  {/* 5: продолжение переписки уводит карточку выше экрана */}
                  {state === "5" && (
                    <>
                      <UserBubble>
                        А если я застряну на первом слайде?
                      </UserBubble>
                      <CatBubble>
                        Тогда просто закрой ноутбук — 15 минут уже зачтутся.
                        Слайд не обязан получиться.
                      </CatBubble>
                      <UserBubble>Ладно. Пойду открою файл</UserBubble>
                      <CatBubble>
                        <span className="font-hand text-[21px] leading-snug">
                          Вот и всё, что нужно.
                        </span>
                      </CatBubble>
                    </>
                  )}

                  {(state === "3" || state === "4") && (
                    <CatBubble>
                      <span className="font-hand text-[21px] leading-snug">
                        Пятнадцать минут — твои.
                      </span>
                      <span className="mt-1 block">
                        Я не буду мешать. Вернёшься — посмотрим, что выросло.
                      </span>
                    </CatBubble>
                  )}

                  {/* ── 4. Награда только после реального действия ───── */}
                  {state === "4" && (
                    <div
                      className="glass relative flex items-center gap-3.5 overflow-hidden p-4"
                      style={{ borderRadius: 28 }}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-6 -top-8 size-28 rounded-full bg-[radial-gradient(circle,oklch(0.86_0.22_130/0.18)_0%,transparent_66%)]"
                      />
                      <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/25">
                        <Sprout
                          className="size-7 text-primary"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="relative flex min-w-0 flex-col gap-0.5">
                        <span className="font-mono text-[11px] font-semibold uppercase leading-[14px] tracking-widest text-primary">
                          Первое движение сделано
                        </span>
                        <span className="text-[16px] font-bold leading-snug">
                          На острове появился росток
                        </span>
                        <span className="mt-1 inline-flex min-h-11 items-center text-[15px] font-semibold text-primary underline-offset-4">
                          Посмотреть
                        </span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── 12. Кнопка возврата вниз + badge новых сообщений ───────── */}
        {state === "6" && (
          <button
            type="button"
            aria-label="К последнему сообщению, 2 новых"
            className="glass press absolute bottom-3 right-4 flex size-11 items-center justify-center rounded-full"
          >
            <ChevronDown className="size-5" aria-hidden="true" />
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">
              2
            </span>
          </button>
        )}
      </div>

      {/* ── Низ экрана: контекст / dock / статус + композер ───────────── */}
      <div className="shrink-0">
        <div
          aria-hidden="true"
          className="h-6 bg-gradient-to-b from-transparent to-background/85"
        />

        <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-4 pb-3">
          {/* ── 7. Sticky-контекст: только когда карточка ушла выше ──── */}
          {state === "5" && (
            <div className="glass flex h-12 items-center gap-2 rounded-2xl px-3">
              <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Открыть презентацию
                </span>{" "}
                · 15 мин
              </span>
              <button
                type="button"
                className="flex h-11 items-center rounded-xl px-2 text-[13px] font-semibold text-primary"
              >
                Изменить
              </button>
            </div>
          )}

          {/* ── 3. Session-dock: фокус идёт, чат молчит ──────────────── */}
          {state === "3" && (
            <div className="glass flex items-center gap-3 rounded-2xl px-3 py-2 ring-1 ring-primary/25">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold">
                  Открыть презентацию
                </span>
                <span className="font-mono text-[12px] text-muted-foreground">
                  12:43
                </span>
              </span>
              <button
                type="button"
                className="press inline-flex h-11 shrink-0 items-center rounded-xl bg-primary px-4 text-[14px] font-bold text-primary-foreground"
              >
                Вернуться в фокус
              </button>
            </div>
          )}

          {/* ── 9. Error: текст не исчезает, мысль сохранена ─────────── */}
          {isError && (
            <div
              className="flex items-center gap-2 border border-white/10 px-3 py-2"
              style={{
                borderRadius: 20,
                background: "oklch(0.72 0.17 55 / 0.1)",
              }}
            >
              <span className="min-w-0 flex-1 text-[13px] leading-[18px] text-foreground">
                Не отправилось. Твоя мысль сохранена.
              </span>
              <button
                type="button"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
                aria-label="Повторить"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
                aria-label="Скопировать"
              >
                <Copy className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* ── 9. Offline: предупреждение над композером ────────────── */}
          {isOffline && (
            <div className="flex items-center gap-2 px-1 py-1 text-[13px] leading-[18px] text-muted-foreground">
              <WifiOff className="size-4 shrink-0" aria-hidden="true" />
              Сейчас без связи. Сообщение отправится после подключения.
            </div>
          )}

          {/* ── 8/9. Композер: три независимые зоны, min-h 60 ────────── */}
          {isLoading ? (
            <Skeleton className="h-[60px] w-full" radius={20} />
          ) : (
            <div
              className="chat-input-dock glass flex min-h-[60px] items-center gap-2 rounded-[20px] px-2"
              style={
                composerFocus
                  ? {
                      outline: "2px solid oklch(0.86 0.22 130 / 0.75)",
                      outlineOffset: 2,
                      background: "oklch(1 0 0 / 0.07)",
                      borderColor: "oklch(1 0 0 / 0.22)",
                    }
                  : undefined
              }
            >
              <button
                type="button"
                aria-label="Добавить"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
              <span
                className={`min-w-0 flex-1 truncate text-[16px] ${
                  hasText ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {hasText ? (
                  <>
                    Не могу заставить себя открыть файл
                    {composerFocus ? null : null}
                  </>
                ) : state === "1" || state === "1b" ? (
                  "Напиши, что мешает…"
                ) : (
                  "Сообщение Напарнику…"
                )}
                {composerFocus && (
                  <span className="ml-px inline-block h-5 w-px translate-y-1 bg-primary" />
                )}
              </span>
              <button
                type="button"
                aria-label="Диктовать"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground"
              >
                <Mic className="size-5" aria-hidden="true" />
              </button>
              {isSending ? (
                <span
                  aria-label="Отправляется"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/25"
                >
                  <span
                    className="size-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                    aria-hidden="true"
                  />
                </span>
              ) : (
                <button
                  type="button"
                  aria-label="Отправить"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                    hasText
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <ArrowUp className="size-5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
