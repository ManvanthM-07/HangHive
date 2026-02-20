import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, Hash, MessageSquare, Mic, Video, MicOff, VideoOff,
    Settings, Search, Bell, Plus, LogOut,
    Send, Terminal, Shield, Zap, Globe, LogIn,
    Palette, Gamepad2, Book, Coffee, Briefcase, Rocket,
    ChevronRight, Lock
} from 'lucide-react';
import CONFIG from '../config';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [communities, setCommunities] = useState([
        { id: 'general', name: 'General Lounge', icon: Globe, color: '#00e5ff', visibility: 'public', purpose: 'general' }
    ]);
    const [activeCommunity, setActiveCommunity] = useState('general');
    const [activeRoom, setActiveRoom] = useState('lobby'); // Default room within a community
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [ws, setWs] = useState(null);
    const [voiceWs, setVoiceWs] = useState(null);
    const [videoWs, setVideoWs] = useState(null);
    const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
    const [isVoiceConnected, setIsVoiceConnected] = useState(false);
    const [isVideoConnected, setIsVideoConnected] = useState(false);
    const [voiceParticipants, setVoiceParticipants] = useState([]);
    const [videoParticipants, setVideoParticipants] = useState([]);
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const scrollRef = useRef(null);
    const localStream = useRef(null);
    const peerConnections = useRef({}); // client_id -> RTCPeerConnection
    const [remoteStreams, setRemoteStreams] = useState({}); // client_id -> MediaStream

    // Dynamic Rooms per community (mock for now, will be dynamic later)
    const communityRooms = {
        'general': [
            { id: 'lobby', name: 'lounge-lobby', icon: MessageSquare },
            { id: 'news', name: 'hive-broadcast', icon: Zap },
        ],
        // Other communities will fetch rooms from backend
    };

    const currentRooms = communityRooms[activeCommunity] || [
        { id: 'lobby', name: 'lobby', icon: Hash }
    ];

    const handleSwitchCommunity = (commId) => {
        setActiveCommunity(commId);
        // Default to 'lobby' or first available room, ensuring we never have an undefined activeRoom
        const rooms = communityRooms[commId] || [{ id: 'lobby', name: 'lobby', icon: Hash }];
        if (rooms.length > 0) {
            setActiveRoom(rooms[0].id);
        } else {
            setActiveRoom('lobby');
        }
    };

    // Icon & Color Mapping based on Purpose
    const getCommunityMeta = (purpose) => {
        if (!purpose) purpose = 'others';
        const mapping = {
            'art': { icon: Palette, color: '#ff4081' },
            'gaming': { icon: Gamepad2, color: '#7c4dff' },
            'study': { icon: Book, color: '#00e676' },
            'friends': { icon: Coffee, color: '#ff9100' },
            'work': { icon: Briefcase, color: '#2979ff' },
            'personal': { icon: Terminal, color: '#76ff03' },
            'others': { icon: Rocket, color: '#f50057' },
            'general': { icon: Globe, color: '#00e5ff' }
        };
        return mapping[purpose.toLowerCase()] || { icon: Globe, color: '#d500f9' };
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('hanghive_user');
        if (!storedUser) {
            navigate('/');
            return;
        }

        try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);

            // Fetch communities owned by user
            const fetchUserCommunities = async () => {
                try {
                    const res = await fetch(`${CONFIG.API_BASE_URL}/communities/?owner_id=${parsedUser.id}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.length > 0) {
                            // Filter out duplicates if General Lounge is somehow in DB
                            setCommunities(prev => {
                                const base = prev.filter(c => c.id === 'general');
                                const owned = data.map(c => {
                                    const meta = getCommunityMeta(c.purpose);
                                    return {
                                        ...c,
                                        icon: meta.icon,
                                        color: meta.color
                                    };
                                });
                                return [...base, ...owned];
                            });
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch user communities:", err);
                }
            };
            // Fetch official system communities
            const fetchSystemCommunities = async () => {
                // We no longer add system communities to the sidebar by default to keep it clean.
                // They are accessible via the Discovery (Globe) button.
                try {
                    const res = await fetch(`${CONFIG.API_BASE_URL}/system-communities/system-nodes`);
                    if (res.ok) {
                        const data = await res.json();
                        // Store them locally if needed for lookup, but don't clutter sidebar
                        // For now we just let the Discovery Modal handle them.
                    }
                } catch (err) {
                    console.error("Failed to fetch system communities:", err);
                }
            };

            fetchUserCommunities();
            fetchSystemCommunities();
        } catch (e) {
            console.error("Failed to parse user data", e);
            localStorage.removeItem('hanghive_user');
            navigate('/');
        }
    }, [navigate]);

    // Chat WebSocket session
    useEffect(() => {
        if (!user || !user.id) return;

        const clientId = String(user.id).split('-')[0];
        // Unique room key to prevent cross-community chat leaks and registry collisions
        const roomKey = `${activeCommunity}-${activeRoom}`;
        const socket = new WebSocket(`${CONFIG.WS_BASE_URL}/ws/${roomKey}/${clientId}?username=${encodeURIComponent(user.username)}`);

        socket.onopen = () => {
            console.log(`Connected to chat: ${roomKey} as ${clientId}`);
            setMessages([]);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setMessages(prev => [...prev, data]);
        };

        setWs(socket);

        return () => {
            console.log("Cleaning up WebSocket session...");
            socket.close();
        };
    }, [user, activeCommunity, activeRoom]);

    // Cleanup voice/video on unmount or room change
    useEffect(() => {
        return () => {
            if (voiceWs) voiceWs.close();
            if (videoWs) videoWs.close();
            setVoiceParticipants([]);
            setVideoParticipants([]);
        };
    }, [activeRoom]);

    const handleVoiceClick = async () => {
        if (isVoiceConnected) {
            voiceWs?.close();
            setVoiceWs(null);
            setIsVoiceConnected(false);
            setVoiceParticipants([]);
            // Cleanup WebRTC
            if (localStream.current) {
                localStream.current.getTracks().forEach(track => track.stop());
                localStream.current = null;
            }
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(`ENDED_VOICE_CALL`);
            }
            return;
        }

        if (!user || !user.id) return;
        const clientId = String(user.id).split('-')[0];
        const roomKey = `${activeCommunity}-${activeRoom}`;

        try {
            localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const socket = new WebSocket(`${CONFIG.WS_BASE_URL}/ws/voice/${roomKey}/${clientId}?username=${encodeURIComponent(user.username)}`);

            socket.onopen = () => {
                setIsVoiceConnected(true);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(`STARTED_VOICE_CALL`);
                }
            };

            socket.onmessage = async (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'voice_participants') {
                    setVoiceParticipants(data.participants);
                    // Participants list changed, check for new users
                    data.participants.forEach(p => {
                        // Polite Peer: Only the one with the 'smaller' ID initiates the connection
                        // This prevents 'glare' where both sides try to call each other at once.
                        if (p.id !== clientId && !peerConnections.current[p.id] && clientId < p.id) {
                            createPeer(p.id, true, 'voice', socket);
                        }
                    });
                } else if (data.target && data.target !== clientId) {
                    // Signaling Filtering: Ignore messages not intended for us
                    return;
                } else if (data.type === 'offer') {
                    await createPeer(data.sender, false, 'voice', socket, data.offer);
                } else if (data.type === 'answer') {
                    await peerConnections.current[data.sender]?.setRemoteDescription(new RTCSessionDescription(data.answer));
                } else if (data.type === 'candidate') {
                    await peerConnections.current[data.sender]?.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            };

            setVoiceWs(socket);
        } catch (err) {
            console.error("Failed to start voice call:", err);
        }
    };

    const handleVideoClick = async () => {
        if (isVideoConnected) {
            videoWs?.close();
            setVideoWs(null);
            setIsVideoConnected(false);
            setVideoParticipants([]);
            // Cleanup WebRTC
            if (localStream.current) {
                localStream.current.getTracks().forEach(track => track.stop());
                localStream.current = null;
            }
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(`ENDED_VIDEO_STREAM`);
            }
            return;
        }

        if (!user || !user.id) return;
        const clientId = String(user.id).split('-')[0];
        const roomKey = `${activeCommunity}-${activeRoom}`;

        try {
            localStream.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const socket = new WebSocket(`${CONFIG.WS_BASE_URL}/ws/video/${roomKey}/${clientId}?username=${encodeURIComponent(user.username)}`);

            socket.onopen = () => {
                setIsVideoConnected(true);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(`STARTED_VIDEO_STREAM`);
                }
            };

            socket.onmessage = async (e) => {
                const data = JSON.parse(e.data);
                if (data.type === 'video_participants') {
                    setVideoParticipants(data.participants);
                    data.participants.forEach(p => {
                        // Polite Peer logic
                        if (p.id !== clientId && !peerConnections.current[p.id] && clientId < p.id) {
                            createPeer(p.id, true, 'video', socket);
                        }
                    });
                } else if (data.target && data.target !== clientId) {
                    // Signaling Filtering
                    return;
                } else if (data.type === 'offer') {
                    await createPeer(data.sender, false, 'video', socket, data.offer);
                } else if (data.type === 'answer') {
                    await peerConnections.current[data.sender]?.setRemoteDescription(new RTCSessionDescription(data.answer));
                } else if (data.type === 'candidate') {
                    await peerConnections.current[data.sender]?.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            };

            setVideoWs(socket);
        } catch (err) {
            console.error("Failed to start video call:", err);
        }
    };

    const toggleMic = () => {
        if (localStream.current) {
            const audioTracks = localStream.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMicMuted(!isMicMuted);
        }
    };

    const toggleCamera = () => {
        if (localStream.current) {
            const videoTracks = localStream.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    const createPeer = async (targetId, initiator, type, socket, offer = null) => {
        if (peerConnections.current[targetId]) return;

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });

        peerConnections.current[targetId] = pc;

        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                pc.addTrack(track, localStream.current);
            });
        }

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.send(JSON.stringify({
                    type: "candidate",
                    target: targetId,
                    sender: String(user.id).split('-')[0],
                    candidate: event.candidate
                }));
            }
        };

        pc.ontrack = (event) => {
            console.log(`Received remote track from ${targetId}`, event.streams[0]);
            setRemoteStreams(prev => ({
                ...prev,
                [targetId]: event.streams[0]
            }));
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                pc.close();
                delete peerConnections.current[targetId];
                setRemoteStreams(prev => {
                    const next = { ...prev };
                    delete next[targetId];
                    return next;
                });
            }
        };

        if (initiator) {
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.send(JSON.stringify({
                    type: "offer",
                    target: targetId,
                    sender: String(user.id).split('-')[0],
                    offer: offer
                }));
            } catch (err) {
                console.error("Create Offer failed:", err);
            }
        } else if (offer) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.send(JSON.stringify({
                    type: "answer",
                    target: targetId,
                    sender: String(user.id).split('-')[0],
                    answer: answer
                }));
            } catch (err) {
                console.error("Create Answer failed:", err);
            }
        }
    };

    const CallOverlay = ({ type, participants, onLeave }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-[60] bg-[#0a0a0f] flex flex-col p-6 overflow-hidden"
        >
            {/* Call Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'video' ? 'bg-hanghive-cyan/20' : 'bg-green-500/20'}`}>
                        {type === 'voice' ? <Mic className="w-6 h-6 text-green-400" /> : <Video className="w-6 h-6 text-hanghive-cyan" />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight uppercase">
                            {type === 'voice' ? 'Voice Conference' : 'Video Transmission'}
                        </h2>
                        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">
                            {participants.length} Participant{participants.length !== 1 ? 's' : ''} // Encrypted Node
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={onLeave}
                        className="px-6 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-bold text-xs transition-all uppercase tracking-widest"
                    >
                        Disconnect
                    </button>
                </div>
            </div>

            {/* Stream Grid */}
            <div className={`flex-1 grid gap-6 min-h-0 ${participants.length === 1 ? 'grid-cols-1' :
                    participants.length === 2 ? 'grid-cols-2' :
                        participants.length <= 4 ? 'grid-cols-2' :
                            'grid-cols-3'
                }`}>
                {participants.map((p) => {
                    const isMe = p.id === String(user.id).split('-')[0];
                    return (
                        <div key={p.id} className="relative group min-h-0">
                            <div className={`h-full rounded-3xl bg-white/[0.02] border border-white/5 overflow-hidden transition-all flex flex-col relative
                                ${type === 'voice' ? 'items-center justify-center p-8' : ''}
                            `}>
                                {type === 'video' ? (
                                    <div className="w-full h-full bg-black/40 flex items-center justify-center relative">
                                        <video
                                            id={`stream-${p.id}`}
                                            autoPlay
                                            playsInline
                                            muted={isMe}
                                            className="w-full h-full object-cover rounded-2xl"
                                            ref={el => {
                                                if (el && isMe) {
                                                    el.srcObject = localStream.current;
                                                } else if (el && remoteStreams[p.id]) {
                                                    el.srcObject = remoteStreams[p.id];
                                                }
                                            }}
                                        />
                                        {/* Overlay Info */}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <div className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white/90 border border-white/10 uppercase tracking-widest">
                                                {isMe ? 'YOU' : p.name.toUpperCase()}
                                            </div>
                                            {!isMe && (
                                                <div className="px-3 py-1 bg-hanghive-cyan/20 backdrop-blur-md rounded-lg text-[10px] font-black text-hanghive-cyan border border-hanghive-cyan/30 uppercase tracking-widest">
                                                    Receiving
                                                </div>
                                            )}
                                            {isMe && isMicMuted && (
                                                <div className="px-3 py-1 bg-red-500/20 backdrop-blur-md rounded-lg text-[10px] font-black text-red-500 border border-red-500/30 uppercase tracking-widest">
                                                    Muted
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-black border-4 ring-8 relative
                                            ${isMe ? 'bg-hanghive-cyan/10 border-hanghive-cyan/30 ring-hanghive-cyan/5 text-hanghive-cyan' : 'bg-white/5 border-white/10 ring-white/[0.02] text-white/40'}
                                        `}>
                                            {p.name.slice(0, 2).toUpperCase()}
                                            {isMe && isMicMuted && (
                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center border-4 border-[#0a0a0f] text-white text-xl">
                                                    <MicOff className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-black text-white uppercase tracking-tight mb-1">{p.name}</div>
                                            <div className={`text-[10px] font-mono uppercase tracking-[0.3em] font-bold ${isMe ? 'text-hanghive-cyan' : 'text-gray-600'}`}>
                                                {isMe ? (isMicMuted ? 'Mic Muted' : 'Source Active') : 'Signal Received'}
                                            </div>
                                        </div>
                                        {!isMe && (
                                            <audio
                                                autoPlay
                                                ref={el => {
                                                    if (el && remoteStreams[p.id]) {
                                                        el.srcObject = remoteStreams[p.id];
                                                    }
                                                }}
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Decorator for grid look */}
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <div className="w-12 h-12 border-t-2 border-r-2 border-white rounded-tr-xl" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Call Controls Bar */}
            <div className="mt-8 pt-6 border-t border-white/5 flex gap-4 justify-center items-center">
                <button
                    onClick={toggleMic}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all border group
                        ${isMicMuted ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}
                    `}
                >
                    {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                {type === 'video' && (
                    <button
                        onClick={toggleCamera}
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all border group
                            ${isCameraOff ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-white'}
                        `}
                    >
                        {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                )}
                <div className="w-[1px] h-8 bg-white/10 mx-2" />
                <button
                    onClick={onLeave}
                    className="h-14 px-8 rounded-2xl bg-red-500 text-white flex items-center justify-center cursor-pointer hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 font-black uppercase tracking-widest text-xs"
                >
                    Leave Call
                </button>
            </div>
        </motion.div>
    );

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

    // ─── Discovery Modal ────────────────────────────────────────────────────────
    const DiscoveryModal = ({ onClose }) => {
        const [view, setView] = useState('browse'); // 'browse', 'create', 'selected'
        const [selectedComm, setSelectedComm] = useState(null);
        const [creationStep, setCreationStep] = useState(1);
        const [newComm, setNewComm] = useState({ name: '', purpose: 'personal', visibility: 'public', description: '' });
        const [publicCommunities, setPublicCommunities] = useState([]);
        const [loading, setLoading] = useState(false);
        const [codeResult, setCodeResult] = useState(null);   // access_code from creation
        const [createdComm, setCreatedComm] = useState(null); // the created community
        const [codeInput, setCodeInput] = useState('');        // user-typed code
        const [codeError, setCodeError] = useState('');        // error message
        const [codeLoading, setCodeLoading] = useState(false); // loading for verify

        useEffect(() => {
            if (view === 'browse') {
                const fetchCommunities = async () => {
                    setLoading(true);
                    try {
                        const [userRes, systemRes] = await Promise.all([
                            fetch(`${CONFIG.API_BASE_URL}/communities/?visibility=public`),
                            fetch(`${CONFIG.API_BASE_URL}/system-communities/system-nodes`)
                        ]);

                        let combined = [];
                        if (userRes.ok) {
                            const userData = await userRes.json();
                            combined = [...combined, ...userData];
                        }
                        if (systemRes.ok) {
                            // We don't want system nodes in the "Community Nodes" section
                            // const systemData = await systemRes.json();
                            // combined = [...combined, ...systemData];
                        }
                        setPublicCommunities(combined);
                    } catch (err) {
                        console.error("Discovery Scan Failed:", err);
                    } finally {
                        setLoading(false);
                    }
                };
                fetchCommunities();
            }
        }, [view]);

        // Reset active room when switching communities
        useEffect(() => {
            const rooms = communityRooms[activeCommunity] || [
                { id: 'general', name: 'general-chat', icon: Hash }
            ];
            if (rooms.length > 0) {
                setActiveRoom(rooms[0].id);
            }
        }, [activeCommunity]);

        const handleJoin = (comm) => {
            const meta = getCommunityMeta(comm.purpose || 'others');
            setCommunities(prev => {
                if (prev.find(c => c.id === comm.id)) return prev;
                return [...prev, { ...comm, icon: meta.icon, color: meta.color }];
            });
            setActiveCommunity(comm.id);
            onClose();
        };

        const handleCreate = async () => {
            if (!user || !user.id) return;
            try {
                const finalName = `${user.username}-${newComm.name}-${newComm.purpose || 'node'}-${newComm.visibility}`.toUpperCase();

                const res = await fetch(`${CONFIG.API_BASE_URL}/communities/?owner_id=${user.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...newComm, name: finalName })
                });
                if (res.ok) {
                    const created = await res.json();
                    const meta = getCommunityMeta(created.purpose);
                    setCommunities(prev => [...prev, { ...created, icon: meta.icon, color: meta.color }]);
                    // Show the code reveal screen
                    setCodeResult(created.access_code);
                    setCreatedComm(created);
                    setView('code_reveal');

                    // Auto-select the new community so when they close/enter, it's there
                    setActiveCommunity(created.id);
                    // Ensure active room is reset
                    const rooms = communityRooms[created.id] || [{ id: 'lobby', name: 'lobby', icon: Hash }];
                    setActiveRoom(rooms[0].id);
                }
            } catch (err) {
                console.error("Node Establishment Failed:", err);
            }
        };

        const handleVerifyCode = async () => {
            if (!codeInput.trim()) return;
            setCodeError('');
            setCodeLoading(true);
            try {
                const res = await fetch(`${CONFIG.API_BASE_URL}/communities/join/${encodeURIComponent(codeInput.trim().toUpperCase())}`);
                if (res.ok) {
                    const comm = await res.json();
                    const meta = getCommunityMeta(comm.purpose || 'others');
                    setCommunities(prev => {
                        if (prev.find(c => String(c.id) === String(comm.id))) return prev;
                        return [...prev, { ...comm, icon: meta.icon, color: meta.color }];
                    });
                    setActiveCommunity(comm.id);
                    const rooms = communityRooms[comm.id] || [{ id: 'lobby', name: 'lobby', icon: Hash }];
                    setActiveRoom(rooms[0].id);
                    onClose();
                } else {
                    const err = await res.json();
                    setCodeError(err.detail || 'Invalid access code.');
                }
            } catch (_) {
                setCodeError('Network error. Check connection.');
            } finally {
                setCodeLoading(false);
            }
        };

        const handleInstantPrivateCreate = async () => {
            if (!user || !user.id) return;
            // Use a local loading state if needed, or just let it fly. 
            // For feedback, we might want to show a spinner, but "Instant" implies speed.
            try {
                const finalName = `${user.username}-${selectedComm.name}-PRIVATE`.toUpperCase();
                const instantNode = {
                    name: finalName,
                    description: selectedComm.description || "Encrypted private channel.",
                    purpose: selectedComm.purpose || "personal",
                    visibility: "private"
                };

                const res = await fetch(`${CONFIG.API_BASE_URL}/communities/?owner_id=${user.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(instantNode)
                });

                if (res.ok) {
                    const created = await res.json();
                    const meta = getCommunityMeta(created.purpose);
                    setCommunities(prev => [...prev, { ...created, icon: meta.icon, color: meta.color }]);

                    // Instant Entry & Reset
                    setActiveCommunity(created.id);
                    const rooms = communityRooms[created.id] || [{ id: 'lobby', name: 'lobby', icon: Hash }];
                    setActiveRoom(rooms[0].id);

                    onClose();
                }
            } catch (err) {
                console.error("Instant Create Failed:", err);
            }
        };

        const containerVariants = {
            hidden: { opacity: 0 },
            visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
            }
        };

        const itemVariants = {
            hidden: { y: 20, opacity: 0 },
            visible: {
                y: 0,
                opacity: 1,
                transition: { type: 'spring', stiffness: 300, damping: 24 }
            }
        };

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.8, y: 40, opacity: 0, filter: 'blur(10px)' }}
                    animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ scale: 0.8, y: 40, opacity: 0, filter: 'blur(10px)' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="w-full max-w-2xl bg-[#08080c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] relative"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Glowing highlight at top */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-hanghive-cyan/50 to-transparent" />
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#050508]">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                {view === 'browse' ? (loading ? 'SCANNING_FREQUENCIES...' : 'DISCOVER_COMMUNITIES') : view === 'create' ? 'ESTABLISH_NEW_NODE' : 'ACCESS_PROTOCOL'}
                            </h2>
                            <p className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-widest">
                                {view === 'browse' ? (loading ? 'RETRIEVING_DATA_FROM_HIVE' : 'SCANNING_PUBLIC_FREQUENCIES') : 'CONFIGURING_SYSTEM_PARAMETERS'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all">
                            <Plus className="w-5 h-5 rotate-45 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {view === 'browse' && (
                            <div className="grid grid-cols-2 gap-3">
                                <motion.div
                                    onClick={() => setView('create')}
                                    whileHover={{ scale: 1.03, y: -3 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="border border-dashed border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-hanghive-cyan/50 hover:bg-hanghive-cyan/5 transition-all cursor-pointer group"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-hanghive-cyan/20 transition-all">
                                        <Plus className="w-5 h-5 text-hanghive-cyan" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-white">CREATE</div>
                                        <div className="text-[9px] text-gray-500 uppercase font-mono">NEW_NODE</div>
                                    </div>
                                </motion.div>

                                <motion.div
                                    onClick={() => setView('private_options')}
                                    whileHover={{ scale: 1.03, y: -3 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="border border-dashed border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-hanghive-purple/50 hover:bg-hanghive-purple/5 transition-all cursor-pointer group"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-hanghive-purple/20 transition-all">
                                        <Shield className="w-5 h-5 text-hanghive-purple" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-white uppercase tracking-tight">Game/Office</div>
                                        <div className="text-[9px] text-gray-500 uppercase font-mono tracking-widest leading-none mt-1">SECURED_NODE</div>
                                    </div>
                                </motion.div>

                                {/* ── Always-visible system nodes ── */}
                                <div className="col-span-2">
                                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em] mb-3">// SYSTEM_NODES</p>
                                </div>
                                {[
                                    { id: 'system_general', purpose: 'general', name: 'General Lounge', description: 'Open hub for all HangHive members. No restrictions.' },
                                    { id: 'system_gaming', purpose: 'gaming', name: 'Gaming Arena', description: 'High-performance gaming community. Connect with players worldwide.' },
                                    { id: 'system_art', purpose: 'art', name: 'Art Exhibition', description: 'Creative canvas for artists, illustrators and designers.' },
                                    { id: 'system_study', purpose: 'study', name: 'Study Hall', description: 'Knowledge base zone for students and researchers.' },
                                    { id: 'system_friends', purpose: 'friends', name: 'Friends Hub', description: 'Social interaction node. Hang out with your crew.' },
                                    { id: 'system_work', purpose: 'work', name: 'Work Desk', description: 'Professional operations hub for teams and colleagues.' },
                                    { id: 'system_personal', purpose: 'personal', name: 'Personal Node', description: 'Private protocol space for solo projects and personal use.' },
                                    { id: 'system_others', purpose: 'others', name: 'Others Hub', description: 'Extended system hub for communities that don\'t fit a category.' },
                                ].map(comm => {
                                    const meta = getCommunityMeta(comm.purpose);
                                    return (
                                        <motion.div
                                            key={comm.id}
                                            onClick={() => { setSelectedComm(comm); setView('selected'); }}
                                            whileHover={{ scale: 1.03, y: -3 }}
                                            whileTap={{ scale: 0.97 }}
                                            className="bg-[#050508] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all hover:border-white/10 relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${meta.color}, transparent)` }} />
                                            <div className="flex items-center justify-between">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                                    <meta.icon className="w-5 h-5" style={{ color: meta.color }} />
                                                </div>
                                                <span className="text-[8px] font-mono text-gray-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 uppercase">
                                                    {comm.purpose}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-tight">{comm.name}</h3>
                                                <p className="text-[9px] text-gray-500 line-clamp-2 mt-0.5">{comm.description}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                {/* ── User-created public communities from API ── */}
                                {publicCommunities.length > 0 && (
                                    <div className="col-span-2 mt-2">
                                        <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.3em] mb-3">// COMMUNITY_NODES</p>
                                    </div>
                                )}
                                {publicCommunities.map(comm => {
                                    const meta = getCommunityMeta(comm.purpose || 'others');
                                    return (
                                        <motion.div
                                            key={comm.id}
                                            onClick={() => { setSelectedComm(comm); setView('selected'); }}
                                            whileHover={{ scale: 1.03, y: -3 }}
                                            whileTap={{ scale: 0.97 }}
                                            className="bg-[#050508] border border-white/5 rounded-2xl p-5 flex flex-col gap-3 cursor-pointer group transition-all hover:border-white/10 relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity" style={{ background: `radial-gradient(circle at top right, ${meta.color}, transparent)` }} />
                                            <div className="flex items-center justify-between">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                                    <meta.icon className="w-5 h-5" style={{ color: meta.color }} />
                                                </div>
                                                <span className="text-[8px] font-mono text-gray-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                                    {comm.purpose?.toUpperCase() || 'NODE'}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white uppercase tracking-tight">{comm.name}</h3>
                                                <p className="text-[9px] text-gray-500 line-clamp-2 mt-0.5">{comm.description || 'No descriptor.'}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {view === 'selected' && selectedComm && (
                            <div className="flex flex-col items-center py-8 text-center">
                                <div className="w-24 h-24 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 group">
                                    {(() => {
                                        const meta = getCommunityMeta(selectedComm.purpose || 'others');
                                        return <meta.icon className="w-10 h-10" style={{ color: meta.color }} />;
                                    })()}
                                </div>
                                <h2 className="text-3xl font-bold text-white mb-2">{selectedComm.name}</h2>
                                <p className="text-gray-400 mb-8 max-w-md">{selectedComm.description || 'No system descriptor available.'}</p>

                                <div className="space-y-3 w-full max-w-md">
                                    <motion.button
                                        onClick={() => handleJoin(selectedComm)}
                                        whileHover={{ x: 4, borderColor: 'rgba(0, 229, 255, 0.5)', backgroundColor: 'rgba(0, 229, 255, 0.05)' }}
                                        className="w-full p-4 rounded-xl border border-white/5 bg-white/5 transition-all flex items-center gap-4 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-hanghive-cyan/20 transition-all">
                                            <LogIn className="w-5 h-5 text-hanghive-cyan" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white uppercase tracking-tight">JOIN_AS_PUBLIC</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-mono">VISIBLE_TO_ALL_HIVE_NODES</div>
                                        </div>
                                    </motion.button>

                                    <motion.button
                                        onClick={() => setView('private_options')}
                                        whileHover={{ x: 4, borderColor: 'rgba(213, 0, 249, 0.5)', backgroundColor: 'rgba(213, 0, 249, 0.05)' }}
                                        className="w-full p-4 rounded-xl border border-white/5 bg-white/5 transition-all flex items-center gap-4 group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-hanghive-purple/20 transition-all">
                                            <Shield className="w-5 h-5 text-hanghive-purple" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white uppercase tracking-tight">REQ_PRIVATE_ENCRYPTION</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-mono">RESTRICTED_ACCESS_ONLY</div>
                                        </div>
                                    </motion.button>
                                </div>

                                <motion.button
                                    onClick={() => setView('browse')}
                                    whileHover={{ opacity: 1, x: -4 }}
                                    className="mt-8 text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2 opacity-50 transition-all"
                                >
                                    <ChevronRight className="w-3 h-3 rotate-180" />
                                    RETURN_TO_FREQUENCIES
                                </motion.button>
                            </div>
                        )}

                        {view === 'private_options' && (
                            <div className="flex flex-col items-center py-8 text-center max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-3xl bg-hanghive-purple/20 flex items-center justify-center mb-6 border border-hanghive-purple/30">
                                    {(() => {
                                        const meta = getCommunityMeta(selectedComm?.purpose || 'others');
                                        return <meta.icon className="w-8 h-8 text-hanghive-purple" />;
                                    })()}
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">
                                    PRIVATE {selectedComm?.purpose?.toUpperCase() || 'NODE'} ARENA
                                </h2>
                                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-10">
                                    Select SECURE {selectedComm?.purpose?.toUpperCase() || 'NODE'} Status
                                </p>

                                <div className="grid grid-cols-2 gap-4 w-full">
                                    <motion.button
                                        onClick={handleInstantPrivateCreate}
                                        whileHover={{ scale: 1.03, y: -3 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="bg-white/5 border border-white/5 rounded-2xl p-6 transition-all cursor-pointer group flex flex-col items-center gap-4 hover:border-hanghive-cyan/40 hover:bg-hanghive-cyan/5"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-hanghive-cyan/20 transition-all">
                                            <Plus className="w-6 h-6 text-hanghive-cyan" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white uppercase">CREATE NODE</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-mono">NEW_{selectedComm?.purpose?.toUpperCase() || 'NODE'}_PROTOCOL</div>
                                        </div>
                                    </motion.button>

                                    <motion.button
                                        onClick={() => setView('enter_code')}
                                        whileHover={{ scale: 1.03, y: -3 }}
                                        whileTap={{ scale: 0.97 }}
                                        className="bg-white/5 border border-white/5 rounded-2xl p-6 transition-all cursor-pointer group flex flex-col items-center gap-4 hover:border-hanghive-purple/40 hover:bg-hanghive-purple/5"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-hanghive-purple/20 transition-all">
                                            <Terminal className="w-6 h-6 text-hanghive-purple" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white uppercase">ENTER CODE</div>
                                            <div className="text-[9px] text-gray-500 uppercase font-mono">JOIN_SECURED_ENVIRONMENT</div>
                                        </div>
                                    </motion.button>
                                </div>

                                <motion.button
                                    onClick={() => setView('browse')}
                                    whileHover={{ opacity: 1, x: -4 }}
                                    className="mt-8 text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2 opacity-50 transition-all"
                                >
                                    <ChevronRight className="w-3 h-3 rotate-180" />
                                    BACK_TO_FREQUENCIES
                                </motion.button>
                            </div>
                        )}

                        {view === 'enter_code' && (
                            <div className="flex flex-col items-center py-8 text-center max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-3xl bg-hanghive-purple/20 flex items-center justify-center mb-6 border border-hanghive-purple/30">
                                    <Terminal className="w-8 h-8 text-hanghive-purple" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1">ACCESS_ENCRYPTED_NODE</h2>
                                <p className="text-[10px] text-gray-500 mb-8 font-mono uppercase tracking-widest">Enter_Access_Protocol_Key</p>

                                <div className="w-full space-y-3">
                                    <input
                                        type="text"
                                        placeholder="HIVE-XXXX-XXXX-XX"
                                        value={codeInput}
                                        onChange={e => { setCodeInput(e.target.value); setCodeError(''); }}
                                        onKeyDown={e => e.key === 'Enter' && handleVerifyCode()}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white text-center focus:outline-none focus:border-hanghive-purple transition-all font-mono tracking-[0.15em] text-lg uppercase"
                                        maxLength={19}
                                    />
                                    {codeError && (
                                        <p className="text-xs text-red-400 font-mono text-center">{codeError}</p>
                                    )}
                                    <motion.button
                                        onClick={handleVerifyCode}
                                        disabled={!codeInput.trim() || codeLoading}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-4 bg-hanghive-purple text-white rounded-xl font-bold hover:bg-hanghive-purple/80 transition-all shadow-[0_0_20px_rgba(213,0,249,0.2)] disabled:opacity-40"
                                    >
                                        {codeLoading ? 'VERIFYING...' : 'VERIFY_ACCESS_KEY'}
                                    </motion.button>
                                </div>

                                <motion.button
                                    onClick={() => { setCodeError(''); setView('private_options'); }}
                                    whileHover={{ opacity: 1, x: -4 }}
                                    className="mt-8 text-[10px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-2 opacity-50 transition-all"
                                >
                                    <ChevronRight className="w-3 h-3 rotate-180" />
                                    BACK_TO_ACCESS_SELECTION
                                </motion.button>
                            </div>
                        )}

                        {view === 'code_reveal' && codeResult && (
                            <div className="flex flex-col items-center py-8 text-center max-w-md mx-auto">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                    className="w-20 h-20 rounded-3xl bg-hanghive-cyan/20 flex items-center justify-center mb-6 border border-hanghive-cyan/40"
                                >
                                    <Shield className="w-10 h-10 text-hanghive-cyan" />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-white mb-1">NODE_ESTABLISHED</h2>
                                <p className="text-xs text-gray-500 mb-2 font-mono">{createdComm?.name}</p>
                                <p className="text-[10px] text-gray-600 mb-8 font-mono uppercase tracking-widest">Share this code to invite members</p>

                                <div className="w-full bg-white/5 border border-hanghive-cyan/30 rounded-2xl p-6 mb-4">
                                    <p className="text-[9px] text-gray-500 uppercase font-mono tracking-widest mb-3">COMMUNITY CODE</p>
                                    <p className="text-2xl font-black text-hanghive-cyan font-mono tracking-[0.2em] drop-shadow-[0_0_20px_rgba(0,229,255,0.5)]">
                                        {codeResult}
                                    </p>
                                </div>

                                <motion.button
                                    onClick={() => navigator.clipboard?.writeText(codeResult)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full mb-3 py-3 bg-hanghive-cyan/10 border border-hanghive-cyan/30 text-hanghive-cyan rounded-xl font-mono text-sm hover:bg-hanghive-cyan/20 transition-all"
                                >
                                    COPY_CODE
                                </motion.button>
                                <motion.button
                                    onClick={onClose}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-mono text-sm hover:bg-white/10 transition-all"
                                >
                                    ENTER_HIVE
                                </motion.button>
                            </div>
                        )}

                        {view === 'create' && (
                            <div className="max-w-md mx-auto py-4 relative overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {creationStep === 1 ? (
                                        <motion.div
                                            key="step1"
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -20, opacity: 0 }}
                                            className="space-y-6"
                                        >
                                            <div>
                                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">COMMUNITY_NAME</label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter identifier..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-hanghive-cyan transition-all font-mono"
                                                    value={newComm.name}
                                                    onChange={e => setNewComm({ ...newComm, name: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 block">DESCRIPTION</label>
                                                <textarea
                                                    placeholder="Describe the node's purpose..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white focus:outline-none focus:border-hanghive-cyan transition-all font-mono min-h-[100px] resize-none"
                                                    value={newComm.description}
                                                    onChange={e => setNewComm({ ...newComm, description: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {[
                                                    { id: 'personal', label: 'PERSONAL', desc: 'PRIVATE_NODE_PROTOCOL', icon: Terminal, color: '#00e5ff' },
                                                    { id: 'gaming', label: 'GAMING', desc: 'HIGH_PERFORMANCE_HUB', icon: Gamepad2, color: '#9333ea' },
                                                    { id: 'art', label: 'ART', desc: 'CREATIVE_CANVAS_SPACE', icon: Palette, color: '#ec4899' },
                                                    { id: 'study', label: 'STUDY', desc: 'KNOWLEDGE_BASE_ZONE', icon: Book, color: '#22c55e' },
                                                    { id: 'friends', label: 'FRIENDS', desc: 'SOCIAL_INTERACTION_NODE', icon: Coffee, color: '#f97316' },
                                                    { id: 'work', label: 'WORK', desc: 'PROFESSIONAL_OPERATIONS', icon: Briefcase, color: '#3b82f6' },
                                                    { id: 'others', label: 'OTHERS', desc: 'EXTENDED_SYSTEM_HUB', icon: Rocket, color: '#ef4444' }
                                                ].map(opt => (
                                                    <motion.button
                                                        key={opt.id}
                                                        onClick={() => setNewComm({ ...newComm, purpose: opt.id })}
                                                        whileHover={{ x: 4 }}
                                                        whileTap={{ scale: 0.99 }}
                                                        className={`p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${newComm.purpose === opt.id ? 'border-hanghive-cyan bg-hanghive-cyan/5 shadow-[0_0_20px_rgba(0,229,255,0.1)]' : 'border-white/5 bg-white/5'}`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${newComm.purpose === opt.id ? 'bg-hanghive-cyan/20' : 'bg-white/5'}`}>
                                                            <opt.icon className="w-5 h-5" style={{ color: newComm.purpose === opt.id ? '#00e5ff' : opt.color }} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-sm font-bold text-white tracking-widest leading-none mb-1">{opt.label}</div>
                                                            <div className="text-[9px] text-gray-500 leading-tight uppercase font-mono tracking-wider">{opt.desc}</div>
                                                        </div>
                                                        {newComm.purpose === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-hanghive-cyan shadow-[0_0_8px_#00e5ff]" />}
                                                    </motion.button>
                                                ))}
                                            </div>
                                            <button
                                                disabled={!newComm.name}
                                                onClick={() => setCreationStep(2)}
                                                className="w-full py-4 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                                            >
                                                NEXT_PROTOCOL
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="step2"
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            exit={{ x: -20, opacity: 0 }}
                                            className="space-y-6"
                                        >
                                            <div className="text-center mb-8">
                                                <h3 className="text-xl font-bold text-white mb-2">VISIBILITY_SETTING</h3>
                                                <p className="text-xs text-gray-500">DETERMINE_WHO_CAN_ACCESS_YOUR_NODE</p>
                                            </div>
                                            <div className="space-y-3">
                                                <motion.button
                                                    onClick={() => setNewComm({ ...newComm, visibility: 'public' })}
                                                    whileHover={{ x: 4 }}
                                                    className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${newComm.visibility === 'public' ? 'border-hanghive-cyan bg-hanghive-cyan/5' : 'border-white/5 bg-white/5'}`}
                                                >
                                                    <Globe className="w-5 h-5 text-hanghive-cyan" />
                                                    <div className="text-left">
                                                        <div className="text-sm font-bold text-white">PUBLIC_VISIBILITY</div>
                                                        <div className="text-[9px] text-gray-500">VISIBLE_TO_ALL_HIVE_NODES</div>
                                                    </div>
                                                </motion.button>
                                                <motion.button
                                                    onClick={() => setNewComm({ ...newComm, visibility: 'private' })}
                                                    whileHover={{ x: 4 }}
                                                    className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${newComm.visibility === 'private' ? 'border-hanghive-purple bg-hanghive-purple/5' : 'border-white/5 bg-white/5'}`}
                                                >
                                                    <Shield className="w-5 h-5 text-hanghive-purple" />
                                                    <div className="text-left">
                                                        <div className="text-sm font-bold text-white">PRIVATE_ENCRYPTION</div>
                                                        <div className="text-[9px] text-gray-500">RESTRICTED_ACCESS_ONLY</div>
                                                    </div>
                                                </motion.button>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => setCreationStep(1)} className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold">BACK</button>
                                                <button onClick={handleCreate} className="flex-1 py-4 bg-hanghive-cyan text-black rounded-xl font-bold">FINALIZE_HUB</button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        );
    };

    if (!user) return null;

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-gray-300 font-sans selection:bg-hanghive-cyan/30">
            <AnimatePresence>
                {isDiscoveryOpen && <DiscoveryModal onClose={() => setIsDiscoveryOpen(false)} />}
            </AnimatePresence>

            {/* Community Sidebar */}
            <div className="w-[72px] bg-[#050508] border-r border-white/5 flex flex-col items-center py-4 gap-4">
                <div className="w-12 h-12 bg-hanghive-cyan/20 rounded-2xl flex items-center justify-center cursor-pointer hover:rounded-xl transition-all duration-300 group">
                    <img src="/HangHive.png" alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <div className="w-8 h-[2px] bg-white/10 rounded-full" />

                {communities.map((comm) => (
                    <motion.div
                        key={comm.id}
                        onClick={() => handleSwitchCommunity(comm.id)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`relative w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 group
                            ${activeCommunity === comm.id ? 'rounded-2xl bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : 'hover:rounded-2xl hover:bg-white/5'}
                        `}
                        title={comm.name}
                    >
                        <AnimatePresence>
                            {activeCommunity === comm.id && (
                                <motion.div
                                    layoutId="active-indicator"
                                    initial={{ height: 0 }}
                                    animate={{ height: 32 }}
                                    exit={{ height: 0 }}
                                    className="absolute -left-4 w-2 bg-white rounded-r-full"
                                />
                            )}
                        </AnimatePresence>

                        {(() => {
                            const meta = getCommunityMeta(comm.purpose || 'others');
                            const Icon = meta.icon;
                            return (
                                <Icon
                                    className={`w-5 h-5 transition-colors ${comm.id === 'general' ? 'animate-pulse' : ''}`}
                                    style={{
                                        color: activeCommunity === comm.id ? (comm.color || meta.color) : '#666',
                                        filter: activeCommunity === comm.id ? `drop-shadow(0 0 8px ${comm.color || meta.color}40)` : 'none'
                                    }}
                                />
                            );
                        })()}

                        {comm.visibility === 'private' && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#0a0a0f] border border-white/10 rounded-full flex items-center justify-center">
                                <Lock className="w-2.5 h-2.5 text-hanghive-purple" />
                            </div>
                        )}

                        {/* Tooltip */}
                        <div className="absolute left-16 px-2 py-1 bg-black/90 backdrop-blur-md text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 border border-white/10">
                            {comm.name.toUpperCase()}
                        </div>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => setIsDiscoveryOpen(true)}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-hanghive-cyan/50 hover:bg-hanghive-cyan/5 transition-all group"
                    title="DISCOVER_COMMUNITIES"
                >
                    <Plus className="w-5 h-5 text-white/40 group-hover:text-hanghive-cyan" />
                </motion.button>
            </div>

            {/* Room Sidebar */}
            <div className="w-60 bg-[#08080c] border-r border-white/5 flex flex-col">
                <div className="h-14 border-b border-white/5 flex items-center px-4 font-bold text-white tracking-tight">
                    <span className="text-hanghive-cyan mr-1 font-mono">#</span>
                    {(communities.find(c => c.id === activeCommunity)?.name || 'Lounge').toUpperCase()}
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-2">Channels</div>
                    {currentRooms.map(r => (
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
                            {(user?.username || 'HU').slice(0, 2).toUpperCase()}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{user?.username}</div>
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

            {/* Main Area */}
            <div className="flex-1 flex flex-col bg-[#0b0b12] relative overflow-hidden">
                <AnimatePresence>
                    {isVoiceConnected && (
                        <CallOverlay
                            type="voice"
                            participants={voiceParticipants}
                            onLeave={handleVoiceClick}
                        />
                    )}
                    {isVideoConnected && (
                        <CallOverlay
                            type="video"
                            participants={videoParticipants}
                            onLeave={handleVideoClick}
                        />
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0f]">
                    <div className="h-14 border-b border-white/5 flex items-center px-4 justify-between">
                        <div className="flex items-center gap-2 font-bold text-white">
                            <span>
                                {(() => {
                                    const comm = communities.find(c => c.id === activeCommunity);
                                    if (!comm) return 'Lounge';
                                    return String(comm.id).startsWith('system_') ? `${comm.name} Collective` : comm.name;
                                })()}
                            </span>
                            <span className="text-[10px] text-gray-600 font-mono ml-2 opacity-50">
                                # {currentRooms.find(r => r.id === activeRoom)?.name || 'lobby'}
                            </span>
                        </div>
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={handleVoiceClick}
                                className={`p-2 rounded-xl transition-all ${isVoiceConnected ? 'bg-green-500/20 text-green-400' : 'text-gray-600 hover:text-gray-300'}`}
                                title="Start Voice Call"
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleVideoClick}
                                className={`p-2 rounded-xl transition-all ${isVideoConnected ? 'bg-hanghive-cyan/20 text-hanghive-cyan' : 'text-gray-600 hover:text-gray-300'}`}
                                title="Start Video Stream"
                            >
                                <Video className="w-5 h-5" />
                            </button>
                            <div className="w-px h-6 bg-white/5 mx-2" />
                            <Search className="w-5 h-5 text-gray-600 hover:text-gray-300 cursor-pointer" />
                            <Bell className="w-5 h-5 text-gray-600 hover:text-gray-300 cursor-pointer" />
                            <Users className="w-5 h-5 text-gray-600 hover:text-gray-300 cursor-pointer" />
                        </div>
                    </div>

                    {/* Access Code Banner for Private Communities */}
                    {communities.find(c => c.id === activeCommunity)?.visibility === 'private' && (
                        <div className="bg-hanghive-purple/10 border-b border-hanghive-purple/20 px-4 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-hanghive-purple" />
                                <span className="text-xs font-bold text-hanghive-purple tracking-wider uppercase">Private Access Code</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-xs text-white font-bold tracking-[0.1em]">{communities.find(c => c.id === activeCommunity)?.access_code || 'LOADING...'}</span>
                                <button
                                    onClick={() => navigator.clipboard.writeText(communities.find(c => c.id === activeCommunity)?.access_code)}
                                    className="text-[10px] text-gray-400 hover:text-white underline decoration-dashed underline-offset-2 uppercase"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-20">
                                <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center mb-4">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold">Beginning of history</h3>
                                <p className="max-w-xs text-sm mt-2">This is the start of the #{currentRooms.find(r => r.id === activeRoom)?.name} channel.</p>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                                className="flex gap-4 group hover:bg-white/[0.02] -mx-6 px-6 py-1 transition-colors"
                            >
                                {msg.type === 'system' || msg.type === 'error' ? (
                                    <div className="flex-1 text-center py-2">
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${msg.type === 'error'
                                            ? 'text-red-400 bg-red-400/5 border-red-400/10'
                                            : 'text-hanghive-cyan bg-hanghive-cyan/5 border-hanghive-cyan/10'
                                            }`}>
                                            {msg.type.toUpperCase()}: {msg.content}
                                        </span>
                                    </div>
                                ) : msg.content === 'STARTED_VOICE_CALL' || msg.content === 'ENDED_VOICE_CALL' || msg.content === 'STARTED_VIDEO_STREAM' || msg.content === 'ENDED_VIDEO_STREAM' ? (
                                    <div className="flex-1 text-center py-1">
                                        <div className={`text-[10px] font-bold uppercase tracking-[0.2em] py-1 px-4 inline-flex items-center gap-2 rounded-lg 
                                            ${msg.content.startsWith('STARTED') ? 'text-green-400 bg-green-400/5' : 'text-gray-500 bg-white/5'}`}>
                                            {msg.content.includes('VOICE') ? <Mic className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                            {msg.sender_name || 'USER'} {msg.content.replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-bold text-gray-500 mt-1 ring-1 ring-white/5">
                                            {String(msg.sender) === String(user?.id).split('-')[0] ? 'ME' : 'ID'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-bold text-white hover:underline cursor-pointer">
                                                    {String(msg.sender) === String(user?.id).split('-')[0] ? user?.username : (msg.sender_name || `User #${msg.sender}`)}
                                                </span>
                                                <span className="text-[10px] text-gray-600 font-mono">TODAY AT {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="text-sm text-gray-300 leading-relaxed mt-0.5">{msg.content}</div>
                                        </div>
                                    </>
                                )}
                            </motion.div>
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
                                placeholder={`Message #${currentRooms.find(r => r.id === activeRoom)?.name}`}
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
        </div >
    );
};

export default Dashboard;
