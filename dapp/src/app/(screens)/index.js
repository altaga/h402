/**
 * 🚀 ħ402 - MATRIX BOOT SEQUENCE
 */

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, Platform } from "react-native";

import { backgroundColor, mainColor } from "../../core/styles";
import { useWallet } from "../../providers/walletProvider";

const monoFont = Platform.OS === "ios" ? "Courier" : "monospace";

export default function SplashLoading() {
  const { status } = useWallet();
  const router = useRouter();
  const [bootText, setBootText] = useState("");

  const fullBootSequence = `> ħ402 V2.4.1 SECURE KERNEL INITIALIZED
> ESTABLISHING X402 PROTOCOL HANDSHAKE...
> MEMORY INTEGRITY: VERIFIED
> DECRYPTING MAINFRAME ACCESS...
> BYPASSING STANDARD AUTHENTICATION...
> 
> AWAITING UPLINK...`;

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setBootText(fullBootSequence.substring(0, i));
      i++;
      if (i > fullBootSequence.length) {
        clearInterval(interval);
      }
    }, 20); // Matrix typing effect
    return () => clearInterval(interval);
  }, []);

  /**
   * ROUTING LOGIC
   */
  useEffect(() => {
    if (status === "loading") return;

    // Small delay to let the user see the boot sequence
    const timer = setTimeout(() => {
      if (status === "connected") {
        router.replace("/(screens)/main");
        return;
      }

      if (status === "disconnected") {
        router.replace("/(screens)/connect");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [status, router]);

  return (
    <View style={[{ flex: 1, backgroundColor, padding: 24, justifyContent: "center" }]}>
      <Text style={{ 
        color: mainColor, 
        fontFamily: monoFont, 
        fontSize: 12, 
        lineHeight: 20,
        letterSpacing: 1
      }}>
        {bootText}
        <Text style={{ opacity: Math.round(Date.now() / 500) % 2 === 0 ? 1 : 0 }}>█</Text>
      </Text>
    </View>
  );
}
