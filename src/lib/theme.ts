export const colors = {
  background: "#F4F7F6",
  surface: "#FFFFFF",
  surfaceMuted: "#EDF4F2",
  primary: "#0B7A6B",
  primaryDark: "#075C50",
  primarySoft: "#E2F3EE",
  navy: "#0B2A2A",
  text: "#142F2D",
  textMuted: "#5B6F6B",
  textSoft: "#8A9C98",
  border: "#DFEAE6",
  borderStrong: "#C8D9D4",
  danger: "#B0453B",
  dangerSoft: "#FBEDEA",
  warning: "#8A5A00",
  warningSoft: "#FFF5E1",
  success: "#0F7A50",
  successSoft: "#E4F5EC",
  info: "#2F5DA8",
  infoSoft: "#EAF0FB",
  accent: "#D4A340",
  accentSoft: "#FBF1DD",
  white: "#FFFFFF",
  overlay: "rgba(7, 32, 31, 0.5)",
};

export const gradients = {
  primary: ["#0C7E6E", "#075C50"] as const,
  hero: ["#082B2C", "#0B4A44"] as const,
  signIn: ["#082A2B", "#0B4742"] as const,
  sheet: ["#FFFFFF", "#F1F8F5"] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  pill: 999,
};

export const shadow = {
  shadowColor: "#0A2A33",
  shadowOpacity: 0.07,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 7 },
  elevation: 2,
};

export const shadowLifted = {
  shadowColor: "#082B2C",
  shadowOpacity: 0.1,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};
