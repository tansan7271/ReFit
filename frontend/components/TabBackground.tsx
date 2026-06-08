import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";

import { colors } from "@/constants/colors";

type BlobConfig = {
    size: number;
    top: number;
    left: number;
    color: string;
    duration: number;
    translateX: number;
    translateY: number;
    scaleTo: number;
};

type Props = {
    accentColor: string;
    secondaryColor: string;
    fadeToColor: string;
};

function makeBlobs(accent: string, secondary: string): BlobConfig[] {
    return [
        {
            size: 360,
            top: -60,
            left: -60,
            color: accent,
            duration: 2100,
            translateX: 30,
            translateY: 24,
            scaleTo: 1.18,
        },
        {
            size: 280,
            top: 40,
            left: 200,
            color: secondary,
            duration: 1800,
            translateX: -28,
            translateY: 32,
            scaleTo: 1.22,
        },
        {
            size: 240,
            top: 180,
            left: 50,
            color: secondary,
            duration: 2500,
            translateX: 36,
            translateY: -20,
            scaleTo: 1.15,
        },
        {
            size: 300,
            top: 140,
            left: 220,
            color: accent,
            duration: 2300,
            translateX: -34,
            translateY: -26,
            scaleTo: 1.2,
        },
        {
            size: 200,
            top: 300,
            left: 140,
            color: secondary,
            duration: 1500,
            translateX: 22,
            translateY: 28,
            scaleTo: 1.25,
        },
    ];
}

function Blob({ config, active }: { config: BlobConfig; active: boolean }) {
    const progress = useRef(new Animated.Value(0)).current;
    const loopRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
        if (active) {
            loopRef.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(progress, {
                        toValue: 1,
                        duration: config.duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(progress, {
                        toValue: 0,
                        duration: config.duration,
                        useNativeDriver: true,
                    }),
                ]),
            );
            loopRef.current.start();
        } else {
            loopRef.current?.stop();
        }
        return () => {
            loopRef.current?.stop();
        };
    }, [active, config.duration, progress]);

    const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, config.translateX],
    });
    const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, config.translateY],
    });
    const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, config.scaleTo],
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.blobOuter,
                {
                    width: config.size,
                    height: config.size,
                    top: config.top,
                    left: config.left,
                    backgroundColor: config.color.replace(/[\d.]+\)$/, "0.10)"),
                    transform: [{ translateX }, { translateY }, { scale }],
                },
            ]}
        >
            <View
                style={[
                    styles.blobMid,
                    {
                        width: config.size * 0.75,
                        height: config.size * 0.75,
                        backgroundColor: config.color.replace(
                            /[\d.]+\)$/,
                            "0.22)",
                        ),
                    },
                ]}
            >
                <View
                    style={[
                        styles.blobInner,
                        {
                            width: config.size * 0.5,
                            height: config.size * 0.5,
                            backgroundColor: config.color.replace(
                                /[\d.]+\)$/,
                                "0.1)",
                            ),
                        },
                    ]}
                />
            </View>
        </Animated.View>
    );
}

export function TabBackground({
    accentColor,
    secondaryColor,
    fadeToColor,
}: Props) {
    const focused = useIsFocused();
    const blobs = makeBlobs(accentColor, secondaryColor);

    return (
        <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.container]}
        >
            <View style={[StyleSheet.absoluteFill, styles.blobCanvas]}>
                {blobs.map((config, i) => (
                    <Blob key={i} config={config} active={focused} />
                ))}
            </View>

            <BlurView
                intensity={85}
                tint="light"
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
            />

            <LinearGradient
                colors={["rgba(255,255,255,0)", fadeToColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: "hidden",
    },
    blobCanvas: {
        backgroundColor: colors.bg,
    },
    blobOuter: {
        position: "absolute",
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
    },
    blobMid: {
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
    },
    blobInner: {
        borderRadius: 999,
    },
});
