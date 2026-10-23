import * as Linking from "expo-linking";
import { Platform } from "react-native";

export async function downloadDocumentUrl(url: string) {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.src = url;
    document.body.appendChild(frame);
    window.setTimeout(() => frame.remove(), 60000);
    return;
  }

  await Linking.openURL(url);
}
