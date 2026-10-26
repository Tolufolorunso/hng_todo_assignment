import { Platform, StyleSheet, type ViewStyle } from "react-native";

export const isIOS: boolean = Platform.OS === "ios";
export const isAndroid: boolean = Platform.OS === "android";

export interface PlatformRippleConfig {
  color: string;
  borderless?: boolean;
}

/**
 * Returns an Android-native ripple configuration for Pressable components.
 * Returns undefined on iOS or other platforms where native ripples are not used.
 */
export function getPlatformRipple(
  color = "rgba(255, 255, 255, 0.12)",
  borderless = false
): PlatformRippleConfig | undefined {
  if (!isAndroid) {
    return undefined;
  }
  return {
    color,
    borderless,
  };
}

/**
 * Generates platform-adaptive card styles:
 * iOS: Inset grouped card with 14px radius, hairline border, and subtle shadow.
 * Android: Material 3 card with 16px radius, hairline border, and elevation 2.
 */
export function getPlatformCardStyle(
  surface: string,
  surfaceBorder: string
): ViewStyle {
  if (isIOS) {
    return {
      backgroundColor: surface,
      borderColor: surfaceBorder,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 14,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
    };
  }

  if (isAndroid) {
    return {
      backgroundColor: surface,
      borderColor: surfaceBorder,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 16,
      elevation: 2,
    };
  }

  return {
    backgroundColor: surface,
    borderColor: surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
  };
}

/**
 * Generates platform-adaptive grouped container styles:
 * iOS: Inset grouped container with 14px radius and clipped overflow.
 * Android: Elevated card container with 16px radius and clipped overflow.
 */
export function getPlatformGroupContainerStyle(
  surface: string,
  surfaceBorder: string
): ViewStyle {
  if (isIOS) {
    return {
      backgroundColor: surface,
      borderColor: surfaceBorder,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 14,
      overflow: "hidden",
    };
  }

  if (isAndroid) {
    return {
      backgroundColor: surface,
      borderColor: surfaceBorder,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 16,
      elevation: 2,
      overflow: "hidden",
    };
  }

  return {
    backgroundColor: surface,
    borderColor: surfaceBorder,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  };
}

/**
 * Generates a hairline divider style between grouped rows.
 */
export function getHairlineDividerStyle(borderColor: string): ViewStyle {
  return {
    height: StyleSheet.hairlineWidth,
    backgroundColor: borderColor,
  };
}
