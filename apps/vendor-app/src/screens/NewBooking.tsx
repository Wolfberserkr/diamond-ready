// The whole product lives or dies on this being faster than the vendor's
// current cash-on-arrival reflex. Three fields. One button.

import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { createBooking } from "../lib/api";
import { computeDepositCents, formatMoney } from "@aruba/shared";

type Props = NativeStackScreenProps<RootStackParamList, "NewBooking">;

export function NewBookingScreen({ navigation }: Props) {
  const [touristName, setTouristName] = useState("");
  const [touristPhone, setTouristPhone] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultIso());
  const [partySize, setPartySize] = useState("2");
  const [totalDollars, setTotalDollars] = useState("");
  const [depositPct, setDepositPct] = useState("25");
  const [busy, setBusy] = useState(false);

  const totalCents = Math.round((parseFloat(totalDollars) || 0) * 100);
  const pct = Math.min(100, Math.max(0, parseInt(depositPct, 10) || 0));
  const depositCents = computeDepositCents(totalCents, pct);

  async function onCreate() {
    if (!touristName || !serviceName || totalCents < 100) {
      Alert.alert("Missing info", "Add a name, service, and total ≥ $1.");
      return;
    }
    setBusy(true);
    try {
      const result = await createBooking({
        serviceId: null,
        serviceNameOverride: serviceName,
        touristName,
        touristPhoneE164: touristPhone || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        partySize: parseInt(partySize, 10) || 1,
        totalCents,
        depositPct: pct,
        currency: "USD",
        lang: "en",
      });
      navigation.replace("BookingShare", {
        bookingId: result.bookingId,
        bookingUrl: result.bookingUrl,
        whatsappMessage: result.whatsappMessage,
        whatsappShareUrl: result.whatsappShareUrl,
      });
    } catch (e) {
      Alert.alert("Couldn't create booking", String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0e1320" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Field label="Tourist name" value={touristName} onChangeText={setTouristName} />
        <Field
          label="Tourist WhatsApp (optional)"
          value={touristPhone}
          onChangeText={setTouristPhone}
          placeholder="+1..."
          keyboardType="phone-pad"
        />
        <Field
          label="Service"
          value={serviceName}
          onChangeText={setServiceName}
          placeholder="Sunset snorkel"
        />
        <Field
          label="When (YYYY-MM-DD HH:mm)"
          value={scheduledAt}
          onChangeText={setScheduledAt}
        />
        <Row>
          <Field
            half
            label="Party size"
            value={partySize}
            onChangeText={setPartySize}
            keyboardType="number-pad"
          />
          <Field
            half
            label="Deposit %"
            value={depositPct}
            onChangeText={setDepositPct}
            keyboardType="number-pad"
          />
        </Row>
        <Field
          label="Total (USD)"
          value={totalDollars}
          onChangeText={setTotalDollars}
          placeholder="240"
          keyboardType="decimal-pad"
        />

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Deposit due now</Text>
          <Text style={styles.previewAmount}>
            {formatMoney(depositCents, "USD")}
          </Text>
        </View>

        <TouchableOpacity style={styles.btn} disabled={busy} onPress={onCreate}>
          <Text style={styles.btnText}>{busy ? "..." : "Create link"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function defaultIso(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{children}</View>;
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad" | "decimal-pad";
  half?: boolean;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, half }: FieldProps) {
  return (
    <View style={[styles.fieldWrap, half ? { flex: 1 } : null]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6a7591"
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 12 },
  label: { color: "#9ba6bf", fontSize: 12, textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: "#161d2f",
    color: "#f4f6fb",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
  },
  previewCard: {
    backgroundColor: "rgba(31,210,140,0.08)",
    borderColor: "rgba(31,210,140,0.3)",
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
  },
  previewLabel: { color: "#9ba6bf", fontSize: 12, textTransform: "uppercase" },
  previewAmount: { color: "#1fd28c", fontSize: 28, fontWeight: "700", marginTop: 4 },
  btn: { backgroundColor: "#1fd28c", padding: 16, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#042116", fontSize: 17, fontWeight: "800" },
});
