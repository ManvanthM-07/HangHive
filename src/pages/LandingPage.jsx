import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus, ArrowRight, Zap, Users, Shield, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TechnicalBackground from '../components/TechnicalBackground';

// ─── Login Modal ──────────────────────────────────────────────────────────────
const LoginModal = ({ onClose }) => {
    const [focused, setFocused] = useState(null);
    const [isSignup, setIsSignup] = useState(false);
    const [remember, setRemember] = useState(false);
    const navigate = useNavigate();

    // Form state
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        if (e.target.type === 'checkbox') {
            setRemember(e.target.checked);
        } else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const endpoint = isSignup ? '/signup' : '/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = typeof data.detail === 'string'
                    ? data.detail
                    : Array.isArray(data.detail)
                        ? data.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
                        : 'Authentication failed';
                throw new Error(errorMessage);
            }

            // Success: store user and navigate
            localStorage.setItem('hanghive_user', JSON.stringify(data));
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md relative overflow-hidden rounded-2xl border border-white/10"
                style={{ background: 'rgba(10,10,20,0.95)', boxShadow: '0 0 60px rgba(0,229,255,0.15)' }}
            >
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-hanghive-cyan opacity-40" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-hanghive-purple opacity-40" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-hanghive-purple opacity-40" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-hanghive-cyan opacity-40" />

                <div className="p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <motion.div
                            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-20 h-20 mb-4"
                        >
                            <img src="/HangHive.png" alt="HangHive" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]" />
                        </motion.div>
                        <h2 className="text-2xl font-bold tracking-tighter text-white font-mono">
                            HANG<span className="text-hanghive-cyan">HIVE</span>
                        </h2>
                        <p className="text-gray-400 text-xs font-mono mt-1">
                            {isSignup ? 'CREATE_NEW_NODE' : 'SYSTEM_AUTHORIZATION'}
                        </p>
                    </div>

                    {/* Tab switcher */}
                    <div className="flex rounded-lg overflow-hidden border border-white/10 mb-6">
                        <button
                            onClick={() => setIsSignup(false)}
                            className={`flex-1 py-2 text-sm font-mono font-semibold transition-all ${!isSignup ? 'bg-hanghive-cyan/20 text-hanghive-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            LOGIN
                        </button>
                        <button
                            onClick={() => setIsSignup(true)}
                            className={`flex-1 py-2 text-sm font-mono font-semibold transition-all ${isSignup ? 'bg-hanghive-purple/20 text-hanghive-purple' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            SIGN_UP
                        </button>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-xs font-mono"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error.toUpperCase()}
                        </motion.div>
                    )}

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {isSignup && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative"
                            >
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="text"
                                    name="username"
                                    placeholder="Username"
                                    required={isSignup}
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-hanghive-purple focus:ring-1 focus:ring-hanghive-purple/40 transition-all font-mono text-sm"
                                />
                            </motion.div>
                        )}

                        <div className="relative">
                            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'email' ? 'text-hanghive-cyan' : 'text-gray-500'}`} />
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-hanghive-cyan focus:ring-1 focus:ring-hanghive-cyan/40 transition-all font-mono text-sm"
                            />
                        </div>

                        <div className="relative">
                            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focused === 'password' ? 'text-hanghive-purple' : 'text-gray-500'}`} />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused(null)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-hanghive-purple focus:ring-1 focus:ring-hanghive-purple/40 transition-all font-mono text-sm"
                            />
                        </div>

                        {!isSignup && (
                            <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                                <label className="flex items-center cursor-pointer hover:text-hanghive-cyan transition-colors">
                                    <input
                                        type="checkbox"
                                        className="mr-2 accent-hanghive-cyan"
                                        checked={remember}
                                        onChange={handleChange}
                                    />
                                    REMEMBER_SESSION
                                </label>
                                <a href="#" className="hover:text-hanghive-purple transition-colors">FORGOT_LOGIC?</a>
                            </div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            type="submit"
                            disabled={loading}
                            className={`w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed ${isSignup
                                ? 'bg-gradient-to-r from-hanghive-purple to-hanghive-blue text-white shadow-lg shadow-hanghive-purple/20'
                                : 'bg-gradient-to-r from-hanghive-cyan to-hanghive-blue text-hanghive-dark shadow-lg shadow-hanghive-cyan/20'
                                }`}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isSignup ? (
                                <><UserPlus className="w-4 h-4" /> ESTABLISH_CONNECTION</>
                            ) : (
                                <><LogIn className="w-4 h-4" /> INITIALIZE_LOGIN</>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-4 flex justify-center gap-4 opacity-30 select-none">
                        <span className="text-[10px] text-hanghive-cyan font-mono animate-pulse">LN-772_SECURED</span>
                        <span className="text-[10px] text-hanghive-purple font-mono animate-pulse">ENCRYPT_AES256</span>
                        <span className="text-[10px] text-hanghive-blue font-mono animate-pulse">HIVE_OS_V1.0</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ─── Feature Card ─────────────────────────────────────────────────────────────
const FeatureCard = ({ icon: Icon, title, desc, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.6, ease: 'easeOut' }}
        whileHover={{ y: -4, scale: 1.02 }}
        className="relative p-6 rounded-2xl border border-white/10 overflow-hidden group cursor-default"
        style={{ background: 'rgba(255,255,255,0.03)' }}
    >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 70%)` }} />
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: color + '20', border: `1px solid ${color}40` }}>
            <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h3 className="text-white font-bold text-sm mb-2 font-mono">{title}</h3>
        <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
    </motion.div>
);

// ─── Landing Page ─────────────────────────────────────────────────────────────
const LandingPage = () => {
    const [showLogin, setShowLogin] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const featuresRef = React.useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('hanghive_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const scrollToFeatures = () => {
        featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const features = [
        { icon: Zap, title: 'REAL_TIME_CHAT', desc: 'Instant messaging with zero latency across all your communities.', color: '#00e5ff', delay: 0.5 },
        { icon: Users, title: 'COMMUNITY_HUBS', desc: 'Create or join hives — organized spaces for your crew.', color: '#d500f9', delay: 0.6 },
        { icon: Shield, title: 'ENCRYPTED_COMMS', desc: 'AES-256 encrypted channels. Your data stays yours.', color: '#2979ff', delay: 0.7 },
        { icon: Globe, title: 'GLOBAL_NETWORK', desc: 'Connect with nodes worldwide. No borders, no limits.', color: '#76ff03', delay: 0.8 },
    ];

    return (
        <div className="relative min-h-screen text-white overflow-x-hidden selection:bg-hanghive-cyan/30">
            <TechnicalBackground />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Nav */}
                <motion.nav
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50"
                >
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                        <img src="/HangHive.png" alt="HangHive" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]" />
                        <span className="font-bold font-mono tracking-widest text-sm">HANG<span className="text-hanghive-cyan">HIVE</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        {user ? (
                            <div className="flex items-center gap-2">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => navigate('/dashboard')}
                                    className="px-5 py-2 text-sm font-mono font-semibold text-hanghive-dark bg-gradient-to-r from-hanghive-cyan to-hanghive-blue rounded-lg shadow-lg shadow-hanghive-cyan/20 flex items-center gap-2 group"
                                >
                                    <Zap className="w-4 h-4 group-hover:animate-pulse" />
                                    OPEN_DASHBOARD
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => {
                                        localStorage.removeItem('hanghive_user');
                                        setUser(null);
                                    }}
                                    className="px-5 py-2 text-sm font-mono font-semibold text-gray-500 border border-white/10 rounded-lg hover:text-white hover:bg-white/5 transition-all"
                                >
                                    SIGN_OUT
                                </motion.button>
                            </div>
                        ) : (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setShowLogin(true)}
                                    className="px-5 py-2 text-sm font-mono font-semibold text-hanghive-cyan border border-hanghive-cyan/40 rounded-lg hover:bg-hanghive-cyan/10 transition-all"
                                >
                                    LOGIN
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setShowLogin(true)}
                                    className="px-5 py-2 text-sm font-mono font-semibold text-hanghive-dark bg-gradient-to-r from-hanghive-cyan to-hanghive-blue rounded-lg shadow-lg shadow-hanghive-cyan/20"
                                >
                                    JOIN_FREE
                                </motion.button>
                            </>
                        )}
                    </div>
                </motion.nav>

                {/* Hero */}
                <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative">
                    {/* Glow orb */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40"
                        style={{ background: 'radial-gradient(circle, rgba(0,229,255,0.1) 0%, transparent 70%)' }} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="mb-8"
                    >
                        <motion.img
                            src="/HangHive.png"
                            alt="HangHive"
                            animate={{ y: [0, -8, 0], rotate: [0, 2, 0, -2, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-32 h-32 object-contain mx-auto drop-shadow-[0_0_40px_rgba(0,229,255,0.4)]"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.7 }}
                        className="mb-3"
                    >
                        <span className="text-xs font-mono text-hanghive-cyan tracking-[0.4em] uppercase opacity-70 group cursor-default">
                            {user ? `// WELCOME BACK, ${user.username.toUpperCase()}` : '// WELCOME TO THE HIVE'}
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.7 }}
                        className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none"
                    >
                        <span className="text-white">YOUR COMMUNITY,</span>
                        <br />
                        <span className="bg-gradient-to-r from-hanghive-cyan via-hanghive-blue to-hanghive-purple bg-clip-text text-transparent italic">
                            AMPLIFIED.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.7 }}
                        className="text-gray-400 text-lg max-w-xl mb-10 leading-relaxed font-light"
                    >
                        HangHive is the next-gen platform for communities that refuse to be ordinary.
                        Real-time chat, voice, and collaboration — all in one cyberpunk-grade hub.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.7 }}
                        className="flex flex-col sm:flex-row gap-4 items-center"
                    >
                        {user ? (
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,229,255,0.4)' }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => navigate('/dashboard')}
                                className="px-10 py-4 bg-gradient-to-r from-hanghive-cyan to-hanghive-blue text-hanghive-dark font-black font-mono text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-hanghive-cyan/30 transition-all"
                            >
                                CONTINUE_SESSION <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0,229,255,0.4)' }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setShowLogin(true)}
                                className="px-10 py-4 bg-gradient-to-r from-hanghive-cyan to-hanghive-blue text-hanghive-dark font-black font-mono text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-hanghive-cyan/30 transition-all"
                            >
                                ENTER_THE_HIVE <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        )}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={scrollToFeatures}
                            className="px-10 py-4 border border-white/15 text-gray-300 font-mono text-sm rounded-xl hover:bg-white/5 hover:border-white/30 transition-all"
                        >
                            EXPLORE_FEATURES
                        </motion.button>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.7 }}
                        className="flex gap-10 mt-16 text-center"
                    >
                        {[['10K+', 'ACTIVE_NODES'], ['500+', 'HIVE_SERVERS'], ['99.9%', 'UPTIME']].map(([val, label]) => (
                            <div key={label} className="group cursor-default">
                                <div className="text-2xl font-black text-hanghive-cyan font-mono group-hover:text-white transition-colors">{val}</div>
                                <div className="text-[10px] text-gray-500 font-mono tracking-wider mt-1">{label}</div>
                            </div>
                        ))}
                    </motion.div>
                </main>

                {/* Features */}
                <section ref={featuresRef} className="px-8 pb-32 max-w-5xl mx-auto w-full pt-20">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="text-center mb-16"
                    >
                        <p className="text-xs font-mono text-hanghive-purple tracking-[0.4em] uppercase opacity-70 mb-2">// CORE_MODULES</p>
                        <h2 className="text-4xl font-bold text-white tracking-tight">Everything your community needs</h2>
                    </motion.div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((f) => <FeatureCard key={f.title} {...f} />)}
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-white/5 px-8 py-5 flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-600">HIVE_OS_V1.0 // ALL_RIGHTS_RESERVED</span>
                    <div className="flex gap-4 text-[10px] font-mono text-gray-600">
                        <a href="#" className="hover:text-hanghive-cyan transition-colors">PRIVACY</a>
                        <a href="#" className="hover:text-hanghive-cyan transition-colors">TERMS</a>
                        <a href="#" className="hover:text-hanghive-cyan transition-colors">SUPPORT</a>
                    </div>
                </footer>
            </div>

            {/* Login Modal */}
            <AnimatePresence>
                {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
