import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Notice } from "@/components/ui";
import { getErrorMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import { colors, radius, shadowLifted } from "@/lib/theme";
import type { CredentialDocument } from "@/types";

type DocumentPreviewModalProps = {
  visible: boolean;
  document: CredentialDocument | null;
  url: string | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onDownload: () => Promise<void>;
};

export function DocumentPreviewModal({
  visible,
  document,
  url,
  loading,
  error,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  if (!document) return null;

  const isWeb = Platform.OS === "web";
  const isImage = isImageDocument(document);
  const isPdf = isPdfDocument(document);
  const isText = isTextDocument(document);
  const canPreviewInBrowser = isImage || isPdf || isText;
  const typeLabel = documentTypeLabel(document);

  const changeZoom = (delta: number) => {
    setZoom((current) => {
      const next = Math.min(3, Math.max(0.5, current + delta));
      return Number(next.toFixed(2));
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await onDownload();
    } catch (caught) {
      setDownloadError(getErrorMessage(caught));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, compact && styles.overlayCompact]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Cerrar vista previa"
        />
        <View style={[styles.sheet, compact && styles.sheetCompact]}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name={documentIcon(document)}
                size={19}
                color="#B7F0E3"
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.fileName} numberOfLines={1}>
                {document.name}
              </Text>
              <Text style={styles.fileMeta} numberOfLines={1}>
                {typeLabel} · {formatRelative(document.created_at)}
              </Text>
            </View>
            <Pressable
              onPress={() => void handleDownload()}
              disabled={downloading}
              style={({ pressed }) => [
                styles.downloadButton,
                pressed && styles.headerButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Descargar ${document.name}`}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={17}
                  color={colors.white}
                />
              )}
              {compact ? null : (
                <Text style={styles.downloadText}>Descargar</Text>
              )}
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.headerButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cerrar vista previa"
            >
              <Ionicons name="close" size={20} color={colors.white} />
            </Pressable>
          </View>

          {downloadError ? (
            <View style={styles.errorWrap}>
              <Notice tone="danger" icon="alert-circle-outline">
                {downloadError}
              </Notice>
            </View>
          ) : null}

          <View style={styles.viewer}>
            {loading ? (
              <View style={styles.stateBlock}>
                <ActivityIndicator size="large" color="#B7F0E3" />
                <Text style={styles.stateText}>Preparando vista previa...</Text>
              </View>
            ) : error ? (
              <View style={styles.stateBlock}>
                <View style={styles.stateIcon}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={28}
                    color="#FFB7A8"
                  />
                </View>
                <Text style={styles.stateTitle}>No se pudo abrir el archivo</Text>
                <Text style={styles.stateText}>{error}</Text>
              </View>
            ) : !url ? (
              <View style={styles.stateBlock}>
                <ActivityIndicator size="large" color="#B7F0E3" />
              </View>
            ) : isWeb && canPreviewInBrowser ? (
              isPdf ? (
                <View style={styles.frame}>
                  {createWebIframe(
                    `${url}#toolbar=1&navpanes=0&view=FitH`,
                    document.name
                  )}
                </View>
              ) : isImage ? (
                <View style={styles.imageStage}>
                  {createWebImage(url, document.name, zoom)}
                </View>
              ) : (
                <View style={styles.frame}>
                  {createWebIframe(url, document.name)}
                </View>
              )
            ) : !isWeb && isImage ? (
              <View style={styles.nativeImageStage}>
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  centerContent
                  contentContainerStyle={styles.nativeImageContent}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  <Image
                    source={{ uri: url }}
                    style={styles.nativeImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              </View>
            ) : (
              <View style={styles.stateBlock}>
                <View style={styles.stateIcon}>
                  <Ionicons
                    name={documentIcon(document)}
                    size={28}
                    color="#B7F0E3"
                  />
                </View>
                <Text style={styles.stateTitle}>
                  Vista previa no disponible
                </Text>
                <Text style={styles.stateText}>
                  {isWeb
                    ? "Este formato no se puede mostrar aquí. Descarga el archivo para abrirlo con la aplicación correspondiente."
                    : "Descarga el archivo para revisarlo con la aplicación correspondiente."}
                </Text>
              </View>
            )}
          </View>

          {!loading && !error && url ? (
            <View style={styles.footer}>
              {isWeb && isImage ? (
                <>
                  <View style={styles.zoomControls}>
                    <Pressable
                      onPress={() => changeZoom(-0.25)}
                      disabled={zoom <= 0.5}
                      style={({ pressed }) => [
                        styles.zoomButton,
                        pressed && styles.zoomButtonPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Reducir zoom"
                    >
                      <Ionicons
                        name="remove"
                        size={17}
                        color={colors.primaryDark}
                      />
                    </Pressable>
                    <Text style={styles.zoomValue}>
                      {Math.round(zoom * 100)}%
                    </Text>
                    <Pressable
                      onPress={() => changeZoom(0.25)}
                      disabled={zoom >= 3}
                      style={({ pressed }) => [
                        styles.zoomButton,
                        pressed && styles.zoomButtonPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Aumentar zoom"
                    >
                      <Ionicons
                        name="add"
                        size={17}
                        color={colors.primaryDark}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setZoom(1)}
                      style={({ pressed }) => [
                        styles.zoomButton,
                        pressed && styles.zoomButtonPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Restablecer zoom"
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={16}
                        color={colors.primaryDark}
                      />
                    </Pressable>
                  </View>
                  <Text style={styles.hint}>
                    Ajusta el zoom y desplázate para revisar la imagen.
                  </Text>
                </>
              ) : (
                <Text style={styles.hint}>
                  {isWeb && isPdf
                    ? "Usa los controles del visor para ampliar y ajustar. También puedes descargar el archivo."
                    : "Descarga el archivo para revisarlo con la aplicación correspondiente."}
                </Text>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function createWebIframe(src: string, title: string) {
  return (
    <iframe
      src={src}
      title={title}
      allow="fullscreen"
      style={{
        border: "none",
        width: "100%",
        height: "100%",
        backgroundColor: colors.white,
      }}
    />
  );
}

function createWebImage(src: string, alt: string, zoom: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        padding: 16,
        boxSizing: "border-box",
        backgroundColor: "#081F1F",
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          display: "block",
          width: `${zoom * 100}%`,
          maxWidth: "none",
          height: "auto",
          margin: "0 auto",
        }}
      />
    </div>
  );
}

function documentIcon(document: CredentialDocument) {
  if (isImageDocument(document)) return "image-outline" as const;
  if (isPdfDocument(document)) return "document-text-outline" as const;
  return "document-attach-outline" as const;
}

function documentTypeLabel(document: CredentialDocument) {
  if (isPdfDocument(document)) return "PDF";
  if (isImageDocument(document)) return "Imagen";
  if (isTextDocument(document)) return "Texto";
  return "Documento";
}

function isPdfDocument(document: CredentialDocument) {
  return (
    document.mime_type === "application/pdf" || /\.pdf$/i.test(document.name)
  );
}

function isImageDocument(document: CredentialDocument) {
  return (
    document.mime_type?.startsWith("image/") === true ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(document.name)
  );
}

function isTextDocument(document: CredentialDocument) {
  return (
    document.mime_type?.startsWith("text/") === true ||
    /\.(txt|csv|json|md)$/i.test(document.name)
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 20, 19, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  overlayCompact: { padding: 0 },
  sheet: {
    width: "94%",
    maxWidth: 1040,
    height: "88%",
    maxHeight: 900,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    ...shadowLifted,
  },
  sheetCompact: {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.navy,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, minWidth: 0 },
  fileName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  fileMeta: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 10.5,
    marginTop: 2,
  },
  downloadButton: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  downloadText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonPressed: { opacity: 0.65 },
  errorWrap: { padding: 12, backgroundColor: colors.surface },
  viewer: { flex: 1, backgroundColor: "#081F1F" },
  frame: { flex: 1, backgroundColor: colors.white },
  imageStage: { flex: 1, backgroundColor: "#081F1F" },
  nativeImageStage: { flex: 1, backgroundColor: "#081F1F" },
  nativeImageContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  nativeImage: { width: "100%", height: "100%" },
  stateBlock: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    gap: 10,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stateTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  stateText: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    maxWidth: 400,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  zoomControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 3,
  },
  zoomButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomButtonPressed: { opacity: 0.6 },
  zoomValue: {
    minWidth: 46,
    textAlign: "center",
    color: colors.navy,
    fontSize: 11,
    fontWeight: "800",
  },
  hint: {
    flex: 1,
    minWidth: 160,
    color: colors.textMuted,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: "right",
  },
});
