import * as Linking from "expo-linking";
import { Platform } from "react-native";

type DocumentWindow = {
  location: { href: string };
  close: () => void;
};

export function prepareDocumentWindow(): DocumentWindow | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const tab = window.open("", "_blank");
  if (!tab) return null;
  tab.opener = null;
  return tab;
}

export async function openDocumentUrl(
  url: string,
  tab: DocumentWindow | null
) {
  if (tab) {
    tab.location.href = url;
    return;
  }
  await Linking.openURL(url);
}
