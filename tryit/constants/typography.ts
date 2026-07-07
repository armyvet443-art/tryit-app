import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";

/**
 * Sora font family map — loaded once at app startup via expo-font.
 * Falls back to system fonts if a weight isn't available yet.
 */
export const SoraFonts = {
  regular: "Sora_400Regular",
  medium: "Sora_500Medium",
  semibold: "Sora_600SemiBold",
  bold: "Sora_700Bold",
  extrabold: "Sora_800ExtraBold",
} as const;

/** Map of font assets for expo-font loading. */
export const fontMap = {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} as const;

export type FontWeight = keyof typeof SoraFonts;
