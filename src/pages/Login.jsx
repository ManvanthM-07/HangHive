import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
    const [focused, setFocused] = useState(null);
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md glass-morphism rounded-2xl p-8 relative overflow-hidden glow-shadow-cyan border border-[rgba(0,229,255,0.2)]"
            >
                {/* Animated Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-hanghive-cyan opacity-40" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-hanghive-purple opacity-40" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-hanghive-purple opacity-40" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-hanghive-cyan opacity-40" />

                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.8, 1, 0.8]
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="w-24 h-24 mb-4 flex items-center justify-center"
                    >
                        <img
                            src="/HangHive.png"
                            alt="HangHive Logo"
                            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]"
                        />
                    </motion.div>
                    <h1 className="text-3xl font-bold tracking-tighter text-white mb-2 font-mono">
                        HANG<span className="text-hanghive-cyan">HIVE</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-light">SYSTEM AUTHORIZATION REQUIRED</p>
                </div>

                <form className="space-y-6">
                    <div className="relative group">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focused === 'email' ? 'text-hanghive-cyan' : 'text-gray-500'}`} />
                        <input
                            type="email"
                            placeholder="System Ident (Email)"
                            className="w-full bg-hanghive-dark/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hanghive-cyan focus:ring-1 focus:ring-hanghive-cyan/50 transition-all duration-300 font-mono text-sm"
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused(null)}
                        />
                        {focused === 'email' && (
                            <motion.div
                                layoutId="scanning-line"
                                className="absolute inset-0 border border-hanghive-cyan rounded-lg pointer-events-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            />
                        )}
                    </div>

                    <div className="relative group">
                        <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focused === 'password' ? 'text-hanghive-purple' : 'text-gray-500'}`} />
                        <input
                            type="password"
                            placeholder="Access Code (Password)"
                            className="w-full bg-hanghive-dark/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hanghive-purple focus:ring-1 focus:ring-hanghive-purple/50 transition-all duration-300 font-mono text-sm"
                            onFocus={() => setFocused('password')}
                            onBlur={() => setFocused(null)}
                        />
                        {focused === 'password' && (
                            <motion.div
                                layoutId="scanning-line"
                                className="absolute inset-0 border border-hanghive-purple rounded-lg pointer-events-none"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                        <label className="flex items-center cursor-pointer hover:text-hanghive-cyan transition-colors">
                            <input type="checkbox" className="mr-2 accent-hanghive-cyan bg-transparent" />
                            REMEMBER_SESSION
                        </label>
                        <a href="#" className="hover:text-hanghive-purple transition-colors">FORGOT_LOGIC?</a>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-gradient-to-r from-hanghive-cyan to-hanghive-blue text-hanghive-dark font-bold py-3 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-hanghive-cyan/20 group hover:glow-shadow-cyan transition-all"
                    >
                        <span>INITIALIZE_LOGIN</span>
                        <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-gray-400 text-sm font-mono">
                        NEW_NODE? <Link to="/signup" className="text-hanghive-purple hover:text-hanghive-cyan transition-colors">ESTABLISH_CONNECTION</Link>
                    </p>
                </div>

                {/* Technical Decoration */}
                <div className="mt-6 flex justify-center space-x-4 opacity-30 select-none">
                    <div className="text-[10px] text-hanghive-cyan font-mono animate-pulse">LN-772_SECURED</div>
                    <div className="text-[10px] text-hanghive-purple font-mono animate-pulse delay-75">ENCRYPT_AES256</div>
                    <div className="text-[10px] text-hanghive-blue font-mono animate-pulse delay-150">HIVE_OS_V1.0</div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
