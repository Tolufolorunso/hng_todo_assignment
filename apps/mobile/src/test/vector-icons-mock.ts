import React from "react";

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: unknown;
}

export function createMockIcon(family: string) {
  const IconComponent = ({ name, size = 24, color = "#000", style }: IconProps) => {
    return React.createElement(
      "span",
      {
        "data-family": family,
        "data-name": name,
        "data-size": size,
        "data-color": color,
        style,
      },
      name
    );
  };
  IconComponent.displayName = family;
  return IconComponent;
}

export const Ionicons = createMockIcon("Ionicons");
export const MaterialCommunityIcons = createMockIcon("MaterialCommunityIcons");
export const MaterialIcons = createMockIcon("MaterialIcons");
export const Feather = createMockIcon("Feather");

export default {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Feather,
};
