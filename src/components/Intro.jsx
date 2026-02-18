import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Intro = ({ onComplete }) => {
    const [isStarted, setIsStarted] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [showLogo, setShowLogo] = useState(false);
    const audioPlayed = useRef(false);

    useEffect(() => {
        // Show a subtle prompt if no click after 1.5 seconds
        const promptTimer = setTimeout(() => {
            if (!isStarted) setShowPrompt(true);
        }, 1500);

        return () => clearTimeout(promptTimer);
    }, [isStarted]);

    const handleStart = () => {
        if (isStarted) return;
        setIsStarted(true);
        setShowPrompt(false);

        // Play Custom Audio
        const audio = new Audio('/hanghiveaudio.mpeg');
        audio.volume = 0.8;
        audio.play().catch(err => console.warn("Audio playback failed:", err));
        audio.onplay = () => { audioPlayed.current = true; };

        // Start logo animation sequence
        setTimeout(() => setShowLogo(true), 100);

        // Auto complete after duration
        setTimeout(() => {
            onComplete();
        }, 4500);
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={handleStart}
        >
            <AnimatePresence>
                {!isStarted && showPrompt && (
                    <motion.div
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
                        initial={{ scale: 0.1, opacity: 0, filter: 'blur(20px) brightness(2)' }}
                        animate={{
                            scale: [0.1, 1.1, 1],
                            opacity: 1,
                            filter: 'blur(0px) brightness(1)',
                        }}
                        transition={{
                            duration: 2.5,
                            ease: [0.16, 1, 0.3, 1]
                        }}
                        className="flex flex-col items-center justify-center w-full"
                    >
                        {/* Logo Container with Centering */}
                        <div className="relative flex items-center justify-center w-64 h-64 mb-6">
                            <img
                                src="/HangHive.png"
                                alt="HangHive Logo"
                                className="w-full h-full object-contain relative z-20"
                            />

                            {/* Chromatic Aberration Layers */}
                            <motion.img
                                src="/HangHive.png"
                                className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-40 z-10"
                                animate={{
                                    x: [-2, 2, -2],
                                    filter: 'hue-rotate(90deg) blur(1px)'
                                }}
                                transition={{ duration: 0.15, repeat: Infinity }}
                            />

                            <motion.img
                                src="/HangHive.png"
                                className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-40 z-10"
                                animate={{
                                    x: [2, -2, 2],
                                    filter: 'hue-rotate(-90deg) blur(1px)'
                                }}
                                transition={{ duration: 0.15, repeat: Infinity }}
                            />
                        </div>

                        {/* Glowing Text */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1, duration: 0.8 }}
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

            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none z-10 opacity-30" />
        </div>
    );
};

export default Intro;
