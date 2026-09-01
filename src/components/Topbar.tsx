"use client";

import { UserButton } from "@clerk/nextjs";
import { useWorkspace } from "./WorkspaceWrapper";
import styles from "./Topbar.module.css";

export default function Topbar() {
  const workspace = useWorkspace();
  
  return (
    <header className={styles.topbar}>
      <div className={styles.leftSide}>
        <div className={styles.workspaceSelector}>
          <div className={styles.workspaceIcon}>{workspace?.name?.charAt(0) || "W"}</div>
          <span className={styles.workspaceName}>{workspace?.name || "Workspace"}</span>
        </div>
      </div>
      <div className={styles.rightSide}>
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: {
                width: 36,
                height: 36,
              }
            }
          }}
        />
      </div>
    </header>
  );
}
