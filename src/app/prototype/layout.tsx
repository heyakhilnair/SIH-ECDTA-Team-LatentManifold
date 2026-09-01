import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import WorkspaceWrapper from "@/components/WorkspaceWrapper";
import styles from "./layout.module.css";

export default function PrototypeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
