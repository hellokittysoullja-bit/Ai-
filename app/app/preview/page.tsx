import { RedesignPreview, type PreviewState } from "@/components/redesign-preview";

const STATES: PreviewState[] = [
  "1",
  "1b",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
];

/** Служебный экран предпросмотра новой архитектуры «Дома»: /app/preview?s=… */
export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const state = STATES.includes(s as PreviewState) ? (s as PreviewState) : "1";
  return (
    <main className="flex h-dvh flex-col overflow-hidden pb-20">
      <RedesignPreview state={state} />
    </main>
  );
}
