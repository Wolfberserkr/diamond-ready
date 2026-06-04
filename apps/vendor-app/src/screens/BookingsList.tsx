import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { supabase } from "../lib/supabase";
import { completeBooking } from "../lib/api";
import { formatMoney } from "@aruba/shared";

type Props = NativeStackScreenProps<RootStackParamList, "BookingsList">;

interface BookingRow {
  id: string;
  short_code: string;
  tourist_name: string;
  service_name: string;
  scheduled_at: string;
  total_cents: number;
  deposit_cents: number;
  currency: "USD" | "AWG";
  status: string;
}

export function BookingsListScreen({ navigation }: Props) {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, short_code, tourist_name, service_name, scheduled_at, total_cents, deposit_cents, currency, status",
      )
      .order("scheduled_at", { ascending: true })
      .limit(100);
    setRows((data ?? []) as BookingRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  async function onComplete(id: string) {
    try {
      await completeBooking(id);
      load();
    } catch (e) {
      Alert.alert("Couldn't mark complete", String(e));
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#9ba6bf" />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={styles.muted}>No bookings yet. Tap "+ New" to create one.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.tourist_name}</Text>
              <Text style={styles.meta}>
                {item.service_name} · {new Date(item.scheduled_at).toLocaleString()}
              </Text>
              <Text style={[styles.meta, { color: statusColor(item.status) }]}>
                {item.status} · {formatMoney(item.total_cents, item.currency)}
              </Text>
            </View>
            {item.status === "paid" && (
              <TouchableOpacity style={styles.smallBtn} onPress={() => onComplete(item.id)}>
                <Text style={styles.smallBtnText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("NewBooking")}
      >
        <Text style={styles.fabText}>+ New</Text>
      </TouchableOpacity>
    </View>
  );
}

function statusColor(s: string): string {
  switch (s) {
    case "pending": return "#f5b942";
    case "paid": return "#1fd28c";
    case "completed": return "#9ba6bf";
    case "canceled":
    case "refunded":
    case "expired": return "#ff6675";
    default: return "#9ba6bf";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e1320" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161d2f",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  name: { color: "#f4f6fb", fontSize: 16, fontWeight: "600" },
  meta: { color: "#9ba6bf", marginTop: 2, fontSize: 13 },
  muted: { color: "#9ba6bf", textAlign: "center", marginTop: 40 },
  smallBtn: {
    backgroundColor: "#1fd28c",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallBtnText: { color: "#042116", fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    backgroundColor: "#1fd28c",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 32,
  },
  fabText: { color: "#042116", fontWeight: "800", fontSize: 16 },
});
