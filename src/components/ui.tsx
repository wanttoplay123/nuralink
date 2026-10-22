import { useState, type ComponentProps, type ReactNode } from "react";
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
import {
  colors,
  gradients,
  radius,
  shadow,
  shadowLifted,
  spacing,
} from "@/lib/theme";
import { initials, verificationLabel } from "@/lib/format";
import type {
  ApplicationStatus,
  ShiftStatus,
  VerificationStatus,
} from "@/types";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function Logo({
  compact = false,
  light = false,
}: {
  compact?: boolean;
  light?: boolean;
}) {
  return (
    <View style={styles.logoRow} accessibilityLabel="NURSELINK">
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.logoMark, compact && styles.logoMarkSmall]}
      >
        <View style={styles.logoMarkInner}>
          <Text style={[styles.logoCross, compact && styles.logoCrossSmall]}>
            +
          </Text>
        </View>
      </LinearGradient>
      <View>
        <Text
          style={[
            styles.logoText,
            light && styles.logoTextLight,
            compact && styles.logoTextSmall,
          ]}
        >
          {"NURSE"}
          <Text
            style={[
              styles.logoTextAccent,
              light && styles.logoTextAccentLight,
            ]}
          >
            {"LINK"}
          </Text>
        </Text>
        {!compact && (
          <Text style={[styles.logoTagline, light && styles.logoTaglineLight]}>
            Talento que cuida.
          </Text>
        )}
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
        variant === "primary" && styles.buttonPrimary,
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
  left?: ReactNode;
  right?: ReactNode;
};

export function Field({
  label,
  error,
  hint,
  required,
  left,
  right,
  style,
  multiline,
  onFocus,
  onBlur,
  ...props
}: FieldProps) {
  const [focused, setFocused] = useState(false);

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
          focused && styles.inputWrapFocused,
          error && styles.inputWrapError,
        ]}
      >
        {left ? (
          <View
            style={[
              styles.fieldIcon,
              multiline && styles.fieldIconMultiline,
            ]}
          >
            {left}
          </View>
        ) : null}
        <TextInput
          {...props}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={colors.textSoft}
          selectionColor={colors.primary}
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
      <View style={styles.noticeIcon}>
        <Ionicons
          name={icon ?? "information-circle-outline"}
          size={18}
          color={selected.color}
        />
      </View>
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
      <View style={styles.emptyHalo} />
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIcon}>
          <Ionicons name={icon} size={28} color={colors.primary} />
        </View>
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
    <LinearGradient
      colors={gradients.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>
        {initials(name)}
      </Text>
    </LinearGradient>
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
    width: "100%",
    maxWidth: 820,
    alignSelf: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  screenFill: { flex: 1 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 15,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
  },
  logoMarkSmall: { width: 36, height: 36, borderRadius: 12, padding: 3 },
  logoMarkInner: {
    flex: 1,
    width: "100%",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoCross: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "400",
    lineHeight: 30,
  },
  logoCrossSmall: { fontSize: 21, lineHeight: 23 },
  logoText: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: 1.1,
  },
  logoTextLight: { color: colors.white },
  logoTextAccent: { color: colors.primary },
  logoTextAccentLight: { color: "#8FE3D4" },
  logoTextSmall: { fontSize: 15, letterSpacing: 0.8 },
  logoTagline: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.45,
    marginTop: 1,
  },
  logoTaglineLight: { color: "rgba(255,255,255,0.62)" },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  buttonPrimary: { ...shadowLifted },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
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
  buttonDisabled: { opacity: 0.5, shadowOpacity: 0 },
  buttonPressed: { opacity: 0.84, transform: [{ scale: 0.995 }] },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  buttonText: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.15,
  },
  buttonTextSmall: { fontSize: 12.5 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.997 }] },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitleText: { flex: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18,
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
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1.7,
  },
  screenHeaderTitle: {
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.55,
    marginTop: 5,
  },
  screenHeaderSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19.5,
    marginTop: 5,
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
  badgeText: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.1 },
  field: { gap: 6 },
  fieldLabel: {
    color: colors.navy,
    fontWeight: "700",
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  required: { color: colors.danger },
  inputWrap: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    gap: 9,
  },
  inputWrapMultiline: { alignItems: "flex-start", paddingVertical: 10 },
  inputWrapFocused: {
    borderColor: colors.primary,
    backgroundColor: "#FBFEFD",
    shadowColor: colors.primary,
    shadowOpacity: 0.09,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  inputWrapError: { borderColor: colors.danger, backgroundColor: "#FFFBFA" },
  fieldIcon: { alignItems: "center", justifyContent: "center" },
  fieldIconMultiline: { paddingTop: 4 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14.5,
    paddingVertical: 13,
    paddingHorizontal: 0,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top", paddingTop: 3 },
  fieldError: { color: colors.danger, fontSize: 11.5, lineHeight: 16 },
  fieldHint: { color: colors.textMuted, fontSize: 11.5, lineHeight: 16 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 13,
  },
  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeBody: { flex: 1, gap: 2, paddingTop: 1 },
  noticeTitle: { fontWeight: "800", fontSize: 12.5, letterSpacing: 0.05 },
  noticeText: { fontSize: 12.5, lineHeight: 18.5 },
  empty: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...shadow,
  },
  emptyHalo: {
    position: "absolute",
    top: -112,
    right: -66,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.primarySoft,
    opacity: 0.62,
  },
  emptyIconOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: colors.navy,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  emptyDescription: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 19,
    textAlign: "center",
    maxWidth: 330,
  },
  emptyAction: { marginTop: spacing.sm, alignSelf: "stretch" },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.82)",
  },
  avatarText: { color: colors.white, fontWeight: "800", letterSpacing: 0.3 },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  loadingBlock: {
    paddingVertical: 36,
    alignItems: "center",
    gap: spacing.sm,
  },
  loadingText: { color: colors.textMuted, fontSize: 12.5 },
});
