import type { Metadata } from "next";
import { AppNav } from "@/components/app-nav";
import { HomeScreen } from "@/components/home-screen";

export const metadata: Metadata = {
  title: "Дом — Напарник",
  description: "Напарник пишет первым: план, первый шаг, старт.",
};

export default function AppHomePage() {
  return (
    <main className="app-page-enter flex flex-1 flex-col">
      <HomeScreen />
      <AppNav />
    </main>
  );
}
