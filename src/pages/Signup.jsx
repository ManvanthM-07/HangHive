import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Lock, UserPlus, ShieldCheck, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

const Signup = () => {
    const [focused, setFocused] = useState(null);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-md glass-morphism rounded-2xl p-8 relative overflow-hidden glow-shadow-purple border border-[rgba(213,0,249,0.2)]"
            >
                {/* Animated Corner Accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-hanghive-purple opacity-40" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-hanghive-cyan opacity-40" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-hanghive-cyan opacity-40" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-hanghive-purple opacity-40" />

                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-24 h-24 mb-4 flex items-center justify-center"
                    >
                        <img
                            src="/HangHive.png"
                            alt="HangHive Logo"
                            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(213,0,249,0.5)]"
                        />
                    </motion.div>
                    <h1 className="text-3xl font-bold tracking-tighter text-white mb-2 font-mono uppercase">
                        Create <span className="text-hanghive-purple text-gradient">Node</span>
                    </h1>
                    <p className="text-gray-400 text-sm font-light uppercase">Protocol: New User Initialization</p>
                </div>

                <form className="space-y-4">
                    <div className="relative group">
                        <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focused === 'name' ? 'text-hanghive-purple' : 'text-gray-500'}`} />
                        <input
                            type="text"
                            placeholder="Designation (Name)"
                            className="w-full bg-hanghive-dark/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hanghive-purple focus:ring-1 focus:ring-hanghive-purple/50 transition-all duration-300 font-mono text-sm"
                            onFocus={() => setFocused('name')}
                            onBlur={() => setFocused(null)}
                        />
                    </div>

                    <div className="relative group">
                        <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focused === 'email' ? 'text-hanghive-cyan' : 'text-gray-500'}`} />
                        <input
                            type="email"
                            placeholder="System Ident (Email)"
                            className="w-full bg-hanghive-dark/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hanghive-cyan focus:ring-1 focus:ring-hanghive-cyan/50 transition-all duration-300 font-mono text-sm"
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused(null)}
                        />
                    </div>

                    <div className="relative group">
                        <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focused === 'password' ? 'text-hanghive-purple' : 'text-gray-500'}`} />
                        <input
                            type="password"
                            placeholder="Security Key (Password)"
                            className="w-full bg-hanghive-dark/50 border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-hanghive-purple focus:ring-1 focus:ring-hanghive-purple/50 transition-all duration-300 font-mono text-sm"
                            onFocus={() => setFocused('password')}
                            onBlur={() => setFocused(null)}
                        />
                    </div>

                    <div className="pt-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-gradient-to-r from-hanghive-purple to-hanghive-blue text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 shadow-lg shadow-hanghive-purple/20 group hover:glow-shadow-purple transition-all"
                        >
                            <span>CREATE_CONNECTION</span>
                            <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                        </motion.button>
                    </div>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 text-center">
                    <p className="text-gray-400 text-sm font-mono">
                        ALREADY_SYNCED? <Link to="/login" className="text-hanghive-cyan hover:text-hanghive-purple transition-colors">INITIALIZE_LOGIN</Link>
                    </p>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 opacity-20 text-[8px] font-mono text-center">
                    <div className="border border-white/20 py-1">DAT-BUF_OK</div>
                    <div className="border border-white/20 py-1">SYS-INT_OK</div>
                    <div className="border border-white/20 py-1">CRYP-MD_OK</div>
                </div>
            </motion.div>
        </div>
    );
};

export default Signup;
