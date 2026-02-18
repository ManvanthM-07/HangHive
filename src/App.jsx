import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TechnicalBackground from './components/TechnicalBackground';

import Intro from './components/Intro';

function App() {
    const [showIntro, setShowIntro] = React.useState(true);

    if (showIntro) {
        return <Intro onComplete={() => setShowIntro(false)} />;
    }

    return (
        <Router>
            <div className="relative min-h-screen text-white">
                <TechnicalBackground />
                <main className="relative z-10">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/" element={<Navigate to="/login" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
