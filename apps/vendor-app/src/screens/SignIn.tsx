import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { supabase } from "../lib/supabase";

export function SignInScreen() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"enter_phone" | "enter_otp">("enter_phone");
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      Alert.alert("Phone format", "Use international format, e.g. +2975551234");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) {
      Alert.alert("Couldn't send code", error.message);
      return;
    }
    setStage("enter_otp");
  }

  async function verifyOtp() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setBusy(false);
    if (error) Alert.alert("Invalid code", error.message);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.muted}>
          {stage === "enter_phone"
            ? "Enter your WhatsApp number to receive a code."
            : "Enter the 6-digit code we sent."}
        </Text>
        {stage === "enter_phone" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="+2975551234"
              placeholderTextColor="#6a7591"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
            <TouchableOpacity style={styles.btn} disabled={busy} onPress={sendOtp}>
              <Text style={styles.btnText}>Send code</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="123456"
              placeholderTextColor="#6a7591"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              autoFocus
            />
            <TouchableOpacity style={styles.btn} disabled={busy} onPress={verifyOtp}>
              <Text style={styles.btnText}>Verify</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e1320", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#161d2f", padding: 20, borderRadius: 16 },
  title: { color: "#f4f6fb", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  muted: { color: "#9ba6bf", marginBottom: 16 },
  input: {
    backgroundColor: "#0e1320",
    color: "#f4f6fb",
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  btn: { backgroundColor: "#1fd28c", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#042116", fontSize: 16, fontWeight: "700" },
});
