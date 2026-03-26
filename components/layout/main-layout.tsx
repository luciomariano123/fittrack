import { Sidebar } from "./sidebar";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <Sidebar />
      <main className="md:ml-[220px] pt-14 md:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
