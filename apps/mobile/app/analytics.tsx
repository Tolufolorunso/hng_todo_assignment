import React from "react";
import { useAppServices, useAppServicesState } from "../src/context/AppContext.js";
import { AnalyticsScreen } from "../src/screens/AnalyticsScreen.js";

export default function AnalyticsRoute(): React.JSX.Element {
  const { taskRepo, followUpRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();

  return (
    <AnalyticsScreen
      key={`analytics_${refreshKey}`}
      taskRepo={taskRepo}
      followUpRepo={followUpRepo}
    />
  );
}
