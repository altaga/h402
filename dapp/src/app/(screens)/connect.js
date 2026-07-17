/**
 * 🔒 ħ402 - AUTHENTICATION / CONNECT SCREEN
 * 
 * Gateway screen for the Inference Dark Pool.
 */

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";

import ConnectWallet from "../../components/walletButton";
import { backgroundColor, mainColor, surfaceColor, mutedColor, textColor, mutedText } from "../../core/styles";
import { useSmartSize } from "../../providers/smartProvider";
import { useWallet } from "../../providers/walletProvider";

const monoFont = Platform.OS === "ios" ? "Courier" : "monospace";

export default function Connect() {
  const { status } = useWallet();
  const { isDesktop } = useSmartSize();
  const router = useRouter();
  const [blink, setBlink] = useState(true);

  const bgColor = backgroundColor;

  useEffect(() => {
    const interval = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(interval);
  }, []);

  /**
   * AUTH GUARD
   */
  useEffect(() => {
    if (status === "connected") {
      router.replace("/(screens)/main");
    }
  }, [status, router]);

  return (
    <View style={[{ flex: 1, backgroundColor: bgColor, alignItems: "center", justifyContent: "center", width: "100%", padding: 24 }]}>
      <View style={styles.card}>
        {/* HEADER SECTION */}
        <View style={styles.headerContainer}>
          <Text style={styles.brandName}>ħ402_KERNEL</Text>
          <Text style={styles.headline}>SYSTEM HALTED. UNAUTHORIZED ACCESS ATTEMPT.</Text>
          <Text style={styles.subheadline}>
            {">"} IDENTITY: UNKNOWN{"\n"}
            {">"} TRACE: BLOCKED{"\n"}
            {">"} ACTION REQUIRED: ESTABLISH X402 UPLINK
          </Text>
        </View>

        {/* ACTION SECTION */}
        <View style={styles.actionContainer}>
          <Text style={styles.statusText}>AWAITING_KEY_EXCHANGE{blink ? "_" : " "}</Text>
          <ConnectWallet />
        </View>

        {/* FOOTER SECTION */}
        <View style={styles.footerContainer}>
          <Text style={styles.badgeText}>DATA_STREAM: ENCRYPTED // NODE: HEDERA_TESTNET</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 600,
    backgroundColor: surfaceColor,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: mainColor,
    padding: 32,
    alignItems: "flex-start",
  },
  headerContainer: {
    alignItems: "flex-start",
    marginBottom: 40,
    width: "100%",
  },
  brandName: {
    color: mainColor,
    fontSize: 20,
    fontFamily: monoFont,
    letterSpacing: 2,
    marginBottom: 16,
  },
  headline: {
    color: textColor,
    fontSize: 16,
    fontFamily: monoFont,
    letterSpacing: 1,
    marginBottom: 24,
  },
  subheadline: {
    color: mutedText,
    fontSize: 13,
    fontFamily: monoFont,
    lineHeight: 22,
  },
  actionContainer: {
    width: "100%",
    alignItems: "flex-start",
    marginBottom: 40,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: mainColor,
  },
  statusText: {
    color: mainColor,
    fontSize: 12,
    fontFamily: monoFont,
    marginBottom: 16,
    letterSpacing: 1,
  },
  footerContainer: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: mainColor,
    paddingTop: 16,
  },
  badgeText: {
    color: mutedText,
    fontSize: 10,
    fontFamily: monoFont,
    letterSpacing: 2,
  },
});
