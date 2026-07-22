import type { Metadata } from "next";
import { HomeScreen } from "@/components/home-screen";

export const metadata: Metadata = {
  title: "Дом — Напарник",
  description: "Напарник пишет первым: план, первый шаг, старт.",
};

export default function AppHomePage() {
  return (
    <main className="app-page-enter flex min-h-dvh flex-col pb-20">
      <HomeScreen />
    </main>
  );
}
