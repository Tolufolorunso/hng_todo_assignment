import React from "react";
import { useAppServices, useAppServicesState } from "../../src/context/AppContext.js";
import { FollowUpsScreen } from "../../src/screens/FollowUpsScreen.js";

export default function FollowUpsTabScreen(): React.JSX.Element {
  const { followUpRepo } = useAppServices();
  const { refreshKey } = useAppServicesState();

  return (
    <FollowUpsScreen
      key={`followups_${refreshKey}`}
      followUpRepo={followUpRepo}
    />
  );
}
