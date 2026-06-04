// The "share" surface. One tap fires the WhatsApp deep link with the message
// pre-filled. Copy fallback is always exposed because in-app browsers and
// WhatsApp policy can drift; never lock the vendor out of pasting manually.

import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "BookingShare">;

export function BookingShareScreen({ route, navigation }: Props) {
  const { bookingUrl, whatsappMessage, whatsappShareUrl } = route.params;

  async function shareToWhatsApp() {
    const supported = await Linking.canOpenURL(whatsappShareUrl);
    if (!supported) {
      Alert.alert("WhatsApp not installed", "Copy the message instead.");
      return;
    }
    await Linking.openURL(whatsappShareUrl);
  }

  async function copyMessage() {
    await Clipboard.setStringAsync(whatsappMessage);
    Alert.alert("Copied", "Paste it into any chat.");
  }

  async function copyLink() {
    await Clipboard.setStringAsync(bookingUrl);
    Alert.alert("Copied", bookingUrl);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} style={{ backgroundColor: "#0e1320" }}>
      <View style={styles.card}>
        <Text style={styles.label}>Preview</Text>
        <Text style={styles.message}>{whatsappMessage}</Text>
      </View>

      <TouchableOpacity style={styles.btn} onPress={shareToWhatsApp}>
        <Text style={styles.btnText}>Share to WhatsApp</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={copyMessage}>
        <Text style={styles.btnSecondaryText}>Copy message</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={copyLink}>
        <Text style={styles.btnSecondaryText}>Copy link only</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btnGhost}
        onPress={() => navigation.popToTop()}
      >
        <Text style={styles.btnGhostText}>Back to bookings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#161d2f", padding: 16, borderRadius: 12, marginBottom: 16 },
  label: { color: "#9ba6bf", fontSize: 12, textTransform: "uppercase", marginBottom: 8 },
  message: { color: "#f4f6fb", fontSize: 15, lineHeight: 22 },
  btn: { backgroundColor: "#25D366", padding: 16, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#042116", fontWeight: "800", fontSize: 17 },
  btnSecondary: { backgroundColor: "#232c44", padding: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  btnSecondaryText: { color: "#f4f6fb", fontWeight: "600" },
  btnGhost: { padding: 14, alignItems: "center", marginTop: 16 },
  btnGhostText: { color: "#9ba6bf" },
});
