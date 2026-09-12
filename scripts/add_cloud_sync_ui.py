from pathlib import Path
p=Path('/home/ubuntu/school-calendar-android/app/(tabs)/settings.tsx')
s=p.read_text()
marker='      <Text style={styles.section}>عن التطبيق</Text>'
insert='      <Text style={styles.section}>النسخ الاحتياطي السحابي</Text><View style={styles.card}><Text style={styles.transferHint}>احفظ نسخة مشفّرة بالنقل الآمن على حسابك، واستعدها على جهاز آخر عند تسجيل الدخول. يبقى التطبيق أوفلاين ويستمر الاستيراد والتصدير المحلي.</Text><View style={styles.transferRow}><Pressable onPress={() => void uploadCloudBackup()} style={styles.transferButton}><Text style={styles.transferButtonText}>{cloudPush.isPending ? "جارٍ الحفظ..." : "حفظ سحابي الآن"}</Text></Pressable><Pressable onPress={() => void restoreCloudBackup()} style={[styles.transferButton, styles.importButton]}><Text style={styles.importButtonText}>{cloudPull.isFetching ? "جارٍ الاستعادة..." : "استعادة سحابية"}</Text></Pressable></View>{syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null}</View>\n'
if 'النسخ الاحتياطي السحابي' not in s: s=s.replace(marker,insert+marker,1)
s=s.replace('transferHint: { color: C.muted,', 'syncMessage: { color: C.teal, fontSize: 11, fontWeight: "800", textAlign: "right", paddingHorizontal: 13, paddingBottom: 13 }, transferHint: { color: C.muted,',1)
p.write_text(s)
