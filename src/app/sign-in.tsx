import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Redirect, router } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "@/context/app";
import { isSupabaseConfigured, requireSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errors";
import {
  Button,
  Card,
  Field,
  Logo,
  Notice,
  Screen,
} from "@/components/ui";
import { colors, gradients, radius, spacing } from "@/lib/theme";

type Mode = "login" | "register";

export default function SignInScreen() {
  const { profile, signIn, signUp } = useApp();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [mode, setMode] = useState<Mode>("login");
  const [registerRole, setRegisterRole] = useState<"nurse" | "institution">("nurse");
  const [fullName, setFullName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [nit, setNit] = useState("");
  const [institutionAddress, setInstitutionAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (profile) {
    return <Redirect href="/(tabs)" />;
  }

  const submit = async () => {
    setError("");
    setNotice("");
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y tu contraseña.");
      return;
    }
    if (mode === "register" && !fullName.trim()) {
      setError(
        registerRole === "institution"
          ? "Ingresa el nombre del responsable de contacto."
          : "Ingresa tu nombre completo."
      );
      return;
    }
    if (mode === "register" && registerRole === "institution" && !institutionName.trim()) {
      setError("Ingresa el nombre o razón social de la institución o clínica.");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (mode === "register" && !acceptedTerms) {
      setError("Debes aceptar los términos y el tratamiento de datos.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        const result = await signUp({
          role: registerRole,
          fullName,
          email,
          password,
          city,
          phone,
          acceptedTerms,
          institutionName: registerRole === "institution" ? institutionName : undefined,
          nit: registerRole === "institution" ? nit : undefined,
          address: registerRole === "institution" ? institutionAddress : undefined,
        });
        if (result.needsConfirmation) {
          setNotice(
            "Te enviamos un enlace de confirmación. Después de confirmar, vuelve a iniciar sesión."
          );
          setMode("login");
          setPassword("");
        }
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    setError("");
    setNotice("");
    if (!email.trim()) {
      setError("Ingresa tu correo para recuperar tu contraseña.");
      return;
    }
    setResetBusy(true);
    try {
      const { error: resetError } = await requireSupabase().auth
        .resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: Linking.createURL("reset-password"),
        });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <Screen contentStyle={[styles.content, isWide && styles.contentWide]}>
      <View style={[styles.layout, isWide && styles.layoutWide]}>
        <LinearGradient
          colors={gradients.signIn}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, isWide && styles.heroWide]}
        >
          <View pointerEvents="none" style={styles.heroOrb} />
          <View pointerEvents="none" style={styles.heroOrbSmall} />
          <Logo light />

          <View style={styles.heroText}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.eyebrow}>TALENTO EN SALUD</Text>
            </View>
            <Text style={[styles.title, isWide && styles.titleWide]}>
              El turno correcto.{"\n"}El profesional ideal.
            </Text>
            <Text style={styles.description}>
              Conectamos clínicas, hospitales y profesionales de enfermería para
              cubrir turnos de forma clara, humana y segura.
            </Text>
          </View>

          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={15}
                color="#B7F0E3"
              />
              <Text style={styles.heroPillText}>Perfiles verificados</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="time-outline" size={15} color="#B7F0E3" />
              <Text style={styles.heroPillText}>Turnos en tu ciudad</Text>
            </View>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#B7F0E3"
              />
            </View>
            <Text style={styles.trustText}>
              Instituciones y profesionales verificados en un solo lugar.
            </Text>
          </View>
        </LinearGradient>

        <View style={[styles.formColumn, isWide && styles.formColumnWide]}>
          {!isSupabaseConfigured && (
            <Notice
              tone="warning"
              title="Supabase aún no está configurado"
              icon="construct-outline"
            >
              Crea el archivo .env con tus credenciales y reinicia la app para
              usar cuentas reales.
            </Notice>
          )}

          {isSupabaseConfigured && (
            <Card style={[styles.formCard, isWide && styles.formCardWide]}>
              <View style={styles.segment}>
                <Pressable
                  onPress={() => {
                    setMode("login");
                    setError("");
                  }}
                  style={[
                    styles.segmentItem,
                    mode === "login" && styles.segmentItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      mode === "login" && styles.segmentTextActive,
                    ]}
                  >
                    Ingresar
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMode("register");
                    setError("");
                  }}
                  style={[
                    styles.segmentItem,
                    mode === "register" && styles.segmentItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      mode === "register" && styles.segmentTextActive,
                    ]}
                  >
                    Crear cuenta
                  </Text>
                </Pressable>
              </View>

              <View style={styles.formHeading}>
                <Text style={styles.formTitle}>
                  {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
                </Text>
                <Text style={styles.formSubtitle}>
                  {mode === "login"
                    ? "Ingresa con el correo registrado en NURSELINK."
                    : registerRole === "institution"
                      ? "Registra tu clínica, hospital o centro asistencial para publicar turnos y convocar personal."
                      : "Regístrate como profesional de enfermería para acceder a turnos y coberturas en tu ciudad."}
                </Text>
              </View>

              {mode === "register" && (
                <View style={styles.rolePickerBox}>
                  <Text style={styles.rolePickerLabel}>Tipo de cuenta</Text>
                  <View style={styles.rolePickerRow}>
                    <Pressable
                      onPress={() => setRegisterRole("nurse")}
                      style={[
                        styles.rolePickerBtn,
                        registerRole === "nurse" && styles.rolePickerBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="medkit-outline"
                        size={18}
                        color={
                          registerRole === "nurse"
                            ? colors.primaryDark
                            : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.rolePickerBtnText,
                          registerRole === "nurse" &&
                            styles.rolePickerBtnTextActive,
                        ]}
                      >
                        Enfermera(o)
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setRegisterRole("institution")}
                      style={[
                        styles.rolePickerBtn,
                        registerRole === "institution" &&
                          styles.rolePickerBtnActive,
                      ]}
                    >
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color={
                          registerRole === "institution"
                            ? colors.primaryDark
                            : colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.rolePickerBtnText,
                          registerRole === "institution" &&
                            styles.rolePickerBtnTextActive,
                        ]}
                      >
                        Clínica / Institución
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {mode === "register" && registerRole === "institution" && (
                <>
                  <Field
                    label="Nombre de la clínica / institución"
                    value={institutionName}
                    onChangeText={setInstitutionName}
                    placeholder="Clínica del Caribe o Hospital San Gabriel"
                    autoCapitalize="words"
                    left={
                      <Ionicons
                        name="business-outline"
                        size={18}
                        color={colors.textSoft}
                      />
                    }
                    required
                  />
                  <Field
                    label="NIT de la institución"
                    value={nit}
                    onChangeText={setNit}
                    placeholder="900.123.456-7"
                    left={
                      <Ionicons
                        name="document-text-outline"
                        size={18}
                        color={colors.textSoft}
                      />
                    }
                  />
                  <Field
                    label="Dirección de la sede"
                    value={institutionAddress}
                    onChangeText={setInstitutionAddress}
                    placeholder="Calle 45 # 22-10"
                    left={
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={colors.textSoft}
                      />
                    }
                  />
                </>
              )}

              {mode === "register" && (
                <Field
                  label={
                    registerRole === "institution"
                      ? "Nombre del responsable de contacto"
                      : "Nombre completo"
                  }
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={
                    registerRole === "institution"
                      ? "Carlos Pérez (Coordinador médico)"
                      : "Ana Lucía Gómez"
                  }
                  autoCapitalize="words"
                  left={
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={colors.textSoft}
                    />
                  }
                  required
                />
              )}

              <Field
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                left={
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={colors.textSoft}
                  />
                }
                required
              />

              <Field
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 8 caracteres"
                secureTextEntry={!showPassword}
                autoComplete="password"
                left={
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={colors.textSoft}
                  />
                }
                right={
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={19}
                      color={colors.textSoft}
                    />
                  </Pressable>
                }
                required
              />

              {mode === "login" && (
                <Pressable
                  onPress={forgotPassword}
                  disabled={resetBusy}
                  style={styles.forgotLink}
                >
                  <Text style={styles.forgotLinkText}>
                    {resetBusy
                      ? "Enviando enlace..."
                      : "¿Olvidaste tu contraseña?"}
                  </Text>
                </Pressable>
              )}

              {mode === "register" && (
                <>
                  <Field
                    label="Ciudad"
                    value={city}
                    onChangeText={setCity}
                    placeholder="Cartagena"
                    autoCapitalize="words"
                    left={
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={colors.textSoft}
                      />
                    }
                  />
                  <Field
                    label="Teléfono"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+57 300 000 0000"
                    keyboardType="phone-pad"
                    left={
                      <Ionicons
                        name="call-outline"
                        size={18}
                        color={colors.textSoft}
                      />
                    }
                  />
                  <Pressable
                    onPress={() => setAcceptedTerms((current) => !current)}
                    style={styles.consentRow}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        acceptedTerms && styles.checkboxActive,
                      ]}
                    >
                      {acceptedTerms ? (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.white}
                        />
                      ) : null}
                    </View>
                    <Text style={styles.consentText}>
                      Acepto los{" "}
                      <Text
                        style={styles.consentLink}
                        onPress={() => router.push("/terms")}
                      >
                        términos y condiciones
                      </Text>{" "}
                      y el tratamiento de mis datos personales.
                    </Text>
                  </Pressable>
                </>
              )}

              {error ? (
                <Notice tone="danger" icon="alert-circle-outline">
                  {error}
                </Notice>
              ) : null}

              {notice ? (
                <Notice tone="success" icon="mail-outline">
                  {notice}
                </Notice>
              ) : null}

              {resetSent ? (
                <Notice tone="success" icon="mail-outline">
                  Revisa tu correo. Te enviamos un enlace para restablecer tu
                  contraseña.
                </Notice>
              ) : null}

              <Button
                label={mode === "login" ? "Iniciar sesión" : "Crear mi cuenta"}
                onPress={submit}
                loading={busy}
                icon={mode === "login" ? "log-in-outline" : "person-add-outline"}
              />

              <Pressable
                onPress={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                  setNotice("");
                }}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>
                  {mode === "login"
                    ? "¿No tienes cuenta? "
                    : "¿Ya tienes cuenta? "}
                  <Text style={styles.switchLinkAction}>
                    {mode === "login" ? "Crea una cuenta" : "Inicia sesión"}
                  </Text>
                </Text>
              </Pressable>
            </Card>
          )}

          <View style={styles.footerRow}>
            <Ionicons
              name="lock-closed-outline"
              size={13}
              color={colors.textSoft}
            />
            <Text style={styles.footer}>
              Tratamos tus datos de forma responsable. NURSELINK no reemplaza los
              procesos de contratación ni la verificación documental de cada
              institución.
            </Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 0,
    maxWidth: 1120,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  contentWide: { paddingTop: spacing.xxl, paddingBottom: 48 },
  layout: { width: "100%", gap: spacing.lg },
  layoutWide: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.xxl,
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: 22,
    gap: spacing.xxl,
    overflow: "hidden",
    justifyContent: "space-between",
  },
  heroWide: {
    flex: 1.05,
    minHeight: 660,
    padding: spacing.xxxl,
    borderRadius: 30,
  },
  heroOrb: {
    position: "absolute",
    top: -92,
    right: -74,
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: "rgba(143, 227, 212, 0.1)",
  },
  heroOrbSmall: {
    position: "absolute",
    bottom: -100,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255, 255, 255, 0.045)",
  },
  heroText: { gap: 14, maxWidth: 520 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyebrowLine: {
    width: 19,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: "#8FE3D4",
  },
  eyebrow: {
    color: "#8FE3D4",
    fontWeight: "800",
    fontSize: 10.5,
    letterSpacing: 1.8,
  },
  title: {
    color: colors.white,
    fontSize: 31,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  titleWide: {
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1.4,
  },
  description: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 440,
  },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  heroPillText: {
    color: "#D8F7F0",
    fontSize: 11,
    fontWeight: "700",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: spacing.lg,
  },
  trustIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustText: {
    flex: 1,
    color: "rgba(255, 255, 255, 0.58)",
    fontSize: 11,
    lineHeight: 16,
    paddingTop: 2,
  },
  formColumn: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    gap: spacing.md,
  },
  formColumnWide: {
    width: 440,
    maxWidth: 440,
    flexShrink: 0,
    justifyContent: "center",
  },
  formCard: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 24,
  },
  formCardWide: { padding: spacing.xxl },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
    shadowColor: "#0A2A33",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentText: {
    color: colors.textMuted,
    fontWeight: "700",
    fontSize: 12.5,
  },
  segmentTextActive: { color: colors.primaryDark },
  formHeading: { gap: 5, marginTop: 2, marginBottom: 2 },
  formTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.45,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 18.5,
  },
  switchLink: { alignItems: "center", paddingTop: spacing.xs },
  switchLinkText: { color: colors.textMuted, fontSize: 12.5 },
  switchLinkAction: { color: colors.primary, fontWeight: "800" },
  forgotLink: { alignSelf: "flex-end", marginTop: -4 },
  forgotLinkText: { color: colors.primary, fontSize: 11.5, fontWeight: "700" },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17.5,
  },
  consentLink: { color: colors.primary, fontWeight: "800" },
  rolePickerBox: {
    gap: 6,
    marginBottom: 2,
  },
  rolePickerLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.15,
  },
  rolePickerRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rolePickerBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rolePickerBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rolePickerBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: colors.textMuted,
  },
  rolePickerBtnTextActive: {
    color: colors.primaryDark,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingHorizontal: 4,
  },
  footer: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 10.5,
    lineHeight: 16,
  },
});
