import { StyleSheet, Text, View } from "react-native";
import { Screen, ScreenHeader } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";

export default function TermsScreen() {
  return (
    <Screen>
      <ScreenHeader
        eyebrow="LEGAL"
        title="Términos y condiciones"
        subtitle="Lee la información antes de usar NURSELINK."
      />

      <View style={styles.block}>
        <Text style={styles.section}>1. Propósito de la plataforma</Text>
        <Text style={styles.paragraph}>
          NURSELINK conecta instituciones de salud con profesionales de
          enfermería para cubrir turnos. No es un vínculo laboral directo entre
          NURSELINK y los usuarios: las condiciones de cada cobertura se pactan
          entre la institución y el profesional.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.section}>2. Tratamiento de datos personales</Text>
        <Text style={styles.paragraph}>
          Tratamos nombre, contacto, ciudad, formación y documentos
          profesionales únicamente para operar la plataforma y verificar
          perfiles. No compartimos tus datos con terceros ajenos al servicio.
          Puedes solicitar la corrección o eliminación de tus datos en cualquier
          momento.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.section}>3. Verificación de credenciales</Text>
        <Text style={styles.paragraph}>
          La verificación de títulos, registro profesional (REVOE) y documentos
          es responsabilidad del administrador autorizado de NURSELINK. Un
          perfil «verificado» confirma que se revisó la documentación, pero no
          sustituye los procesos de contratación ni la validación documental que
          cada institución deba realizar por su cuenta.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.section}>4. Responsabilidad</Text>
        <Text style={styles.paragraph}>
          NURSELINK facilita la conexión y el intercambio de mensajes, pero no
          interviene en la ejecución clínica del turno. Las instituciones y
          profesionales asumen la responsabilidad de sus propias obligaciones
          legales, laborales y de seguridad del paciente.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.section}>5. Uso aceptable</Text>
        <Text style={styles.paragraph}>
          Queda prohibido publicar información falsa, suplantar identidades,
          compartir claves de servicio o usar la plataforma para fines distintos
          a la cobertura de turnos de salud.
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={styles.section}>6. Contacto</Text>
        <Text style={styles.paragraph}>
          Para dudas sobre estos términos o sobre el tratamiento de tus datos,
          contacta a la administración de NURSELINK desde el panel de soporte.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  section: { fontSize: 15, fontWeight: "800", color: colors.navy },
  paragraph: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textMuted,
  },
});
