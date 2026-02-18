import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const TechnicalBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resize);
        resize();

        const circuits = [];
        const circuitCount = 15;

        for (let i = 0; i < circuitCount; i++) {
            circuits.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                length: Math.random() * 200 + 100,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                angle: (Math.round(Math.random() * 4) * 90) * (Math.PI / 180),
                color: i % 2 === 0 ? '#00e5ff' : '#d500f9',
                pulse: Math.random() * Math.PI,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.lineWidth = 1;

            circuits.forEach((c) => {
                c.pulse += 0.02;
                const alpha = c.opacity * (0.5 + Math.sin(c.pulse) * 0.5);

                ctx.strokeStyle = c.color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);

                const endX = c.x + Math.cos(c.angle) * c.length;
                const endY = c.y + Math.sin(c.angle) * c.length;

                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw small joints
                ctx.fillStyle = c.color;
                ctx.beginPath();
                ctx.arc(c.x, c.y, 2, 0, Math.PI * 2);
                ctx.fill();

                // Move circuits slowly
                c.x += Math.cos(c.angle) * 0.2;
                c.y += Math.sin(c.angle) * 0.2;

                if (c.x < 0 || c.x > canvas.width || c.y < 0 || c.y > canvas.height) {
                    c.x = Math.random() * canvas.width;
                    c.y = Math.random() * canvas.height;
                }
            });

            // Grid pattern
            ctx.strokeStyle = 'rgba(41, 121, 255, 0.05)';
            ctx.lineWidth = 1;
            const gridSize = 50;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 -z-10 bg-hanghive-darker overflow-hidden">
            <canvas ref={canvasRef} className="opacity-40" />
            <div className="absolute inset-0 bg-gradient-to-t from-hanghive-darker via-transparent to-hanghive-darker opacity-80" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(41,121,255,0.1),_transparent_70%)]" />

            {/* Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="w-full h-[2px] bg-hanghive-cyan opacity-[0.03] animate-scanline shadow-[0_0_10px_#00e5ff]" />
            </div>
        </div>
    );
};

export default TechnicalBackground;
