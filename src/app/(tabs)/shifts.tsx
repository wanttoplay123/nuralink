import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  LoadingBlock,
  Notice,
  Screen,
  ScreenHeader,
  SectionTitle,
} from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import {
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/format";
import { colors, radius, spacing } from "@/lib/theme";
import type { Shift } from "@/types";

export default function ShiftsScreen() {
  const { api, profile } = useApp();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!api) return;
    setError("");
    try {
      setShifts(await api.getAvailableShifts());
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const cities = useMemo(() => {
    const unique = Array.from(new Set(shifts.map((shift) => shift.city)));
    return ["Todas", ...unique.sort((a, b) => a.localeCompare(b))];
  }, [shifts]);

  const visibleShifts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return shifts.filter((shift) => {
      const matchesCity = city === "Todas" || shift.city === city;
      const haystack = [
        shift.title,
        shift.service,
        shift.city,
        shift.institution?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return matchesCity && (!term || haystack.includes(term));
    });
  }, [city, search, shifts]);

  return (
    <Screen refreshing={loading} onRefresh={load}>
      <ScreenHeader
        eyebrow="OPORTUNIDADES"
        title="Turnos disponibles"
        subtitle="Oportunidades futuras de instituciones verificadas. Revisa requisitos, horario y remuneración antes de postularte."
      />

      {profile?.role === "nurse" ? (
        <Notice tone="info" icon="shield-checkmark-outline">
          Solo puedes postularte si tu perfil profesional está verificado. Si
          aún está pendiente, puedes explorar los turnos mientras termina la
          revisión.
        </Notice>
      ) : null}

      <Field
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar por institución, servicio o ciudad..."
        autoCapitalize="none"
        right={
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.textSoft}
          />
        }
      />

      <View style={styles.chips}>
        {cities.map((item) => {
          const active = item === city;
          return (
            <Pressable
              key={item}
              onPress={() => setCity(item)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}

      {loading && shifts.length === 0 ? (
        <LoadingBlock label="Buscando turnos..." />
      ) : visibleShifts.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No encontramos turnos"
          description={
            shifts.length === 0
              ? "Cuando una institución verificada publique un turno, aparecerá aquí."
              : "Prueba con otra ciudad o cambia el término de búsqueda."
          }
        />
      ) : (
        <View style={styles.list}>
          <SectionTitle
            title={`${visibleShifts.length} turno${visibleShifts.length === 1 ? "" : "s"}`}
            subtitle="Toca una tarjeta para ver el detalle completo."
          />
          {visibleShifts.map((shift) => (
            <ShiftCard
              key={shift.id}
              shift={shift}
              onPress={() => router.push(`/shift/${shift.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ShiftCard({
  shift,
  onPress,
}: {
  shift: Shift;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.institutionIcon}>
          <Ionicons name="business-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.cardTopText}>
          <Text style={styles.institution} numberOfLines={1}>
            {shift.institution?.name ?? "Institución de salud"}
          </Text>
          <Text style={styles.city}>
            <Ionicons name="location-outline" size={12} /> {shift.city}
          </Text>
        </View>
        <Badge
          label={shift.fulfillment_mode === "managed" ? "Gestionado" : "Directo"}
          tone={shift.fulfillment_mode === "managed" ? "info" : "neutral"}
        />
      </View>

      <Text style={styles.shiftTitle}>{shift.title}</Text>
      <Text style={styles.service}>{shift.service}</Text>

      <View style={styles.metaRow}>
        <View style={styles.meta}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
          <Text style={styles.metaText}>{formatDate(shift.starts_at)}</Text>
        </View>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {formatTime(shift.starts_at)} – {formatTime(shift.ends_at)}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.payLabel}>Remuneración</Text>
          <Text style={styles.pay}>{formatCurrency(shift.payment_amount)}</Text>
        </View>
        <View style={styles.detailLink}>
          <Text style={styles.detailText}>Ver detalle</Text>
          <Ionicons
            name="arrow-forward-outline"
            size={16}
            color={colors.primary}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: colors.white },
  list: { gap: spacing.md },
  card: { gap: spacing.sm },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  institutionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTopText: { flex: 1 },
  institution: { fontSize: 14, fontWeight: "800", color: colors.navy },
  city: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  shiftTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
    marginTop: spacing.xs,
  },
  service: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 11, color: colors.textMuted },
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  payLabel: { fontSize: 10, color: colors.textSoft, fontWeight: "700" },
  pay: { fontSize: 18, fontWeight: "800", color: colors.primaryDark },
  detailLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
});
