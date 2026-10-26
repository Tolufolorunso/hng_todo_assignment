import React from "react";
import { useAppServices, useAppServicesState } from "../src/context/AppContext.js";
import { CalendarScreen } from "../src/screens/CalendarScreen.js";

export default function CalendarRoute(): React.JSX.Element {
  const { taskRepo, followUpRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();

  return (
    <CalendarScreen
      key={`calendar_${refreshKey}`}
      taskRepo={taskRepo}
      followUpRepo={followUpRepo}
    />
  );
}
