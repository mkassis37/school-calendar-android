import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from "expo-audio";

type SoundKind = "homework" | "exam";
type SavedSounds = Record<SoundKind, { uri: string; name: string } | null>;
const STORAGE_KEY = "school-calendar-custom-audio-v1";
const EMPTY: SavedSounds = { homework: null, exam: null };

export function SoundLibrarySettings() {
  const [kind, setKind] = useState<SoundKind>("homework");
  const [sounds, setSounds] = useState<SavedSounds>(EMPTY);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: "document" });
  const recorderState = useAudioRecorderState(recorder);
  const activeUri = sounds[kind]?.uri ?? null;
  const player = useAudioPlayer(activeUri);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as SavedSounds;
        if (parsed && typeof parsed === "object") setSounds({ ...EMPTY, ...parsed });
      } catch {}
    });
  }, []);

  const persist = async (next: SavedSounds) => {
    setSounds(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const storeSound = async (uri: string, name: string) => {
    const directory = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}school-calendar-audio/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_") || "custom-sound.m4a";
    const target = `${directory}${Date.now()}-${safeName}`;
    let storedUri = uri;
    try { await FileSystem.copyAsync({ from: uri, to: target }); storedUri = target; } catch {}
    const next = { ...sounds, [kind]: { uri: storedUri, name } };
    await persist(next);
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("إذن الميكروفون مطلوب", "اسمح باستخدام الميكروفون لتسجيل نغمة قصيرة.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert("تعذر بدء التسجيل", "تحقق من إذن الميكروفون ثم حاول مرة أخرى.");
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();
      if (recorder.uri) await storeSound(recorder.uri, `تسجيل-${kind}.m4a`);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    } catch {
      Alert.alert("تعذر حفظ التسجيل", "حاول تسجيل الصوت مرة أخرى.");
    }
  };

  const chooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    await storeSound(result.assets[0].uri, result.assets[0].name);
  };

  const downloadSound = async () => {
    const url = downloadUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      Alert.alert("رابط غير صالح", "أدخل رابطًا مباشرًا يبدأ بـ https:// أو http://");
      return;
    }
    setBusy(true);
    try {
      const extension = url.split("?")[0].split(".").pop()?.slice(0, 5) || "mp3";
      const target = `${FileSystem.cacheDirectory}sound-${Date.now()}.${extension}`;
      const result = await FileSystem.downloadAsync(url, target);
      const info = await FileSystem.getInfoAsync(result.uri);
      if (!info.exists || ("size" in info && (info.size ?? 0) > 15_000_000)) throw new Error("invalid audio size");
      await storeSound(result.uri, `تنزيل-${kind}.${extension}`);
      setDownloadUrl("");
    } catch {
      Alert.alert("تعذر تنزيل الصوت", "تأكد أن الرابط مباشر لملف صوتي وأن حجمه لا يتجاوز 15 ميغابايت.");
    } finally {
      setBusy(false);
    }
  };

  const preview = async () => {
    if (!activeUri) return;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      Alert.alert("تعذرت معاينة الصوت", "قد لا تكون صيغة الملف مدعومة على هذا الجهاز.");
    }
  };

  const removeSound = async () => {
    const next = { ...sounds, [kind]: null };
    await persist(next);
  };

  return <View style={{ padding: 13, gap: 10 }}>
    <Text style={{ color: "#142330", fontSize: 13, fontWeight: "900", textAlign: "right" }}>نغمات صوتية مخصصة</Text>
    <Text style={{ color: "#738291", fontSize: 10, lineHeight: 17, textAlign: "right" }}>اختر نوع التنبيه، ثم سجّل صوتًا أو اختر ملفًا أو نزّله من رابط مباشر. يمكنك معاينة النغمة المحفوظة.</Text>
    <View style={{ flexDirection: "row-reverse", gap: 8 }}>
      {([{ key: "homework", label: "الواجبات" }, { key: "exam", label: "الامتحانات" }] as const).map((item) => <Pressable key={item.key} onPress={() => setKind(item.key)} style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: kind === item.key ? "#1AA394" : "#E7ECF2", backgroundColor: kind === item.key ? "#E5F6F2" : "#FFFFFF" }}><Text style={{ color: kind === item.key ? "#1AA394" : "#738291", textAlign: "center", fontSize: 11, fontWeight: "800" }}>{item.label}</Text></Pressable>)}
    </View>
    <View style={{ borderRadius: 10, borderWidth: 1, borderColor: "#E7ECF2", padding: 10, gap: 7 }}>
      <Text numberOfLines={1} style={{ color: "#142330", textAlign: "right", fontSize: 11 }}>{sounds[kind]?.name ?? "لم يتم اختيار نغمة لهذا النوع بعد"}</Text>
      <View style={{ flexDirection: "row-reverse", gap: 7 }}>
        <Pressable onPress={() => void preview()} disabled={!activeUri} style={{ flex: 1, padding: 9, borderRadius: 9, backgroundColor: activeUri ? "#1AA394" : "#D9E1E7" }}><Text style={{ color: "#FFFFFF", textAlign: "center", fontSize: 10, fontWeight: "800" }}>معاينة</Text></Pressable>
        <Pressable onPress={() => void removeSound()} disabled={!activeUri} style={{ flex: 1, padding: 9, borderRadius: 9, backgroundColor: "#FCECF2" }}><Text style={{ color: "#C04A75", textAlign: "center", fontSize: 10, fontWeight: "800" }}>إزالة</Text></Pressable>
      </View>
    </View>
    <View style={{ flexDirection: "row-reverse", gap: 7 }}>
      <Pressable onPress={() => void chooseFile()} style={{ flex: 1, borderRadius: 9, borderWidth: 1, borderColor: "#1AA394", padding: 10 }}><Text style={{ color: "#1AA394", textAlign: "center", fontSize: 10, fontWeight: "800" }}>اختيار ملف صوتي</Text></Pressable>
      <Pressable onPress={() => void (recorderState.isRecording ? stopRecording() : startRecording())} style={{ flex: 1, borderRadius: 9, backgroundColor: recorderState.isRecording ? "#C04A75" : "#E5F6F2", padding: 10 }}><Text style={{ color: recorderState.isRecording ? "#FFFFFF" : "#1AA394", textAlign: "center", fontSize: 10, fontWeight: "800" }}>{recorderState.isRecording ? "إيقاف التسجيل وحفظه" : "تسجيل من الميكروفون"}</Text></Pressable>
    </View>
    <TextInput value={downloadUrl} onChangeText={setDownloadUrl} placeholder="رابط مباشر لملف صوتي" placeholderTextColor="#AAB5BF" autoCapitalize="none" keyboardType="url" style={{ borderWidth: 1, borderColor: "#E7ECF2", borderRadius: 9, padding: 10, color: "#142330", textAlign: "left", fontSize: 11 }} />
    <Pressable disabled={busy} onPress={() => void downloadSound()} style={{ backgroundColor: "#E5F6F2", padding: 10, borderRadius: 9 }}><Text style={{ color: "#1AA394", textAlign: "center", fontSize: 10, fontWeight: "800" }}>{busy ? "جارٍ التنزيل..." : "تنزيل الصوت وحفظه"}</Text></Pressable>
    <Text style={{ color: "#8A6B28", fontSize: 10, lineHeight: 16, textAlign: "right" }}>ملاحظة: هذه الأصوات محفوظة للمعاينة داخل التطبيق. Android يتحكم بصوت إشعاراته من إعدادات قناة التنبيه، ولا يسمح للتطبيق بتبديل ملف صوت عشوائي للقناة مباشرة بعد إنشائها.</Text>
  </View>;
}
