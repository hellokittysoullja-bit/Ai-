import { RedesignPreview } from "@/components/redesign-preview";

/** Служебный экран предпросмотра новой архитектуры «Дома»: /app/preview?s=1..4 */
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const state =
    s === "2" || s === "3" || s === "4" || s === "5" ? s : "1";
  return (
    <main className="flex h-dvh flex-col overflow-hidden pb-20">
      <RedesignPreview state={state} />
    </main>
  );
}
