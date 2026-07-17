import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import { toast } from "react-native-sonner";
import { SafeAreaView } from "react-native-safe-area-context";


import AIAppChat from "../../components/chat";
import ConnectWallet from "../../components/walletButtonHeader";
import GlobalStyles, { mainColor, mutedText, surfaceColor, mutedColor, textColor } from "../../core/styles";
import { useSmartSize } from "../../providers/smartProvider";
import { useWallet } from "../../providers/walletProvider";
import { Ionicons } from "@expo/vector-icons";

const monoFont = Platform.OS === "ios" ? "Courier" : "monospace";

export default function Main() {
  const { status } = useWallet();
  const { isDesktop } = useSmartSize();
  const router = useRouter();
  const redirectedRef = useRef(false);
  const [clickCount, setClickCount] = useState(0);

  const handleLogoPress = () => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next === 3) {
        toast.success("SYSTEM OVERRIDE", {
          description: "ħ402 ROOT ACCESS GRANTED.",
          duration: 4000,
        });
        return 0;
      }
      return next;
    });

    setTimeout(() => setClickCount(0), 2000);
  };

  /**
   * AUTH GUARD
   */
  useEffect(() => {
    if (redirectedRef.current) return;
    if (status === "loading") return;

    if (status === "disconnected") {
      redirectedRef.current = true;
      router.replace("/(screens)/connect");
    }
  }, [status, router]);

  return (
    <SafeAreaView style={GlobalStyles.container}>
      {!isDesktop && (
        <View style={GlobalStyles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable onPress={handleLogoPress}>
              <Text style={{
                color: mainColor,
                fontFamily: monoFont,
                fontSize: 18,
                fontWeight: "bold",
                letterSpacing: 2
              }}>ħ402</Text>
            </Pressable>
          </View>
          
          <Pressable
            onPress={() => router.push("/dashboard")}
            style={{
              padding: 8,
              backgroundColor: surfaceColor,
              borderRadius: 0,
              borderWidth: 1,
              borderColor: mainColor
            }}
          >
            <Ionicons name="grid-outline" size={18} color={mainColor} />
          </Pressable>
          
          <Text style={{
            color: mutedText,
            fontSize: 7,
            fontFamily: monoFont,
            textTransform: "uppercase",
            textAlign: 'center',
            letterSpacing: 2,
            opacity: 0.8,
          }}>
            x402 Gateway{"\n"}Inference Pool
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ConnectWallet />
          </View>
        </View>
      )}

      <View style={GlobalStyles.main}>
        <AIAppChat />
      </View>
    </SafeAreaView>
  );
}
