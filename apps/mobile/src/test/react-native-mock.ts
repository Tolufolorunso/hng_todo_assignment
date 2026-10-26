export const View = "View";
export const Text = "Text";
export const Pressable = "Pressable";
export const TextInput = "TextInput";
export const ScrollView = "ScrollView";
export const FlatList = "FlatList";
export const SafeAreaView = "SafeAreaView";
export const StatusBar = "StatusBar";
export const ActivityIndicator = "ActivityIndicator";
export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T): T => styles,
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
  StyleSheet,
  Linking,
};
