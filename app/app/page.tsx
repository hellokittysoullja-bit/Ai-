import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";

export const metadata: Metadata = {
  title: "Дом — Напарник",
  description: "Напарник пишет первым: план, первый шаг, старт.",
};

export default function AppHomePage() {
  return (
    // h-dvh (не min-h): Дом — колонка ровно в высоту вьюпорта, весь
    // контент скроллится ВНУТРИ ленты чата, композер всегда стоит над
    // доком — поле ввода больше не ныряет под навигацию
    <main className="app-page-enter flex h-dvh flex-col pb-20">
      <HomeScreen />
    </main>
  );
}
