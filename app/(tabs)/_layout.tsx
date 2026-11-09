import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  return (
    <Tabs
      initialRouteName="today"
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: "#8A95A3",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontFamily: "System", fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "اليوم", tabBarIcon: ({ color }) => <IconSymbol size={24} name="today" color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "التقويم", tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} /> }} />
      <Tabs.Screen name="tasks" options={{ title: "المهام", tabBarIcon: ({ color }) => <IconSymbol size={24} name="checklist" color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "المزيد", tabBarIcon: ({ color }) => <IconSymbol size={24} name="menu" color={color} /> }} />
    </Tabs>
  );
}
