import React from "react";

export function enableScreens(): void {}

export function ScreenContainer({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return React.createElement(React.Fragment, null, children);
}

export function Screen({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return React.createElement(React.Fragment, null, children);
}

export default {
  enableScreens,
  ScreenContainer,
  Screen,
};
