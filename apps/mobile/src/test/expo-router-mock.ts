import React from "react";

export interface MockRouter {
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  canGoBack: () => boolean;
  navigate: (href: string) => void;
  setParams: (params: Record<string, string>) => void;
}

let currentPath = "/tasks";
let currentParams: Record<string, string | undefined> = {};

export function setMockPath(path: string): void {
  currentPath = path;
}

export function setMockParams(params: Record<string, string | undefined>): void {
  currentParams = params;
}

export function useRouter(): MockRouter {
  return {
    push: (href: string) => {
      currentPath = href;
    },
    replace: (href: string) => {
      currentPath = href;
    },
    back: () => {},
    canGoBack: () => true,
    navigate: (href: string) => {
      currentPath = href;
    },
    setParams: (params: Record<string, string>) => {
      currentParams = { ...currentParams, ...params };
    },
  };
}

export function useLocalSearchParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return currentParams as T;
}

export function usePathname(): string {
  return currentPath;
}

export function useSegments(): string[] {
  return currentPath.split("/").filter(Boolean);
}

const Screen = ({ children }: { children?: React.ReactNode; [key: string]: unknown }) => {
  return children ? React.createElement(React.Fragment, null, children) : null;
};

export const Stack = ({ children }: { children?: React.ReactNode; [key: string]: unknown }) => {
  return React.createElement(React.Fragment, null, children);
};
Stack.Screen = Screen;

export const Tabs = ({ children }: { children?: React.ReactNode; [key: string]: unknown }) => {
  return React.createElement(React.Fragment, null, children);
};
Tabs.Screen = Screen;

export const Slot = ({ children }: { children?: React.ReactNode }) => {
  return React.createElement(React.Fragment, null, children);
};

export const Link = ({
  children,
  onPress,
}: {
  children?: React.ReactNode;
  href: string;
  asChild?: boolean;
  onPress?: () => void;
}) => {
  return React.createElement("a", { onClick: onPress }, children);
};

export const Redirect = () => null;

export default {
  useRouter,
  useLocalSearchParams,
  usePathname,
  useSegments,
  Stack,
  Tabs,
  Slot,
  Link,
  Redirect,
  setMockPath,
  setMockParams,
};
