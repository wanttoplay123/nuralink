export const colors = {
  background: "#F2F7F8",
  surface: "#FFFFFF",
  surfaceMuted: "#EAF3F2",
  primary: "#0A8F85",
  primaryDark: "#04665E",
  primarySoft: "#D8F1EC",
  navy: "#0F2433",
  text: "#132735",
  textMuted: "#5B6F7C",
  textSoft: "#8A9AA3",
  border: "#DCE7EA",
  borderStrong: "#C6D6DC",
  danger: "#B23B3B",
  dangerSoft: "#FBE9E9",
  warning: "#976400",
  warningSoft: "#FFF3D9",
  success: "#21755B",
  successSoft: "#E1F4EC",
  info: "#2E5AAC",
  infoSoft: "#E7EEFF",
  white: "#FFFFFF",
  overlay: "rgba(10, 32, 40, 0.45)",
};

export const gradients = {
  primary: ["#0A8F85", "#04665E"] as const,
  hero: ["#12384C", "#0A8F85"] as const,
  signIn: ["#FFFFFF", "#E9F6F3"] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadow = {
  shadowColor: "#0A2A33",
  shadowOpacity: 0.1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
