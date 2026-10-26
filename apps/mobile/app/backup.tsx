import React from "react";
import { useAppServices, useAppServicesState } from "../src/context/AppContext.js";
import { BackupScreen } from "../src/screens/BackupScreen.js";

export default function BackupRoute(): React.JSX.Element {
  const { backupService } = useAppServices();
  const { notifyDataChanged } = useAppServicesState();

  return (
    <BackupScreen
      backupService={backupService}
      onDataChanged={notifyDataChanged}
    />
  );
}
