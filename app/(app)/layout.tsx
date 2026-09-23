import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto max-w-2xl px-4 pb-28">{children}</main>
      <BottomNav />
    </>
  );
}
