import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Intro from './components/Intro';

function App() {
    const [showIntro, setShowIntro] = React.useState(true);

    return (
        <BrowserRouter>
            <AnimatePresence mode="wait">
                {showIntro ? (
                    <Intro key="intro" onComplete={() => setShowIntro(false)} />
                ) : (
                    <motion.div
                        key="main-app"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </motion.div>
                )}
            </AnimatePresence>
        </BrowserRouter>
    );
}

export default App;
