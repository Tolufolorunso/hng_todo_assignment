export const View = "View";
export const Text = "Text";
export const Pressable = "Pressable";
export const TextInput = "TextInput";
export const ScrollView = "ScrollView";
export const FlatList = "FlatList";
export const SafeAreaView = "SafeAreaView";
export const StatusBar = "StatusBar";
export const ActivityIndicator = "ActivityIndicator";
export const Modal = "Modal";
export const Platform = {
  OS: "ios" as "ios" | "android" | "windows" | "macos" | "web",
  select: <T>(obj: { ios?: T; android?: T; default?: T }): T | undefined => obj.ios ?? obj.default,
};
export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
  hairlineWidth: 1,
};
export const Linking = {
  openURL: async (): Promise<void> => {},
  canOpenURL: async (): Promise<boolean> => true,
};

export default {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  FlatList,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Linking,
};
