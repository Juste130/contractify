import Sidebar from "@/components/layout/sidebar";
import DashboardHeader from "@/components/layout/dashboardHeader";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <div className="flex h-screen">
        <Sidebar 
            // userRole="admin"
            // currentPath="/dashboard"
        />
        <div className="flex flex-col flex-1 ">
            <DashboardHeader/>
            <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
                {children}
            </main>
        </div>
      </div>
  );
}
