import { Colors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useColorScheme } from "./use-color-scheme";
import { useThemeContext } from "@/lib/theme-provider";

export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const colorSchema = useColorScheme();
  const { customColors } = useThemeContext();
  const scheme = (colorSchemeOverride ?? colorSchema ?? "light") as ColorScheme;
  const base = Colors[scheme];
  return {
    ...base,
    ...customColors,
    text: customColors.foreground ?? base.text,
    tint: customColors.primary ?? base.tint,
    tabIconSelected: customColors.primary ?? base.tabIconSelected,
  };
}
