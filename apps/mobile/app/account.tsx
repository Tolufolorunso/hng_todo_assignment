import React from "react";
import { useAppServices } from "../src/context/AppContext";
import { AccountScreen } from "../src/screens/AccountScreen";

export default function AccountRoute(): React.JSX.Element {
  const { authService, syncEngine, syncRepo } = useAppServices();

  return (
    <AccountScreen
      authService={authService}
      syncEngine={syncEngine}
      syncRepo={syncRepo}
    />
  );
}
