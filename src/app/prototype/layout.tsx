import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import WorkspaceWrapper from "@/components/WorkspaceWrapper";
import styles from "./layout.module.css";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function PrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  
  return (
    <WorkspaceWrapper>
      <div className={styles.appShell}>
        <Sidebar />
        <div className={styles.mainContent}>
          <Topbar />
          <main className={styles.pageContent}>
            {children}
          </main>
        </div>
      </div>
    </WorkspaceWrapper>
  );
}
