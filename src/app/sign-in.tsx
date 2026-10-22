import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
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
  const [error, setError] = useState("");

  if (profile) {
    return <Redirect href="/(tabs)" />;
  }

  const submit = async () => {
    setError("");
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
          Alert.alert(
            "Revisa tu correo",
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
    <Screen contentStyle={styles.content}>
      <LinearGradient
        colors={gradients.signIn}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Logo />
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>PLATAFORMA DE TALENTO EN SALUD</Text>
          <Text style={styles.title}>
            El turno correcto.{"\n"}El profesional ideal.
          </Text>
          <Text style={styles.description}>
            Conectamos clínicas, hospitales y profesionales de enfermería para
            cubrir turnos de forma clara y segura.
          </Text>
        </View>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={colors.primaryDark}
            />
            <Text style={styles.heroPillText}>Perfiles verificados</Text>
          </View>
          <View style={styles.heroPill}>
            <Ionicons
              name="time-outline"
              size={15}
              color={colors.primaryDark}
            />
            <Text style={styles.heroPillText}>Turnos en tu ciudad</Text>
          </View>
        </View>
      </LinearGradient>

      {!isSupabaseConfigured && (
        <Notice tone="warning" title="Supabase aún no está configurado" icon="construct-outline">
          Crea el archivo .env con tus credenciales y reinicia la app para usar
          cuentas reales.
        </Notice>
      )}

      {isSupabaseConfigured && (
        <Card style={styles.formCard}>
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

          {mode === "register" && (
            <View style={styles.rolePickerBox}>
              <Text style={styles.rolePickerLabel}>Tipo de cuenta:</Text>
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
                    color={registerRole === "nurse" ? colors.primaryDark : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.rolePickerBtnText,
                      registerRole === "nurse" && styles.rolePickerBtnTextActive,
                    ]}
                  >
                    Enfermera(o)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setRegisterRole("institution")}
                  style={[
                    styles.rolePickerBtn,
                    registerRole === "institution" && styles.rolePickerBtnActive,
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={registerRole === "institution" ? colors.primaryDark : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.rolePickerBtnText,
                      registerRole === "institution" && styles.rolePickerBtnTextActive,
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
                placeholder="Ej. Clínica del Caribe o Hospital San Gabriel"
                autoCapitalize="words"
                required
              />
              <Field
                label="NIT de la institución"
                value={nit}
                onChangeText={setNit}
                placeholder="900.123.456-7"
              />
              <Field
                label="Dirección de la sede"
                value={institutionAddress}
                onChangeText={setInstitutionAddress}
                placeholder="Calle 45 # 22-10"
              />
            </>
          )}

          {mode === "register" && (
            <Field
              label={registerRole === "institution" ? "Nombre del responsable de contacto" : "Nombre completo"}
              value={fullName}
              onChangeText={setFullName}
              placeholder={registerRole === "institution" ? "Carlos Pérez (Coordinador médico)" : "Ana Lucía Gómez"}
              autoCapitalize="words"
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
            required
          />

          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            required
          />

          {mode === "login" && (
            <Pressable
              onPress={forgotPassword}
              disabled={resetBusy}
              style={styles.forgotLink}
            >
              <Text style={styles.forgotLinkText}>
                {resetBusy ? "Enviando enlace..." : "¿Olvidaste tu contraseña?"}
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
              />
              <Field
                label="Teléfono"
                value={phone}
                onChangeText={setPhone}
                placeholder="+57 300 000 0000"
                keyboardType="phone-pad"
              />
              <Pressable
                onPress={() => setAcceptedTerms((current) => !current)}
                style={styles.consentRow}
              >
                <Ionicons
                  name={acceptedTerms ? "checkbox" : "square-outline"}
                  size={20}
                  color={acceptedTerms ? colors.primary : colors.textSoft}
                />
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
            }}
            style={styles.switchLink}
          >
            <Text style={styles.switchLinkText}>
              {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
              <Text style={styles.switchLinkAction}>
                {mode === "login" ? "Crea una cuenta" : "Inicia sesión"}
              </Text>
            </Text>
          </Pressable>
        </Card>
      )}

      <Text style={styles.footer}>
        Al continuar aceptas el tratamiento responsable de tus datos. NURSELINK
        no reemplaza los procesos de contratación ni la verificación documental
        de cada institución.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.xxl },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroText: { gap: spacing.sm },
  eyebrow: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  title: {
    color: colors.navy,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "800",
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  heroPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  heroPillText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  formCard: { gap: spacing.md },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  segmentItemActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  segmentTextActive: { color: colors.primary },
  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.navy,
    marginTop: spacing.xs,
  },
  formSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  switchLink: { alignItems: "center", paddingTop: spacing.xs },
  switchLinkText: { color: colors.textMuted, fontSize: 13 },
  switchLinkAction: { color: colors.primary, fontWeight: "800" },
  forgotLink: { alignSelf: "flex-end" },
  forgotLinkText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  consentText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  consentLink: { color: colors.primary, fontWeight: "800" },
  rolePickerBox: {
    gap: 6,
    marginBottom: spacing.xs,
  },
  rolePickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
  },
  rolePickerRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  rolePickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rolePickerBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rolePickerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  rolePickerBtnTextActive: {
    color: colors.primaryDark,
  },
  footer: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
});
