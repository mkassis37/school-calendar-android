import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  calendar: "calendar-month",
  checklist: "checklist",
  settings: "settings",
  add: "add",
  close: "close",
  arrow: "arrow-forward",
  back: "arrow-back",
  today: "today",
  notifications: "notifications-none",
  notificationsActive: "notifications-active",
  menu: "menu-book",
  assignment: "assignment",
  exam: "edit-note",
  activity: "local-activity",
  evaluation: "fact-check",
  delete: "delete-outline",
  edit: "edit",
  check: "check",
  cloudOff: "cloud-off",
  sync: "sync",
  chevronDown: "expand-more",
  info: "info-outline",
  search: "search",
  archive: "archive",
  unarchive: "unarchive",
} as const;

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name] as MaterialIconName} style={style} />;
}
