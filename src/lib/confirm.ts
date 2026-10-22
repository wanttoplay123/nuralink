import { Alert, Platform } from "react-native";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

export function confirm(options: ConfirmOptions): Promise<boolean> {
  const message = options.message ?? "";
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const full = [options.title, message].filter(Boolean).join("\n\n");
    return Promise.resolve(window.confirm(full));
  }

  return new Promise((resolve) => {
    Alert.alert(
      options.title,
      message || undefined,
      [
        {
          text: options.cancelText ?? "Cancelar",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: options.confirmText ?? "Aceptar",
          style: options.destructive ? "destructive" : "default",
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
