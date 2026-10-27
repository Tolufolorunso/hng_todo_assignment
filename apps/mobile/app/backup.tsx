import React from "react";
import { useAppServices, useAppServicesState } from "../src/context/AppContext";
import { BackupScreen } from "../src/screens/BackupScreen";

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
