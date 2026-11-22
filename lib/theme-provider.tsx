import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Appearance,
  I18nManager,
  View,
  useColorScheme as useSystemColorScheme,
} from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

type CustomColors = Partial<Record<"primary" | "background" | "surface" | "foreground" | "muted" | "border", string>>;
type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  resetCustomColors: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "school-calendar-theme-v1";
const CUSTOM_COLORS_KEY = "school-calendar-custom-colors-v1";
const validCustomColors = (value: unknown): value is CustomColors =>
  !!value && typeof value === "object" && Object.entries(value).every(([key, color]) =>
    ["primary", "background", "surface", "foreground", "muted", "border"].includes(key) &&
    typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)
  );

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);
  const [customColors, setCustomColorsState] = useState<CustomColors>({});

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = { ...SchemeColors[scheme], ...customColors };
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setCustomColors = useCallback((colors: CustomColors) => {
    setCustomColorsState(colors);
    void AsyncStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
  }, []);
  const resetCustomColors = useCallback(() => setCustomColors({}), [setCustomColors]);

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setColorSchemeState(scheme);
      applyScheme(scheme);
      void AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
    },
    [applyScheme],
  );

  useEffect(() => {
    applyScheme(colorScheme);
    I18nManager.allowRTL(true);
    if (typeof document !== "undefined") {
      document.documentElement.dir = "rtl";
      document.documentElement.lang = "ar";
      document.body.dir = "rtl";
    }
  }, [applyScheme, colorScheme, customColors]);

  useEffect(() => {
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") setColorSchemeState(stored);
    });
    void AsyncStorage.getItem(CUSTOM_COLORS_KEY).then((stored) => {
      if (!stored) return;
      try { const parsed: unknown = JSON.parse(stored); if (validCustomColors(parsed)) setCustomColorsState(parsed); } catch {}
    });
  }, []);

  const themeVariables = useMemo(
    () =>
      vars({
        "color-primary": customColors.primary ?? SchemeColors[colorScheme].primary,
        "color-background": customColors.background ?? SchemeColors[colorScheme].background,
        "color-surface": customColors.surface ?? SchemeColors[colorScheme].surface,
        "color-foreground": customColors.foreground ?? SchemeColors[colorScheme].foreground,
        "color-muted": customColors.muted ?? SchemeColors[colorScheme].muted,
        "color-border": customColors.border ?? SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
        "color-error": SchemeColors[colorScheme].error,
      }),
    [colorScheme, customColors],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
      customColors,
      setCustomColors,
      resetCustomColors,
    }),
    [colorScheme, setColorScheme, customColors, setCustomColors, resetCustomColors],
  );
  console.log(value, themeVariables);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
