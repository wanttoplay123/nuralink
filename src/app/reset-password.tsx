import { useState } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { Button, Field, Notice, Screen, ScreenHeader } from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/lib/theme";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      router.replace("/sign-in");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <ScreenHeader
        eyebrow="SEGURIDAD"
        title="Nueva contraseña"
        subtitle="Elige una contraseña segura de al menos 8 caracteres."
      />

      <Field
        label="Nueva contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
        required
      />
      <Field
        label="Repetir contraseña"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repite la contraseña"
        secureTextEntry
        required
      />
      {error ? (
        <Notice tone="danger" icon="alert-circle-outline">
          {error}
        </Notice>
      ) : null}
      <Button label="Actualizar contraseña" onPress={submit} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.xxl },
});
