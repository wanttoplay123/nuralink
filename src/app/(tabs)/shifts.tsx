import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/app";
import {
  Badge,
  Button,
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

      <Card style={styles.filterCard}>
        <Field
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por institución, servicio o ciudad..."
          autoCapitalize="none"
          left={
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textSoft}
            />
          }
          right={
            search ? (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textSoft}
                />
              </Pressable>
            ) : undefined
          }
        />

        {shifts.length > 0 ? (
          <View style={styles.chips}>
            {cities.map((item) => {
              const active = item === city;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCity(item)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Card>

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
          title={
            shifts.length === 0 ? "Aún no hay turnos" : "Sin coincidencias"
          }
          description={
            shifts.length === 0
              ? "Las instituciones verificadas publicarán sus oportunidades aquí. Vuelve pronto o revisa tu perfil mientras tanto."
              : "Prueba con otra ciudad o cambia el término de búsqueda."
          }
          action={
            profile?.role === "institution" && shifts.length === 0 ? (
              <Button
                label="Publicar un turno"
                icon="add-circle-outline"
                onPress={() => router.push("/(tabs)/institution")}
              />
            ) : undefined
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
          <View style={styles.cityRow}>
            <Ionicons
              name="location-outline"
              size={11}
              color={colors.textSoft}
            />
            <Text style={styles.city} numberOfLines={1}>
              {shift.city}
            </Text>
          </View>
        </View>
        <Badge
          label={shift.fulfillment_mode === "managed" ? "Gestionado" : "Directo"}
          tone={shift.fulfillment_mode === "managed" ? "info" : "neutral"}
        />
      </View>

      <Text style={styles.shiftTitle}>{shift.title}</Text>

      <View style={styles.servicePill}>
        <Ionicons name="medkit-outline" size={12} color={colors.primaryDark} />
        <Text style={styles.service}>{shift.service}</Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaTile}>
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <View style={styles.metaTextWrap}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaText}>{formatDate(shift.starts_at)}</Text>
          </View>
        </View>
        <View style={styles.metaTile}>
          <Ionicons name="time-outline" size={15} color={colors.primary} />
          <View style={styles.metaTextWrap}>
            <Text style={styles.metaLabel}>Horario</Text>
            <Text style={styles.metaText}>
              {formatTime(shift.starts_at)} – {formatTime(shift.ends_at)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.payLabel}>Remuneración</Text>
          <Text style={styles.pay}>{formatCurrency(shift.payment_amount)}</Text>
        </View>
        <View style={styles.detailLink}>
          <Text style={styles.detailText}>Ver detalle</Text>
          <View style={styles.detailArrow}>
            <Ionicons
              name="arrow-forward-outline"
              size={14}
              color={colors.primaryDark}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  filterCard: { gap: spacing.md, padding: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 11.5, fontWeight: "700", color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  list: { gap: spacing.md },
  card: { gap: 9, padding: 17 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  institutionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTopText: { flex: 1 },
  institution: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.1,
  },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  city: { fontSize: 10.5, color: colors.textSoft },
  shiftTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.35,
    marginTop: 3,
  },
  servicePill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  service: { color: colors.primaryDark, fontSize: 10.5, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 3,
  },
  metaTile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  metaTextWrap: { flex: 1, gap: 1 },
  metaLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.textSoft,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metaText: { fontSize: 10.5, color: colors.text, fontWeight: "600" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: 3,
  },
  payLabel: {
    fontSize: 9.5,
    color: colors.textSoft,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pay: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.primaryDark,
    letterSpacing: -0.4,
    marginTop: 1,
  },
  detailLink: { flexDirection: "row", alignItems: "center", gap: 7 },
  detailText: { color: colors.primaryDark, fontSize: 11.5, fontWeight: "800" },
  detailArrow: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
