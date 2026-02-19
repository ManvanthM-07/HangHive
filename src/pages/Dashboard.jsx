import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, Hash, MessageSquare, Mic, Video,
    Settings, Search, Bell, Plus, LogOut,
    Send, Terminal, Shield, Zap, Globe
} from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeRoom, setActiveRoom] = useState('general');
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [ws, setWs] = useState(null);
    const [voiceWs, setVoiceWs] = useState(null);
    const [videoWs, setVideoWs] = useState(null);
    const [isVoiceConnected, setIsVoiceConnected] = useState(false);
    const [isVideoConnected, setIsVideoConnected] = useState(false);
    const scrollRef = useRef(null);

    const rooms = [
        { id: 'general', name: 'general-lounge', icon: Globe, color: '#00e5ff' },
        { id: 'art', name: 'art-exhibition', icon: Zap, color: '#d500f9' },
        { id: 'gaming', name: 'gaming-room', icon: Shield, color: '#76ff03' },
        { id: 'friends', name: 'friends-hub', icon: Users, color: '#2979ff' },
        { id: 'study', name: 'study-group', icon: Terminal, color: '#ffea00' },
    ];

    useEffect(() => {
        const storedUser = localStorage.getItem('hanghive_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);

    // Chat WebSocket session
    useEffect(() => {
        if (!user) return;

        const clientId = parseInt(user.id.split('-')[0], 16) || Date.now();
        const socket = new WebSocket(`ws://${window.location.host}/ws/${activeRoom}/${clientId}`);

        socket.onopen = () => {
            console.log(`Connected to chat: ${activeRoom}`);
            setMessages([]);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, data]);
        };

        setWs(socket);

        return () => socket.close();
    }, [user, activeRoom]);

    // Cleanup voice/video on unmount or room change
    useEffect(() => {
        return () => {
            if (voiceWs) voiceWs.close();
            if (videoWs) videoWs.close();
        };
    }, [activeRoom]);

    const handleVoiceClick = () => {
        if (isVoiceConnected) {
            voiceWs?.close();
            setVoiceWs(null);
            setIsVoiceConnected(false);
            return;
        }

        const clientId = user.username.toLowerCase().replace(/\s/g, '_');
        const socket = new WebSocket(`ws://${window.location.host}/ws/voice/${activeRoom}/${clientId}`);

        socket.onopen = () => setIsVoiceConnected(true);
        socket.onclose = () => setIsVoiceConnected(false);
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            console.log("Voice Signaling Payload:", data);
        };

        setVoiceWs(socket);
    };

    const handleVideoClick = () => {
        if (isVideoConnected) {
            videoWs?.close();
            setVideoWs(null);
            setIsVideoConnected(false);
            return;
        }

        const clientId = user.username.toLowerCase().replace(/\s/g, '_');
        const socket = new WebSocket(`ws://${window.location.host}/ws/video/${activeRoom}/${clientId}`);

        socket.onopen = () => setIsVideoConnected(true);
        socket.onclose = () => setIsVideoConnected(false);
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            console.log("Video Signaling Payload:", data);
        };

        setVideoWs(socket);
    };

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (inputText.trim() && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(inputText);
            setInputText('');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('hanghive_user');
        navigate('/');
    };

    if (!user) return null;

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-gray-300 font-sans selection:bg-hanghive-cyan/30">
            {/* Server Sidebar */}
            <div className="w-[72px] bg-[#050508] border-r border-white/5 flex flex-col items-center py-4 gap-4">
                <div className="w-12 h-12 bg-hanghive-cyan/20 rounded-2xl flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-300 group">
                    <img src="/HangHive.png" alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <div className="w-8 h-[2px] bg-white/10 rounded-full" />
                {rooms.map((room) => (
                    <div
                        key={room.id}
                        onClick={() => setActiveRoom(room.id)}
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 group
                            ${activeRoom === room.id ? 'rounded-2xl bg-white/10' : 'hover:rounded-2xl hover:bg-white/5'}
                        `}
                    >
                        {activeRoom === room.id && (
                            <div className="absolute -left-4 w-2 h-8 bg-white rounded-r-full" />
                        )}
                        <room.icon className="w-5 h-5" style={{ color: activeRoom === room.id ? room.color : '#666' }} />
                    </div>
                ))}
                <div className="mt-auto w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-white/30 transition-all">
                    <Plus className="w-5 h-5 text-white/40" />
                </div>
            </div>

            {/* Room Sidebar */}
            <div className="w-60 bg-[#08080c] border-r border-white/5 flex flex-col">
                <div className="h-14 border-b border-white/5 flex items-center px-4 font-bold text-white tracking-tight">
                    <span className="text-hanghive-cyan mr-1 font-mono">#</span>
                    {rooms.find(r => r.id === activeRoom)?.name.toUpperCase()}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Text Channels</div>
                    {rooms.map(r => (
                        <div
                            key={r.id}
                            onClick={() => setActiveRoom(r.id)}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all
                                ${activeRoom === r.id ? 'bg-white/5 text-white' : 'hover:bg-white/5 text-gray-500 hover:text-gray-300'}
                            `}
                        >
                            <Hash className="w-4 h-4 opacity-40" />
                            <span className="text-sm font-medium">{r.name}</span>
                        </div>
                    ))}

                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2 mt-6">Voice / Video</div>
                    <div
                        onClick={handleVoiceClick}
                        className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-all group
                            ${isVoiceConnected ? 'bg-green-500/10 text-green-400' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}
                        `}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isVoiceConnected ? 'bg-green-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                            <Mic className={`w-4 h-4 ${isVoiceConnected ? 'animate-pulse' : 'opacity-40'}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">Voice Call</span>
                            <span className="text-[9px] font-mono opacity-50 uppercase tracking-widest">
                                {isVoiceConnected ? 'ACTIVE_SESSION' : 'READY_TO_JOIN'}
                            </span>
                        </div>
                    </div>

                    <div
                        onClick={handleVideoClick}
                        className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-all group mt-1
                            ${isVideoConnected ? 'bg-hanghive-cyan/10 text-hanghive-cyan' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}
                        `}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isVideoConnected ? 'bg-hanghive-cyan/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                            <Video className={`w-4 h-4 ${isVideoConnected ? 'animate-bounce' : 'opacity-40'}`} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold">Video Feed</span>
                            <span className="text-[9px] font-mono opacity-50 uppercase tracking-widest">
                                {isVideoConnected ? 'STREAMING_LIVE' : 'IDLE_STREAM'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* User Bar */}
                <div className="p-3 bg-[#050508] border-t border-white/5 flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-hanghive-cyan to-hanghive-purple p-[1px]">
                        <div className="w-full h-full rounded-full bg-[#050508] flex items-center justify-center text-[10px] font-bold text-white">
                            {user.username.slice(0, 2).toUpperCase()}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{user.username}</div>
                        <div className="text-[10px] text-gray-500 font-mono">#ONLINE</div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={handleLogout} className="p-1.5 hover:bg-white/10 rounded transition-all text-gray-500 hover:text-red-400">
                            <LogOut className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 hover:bg-white/10 rounded transition-all text-gray-500 hover:text-white">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0b0b12]">
                <div className="h-14 border-b border-white/5 flex items-center px-4 justify-between">
                    <div className="flex items-center gap-2 font-bold text-white">
                        <Hash className="w-5 h-5 text-gray-600" />
                        <span>{rooms.find(r => r.id === activeRoom)?.name}</span>
                    </div>
                    <div className="flex gap-4">
                        <Search className="w-5 h-5 text-gray-600 hover:text-gray-300 cursor-pointer" />
                        <Bell className="w-5 h-5 text-gray-600 hover:text-gray-300 cursor-pointer" />
                        <Users className="w-5 h-5 text-gray-600 hover:text-gray-300 cursor-pointer" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-20">
                            <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center mb-4">
                                <MessageSquare className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">Beginning of history</h3>
                            <p className="max-w-xs text-sm mt-2">This is the start of the #{rooms.find(r => r.id === activeRoom)?.name} channel.</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className="flex gap-4 group hover:bg-white/[0.02] -mx-6 px-6 py-1">
                            {msg.type === 'system' ? (
                                <div className="flex-1 text-center py-2">
                                    <span className="text-[10px] font-mono text-hanghive-cyan bg-hanghive-cyan/5 px-2 py-0.5 rounded border border-hanghive-cyan/10">
                                        SYSTEM: {msg.content}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-gray-500 mt-1">
                                        {msg.sender === (parseInt(user.id.split('-')[0], 16) || 0) ? 'ME' : 'ID'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm font-bold text-white hover:underline cursor-pointer">
                                                {msg.sender === (parseInt(user.id.split('-')[0], 16) || 0) ? user.username : `User #${msg.sender}`}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-mono">TODAY AT {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="text-sm text-gray-300 leading-relaxed mt-0.5">{msg.content}</div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                    <div ref={scrollRef} />
                </div>

                <div className="p-4">
                    <form onSubmit={handleSend} className="bg-[#15151e] rounded-xl border border-white/5 focus-within:border-hanghive-cyan/30 transition-all flex items-center px-4 relative">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center mr-3 hover:bg-white/10 cursor-pointer">
                            <Plus className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder={`Message #${rooms.find(r => r.id === activeRoom)?.name}`}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="flex-1 bg-transparent py-3 text-sm focus:outline-none text-white placeholder:text-gray-600"
                        />
                        <button type="submit" className="p-2 text-gray-600 hover:text-hanghive-cyan transition-all">
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <div className="text-[9px] font-mono text-gray-600 mt-2 ml-1 tracking-wider">
                        ENCRYPTED_SIGNAL_STREAM_V1.2 // SECURED_BY_HANGHIVE
                    </div>
                </div>
            </div>

            {/* Members Panel */}
            <div className="w-60 bg-[#08080c] border-l border-white/5 hidden lg:flex flex-col">
                <div className="h-14 border-b border-white/5 flex items-center px-4 font-bold text-gray-500 text-xs uppercase tracking-widest">
                    Members — 1
                </div>
                <div className="p-3 space-y-4">
                    <div>
                        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 mb-2">Online — 1</div>
                        <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer opacity-100 group">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-xl bg-hanghive-cyan/20 flex items-center justify-center font-bold text-hanghive-cyan text-xs">
                                    {user.username.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#08080c] rounded-full flex items-center justify-center">
                                    <div className="w-2 h-2 bg-[#76ff03] rounded-full" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-white truncate">{user.username}</div>
                                <div className="text-[10px] text-gray-500 truncate">Listening to hive...</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
