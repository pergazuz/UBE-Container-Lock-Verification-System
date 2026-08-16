import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { VerifyStation } from "@/components/verify/VerifyStation";
import { HistoryView } from "@/components/history/HistoryView";
import { LogsView } from "@/components/logs/LogsView";
import { UsersView } from "@/components/users/UsersView";
import { SettingsView } from "@/components/settings/SettingsView";
import { LoginView } from "@/components/auth/LoginView";
import { RequireAuth, RequireSupervisor } from "@/components/layout/RequireAuth";
import { LogStoreProvider } from "@/data/store";
import { AuthProvider } from "@/data/auth";
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

export default function App() {
  return (
    <SettingsProvider>
      <LogStoreProvider>
        <AuthProvider>
          <SessionProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginView />} />

                <Route element={<RequireAuth />}>
                  <Route
                    path="/"
                    element={
                      <PageShell
                        title="สถานีตรวจสอบการล็อก"
                        subtitle="สแกน QR Code บนคอนเทนเนอร์ แล้วกด Verify เพื่อตรวจสอบว่าล็อกครบทั้ง 4 ด้าน"
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
                    path="/logs"
                    element={
                      <PageShell
                        title="บันทึกเหตุการณ์ (User Log)"
                        subtitle="เหตุการณ์การตรวจสอบและการใช้งานระบบ — ใครทำอะไร เมื่อไร ที่สถานีไหน"
                      >
                        <LogsView />
                      </PageShell>
                    }
                  />
                  <Route
                    path="/users"
                    element={
                      <RequireSupervisor>
                        <PageShell
                          title="ผู้ใช้งาน (Users)"
                          subtitle="จัดการบัญชีพนักงานและหัวหน้างานของสถานีตรวจสอบ"
                        >
                          <UsersView />
                        </PageShell>
                      </RequireSupervisor>
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
                </Route>
              </Routes>
            </BrowserRouter>
          </SessionProvider>
        </AuthProvider>
      </LogStoreProvider>
    </SettingsProvider>
  );
}
