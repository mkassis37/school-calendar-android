import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useThemeContext } from "@/lib/theme-provider";

type Palette = { primary: string; background: string; surface: string; foreground: string; muted: string; border: string };
const DEFAULTS: Palette = { primary: "#1AA394", background: "#F7F9FC", surface: "#FFFFFF", foreground: "#142330", muted: "#738291", border: "#E7ECF2" };
const BLUE: Palette = { primary: "#3977C3", background: "#F3F7FC", surface: "#FFFFFF", foreground: "#18283C", muted: "#71839A", border: "#DCE6F1" };
const PURPLE: Palette = { primary: "#8057B7", background: "#F7F4FB", surface: "#FFFFFF", foreground: "#2A2038", muted: "#80748F", border: "#E7DFF0" };
const GREEN: Palette = { primary: "#39865B", background: "#F2F8F3", surface: "#FFFFFF", foreground: "#1C3024", muted: "#718578", border: "#DCE9DF" };

export function ThemeCustomizer() {
  const { customColors, setCustomColors, resetCustomColors } = useThemeContext();
  const [draft, setDraft] = useState<Palette>({ ...DEFAULTS, ...customColors });
  useEffect(() => { setDraft({ ...DEFAULTS, ...customColors }); }, [customColors]);

  const chooseDefault = () => { setDraft(DEFAULTS); setCustomColors(DEFAULTS); };
  const chooseBlue = () => { setDraft(BLUE); setCustomColors(BLUE); };
  const choosePurple = () => { setDraft(PURPLE); setCustomColors(PURPLE); };
  const chooseGreen = () => { setDraft(GREEN); setCustomColors(GREEN); };
  const changePrimary = (value: string) => setDraft((old) => ({ ...old, primary: value }));
  const changeBackground = (value: string) => setDraft((old) => ({ ...old, background: value }));
  const changeSurface = (value: string) => setDraft((old) => ({ ...old, surface: value }));
  const changeForeground = (value: string) => setDraft((old) => ({ ...old, foreground: value }));
  const save = () => setCustomColors(draft);
  const reset = () => { resetCustomColors(); setDraft(DEFAULTS); };

  return (
    <View style={{ padding: 13, gap: 10 }}>
      <Text style={{ color: "#142330", fontSize: 14, fontWeight: "900", textAlign: "right" }}>ألوان التطبيق</Text>
      <Text style={{ color: "#738291", fontSize: 10, textAlign: "right" }}>اختر ثيمًا جاهزًا أو أدخل رمز اللون بصيغة HEX.</Text>
      <View style={{ flexDirection: "row-reverse", gap: 6 }}>
        <Pressable onPress={chooseDefault} style={{ flex: 1, padding: 8, backgroundColor: "#E5F6F2", borderRadius: 8 }}><Text style={{ color: "#1AA394", textAlign: "center", fontSize: 10 }}>افتراضي</Text></Pressable>
        <Pressable onPress={chooseBlue} style={{ flex: 1, padding: 8, backgroundColor: "#EAF1FA", borderRadius: 8 }}><Text style={{ color: "#3977C3", textAlign: "center", fontSize: 10 }}>أزرق</Text></Pressable>
        <Pressable onPress={choosePurple} style={{ flex: 1, padding: 8, backgroundColor: "#F2EBF8", borderRadius: 8 }}><Text style={{ color: "#8057B7", textAlign: "center", fontSize: 10 }}>بنفسجي</Text></Pressable>
        <Pressable onPress={chooseGreen} style={{ flex: 1, padding: 8, backgroundColor: "#EAF5EC", borderRadius: 8 }}><Text style={{ color: "#39865B", textAlign: "center", fontSize: 10 }}>أخضر</Text></Pressable>
      </View>
      <Text style={{ color: "#142330", textAlign: "right", fontSize: 11 }}>اللون الأساسي والأزرار</Text>
      <TextInput value={draft.primary} onChangeText={changePrimary} placeholder="#1AA394" style={{ borderWidth: 1, borderColor: "#E7ECF2", borderRadius: 8, padding: 8, textAlign: "center", color: "#142330" }} />
      <Text style={{ color: "#142330", textAlign: "right", fontSize: 11 }}>خلفية التطبيق</Text>
      <TextInput value={draft.background} onChangeText={changeBackground} placeholder="#F7F9FC" style={{ borderWidth: 1, borderColor: "#E7ECF2", borderRadius: 8, padding: 8, textAlign: "center", color: "#142330" }} />
      <Text style={{ color: "#142330", textAlign: "right", fontSize: 11 }}>خلفية البطاقات</Text>
      <TextInput value={draft.surface} onChangeText={changeSurface} placeholder="#FFFFFF" style={{ borderWidth: 1, borderColor: "#E7ECF2", borderRadius: 8, padding: 8, textAlign: "center", color: "#142330" }} />
      <Text style={{ color: "#142330", textAlign: "right", fontSize: 11 }}>لون النصوص</Text>
      <TextInput value={draft.foreground} onChangeText={changeForeground} placeholder="#142330" style={{ borderWidth: 1, borderColor: "#E7ECF2", borderRadius: 8, padding: 8, textAlign: "center", color: "#142330" }} />
      <View style={{ backgroundColor: draft.background, borderRadius: 10, padding: 10, gap: 8 }}>
        <Text style={{ color: draft.foreground, textAlign: "right" }}>معاينة المظهر قبل الحفظ</Text>
        <View style={{ backgroundColor: draft.surface, borderRadius: 8, padding: 9 }}>
          <Text style={{ color: draft.foreground, textAlign: "right" }}>بطاقة تجريبية</Text>
        </View>
        <View style={{ backgroundColor: draft.primary, borderRadius: 8, padding: 9 }}>
          <Text style={{ color: "#FFFFFF", textAlign: "center" }}>زر تجريبي</Text>
        </View>
      </View>
      <Pressable onPress={save} style={{ backgroundColor: "#1AA394", padding: 11, borderRadius: 9 }}><Text style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "800" }}>حفظ الألوان</Text></Pressable>
      <Pressable onPress={reset} style={{ backgroundColor: "#E5F6F2", padding: 11, borderRadius: 9 }}><Text style={{ color: "#1AA394", textAlign: "center", fontWeight: "800" }}>إعادة الافتراضي</Text></Pressable>
    </View>
  );
}
