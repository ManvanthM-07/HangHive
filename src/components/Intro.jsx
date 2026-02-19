import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Intro = ({ onComplete }) => {
    const [isStarted, setIsStarted] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showLogo, setShowLogo] = useState(false);
    const [isExitingInternal, setIsExitingInternal] = useState(false);
    const audioPlayed = useRef(false);

    useEffect(() => {
        const promptTimer = setTimeout(() => {
            if (!isStarted) setShowPrompt(true);
        }, 1500);
        return () => clearTimeout(promptTimer);
    }, [isStarted]);

    const handleStart = () => {
        if (isStarted) return;
        setIsStarted(true);
        setShowPrompt(false);

        const audio = new Audio('/hanghiveaudio.mpeg');
        audio.volume = 0.8;

        // Immediately play audio and show logo upon start
        setShowLogo(true);
        audio.play().catch(err => console.warn("Audio playback failed:", err));
        audioPlayed.current = true;

        // Perfectly timed exit for the audio buildup
        setTimeout(() => {
            setIsExitingInternal(true); // Disable heavy loops
            onComplete();
        }, 4200);
    };

    const cinematicEasing = [0.77, 0, 0.175, 1];

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{
                scale: 60,
                opacity: 0,
                transition: {
                    duration: 1.8,
                    ease: [0.4, 0, 0.2, 1]
                }
            }}
            style={{ willChange: "transform, opacity, filter" }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={handleStart}
        >
            <AnimatePresence>
                {!isStarted && showPrompt && (
                    <motion.div
                        key="prompt"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center space-y-4"
                    >
                        <div className="w-8 h-8 border-2 border-hanghive-cyan rounded-full animate-ping opacity-50" />
                        <p className="text-hanghive-cyan font-mono text-xs tracking-[0.5em] uppercase">Click to Begin</p>
                    </motion.div>
                )}

                {showLogo && (
                    <motion.div
                        key="logo-content"
                        initial={{ scale: 0.85, opacity: 0, filter: 'blur(10px)' }}
                        animate={{
                            scale: 1,
                            opacity: 1,
                            filter: 'blur(0px)',
                        }}
                        transition={{
                            duration: 2.2,
                            ease: cinematicEasing
                        }}
                        className="flex flex-col items-center justify-center w-full"
                    >
                        <div className="relative flex items-center justify-center w-64 h-64 mb-6">
                            <img
                                src="/HangHive.png"
                                alt="HangHive Logo"
                                className="w-full h-full object-contain relative z-20"
                            />

                            {/* Chromatic Aberration Layers - Disabled upon exit to free up GPU */}
                            <AnimatePresence>
                                {!isExitingInternal && (
                                    <>
                                        <motion.img
                                            src="/HangHive.png"
                                            className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-30 z-10"
                                            animate={{
                                                x: [-1, 1, -1],
                                                filter: 'hue-rotate(90deg) blur(0.5px)'
                                            }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                                        />

                                        <motion.img
                                            src="/HangHive.png"
                                            className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-30 z-10"
                                            animate={{
                                                x: [1, -1, 1],
                                                filter: 'hue-rotate(-90deg) blur(0.5px)'
                                            }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
                                        />
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 1.5, ease: cinematicEasing }}
                            className="flex flex-col items-center w-full"
                        >
                            <h1 className="text-4xl font-bold tracking-[0.8em] text-white font-mono translate-x-[0.4em]">
                                HANG<span className="text-hanghive-cyan">HIVE</span>
                            </h1>
                            <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-hanghive-cyan to-transparent mt-4 glow-shadow-cyan" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CRT Overlay Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-30" />
        </motion.div>
    );
};

export default Intro;
