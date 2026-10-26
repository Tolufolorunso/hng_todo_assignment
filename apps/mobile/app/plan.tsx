import React from "react";
import { useAppServices, useAppServicesState } from "../src/context/AppContext.js";
import { PlanScreen } from "../src/screens/PlanScreen.js";

export default function PlanRoute(): React.JSX.Element {
  const { taskRepo, followUpRepo, dailyPlanRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();

  return (
    <PlanScreen
      key={`plan_${refreshKey}`}
      taskRepo={taskRepo}
      followUpRepo={followUpRepo}
      dailyPlanRepo={dailyPlanRepo}
    />
  );
}
