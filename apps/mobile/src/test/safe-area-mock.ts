import React from "react";

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const defaultInsets: EdgeInsets = {
  top: 44,
  right: 0,
  bottom: 34,
  left: 0,
};

export function useSafeAreaInsets(): EdgeInsets {
  return defaultInsets;
}

export function SafeAreaProvider({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return React.createElement(React.Fragment, null, children);
}

export function SafeAreaView({ children, style }: { children?: React.ReactNode; style?: unknown }): React.JSX.Element {
  return React.createElement("div", { style }, children);
}

export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: defaultInsets,
};

export default {
  useSafeAreaInsets,
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
};
