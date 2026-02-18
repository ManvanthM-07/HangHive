import React from 'react';
import LandingPage from './pages/LandingPage';
import Intro from './components/Intro';

function App() {
    const [showIntro, setShowIntro] = React.useState(true);

    if (showIntro) {
        return <Intro onComplete={() => setShowIntro(false)} />;
    }

    return <LandingPage />;
}

export default App;
