import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { VerifyStation } from "@/components/verify/VerifyStation";
import { HistoryView } from "@/components/history/HistoryView";
import { SettingsView } from "@/components/settings/SettingsView";
import { LogStoreProvider } from "@/data/store";
import { SessionProvider } from "@/data/session";
import { SettingsProvider } from "@/data/settings";

function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 py-4">
      <div className="flex items-center px-4 text-[11px] text-muted-foreground sm:px-6 lg:px-8">
        <span className="font-mono">
          UBE · Container Lock Verification System
        </span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <SessionProvider>
        <LogStoreProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col">
            <Header />
            <Routes>
              <Route
                path="/"
                element={
                  <PageShell
                    title="สถานีตรวจสอบการล็อก"
                    subtitle="วางคอนเทนเนอร์ในกรอบที่กำหนด แล้วกด Verify เพื่อตรวจสอบว่าล็อกครบทั้งสองด้าน"
                  >
                    <VerifyStation />
                  </PageShell>
                }
              />
              <Route
                path="/history"
                element={
                  <PageShell
                    title="ประวัติการตรวจสอบ & Dashboard"
                    subtitle="ค้นหา กรอง และส่งออกรายการตรวจสอบทั้งหมด พร้อมการแก้ไขผลโดยหัวหน้างาน"
                  >
                    <HistoryView />
                  </PageShell>
                }
              />
              <Route
                path="/settings"
                element={
                  <PageShell
                    title="ตั้งค่าระบบ (Settings)"
                    subtitle="กำหนดเกณฑ์การตรวจสอบ กล้อง การเชื่อมต่อ AI และจัดการข้อมูล"
                  >
                    <SettingsView />
                  </PageShell>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Footer />
          </div>
        </BrowserRouter>
        </LogStoreProvider>
      </SessionProvider>
    </SettingsProvider>
  );
}
