import { Redirect } from "expo-router";

/**
 * Android can launch the app with the bare custom scheme, for example
 * the app's custom scheme with an empty path. Expo Router treats that URL as the root
 * path. Keep a real root route so a bare launch never shows "Unmatched Route".
 */
export default function RootRedirect() {
  return <Redirect href="/(tabs)" />;
}
