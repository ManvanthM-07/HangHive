import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, Hash, MessageSquare, Mic, Video, MicOff, VideoOff,
    Settings, Search, Bell, Plus, LogOut,
    Send, Terminal, Shield, Zap, Globe, LogIn,
    Palette, Gamepad2, Book, Coffee, Briefcase, Rocket,
    ChevronRight, Lock, Play, Music, Image, Heart, Share2, MoreHorizontal,
    Music2, Layout, Upload, SkipBack, SkipForward, Volume2, List,
    GraduationCap, Building2, University, School, Library, FileText, Inbox, Package
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
    const [roomMembers, setRoomMembers] = useState([]); // Real-time members in the current chat room
    const [isMicMuted, setIsMicMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [mediaTab, setMediaTab] = useState(null); // null = landing grid, 'shorts' | 'exhibition' | 'studio' | 'chat' | 'school' | 'college' | 'office' | 'other'
    const [subTab, setSubTab] = useState(null); // Used for School sub-categories (teacher/student)
    const [mediaItems, setMediaItems] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadType, setUploadType] = useState('image'); // pre-select type in UploadModal
    const scrollRef = useRef(null);
    const localStream = useRef(null);
    const peerConnections = useRef({}); // client_id -> RTCPeerConnection
    const [remoteStreams, setRemoteStreams] = useState({}); // client_id -> MediaStream
    const [audioLevels, setAudioLevels] = useState({}); // client_id -> volume level (0-100)
    const audioInterval = useRef(null);
    const audioContext = useRef(null);
    const analyzers = useRef({}); // client_id -> AnalyserNode

    // Dynamic Rooms per community — useMemo prevents new object creation every render
    const communityRooms = useMemo(() => ({
        'general': [
            { id: 'lobby', name: 'lounge-lobby', icon: MessageSquare },
            { id: 'news', name: 'hive-broadcast', icon: Zap },
        ],
        // Other communities will fetch rooms from backend
    }), []);

    const currentRooms = useMemo(
        () => communityRooms[activeCommunity] || [{ id: 'lobby', name: 'lobby', icon: Hash }],
        [communityRooms, activeCommunity]
    );

    const handleSwitchCommunity = (commId) => {
        setActiveCommunity(commId);
        setMediaTab(null); // Reset Art Dashboard to landing grid when switching communities
        setSubTab(null); // Reset sub-tabs
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

    const currentCommunityObj = useMemo(
        () => communities.find(c => c.id === activeCommunity) || communities[0],
        [communities, activeCommunity]
    );
    const isArtCommunity = currentCommunityObj?.purpose?.toLowerCase() === 'art';
    const isWorkCommunity = currentCommunityObj?.purpose?.toLowerCase() === 'work';
    const currentCommunityId = currentCommunityObj?.id;

    // useCallback gives fetchMedia a stable reference so it doesn't cause
    // stale closures when called from the WebSocket onmessage handler.
    const fetchMedia = useCallback(() => {
        if (!currentCommunityId) return;
        const purpose = currentCommunityObj?.purpose?.toLowerCase();
        if (purpose !== 'art' && purpose !== 'work') return;
        fetch(`${CONFIG.API_BASE_URL}/media/${currentCommunityId}`)
            .then(res => {
                if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setMediaItems(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.warn("Media fetch error (showing empty):", err);
                setMediaItems([]);
            });
    }, [currentCommunityId, currentCommunityObj?.purpose]);

    // Only depend on the stable community ID and mediaTab — not derived booleans
    // that change on every render, which would cause an infinite fetch loop.
    useEffect(() => {
        fetchMedia();
    }, [fetchMedia, mediaTab]);

    // Chat WebSocket session
    useEffect(() => {
        if (!user || !user.id) return;

        const clientId = parseInt(user.id, 10) || String(user.id).split('-')[0];
        const roomKey = `${activeCommunity}-${activeRoom}`;
        console.log(`[MEMBERS_DEBUG] Opening WS: room=${roomKey}, clientId=${clientId}, username=${user.username}`);
        const socket = new WebSocket(`${CONFIG.WS_BASE_URL}/ws/${roomKey}/${clientId}?username=${encodeURIComponent(user.username)}`);

        socket.onopen = () => {
            console.log(`[MEMBERS_DEBUG] Connected: room=${roomKey}, id=${clientId}`);
            setMessages([]);
            setRoomMembers([]);
            socket.send(JSON.stringify({ type: 'get_members' }));
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'room_members') {
                    // Only update state if the member list actually changed to
                    // avoid re-rendering the whole dashboard on every 5-second poll.
                    setRoomMembers(prev => {
                        const next = data.members || [];
                        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
                        return next;
                    });
                } else if (data.type === 'new_media') {
                    console.log("[MEDIA_DEBUG] Real-time media update received:", data);
                    fetchMedia(); // Refresh media items for everyone in the community
                } else {
                    setMessages(prev => [...prev, data]);
                }
            } catch (err) {
                console.error("[CHAT_DEBUG] Parse error:", err);
            }
        };

        socket.onerror = (err) => console.error("[CHAT_DEBUG] WS error:", err);

        setWs(socket);

        // Poll member list every 5 seconds to stay in sync with other users
        const memberPoll = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'get_members' }));
            }
        }, 5000);

        return () => {
            clearInterval(memberPoll);
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

    const cleanupCall = () => {
        // Stop all tracks in local stream
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        // Close all peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        // Clear remote streams
        setRemoteStreams({});
        // Reset mic/camera state for next call session
        setIsMicMuted(false);
        setIsMicMuted(false);
        setIsCameraOff(false);

        // Stop all audio analysis
        if (audioInterval.current) clearInterval(audioInterval.current);
        Object.values(analyzers.current).forEach(a => a.disconnect());
        analyzers.current = {};
        if (audioContext.current) {
            audioContext.current.close().catch(() => { });
            audioContext.current = null;
        }
        setAudioLevels({});
    };

    const setupAudioMonitor = (stream, id) => {
        try {
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const context = audioContext.current;
            const source = context.createMediaStreamSource(stream);
            const analyzer = context.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            analyzers.current[id] = analyzer;

            // Simple loop to update levels
            if (!audioInterval.current) {
                audioInterval.current = setInterval(() => {
                    const newLevels = {};
                    Object.entries(analyzers.current).forEach(([cid, node]) => {
                        const dataArray = new Uint8Array(node.frequencyBinCount);
                        node.getByteFrequencyData(dataArray);
                        const avg = dataArray.reduce((prev, curr) => prev + curr, 0) / dataArray.length;
                        newLevels[cid] = Math.min(100, Math.round(avg * 1.5)); // Scale it for better visibility
                    });
                    setAudioLevels(prev => ({ ...prev, ...newLevels }));
                }, 100);
            }
        } catch (err) {
            console.error("Audio monitor setup failed:", err);
        }
    };

    const handleVoiceClick = async () => {
        if (isVoiceConnected) {
            voiceWs?.close();
            setVoiceWs(null);
            setIsVoiceConnected(false);
            setVoiceParticipants([]);
            cleanupCall();

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(`ENDED_VOICE_CALL`);
            }
            return;
        }

        // Mutual Exclusivity: Close video if active
        if (isVideoConnected) {
            videoWs?.close();
            setVideoWs(null);
            setIsVideoConnected(false);
            setVideoParticipants([]);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(`ENDED_VIDEO_STREAM`);
            }
        }

        // Thorough cleanup before starting new session
        cleanupCall();

        if (!user || !user.id) return;
        const clientId = String(user.id).split('-')[0];
        const roomKey = `${activeCommunity}-${activeRoom}`;

        try {
            localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const socket = new WebSocket(`${CONFIG.WS_BASE_URL}/ws/voice/${roomKey}/${clientId}?username=${encodeURIComponent(user.username)}`);

            socket.onopen = () => {
                setIsVoiceConnected(true);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(`STARTED_VOICE_CALL`);
                }
                if (localStream.current) {
                    setupAudioMonitor(localStream.current, clientId);
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
            cleanupCall();

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(`ENDED_VIDEO_STREAM`);
            }
            return;
        }

        // Mutual Exclusivity: Close voice if active
        if (isVoiceConnected) {
            voiceWs?.close();
            setVoiceWs(null);
            setIsVoiceConnected(false);
            setVoiceParticipants([]);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(`ENDED_VOICE_CALL`);
            }
        }

        // Thorough cleanup before starting new session
        cleanupCall();

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
                if (localStream.current) {
                    setupAudioMonitor(localStream.current, clientId);
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
        // Prevent "flickering" or duplicate connections by checking current state
        const existing = peerConnections.current[targetId];
        if (existing && (existing.connectionState === 'connected' || existing.connectionState === 'connecting')) {
            console.log(`[WEBRTC_DEBUG] Skipping redundant connection to ${targetId}`);
            return;
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        peerConnections.current[targetId] = pc;

        if (localStream.current) {
            localStream.current.getTracks().forEach(track => {
                track.enabled = true; // Ensure track is active when adding
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
            console.log(`Received remote track from ${targetId}:`, event.track.kind);

            setRemoteStreams(prev => {
                const currentStream = prev[targetId] || new MediaStream();
                if (!currentStream.getTracks().find(t => t.id === event.track.id)) {
                    currentStream.addTrack(event.track);
                }
                return { ...prev, [targetId]: currentStream };
            });

            if (event.track.kind === 'audio') {
                // Ensure audio monitor is set up for the stream
                setTimeout(() => {
                    setRemoteStreams(prev => {
                        if (prev[targetId]) setupAudioMonitor(prev[targetId], targetId);
                        return prev;
                    });
                }, 100);
            }
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

    const CallOverlay = ({ type, participants, onLeave, isMicMuted, isCameraOff, toggleMic, toggleCamera, audioLevels }) => (
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
                                                if (el) {
                                                    const stream = isMe ? localStream.current : remoteStreams[p.id];
                                                    if (el.srcObject !== stream) {
                                                        el.srcObject = stream;
                                                    }
                                                    if (stream) {
                                                        el.play().catch(e => console.error("Playback failed:", e));
                                                    }
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
                                        <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-black border-4 ring-8 relative transition-all duration-300
                                            ${isMe ? 'bg-hanghive-cyan/10 border-hanghive-cyan/30 ring-hanghive-cyan/5 text-hanghive-cyan' : 'bg-white/5 border-white/10 ring-white/[0.02] text-white/40'}
                                            ${(audioLevels[p.id] > 10) ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)] scale-105' : ''}
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
                                                {audioLevels[p.id] > 10 ? (
                                                    <span className="text-green-400 animate-pulse">● Speaking</span>
                                                ) : (
                                                    isMe ? (isMicMuted ? 'Mic Muted' : 'Source Active') : 'Signal Received'
                                                )}
                                            </div>
                                        </div>
                                        {!isMe && (
                                            <audio
                                                autoPlay
                                                playsInline
                                                muted={false} // Explicitly unmute remote audio
                                                ref={el => {
                                                    if (el && remoteStreams[p.id]) {
                                                        if (el.srcObject !== remoteStreams[p.id]) {
                                                            console.log(`[WEBRTC_DEBUG] Binding audio for ${p.id}`);
                                                            el.srcObject = remoteStreams[p.id];
                                                        }
                                                        el.play().catch(e => console.error("Audio playback failed:", e));
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
                            isMicMuted={isMicMuted}
                            toggleMic={toggleMic}
                            audioLevels={audioLevels}
                        />
                    )}
                    {isVideoConnected && (
                        <CallOverlay
                            type="video"
                            participants={videoParticipants}
                            onLeave={handleVideoClick}
                            isMicMuted={isMicMuted}
                            isCameraOff={isCameraOff}
                            toggleMic={toggleMic}
                            toggleCamera={toggleCamera}
                            audioLevels={audioLevels}
                        />
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative overflow-hidden bg-[#0a0a0f]">
                    {isArtCommunity ? (
                        <ArtDashboard
                            mediaTab={mediaTab}
                            setMediaTab={setMediaTab}
                            mediaItems={mediaItems}
                            onUpload={(type) => { setUploadType(type); setIsUploading(true); }}
                            messages={messages}
                            inputText={inputText}
                            setInputText={setInputText}
                            handleSend={handleSend}
                            scrollRef={scrollRef}
                            user={user}
                            currentRooms={currentRooms}
                            activeRoom={activeRoom}
                        />
                    ) : isWorkCommunity ? (
                        <WorkDashboard
                            mediaTab={mediaTab}
                            setMediaTab={setMediaTab}
                            subTab={subTab}
                            setSubTab={setSubTab}
                            mediaItems={mediaItems}
                            onUpload={(type) => { setUploadType(type); setIsUploading(true); }}
                            messages={messages}
                            inputText={inputText}
                            setInputText={setInputText}
                            handleSend={handleSend}
                            scrollRef={scrollRef}
                            user={user}
                            currentRooms={currentRooms}
                            activeRoom={activeRoom}
                        />
                    ) : (
                        <>
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
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Upload Modal for Art Communities */}
            <UploadModal
                isOpen={isUploading}
                onClose={() => setIsUploading(false)}
                uploadType={uploadType}
                onUploadSuccess={(type) => {
                    fetchMedia();
                    // Auto-navigate to the relevant tab
                    if (type === 'video') setMediaTab('shorts');
                    else if (type === 'image') setMediaTab('exhibition');
                    else if (type === 'audio') setMediaTab('studio');
                    else if (['school', 'college', 'office', 'other'].includes(type)) setMediaTab(type);
                }}
                currentCommunity={currentCommunityObj}
                user={user}
            />

            {/* Members Panel */}
            <div className="w-60 bg-[#08080c] border-l border-white/5 hidden lg:flex flex-col">
                <div className="h-14 border-b border-white/5 flex items-center px-4 font-bold text-gray-500 text-xs uppercase tracking-widest">
                    Members — {roomMembers.length}
                </div>
                <div className="p-3 space-y-4">
                    <div>
                        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-2 mb-2">Online — {roomMembers.length}</div>
                        <div className="space-y-1">
                            {roomMembers.map((member) => {
                                const isMe = String(member.id) === String(user?.id).split('-')[0];
                                return (
                                    <div key={member.id} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer opacity-100 group">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-xl bg-hanghive-cyan/20 flex items-center justify-center font-bold text-hanghive-cyan text-xs">
                                                {member.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#08080c] rounded-full flex items-center justify-center">
                                                <div className="w-2 h-2 bg-[#76ff03] rounded-full" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-white truncate">
                                                {member.name}
                                                {isMe && <span className="ml-1 text-[10px] text-gray-500">(You)</span>}
                                            </div>
                                            <div className="text-[10px] text-gray-500 truncate">Listening to hive...</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

// ─── Art Community Multimedia Components ──────────────────────────

const ART_TABS = [
    { id: 'shorts', label: 'Shorts', icon: Play, mediaType: 'video', desc: 'Share vertical video clips', color: 'from-red-500/20 to-red-900/10', border: 'border-red-500/20', accent: 'text-red-400' },
    { id: 'exhibition', label: 'Exhibition', icon: Layout, mediaType: 'image', desc: 'Showcase your artwork & photos', color: 'from-violet-500/20 to-violet-900/10', border: 'border-violet-500/20', accent: 'text-violet-400' },
    { id: 'studio', label: 'Studio', icon: Music2, mediaType: 'audio', desc: 'Upload & play music tracks', color: 'from-green-500/20 to-green-900/10', border: 'border-green-500/20', accent: 'text-green-400' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, mediaType: null, desc: 'Talk with the art community', color: 'from-hanghive-cyan/20 to-hanghive-cyan/5', border: 'border-hanghive-cyan/20', accent: 'text-hanghive-cyan' },
];

const WORK_TABS = [
    { id: 'school', label: 'School', icon: GraduationCap, mediaType: 'school', desc: 'Educational projects & material', color: 'from-blue-500/20 to-blue-900/10', border: 'border-blue-500/20', accent: 'text-blue-400' },
    { id: 'college', label: 'College', icon: University, mediaType: 'college', desc: 'Academic study & research', color: 'from-indigo-500/20 to-indigo-900/10', border: 'border-indigo-500/20', accent: 'text-indigo-400' },
    { id: 'office', label: 'Office', icon: Building2, mediaType: 'office', desc: 'Professional tools & collabs', color: 'from-emerald-500/20 to-emerald-900/10', border: 'border-emerald-500/20', accent: 'text-emerald-400' },
    { id: 'other', label: 'Other', icon: Package, mediaType: 'other', desc: 'Miscellaneous work resources', color: 'from-amber-500/20 to-amber-900/10', border: 'border-amber-500/20', accent: 'text-amber-400' },
    { id: 'chat', label: 'Chat', icon: MessageSquare, mediaType: null, desc: 'Professional communication', color: 'from-hanghive-cyan/20 to-hanghive-cyan/5', border: 'border-hanghive-cyan/20', accent: 'text-hanghive-cyan' },
];

const ArtDashboard = ({ mediaTab, setMediaTab, mediaItems = [], onUpload,
    messages = [], inputText, setInputText, handleSend, scrollRef, user, currentRooms = [], activeRoom }) => {

    const activeSection = ART_TABS.find(t => t.id === mediaTab);

    // ── Landing grid (no section selected) ────────────────────────
    const Landing = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050508] min-h-0 overflow-y-auto">
            <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hanghive-cyan/10 border border-hanghive-cyan/20 text-hanghive-cyan text-[10px] font-black uppercase tracking-widest mb-4">
                    <Palette className="w-3 h-3" /> Art Community
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Create & Explore</h1>
                <p className="text-sm text-gray-500">Choose a space to express yourself</p>
            </div>

            <div className="grid grid-cols-2 gap-5 w-full max-w-2xl">
                {ART_TABS.map(({ id, label, icon: Icon, mediaType, desc, color, border, accent }) => {
                    const count = mediaType ? mediaItems.filter(i => i.type === mediaType).length : messages.length;
                    return (
                        <motion.div
                            key={id}
                            whileHover={{ scale: 1.03, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setMediaTab(id)}
                            className={`relative flex flex-col gap-4 p-6 rounded-3xl bg-gradient-to-br ${color} border ${border} cursor-pointer group overflow-hidden`}
                        >
                            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${color} opacity-30 blur-2xl pointer-events-none`} />

                            <div className={`w-14 h-14 rounded-2xl bg-white/5 border ${border} flex items-center justify-center`}>
                                <Icon className={`w-7 h-7 ${accent}`} />
                            </div>

                            <div>
                                <div className="text-lg font-black text-white tracking-tight">{label}</div>
                                <div className="text-xs text-gray-500 mt-1">{desc}</div>
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <span className={`text-[10px] font-bold ${accent} opacity-70`}>
                                    {count} {mediaType ? (mediaType === 'audio' ? 'tracks' : mediaType === 'image' ? 'posts' : 'clips') : 'messages'}
                                </span>
                                {mediaType && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onUpload(mediaType); }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border ${border} hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-all`}
                                    >
                                        <Upload className="w-3 h-3" /> Create
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );

    // ── Section view (after clicking a card) ──────────────────────
    if (!activeSection) return <Landing />;

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#050508]">
            {/* Section Header */}
            <div className={`border-b ${activeSection.border} bg-[#08080c]/70 backdrop-blur-md px-6 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMediaTab(null)}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                    </button>
                    <activeSection.icon className={`w-5 h-5 ${activeSection.accent}`} />
                    <span className="text-sm font-black text-white uppercase tracking-wider">{activeSection.label}</span>
                </div>
                {activeSection.mediaType && (
                    <button
                        onClick={() => onUpload(activeSection.mediaType)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border ${activeSection.border} hover:bg-white/10 ${activeSection.accent} text-[10px] font-black uppercase tracking-widest transition-all`}
                    >
                        <Upload className="w-3.5 h-3.5" /> Add {activeSection.label}
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {mediaTab === 'shorts' && <ShortsFeed items={mediaItems.filter(i => i.type === 'video')} />}
                {mediaTab === 'exhibition' && <ExhibitionGrid items={mediaItems.filter(i => i.type === 'image')} />}
                {mediaTab === 'studio' && <StudioPlayer items={mediaItems.filter(i => i.type === 'audio')} />}

                {mediaTab === 'chat' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center opacity-20">
                                    <MessageSquare className="w-12 h-12 mb-3" />
                                    <h3 className="text-lg font-bold">No messages yet</h3>
                                    <p className="text-xs mt-1">Say something to the art community...</p>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className="flex gap-4 group hover:bg-white/[0.02] rounded-xl px-4 py-1 -mx-4 transition-colors">
                                    {msg.type === 'system' || msg.type === 'error' ? (
                                        <div className="flex-1 text-center py-1">
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-hanghive-cyan bg-hanghive-cyan/5 border-hanghive-cyan/10">{msg.content}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center font-bold text-gray-500 mt-1 ring-1 ring-white/5 flex-shrink-0">
                                                {String(msg.sender) === String(user?.id).split('-')[0] ? 'ME' : 'A'}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-sm font-bold text-white">
                                                        {String(msg.sender) === String(user?.id).split('-')[0] ? user?.username : (msg.sender_name || `User #${msg.sender}`)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600 font-mono">
                                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
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
                            <form onSubmit={handleSend} className="bg-[#15151e] rounded-xl border border-white/5 focus-within:border-hanghive-cyan/30 transition-all flex items-center px-4">
                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center mr-3 hover:bg-white/10 cursor-pointer">
                                    <Plus className="w-4 h-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={`Message #${currentRooms.find(r => r.id === activeRoom)?.name || 'art-chat'}`}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    className="flex-1 bg-transparent py-3 text-sm focus:outline-none text-white placeholder:text-gray-600"
                                />
                                <button type="submit" className="p-2 text-gray-600 hover:text-hanghive-cyan transition-all">
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {activeSection.mediaType && mediaItems.filter(i => i.type === activeSection.mediaType).length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                        <Palette className="w-14 h-14 mb-4" />
                        <h3 className="text-lg font-bold uppercase tracking-widest">No {activeSection.label} Yet</h3>
                        <p className="text-xs mt-2 uppercase tracking-wider">Be the first to inspire the hive</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ShortsFeed = ({ items }) => {
    // Helper to extract YouTube ID from various URL formats
    const getYoutubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url?.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <div className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide">
            {items.map((item, idx) => {
                const ytId = getYoutubeId(item.url);
                return (
                    <div key={idx} className="h-full w-full snap-start relative bg-black flex items-center justify-center">
                        {ytId ? (
                            <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0`}
                                title={item.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <video
                                src={item.url}
                                className="h-full w-auto max-w-full"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        )}
                        <div className="absolute top-6 left-6 z-10">
                            <div className="text-white font-black text-xl tracking-tighter uppercase drop-shadow-lg">{item.title}</div>
                        </div>
                        <div className="absolute bottom-12 right-6 flex flex-col gap-6">
                            <button className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all text-white">
                                    <Heart className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold text-white">LIKE</span>
                            </button>
                            <button className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all text-white">
                                    <MessageSquare className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold text-white">42</span>
                            </button>
                            <button className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all text-white">
                                    <Share2 className="w-6 h-6" />
                                </div>
                            </button>
                        </div>
                        <div className="absolute bottom-12 left-6 max-w-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-hanghive-cyan p-[2px]">
                                    <div className="w-full h-full rounded-xl bg-black flex items-center justify-center font-bold text-hanghive-cyan">A</div>
                                </div>
                                <span className="text-sm font-bold text-white uppercase tracking-wider">Artist Node</span>
                            </div>
                            <h4 className="text-white text-sm font-medium mb-1">{item.title}</h4>
                            <div className="flex items-center gap-2 text-hanghive-cyan">
                                <Music className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest truncate">Original hive audio</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ExhibitionGrid = ({ items }) => {
    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                {items.map((item, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        className="break-inside-avoid relative group rounded-2xl overflow-hidden bg-[#15151e] border border-white/5"
                    >
                        <img src={item.url} alt={item.title} className="w-full h-auto" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all p-4 flex flex-col justify-end">
                            <h4 className="text-white font-bold text-sm tracking-tight">{item.title}</h4>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const WorkResourceGrid = ({ items }) => {
    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5, scale: 1.02 }}
                        onClick={() => window.open(item.url, '_blank')}
                        className="bg-white/5 border border-white/10 rounded-2xl p-6 cursor-pointer hover:bg-white/10 transition-all flex flex-col gap-4 group"
                    >
                        <div className="flex items-start justify-between">
                            <div className="w-12 h-12 rounded-xl bg-hanghive-cyan/10 flex items-center justify-center border border-hanghive-cyan/30">
                                <FileText className="w-6 h-6 text-hanghive-cyan" />
                            </div>
                            <div className="p-2 bg-white/5 rounded-lg opacity-40 group-hover:opacity-100 transition-all">
                                <Plus className="w-4 h-4 text-white rotate-45" />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg mb-1">{item.title}</h4>
                            <p className="text-xs text-gray-500 font-mono tracking-widest break-all">{item.url}</p>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-hanghive-cyan uppercase tracking-tighter">
                            <span>Access Hub Protocol</span>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

const SCHOOL_SUB_TABS = [
    { id: 'school-teacher', label: 'Teacher Hub', icon: Library, desc: 'Lesson plans & resources', color: 'from-blue-600/20 to-blue-900/10', border: 'border-blue-500/30' },
    { id: 'school-student', label: 'Student Space', icon: GraduationCap, desc: 'Submissions & worksheets', color: 'from-cyan-600/20 to-cyan-900/10', border: 'border-cyan-500/30' },
];

const WorkDashboard = ({ mediaTab, setMediaTab, subTab, setSubTab, mediaItems = [], onUpload,
    messages = [], inputText, setInputText, handleSend, scrollRef, user, currentRooms = [], activeRoom }) => {

    const activeSection = WORK_TABS.find(t => t.id === mediaTab);

    // ── School Role Selection ────────────────────────
    const SchoolSelection = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050508] min-h-0 overflow-y-auto">
            <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <School className="w-3 h-3" /> Educational Node
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Identify Your Protocol</h1>
                <p className="text-sm text-gray-500">Access role-specific resources and hubs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                {SCHOOL_SUB_TABS.map(({ id, label, icon: Icon, desc, color, border }) => (
                    <motion.div
                        key={id}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSubTab(id)}
                        className={`relative flex flex-col gap-5 p-8 rounded-[2rem] bg-gradient-to-br ${color} border ${border} cursor-pointer group overflow-hidden`}
                    >
                        <div className={`w-16 h-16 rounded-2xl bg-white/5 border ${border} flex items-center justify-center`}>
                            <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="text-xl font-black text-white tracking-tight leading-none mb-1">{label}</div>
                            <p className="text-xs text-gray-500 font-medium">{desc}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest mt-2 border-t border-white/5 pt-4">
                            Establish Link <ChevronRight className="w-3 h-3" />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );

    // ── Landing grid (no section selected) ────────────────────────
    const Landing = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#050508] min-h-0 overflow-y-auto">
            <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hanghive-cyan/10 border border-hanghive-cyan/20 text-hanghive-cyan text-[10px] font-black uppercase tracking-widest mb-4">
                    <Briefcase className="w-3 h-3" /> Work Community
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Build & Collaborate</h1>
                <p className="text-sm text-gray-500">The hive is ready for your next milestone</p>
            </div>

            <div className="grid grid-cols-2 gap-5 w-full max-w-2xl">
                {WORK_TABS.map(({ id, label, icon: Icon, mediaType, desc, color, border, accent }) => {
                    const count = mediaType ? mediaItems.filter(i => i.type === mediaType).length : messages.length;
                    return (
                        <motion.div
                            key={id}
                            whileHover={{ scale: 1.03, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setMediaTab(id)}
                            className={`relative flex flex-col gap-4 p-6 rounded-3xl bg-gradient-to-br ${color} border ${border} cursor-pointer group overflow-hidden`}
                        >
                            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${color} opacity-30 blur-2xl pointer-events-none`} />

                            <div className={`w-14 h-14 rounded-2xl bg-white/5 border ${border} flex items-center justify-center`}>
                                <Icon className={`w-7 h-7 ${accent}`} />
                            </div>

                            <div>
                                <div className="text-lg font-black text-white tracking-tight">{label}</div>
                                <div className="text-xs text-gray-500 mt-1">{desc}</div>
                            </div>

                            <div className="absolute bottom-6 right-6 flex items-center gap-2">
                                <div className="text-xs font-black text-white">{count}</div>
                                <div className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-green-500' : 'bg-gray-700'}`} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
            <AnimatePresence mode="wait">
                {!mediaTab ? (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 overflow-hidden"
                    >
                        <Landing />
                    </motion.div>
                ) : mediaTab === 'school' && !subTab ? (
                    <motion.div
                        key="school-selection"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 overflow-hidden"
                    >
                        <div className="h-14 flex items-center px-6 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md sticky top-0 z-20">
                            <button
                                onClick={() => setMediaTab(null)}
                                className="mr-4 p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>
                            <span className="text-sm font-black text-white uppercase tracking-tighter">SCHOOL_RESOURCES</span>
                        </div>
                        <SchoolSelection />
                    </motion.div>
                ) : (
                    <motion.div
                        key="section"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-1 flex flex-col overflow-hidden"
                    >
                        {/* Section Header */}
                        <div className="h-14 flex items-center px-6 border-b border-white/5 bg-[#050508]/80 backdrop-blur-md sticky top-0 z-20">
                            <button
                                onClick={() => subTab ? setSubTab(null) : setMediaTab(null)}
                                className="mr-4 p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-all"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2">
                                {subTab ? (
                                    <>
                                        {(() => {
                                            const s = SCHOOL_SUB_TABS.find(t => t.id === subTab);
                                            const Icon = s.icon;
                                            return <Icon className="w-4 h-4 text-blue-400" />;
                                        })()}
                                        <span className="text-sm font-black text-white uppercase tracking-tighter">{SCHOOL_SUB_TABS.find(t => t.id === subTab)?.label}</span>
                                    </>
                                ) : (
                                    <>
                                        <activeSection.icon className={`w-4 h-4 ${activeSection.accent}`} />
                                        <span className="text-sm font-black text-white uppercase tracking-tighter">{activeSection.label}</span>
                                    </>
                                )}
                            </div>

                            {(activeSection?.mediaType || subTab) && (
                                <button
                                    onClick={() => onUpload(subTab || activeSection.mediaType)}
                                    className={`ml-auto px-4 py-1.5 rounded-full bg-white/5 border ${activeSection?.border || 'border-blue-500/20'} text-[10px] font-black text-white hover:bg-white/10 transition-all flex items-center gap-2`}
                                >
                                    <Plus className="w-3 h-3" /> PUSH_DATA
                                </button>
                            )}
                        </div>

                        {/* Section Content */}
                        <div className="flex-1 overflow-hidden relative">
                            {mediaTab === 'chat' ? (
                                <div className="h-full flex flex-col bg-[#050508]">
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.slice(-50).map((msg, i) => (
                                            <div key={i} className={`flex gap-3 group/msg ${msg.isSystem ? 'justify-center py-4' : ''}`}>
                                                {msg.isSystem ? (
                                                    <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                        {msg.content}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 p-[1px]">
                                                            <div className="w-full h-full rounded-xl bg-[#0a0a0f] flex items-center justify-center font-bold text-gray-400">
                                                                {msg.sender?.username?.slice(0, 2).toUpperCase() || 'U'}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-white tracking-tight">{msg.sender?.username}</span>
                                                                <span className="text-[10px] text-gray-600 font-mono">
                                                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
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
                                        <form onSubmit={handleSend} className="bg-[#15151e] rounded-xl border border-white/5 focus-within:border-hanghive-cyan/30 transition-all flex items-center px-4">
                                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center mr-3 hover:bg-white/10 cursor-pointer">
                                                <Plus className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder={`Message in work-chat`}
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                className="flex-1 bg-transparent py-3 text-sm focus:outline-none text-white placeholder:text-gray-600"
                                            />
                                            <button type="submit" className="p-2 text-gray-600 hover:text-hanghive-cyan transition-all">
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            ) : (
                                <WorkResourceGrid items={mediaItems.filter(i => i.type === (subTab || activeSection.mediaType))} />
                            )}

                            {(activeSection?.mediaType || subTab) && mediaItems.filter(i => i.type === (subTab || activeSection.mediaType)).length === 0 && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                    <activeSection.icon className="w-14 h-14 mb-4" />
                                    <h3 className="text-lg font-bold uppercase tracking-widest">No Resources Yet</h3>
                                    <p className="text-xs mt-2 uppercase tracking-wider">Initialize the first data node</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
const StudioPlayer = ({ items }) => {
    const [currentTrack, setCurrentTrack] = useState(null);

    return (
        <div className="h-full flex flex-col bg-[#050508]">
            <div className="flex-1 overflow-y-auto p-8">
                <div className="flex items-end gap-8 mb-12">
                    <div className="w-64 h-64 bg-gradient-to-br from-hanghive-cyan/20 to-hanghive-purple/20 rounded-3xl flex items-center justify-center border border-white/5 shadow-2xl">
                        <Music2 className="w-24 h-24 text-hanghive-cyan opacity-20" />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em]">COLLECTION</span>
                        <h1 className="text-6xl font-black text-white mt-2 mb-6 tracking-tighter">Art Community Studio</h1>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-hanghive-cyan"></div>
                            <span className="text-sm font-bold text-white">Hive Collective</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-sm text-gray-400 font-medium">{items.length} tracks</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="grid grid-cols-[48px_1fr_1fr_48px] px-4 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest border-b border-white/5 mb-4">
                        <span>#</span>
                        <span>Title</span>
                        <span>Creator</span>
                        <span className="justify-self-end text-right">Dur</span>
                    </div>
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentTrack(item)}
                            className="grid grid-cols-[48px_1fr_1fr_48px] items-center px-4 py-3 rounded-xl hover:bg-white/5 cursor-pointer group transition-all"
                        >
                            <span className="text-xs font-mono text-gray-500 group-hover:text-hanghive-cyan">
                                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            </span>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                                    <Play className="w-4 h-4 text-white/20 group-hover:text-hanghive-cyan" />
                                </div>
                                <span className="text-sm font-bold text-white">{item.title}</span>
                            </div>
                            <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">Artist Node</span>
                            <span className="text-xs font-mono text-gray-500 justify-self-end">3:42</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spotify-style Player Bar */}
            {currentTrack && (
                <div className="h-24 bg-[#0a0a0f] border-t border-white/5 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 w-[30%]">
                        <div className="w-14 h-14 rounded-xl bg-hanghive-cyan/20 flex items-center justify-center">
                            <Music className="w-6 h-6 text-hanghive-cyan" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{currentTrack.title}</div>
                            <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Artist Node</div>
                        </div>
                        <Heart className="w-4 h-4 text-gray-600 hover:text-hanghive-cyan ml-2 cursor-pointer" />
                    </div>

                    <div className="flex flex-col items-center gap-2 flex-1 max-w-xl">
                        <div className="flex items-center gap-6">
                            <SkipBack className="w-5 h-5 text-gray-500 hover:text-white cursor-pointer" />
                            <button className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-all">
                                <Play className="w-5 h-5 fill-current" />
                            </button>
                            <SkipForward className="w-5 h-5 text-gray-500 hover:text-white cursor-pointer" />
                        </div>
                        <div className="w-full flex items-center gap-3 text-[10px] font-mono text-gray-600 font-bold">
                            <span>1:24</span>
                            <div className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden">
                                <div className="absolute inset-y-0 left-0 w-[40%] bg-hanghive-cyan rounded-full" />
                            </div>
                            <span>3:42</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 w-[30%]">
                        <List className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer" />
                        <Volume2 className="w-4 h-4 text-gray-500 hover:text-white cursor-pointer" />
                        <div className="w-24 h-1 bg-white/10 rounded-full">
                            <div className="w-[60%] h-full bg-hanghive-cyan rounded-full" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Multimedia Upload Modal ──────────────────────────────────────

const UploadModal = ({ isOpen, onClose, uploadType, onUploadSuccess, currentCommunity, user }) => {
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [type, setType] = useState(uploadType || 'image');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (uploadType) setType(uploadType);
    }, [uploadType]);

    if (!isOpen) return null;

    const isArt = currentCommunity?.purpose?.toLowerCase() === 'art';
    const isWork = currentCommunity?.purpose?.toLowerCase() === 'work';

    const categories = isArt ? [
        { id: 'video', label: 'Video (Shorts)', icon: Play },
        { id: 'image', label: 'Image (Exhibition)', icon: Layout },
        { id: 'audio', label: 'Audio (Studio)', icon: Music2 },
    ] : isWork ? [
        { id: 'school-teacher', label: 'Teacher Resource', icon: Library },
        { id: 'school-student', label: 'Student Material', icon: GraduationCap },
        { id: 'college', label: 'College Material', icon: University },
        { id: 'office', label: 'Office Asset', icon: Building2 },
        { id: 'other', label: 'Other Work', icon: Package },
    ] : [
        { id: 'image', label: 'General File', icon: Layout }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user?.id || !currentCommunity?.id) {
            alert("Error: Missing user or community identification.");
            return;
        }

        const ownerId = Number(user?.id);
        const communityId = Number(currentCommunity?.id);

        if (isNaN(ownerId) || isNaN(communityId)) {
            console.error("[UPLOAD_DEBUG] ID conversion failed:", { ownerId: user?.id, communityId: currentCommunity?.id });
            // This happens when a system community is stored with the old string ID (e.g. "system_art").
            // The backend API now returns real integer IDs — the user just needs to re-join
            // the community from the Discovery panel to pick up the new ID.
            alert(
                "This community needs to be refreshed.\n\n" +
                "Please click the 🔍 Discovery button, find this community, and click Join again. " +
                "This is a one-time step to sync with the updated backend."
            );
            setIsSubmitting(false);
            return;
        }

        // Explicitly cast IDs to numbers just in case they are strings,
        // as the backend MediaItemCreate schema expects integers.
        const payload = {
            title,
            url: url.trim(), // Remove any trailing spaces which might cause 422
            type,
            owner_id: ownerId,
            community_id: communityId
        };

        try {
            console.log("[UPLOAD_DEBUG] Initiating upload with payload:", payload);
            console.log("[UPLOAD_DEBUG] Targeting URL:", `${CONFIG.API_BASE_URL}/media/`);

            const res = await fetch(`${CONFIG.API_BASE_URL}/media/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const result = await res.json();
                console.log("[UPLOAD_DEBUG] Upload successful:", result);
                alert("Upload Successful! Your creation has been added.");
                onUploadSuccess(type);
                onClose();
                setTitle('');
                setUrl('');
            } else {
                let errorData;
                try {
                    errorData = await res.json();
                } catch (e) {
                    errorData = { detail: "Non-JSON response from server" };
                }
                console.error("[UPLOAD_DEBUG] Upload failed with status:", res.status, errorData);
                const detail = typeof errorData.detail === 'string'
                    ? errorData.detail
                    : JSON.stringify(errorData.detail || 'Internal Server Error');
                alert(`Upload failed (Status ${res.status}): ${detail}`);
            }
        } catch (err) {
            console.error("[UPLOAD_DEBUG] Network/Critical error:", err);
            alert(`A critical error occurred: ${err.message}. Please ensure the backend is running at ${CONFIG.API_BASE_URL}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Share Creation</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-all">
                        <Plus className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Resource Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setType(cat.id)}
                                    className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all text-left flex items-center gap-2 ${type === cat.id ? 'bg-hanghive-cyan/10 border-hanghive-cyan text-hanghive-cyan' : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'}`}
                                >
                                    <cat.icon className="w-3 h-3" />
                                    <span className="truncate">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Creation Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="Enter a title..."
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-hanghive-cyan/30 placeholder:text-gray-700 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Resource URL</label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            required
                            placeholder="https://example.com/media.mp4"
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-hanghive-cyan/30 placeholder:text-gray-700 transition-all font-mono"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-hanghive-cyan text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'TRANSMITTING...' : 'INITIATE UPLOAD'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default Dashboard;
