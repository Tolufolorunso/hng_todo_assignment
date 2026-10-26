import * as Haptics from "expo-haptics";

export const hapticFeedback = {
  /**
   * Subtle tactile feedback for interactive taps, buttons, and chips.
   */
  light: async (): Promise<void> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Safe fallback for web, node, or unsupported hardware
    }
  },

  /**
   * Noticeable tactile click for task checkbox toggles and important actions.
   */
  medium: async (): Promise<void> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Safe fallback
    }
  },

  /**
   * Prominent tactile feedback for destructive or high-impact actions.
   */
  heavy: async (): Promise<void> => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Safe fallback
    }
  },

  /**
   * Selection feedback for segmented tabs, pickers, and mode switches.
   */
  selection: async (): Promise<void> => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Safe fallback
    }
  },

  /**
   * Positive completion notification feedback for saved tasks, notes, or backups.
   */
  success: async (): Promise<void> => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Safe fallback
    }
  },

  /**
   * Cautionary feedback for confirmation prompts or non-fatal alerts.
   */
  warning: async (): Promise<void> => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Safe fallback
    }
  },

  /**
   * Error notification feedback for validation failures or rejected operations.
   */
  error: async (): Promise<void> => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Safe fallback
    }
  },
};

export default hapticFeedback;
