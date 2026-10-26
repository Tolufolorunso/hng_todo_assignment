import React from "react";
import { useAppServices, useAppServicesState } from "../src/context/AppContext.js";
import { InboxScreen } from "../src/screens/InboxScreen.js";

export default function InboxRoute(): React.JSX.Element {
  const { inboxRepo, triageService } = useAppServices();
  const { refreshKey } = useAppServicesState();

  return (
    <InboxScreen
      key={`inbox_${refreshKey}`}
      inboxRepo={inboxRepo}
      triageService={triageService}
    />
  );
}
