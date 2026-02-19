import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Intro from './components/Intro';

function App() {
    const [showIntro, setShowIntro] = React.useState(true);

    return (
        <AnimatePresence>
            {showIntro ? (
                <Intro key="intro" onComplete={() => setShowIntro(false)} />
            ) : (
                <motion.div
                    key="main-app"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                >
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </BrowserRouter>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default App;
