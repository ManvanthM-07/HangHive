const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const CONFIG = {
    API_BASE_URL: isDev ? 'http://localhost:8000' : 'https://hanghive-backend-rxyh.onrender.com',
    WS_BASE_URL: isDev ? 'ws://localhost:8000' : 'wss://hanghive-backend-rxyh.onrender.com'
};

export default CONFIG;
