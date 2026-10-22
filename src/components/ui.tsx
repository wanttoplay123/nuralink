import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, gradients, radius, shadow, spacing } from "@/lib/theme";
import { initials, verificationLabel } from "@/lib/format";
import type {
  ApplicationStatus,
  ShiftStatus,
  VerificationStatus,
} from "@/types";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.logoMark, compact && styles.logoMarkSmall]}
      >
        <Text style={[styles.logoCross, compact && styles.logoCrossSmall]}>
          +
        </Text>
      </LinearGradient>
      <View>
        <Text style={[styles.logoText, compact && styles.logoTextSmall]}>
          NURSELINK
        </Text>
        {!compact && <Text style={styles.logoTagline}>Talento que cuida.</Text>}
      </View>
    </View>
  );
}

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ComponentProps<typeof SafeAreaView>["edges"];
};

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  contentStyle,
  edges = ["top", "left", "right"],
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      nestedScrollEnabled
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.screenFill, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {body}
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft" | "light";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  small = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const textColor =
    variant === "primary"
      ? colors.white
      : variant === "danger"
        ? colors.danger
        : variant === "ghost"
          ? colors.textMuted
          : variant === "light"
            ? colors.primaryDark
            : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        variant === "danger" && styles.buttonDanger,
        variant === "soft" && styles.buttonSoft,
        variant === "light" && styles.buttonLight,
        small && styles.buttonSmall,
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
          <Text
            style={[
              styles.buttonText,
              { color: textColor },
              small && styles.buttonTextSmall,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.screenHeaderRow}>
      <View style={styles.screenHeaderText}>
        <Text style={styles.screenHeaderEyebrow}>{eyebrow}</Text>
        <Text style={styles.screenHeaderTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.screenHeaderSubtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export function Badge({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
}) {
  const palette: Record<BadgeTone, { background: string; color: string }> = {
    neutral: { background: "#EDF2F3", color: colors.textMuted },
    success: { background: colors.successSoft, color: colors.success },
    warning: { background: colors.warningSoft, color: colors.warning },
    danger: { background: colors.dangerSoft, color: colors.danger },
    info: { background: colors.infoSoft, color: colors.info },
  };
  const selected = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: selected.background }]}>
      {icon ? (
        <Ionicons name={icon} size={12} color={selected.color} />
      ) : null}
      <Text style={[styles.badgeText, { color: selected.color }]}>
        {label}
      </Text>
    </View>
  );
}

export function VerificationBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  return (
    <Badge
      label={verificationLabel(status)}
      tone={
        status === "verified"
          ? "success"
          : status === "rejected"
            ? "danger"
            : "warning"
      }
      icon={
        status === "verified"
          ? "checkmark-circle-outline"
          : status === "rejected"
            ? "close-circle-outline"
            : "time-outline"
      }
    />
  );
}

export function ApplicationStatusBadge({
  status,
}: {
  status: ApplicationStatus;
}) {
  const labels: Record<ApplicationStatus, string> = {
    pending: "Pendiente",
    reviewing: "En revisión",
    accepted: "Aceptada",
    rejected: "Rechazada",
    withdrawn: "Retirada",
  };
  const tones: Record<ApplicationStatus, BadgeTone> = {
    pending: "warning",
    reviewing: "info",
    accepted: "success",
    rejected: "danger",
    withdrawn: "neutral",
  };
  return <Badge label={labels[status]} tone={tones[status]} />;
}

export function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const labels: Record<ShiftStatus, string> = {
    draft: "Borrador",
    open: "Abierto",
    covered: "Cubierto",
    cancelled: "Cancelado",
  };
  const tones: Record<ShiftStatus, BadgeTone> = {
    draft: "neutral",
    open: "success",
    covered: "info",
    cancelled: "danger",
  };
  return <Badge label={labels[status]} tone={tones[status]} />;
}

type FieldProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  right?: ReactNode;
};

export function Field({
  label,
  error,
  hint,
  required,
  right,
  style,
  multiline,
  ...props
}: FieldProps) {
  return (
    <View style={styles.field}>
      {label ? (
        <Text style={styles.fieldLabel}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          error && styles.inputWrapError,
        ]}
      >
        <TextInput
          {...props}
          multiline={multiline}
          placeholderTextColor={colors.textSoft}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            style,
          ]}
        />
        {right}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
  icon,
}: {
  tone?: BadgeTone;
  title?: string;
  children: ReactNode;
  icon?: IconName;
}) {
  const palette: Record<
    BadgeTone,
    { background: string; border: string; color: string }
  > = {
    neutral: {
      background: "#F1F5F6",
      border: colors.border,
      color: colors.textMuted,
    },
    success: {
      background: colors.successSoft,
      border: "#B9E3D3",
      color: colors.success,
    },
    warning: {
      background: colors.warningSoft,
      border: "#F2D79A",
      color: colors.warning,
    },
    danger: {
      background: colors.dangerSoft,
      border: "#EFC4C4",
      color: colors.danger,
    },
    info: {
      background: colors.infoSoft,
      border: "#C7D6F7",
      color: colors.info,
    },
  };
  const selected = palette[tone];
  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: selected.background, borderColor: selected.border },
      ]}
    >
      <Ionicons
        name={icon ?? "information-circle-outline"}
        size={20}
        color={selected.color}
      />
      <View style={styles.noticeBody}>
        {title ? (
          <Text style={[styles.noticeTitle, { color: selected.color }]}>
            {title}
          </Text>
        ) : null}
        {typeof children === "string" ? (
          <Text style={[styles.noticeText, { color: selected.color }]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

export function Avatar({
  name,
  size = 44,
}: {
  name: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

export function Row({
  children,
  gap = spacing.sm,
  style,
}: {
  children: ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function LoadingBlock({ label = "Cargando..." }: { label?: string }) {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screenScroll: { flex: 1 },
  screenContent: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  screenFill: { flex: 1 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkSmall: { width: 34, height: 34, borderRadius: 11 },
  logoCross: { color: colors.white, fontSize: 30, fontWeight: "700", lineHeight: 34 },
  logoCrossSmall: { fontSize: 23, lineHeight: 26 },
  logoText: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: 0.4,
  },
  logoTextSmall: { fontSize: 16 },
  logoTagline: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonGhost: { backgroundColor: "transparent", minHeight: 42 },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonSoft: { backgroundColor: colors.primarySoft },
  buttonLight: { backgroundColor: colors.white },
  buttonSmall: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.82 },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buttonText: { fontSize: 15, fontWeight: "700" },
  buttonTextSmall: { fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  cardPressed: { opacity: 0.9 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitleText: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.navy },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  screenHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  screenHeaderText: { flex: 1 },
  screenHeaderEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  screenHeaderTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 4,
  },
  screenHeaderSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  field: { gap: 6 },
  fieldLabel: { color: colors.navy, fontWeight: "700", fontSize: 13 },
  required: { color: colors.danger },
  inputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
  },
  inputWrapMultiline: { alignItems: "flex-start", paddingVertical: spacing.sm },
  inputWrapError: { borderColor: colors.danger },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" },
  fieldError: { color: colors.danger, fontSize: 12 },
  fieldHint: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeBody: { flex: 1, gap: 2 },
  noticeTitle: { fontWeight: "800", fontSize: 13 },
  noticeText: { fontSize: 13, lineHeight: 19 },
  empty: {
    alignItems: "center",
    paddingVertical: 34,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  emptyAction: { marginTop: spacing.sm, alignSelf: "stretch" },
  avatar: {
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primaryDark, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  loadingBlock: {
    paddingVertical: 36,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontSize: 13 },
});
