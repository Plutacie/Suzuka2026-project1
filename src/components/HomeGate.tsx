"use client";

import dynamic from "next/dynamic";

const OcNetworkPage = dynamic(
  () =>
    import("@/components/OcNetworkPage").then((m) => m.OcNetworkPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[100dvh] items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        加载画布…
      </div>
    ),
  },
);

export function HomeGate() {
  return <OcNetworkPage />;
}
