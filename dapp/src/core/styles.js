import {
  Dimensions,
  PixelRatio,
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";

const normalizeFontSize = (size) => {
  let { width, height } = Dimensions.get("window");
  if (Platform.OS === "web" && height / width < 1) {
    width /= 2.3179;
    height *= 0.7668;
  }
  const scale = Math.min(width / 375, height / 667);
  return PixelRatio.roundToNearestPixel(size * scale);
};

export const iconSize = normalizeFontSize(16);
export const screenHeight = Dimensions.get("screen").height;
export const windowHeight = Dimensions.get("window").height;

// ħ402 LUXURY MATRIX COLOR SYSTEM
export const backgroundColor = "#000000"; // Absolute Black
export const surfaceColor = "#000000"; // No surface elevation, pure void
export const mainColor = "#00FF41"; // Raw Phosphor Green
export const mutedColor = "#111111"; // Barely visible borders
export const textColor = "#00FF41"; // Green text by default
export const mutedText = "#008F11"; // Dimmer Matrix Green

export const header = 64;
export const footer = 0;

export const ratio = Dimensions.get("window").height / Dimensions.get("window").width;
export const StatusBarHeight = StatusBar.currentHeight;
export const NavigatorBarHeight = screenHeight - windowHeight;

// Font Stacks - 100% Monospace for Matrix aesthetic
const monoFont = Platform.OS === "ios" ? "Courier" : "monospace";

// Global Styles
const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor,
    width: "100%",
  },
  header: {
    height: header,
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: mainColor,
  },
  main: {
    flex: 1,
    backgroundColor,
    width: "100%",
  },
  headerItem: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});

export const GeminiStyles = StyleSheet.create({
  // Greeting Hero - Removed since we use CLI terminal view
  heroContainer: {
    padding: 24,
    marginTop: 60,
  },
  greetingText: {
    fontSize: 16,
    color: mutedText,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  promptText: {
    fontSize: 32,
    color: mainColor,
    fontFamily: monoFont,
    lineHeight: 40,
    marginBottom: 32,
  },

  suggestionsList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  suggestionChip: {
    backgroundColor: backgroundColor,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 0, 
    borderWidth: 1,
    borderColor: mainColor,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  suggestionText: {
    color: mainColor,
    fontSize: 13,
    fontFamily: monoFont,
  },

  // Input Container
  inputBox: {
    backgroundColor: backgroundColor,
    borderRadius: 0, 
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: mainColor,
  },
  inputPlaceholderText: {
    color: mutedText,
    fontSize: 14,
    fontFamily: monoFont,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  inputActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 6,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: mutedColor,
    paddingTop: 8,
  },
  inputLeftActions: {
    flexDirection: "row",
    gap: 16,
  },
  inputRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  modelSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: mainColor,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modelText: {
    color: mainColor,
    fontSize: 12,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Premium Model Menu
  modelMenuContainer: {
    position: "absolute",
    bottom: 80,
    right: 16,
    width: 280,
    backgroundColor: backgroundColor,
    borderRadius: 0,
    padding: 8,
    borderWidth: 1,
    borderColor: mainColor,
    zIndex: 1000,
  },
  toolsMenuContainer: {
    position: "absolute",
    bottom: 80,
    left: 16,
    width: 250,
    backgroundColor: backgroundColor,
    borderRadius: 0,
    padding: 8,
    borderWidth: 1,
    borderColor: mainColor,
    zIndex: 1000,
  },
  modelMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 0,
    marginBottom: 4,
  },
  modelMenuItemActive: {
    backgroundColor: "rgba(0, 255, 65, 0.15)",
    borderLeftWidth: 4,
    borderLeftColor: mainColor,
  },
  modelItemTitle: {
    color: mainColor,
    fontSize: 14,
    fontFamily: monoFont,
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 1,
  },
  modelItemSub: {
    color: mutedText,
    fontSize: 11,
    fontFamily: monoFont,
    letterSpacing: 1,
  },
  modelMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    zIndex: 999,
  },

  // Receipt Styles
  receiptContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: backgroundColor,
    borderWidth: 1,
    borderColor: mainColor,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    marginBottom: 12,
    gap: 8,
  },
  receiptText: {
    color: mainColor,
    fontSize: 11,
    fontFamily: monoFont,
    letterSpacing: 0.5,
  },

  // Subheader: Session Spend
  subHeader: {
    height: 48,
    backgroundColor: backgroundColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: mainColor,
  },
  sessionSpendLabel: {
    color: mutedText,
    fontSize: 10,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sessionSpendAmount: {
    color: mainColor,
    fontSize: 14,
    fontFamily: monoFont,
  },

});

export const WalletButtonStyles = StyleSheet.create({
  button: {
    backgroundColor: mainColor,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 0,
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  loadingButton: {
    backgroundColor: mainColor,
    opacity: 0.5,
  },
  disconnectButton: {
    backgroundColor: backgroundColor,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  disconnectingButton: {
    backgroundColor: backgroundColor,
    borderWidth: 1,
    borderColor: "#EF4444",
    opacity: 0.5,
  },
  buttonText: {
    color: "#000000",
    fontSize: 14,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "bold",
  },
  disconnectButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  disconnectingButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontFamily: monoFont,
  },
});

export const WalletButtonExpandedStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: backgroundColor,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: mainColor,
  },
  button: { ...WalletButtonStyles.button },
  loadingButton: { ...WalletButtonStyles.loadingButton },
  disconnectButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#EF4444",
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 0,
    width: "100%",
    alignItems: "center",
  },
  buttonText: { ...WalletButtonStyles.buttonText },
  disconnectButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  connectedContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: backgroundColor,
    borderRadius: 0,
    minWidth: 280,
    borderWidth: 1,
    borderColor: mainColor,
  },
  balanceAmount: {
    color: mainColor,
    fontSize: 32,
    fontFamily: monoFont,
    marginVertical: 16,
  },
  accountAddress: {
    color: mainColor,
    fontSize: 12,
    fontFamily: monoFont,
    backgroundColor: mutedColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: mainColor,
  },
});

export const WalletButtonHeaderStyles = StyleSheet.create({
  button: {
    backgroundColor: backgroundColor,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: mainColor,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingButton: { opacity: 0.5 },
  disconnectButton: {
    backgroundColor: backgroundColor,
    borderColor: "#EF4444",
  },
  buttonText: {
    color: mainColor,
    fontSize: 12,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  disconnectButtonText: {
    color: "#EF4444",
    fontSize: 12,
    fontFamily: monoFont,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

export const FinanceStyles = StyleSheet.create({
  card: {
    backgroundColor: backgroundColor,
    borderWidth: 1,
    borderColor: mainColor,
    padding: 20,
    marginVertical: 12,
    alignSelf: "stretch",
    borderRadius: 0,
  },
  ticker: {
    fontFamily: monoFont,
    fontSize: 12,
    color: mainColor,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontFamily: monoFont,
    color: mainColor,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  price: {
    fontSize: 32,
    fontFamily: monoFont,
    color: mainColor,
    letterSpacing: -1,
  },
  change: {
    fontSize: 12,
    fontFamily: monoFont,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "transparent",
    color: mainColor,
    borderWidth: 1,
    borderColor: mainColor,
  },
  metaContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: mainColor,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 9,
    color: mutedText,
    textTransform: "uppercase",
    fontFamily: monoFont,
    letterSpacing: 1,
  },
  metaValue: {
    fontSize: 12,
    color: mainColor,
    fontFamily: monoFont,
  }
});

export default GlobalStyles;
