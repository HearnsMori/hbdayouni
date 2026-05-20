'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, PhoneOff, Send,
    Copy, CheckCheck, Loader2, Monitor, MonitorOff,
    Sun, Moon, Smile, VideoIcon, ChevronLeft,
    MessageSquare, Lock, Archive, Clock,
} from 'lucide-react';
import { useRouter } from "next/navigation";
import { io, Socket } from 'socket.io-client';
import coreApi from '@/utils/coreApi';
import { throws } from 'assert';

export interface RoomDef {
    id: string;
    name: string;
    subtitle?: string;
    avatar?: string;
    unread?: number;
}

interface Peer {
    socketId: string;
    userId: string;
    displayName: string;
    stream?: MediaStream;
    video?: boolean;
    audio?: boolean;
}

interface ChatMsg {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: string;
}

export interface CallPageProps {
    serverUrl?: string;
    userId?: string;
    displayName?: string;
    rooms: RoomDef[];
}

type RoomStatus = 'future' | 'active' | 'archived';

const ROOM_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildP(light: boolean) {
    return {
        GOLD: '#C8A96E',
        GOLD_DARK: '#A8854E',
        GOLD_GL: 'rgba(200,169,110,0.16)',
        BG: light ? '#FAF8F5' : '#0F0F0F',
        CARD: light ? '#FFFFFF' : '#1B1B1B',
        DARK: light ? '#1A1A1A' : '#F5F5F5',
        GRAY: light ? '#888888' : '#A0A0A0',
        BORDER: light ? '#F0EBE3' : '#2A2A2A',
        SOFT: light ? '#EEEEEE' : '#222222',
        SHADOW: light ? '0 4px 15px rgba(0,0,0,0.05)' : '0 4px 20px rgba(0,0,0,0.45)',
        HOVER: light ? '#F5F0EA' : '#232323',
    };
}

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRoomDate(roomId: string): Date {
    const parts = roomId.split('_');
    const dateKey = parts[1];
    const time = parts[2];
    return new Date(`${dateKey}T${time}:00`);
}

function getRoomStatus(roomId: string, now: number): RoomStatus {
    const start = getRoomDate(roomId).getTime();
    if (now < start) return 'future';
    if (now < start + ROOM_DURATION_MS) return 'active';
    return 'archived';
}

function formatCountdown(ms: number): string {
    if (ms <= 0) return '0s';
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function timeLeft(roomId: string, now: number): string {
    const end = getRoomDate(roomId).getTime() + ROOM_DURATION_MS;
    return formatCountdown(end - now);
}

// ─── LocalVideo ───────────────────────────────────────────────────────────────
// Isolated component so the video element mounts independently and
// correctly receives its srcObject via a dedicated useEffect.
function LocalVideo({
    stream,
    mirrored,
    gold,
    audioOn,
    videoOn,
    displayName,
    screenOn,
}: {
    stream: MediaStream | null;
    mirrored: boolean;
    gold: string;
    audioOn: boolean;
    videoOn: boolean;
    displayName: string;
    screenOn: boolean;
}) {
    const ref = useRef<HTMLVideoElement>(null);

    // Sync stream → srcObject every time either changes
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (stream) {
            el.srcObject = stream;
            el.play().catch(() => {/* autoplay policy – muted so usually fine */ });
        } else {
            el.srcObject = null;
        }
    }, [stream]);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
                position: 'relative', borderRadius: 12,
                overflow: 'hidden', background: '#141414', minHeight: 0,
            }}
        >
            {!videoOn || !stream ? (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(200,169,110,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <VideoOff size={20} color={gold} />
                    </div>
                    <span style={{ fontSize: 12, color: '#555' }}>Camera off</span>
                </div>
            ) : (
                <video
                    ref={ref}
                    autoPlay
                    muted        /* always mute local to prevent feedback */
                    playsInline
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        // Mirror camera view; don't mirror screen share
                        transform: mirrored ? 'scaleX(-1)' : 'none',
                    }}
                />
            )}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent,rgba(0,0,0,0.72))',
                padding: '16px 10px 8px',
                display: 'flex', alignItems: 'center', gap: 5,
            }}>
                {!audioOn && <MicOff size={11} color="#ef9090" />}
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', flex: 1 }}>
                    {displayName}{screenOn ? ' · Presenting' : ''}
                </span>
                <span style={{
                    fontSize: 9, color: gold,
                    background: 'rgba(200,169,110,0.2)',
                    padding: '2px 6px', borderRadius: 10, fontWeight: 700,
                }}>YOU</span>
            </div>
        </motion.div>
    );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CallPage({
    serverUrl = 'http://localhost:10000',
    userId = `user-${Math.random().toString(36).slice(2, 8)}`,
    displayName = 'You',
    rooms = [],
}: CallPageProps) {
    const router = useRouter();
    const [light, setLight] = useState(() => coreApi.isLightMode());
    const P = buildP(light);
    const toggleTheme = () => { coreApi.toggleMode(); setLight(coreApi.isLightMode()); };

    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const activeRoom = rooms.find(r => r.id === activeRoomId) ?? null;
    const activeStatus: RoomStatus | null = activeRoomId ? getRoomStatus(activeRoomId, now) : null;
    const isArchived = activeStatus === 'archived';
    const isFuture = activeStatus === 'future';

    const [msgCache, setMsgCache] = useState<Record<string, ChatMsg[]>>({});
    const msgs = activeRoomId ? (msgCache[activeRoomId] ?? []) : [];
    const addMsg = (roomId: string, msg: ChatMsg) =>
        setMsgCache(prev => ({ ...prev, [roomId]: [...(prev[roomId] ?? []), msg] }));

    const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
    const [tab, setTab] = useState<'chat' | 'call'>('chat');
    const [inCall, setInCall] = useState(false);
    const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
    const [chatInput, setChatInput] = useState('');
    const [filterLoading, setFilterLoading] = useState(false);
    const [videoOn, setVideoOn] = useState(true);
    const [audioOn, setAudioOn] = useState(true);
    const [screenOn, setScreenOn] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // ── FIX: track the active local stream in state so LocalVideo re-syncs ──
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const streamRef = useRef<MediaStream | null>(null);
    const screenRef = useRef<MediaStream | null>(null);
    const chatEnd = useRef<HTMLDivElement>(null);

    const getSocket = useCallback(() => {
        if (!socketRef.current)
            socketRef.current = io(serverUrl, { path: '/socket.io' });
        return socketRef.current;
    }, [serverUrl]);

    const createPC = useCallback((peerId: string) => {
        const pc = new RTCPeerConnection(ICE);
        pcsRef.current.set(peerId, pc);
        const socket = getSocket();
        pc.onicecandidate = ({ candidate }) => {
            if (candidate) socket.emit('webrtc-ice-candidate', { to: peerId, candidate });
        };
        pc.ontrack = ({ streams }) => {
            setPeers(prev => {
                const m = new Map(prev), p = m.get(peerId);
                if (p) m.set(peerId, { ...p, stream: streams[0] });
                return m;
            });
        };
        streamRef.current?.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));
        return pc;
    }, [getSocket]);

    const openRoom = useCallback(async (room: RoomDef) => {
        //alert("step 0");
        setError(''); setLoading(true);
        setActiveRoomId(room.id);
        setTab('chat');
        setUnreadMap(prev => ({ ...prev, [room.id]: 0 }));

        //alert("step 1");

        const socket = getSocket();
        socket.off('chat-history');
        socket.off('chat-message');
        socket.off('peer-media-state');
        //alert("step 2");
        socket.emit('join-room', { roomId: room.id, userId, displayName });
        //alert("step 3");
        try {
            const res = await fetch(`${serverUrl}/api/calls/rooms/${room.id}/messages`);

            const data = await res.json();
            //alert("step 4");

            console.log(data);
            //alert(JSON.stringify(data));

            if (res.ok) {
                //alert("step 5");
                const { messages } = data;

                setMsgCache(prev => ({
                    ...prev,
                    [room.id]: messages ?? []
                }));
            }
        } catch { /* ignore */ }
        //alert("step 6");
        const status = getRoomStatus(room.id, Date.now());
        if (status === 'active') {
            socket.on('chat-message', (msg: ChatMsg) => {
                if (msg.senderId === userId) return;
                addMsg(room.id, msg);
                setUnreadMap(prev => {
                    const isVisible = document.visibilityState === 'visible';
                    return isVisible ? prev : { ...prev, [room.id]: (prev[room.id] ?? 0) + 1 };
                });
            });
        }
        //alert("step 7");

        socket.on('peer-media-state', ({ socketId, video, audio }: any) => {
            setPeers(prev => {
                const m = new Map(prev), p = m.get(socketId);
                if (p) m.set(socketId, { ...p, video, audio });
                return m;
            });
        });
        //alert("step 8");

        setLoading(false);
        //alert("step 9");
    }, [getSocket, serverUrl, userId, displayName]);

    const joinCall = useCallback(async () => {
        if (!activeRoomId) return;
        setLoading(true); setError('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;

            // ── FIX: store in state so LocalVideo mounts with the stream ──
            setLocalStream(stream);

            const socket = getSocket();
            socket.emit('join-room', { roomId: activeRoomId, userId, displayName });
            socket.off('room-joined'); socket.off('peer-joined');
            socket.off('webrtc-offer'); socket.off('webrtc-answer');
            socket.off('webrtc-ice-candidate'); socket.off('peer-left');

            socket.on('room-joined', ({ peers: init }: { peers: Peer[] }) => {
                init.forEach(async peer => {
                    const pc = createPC(peer.socketId);
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('webrtc-offer', { to: peer.socketId, offer });
                    setPeers(prev => new Map(prev).set(peer.socketId, peer));
                });
            });
            socket.on('peer-joined', (peer: Peer) =>
                setPeers(prev => new Map(prev).set(peer.socketId, peer)));
            socket.on('webrtc-offer', async ({ from, offer }: any) => {
                const pc = createPC(from);
                await pc.setRemoteDescription(offer);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('webrtc-answer', { to: from, answer });
            });
            socket.on('webrtc-answer', async ({ from, answer }: any) => {
                await pcsRef.current.get(from)?.setRemoteDescription(answer);
            });
            socket.on('webrtc-ice-candidate', async ({ from, candidate }: any) => {
                await pcsRef.current.get(from)?.addIceCandidate(candidate);
            });
            socket.on('peer-left', ({ socketId }: any) => {
                pcsRef.current.get(socketId)?.close();
                pcsRef.current.delete(socketId);
                setPeers(prev => { const m = new Map(prev); m.delete(socketId); return m; });
            });

            setInCall(true); setTab('call');
        } catch (e: any) { setError(e.message ?? 'Could not access camera/mic'); }
        setLoading(false);
    }, [activeRoomId, getSocket, createPC, userId, displayName]);

    const leaveCall = () => {
        streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
        screenRef.current?.getTracks().forEach(t => t.stop()); screenRef.current = null;
        pcsRef.current.forEach(pc => pc.close()); pcsRef.current.clear();
        setPeers(new Map());
        // ── FIX: clear local stream state ──
        setLocalStream(null);
        setInCall(false); setScreenOn(false); setTab('chat');
    };

    const goBack = () => {
        leaveCall();
        socketRef.current?.off('chat-message');
        socketRef.current?.off('peer-media-state');
        setActiveRoomId(null); setTab('chat');
    };

    const toggleVideo = () => {
        const t = streamRef.current?.getVideoTracks()[0]; if (!t) return;
        t.enabled = !t.enabled; setVideoOn(t.enabled);
        socketRef.current?.emit('media-state', { roomId: activeRoomId, video: t.enabled, audio: audioOn });
    };
    const toggleAudio = () => {
        const t = streamRef.current?.getAudioTracks()[0]; if (!t) return;
        t.enabled = !t.enabled; setAudioOn(t.enabled);
        socketRef.current?.emit('media-state', { roomId: activeRoomId, video: videoOn, audio: t.enabled });
    };

    const toggleScreen = useCallback(async () => {
        if (screenOn) {
            // ── Stop screen share ──
            screenRef.current?.getTracks().forEach(t => t.stop());
            screenRef.current = null;
            setScreenOn(false);

            // Restore camera track for peers
            const camTrack = streamRef.current?.getVideoTracks()[0];
            if (camTrack) {
                pcsRef.current.forEach(pc =>
                    pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(camTrack));
            }

            // ── FIX: restore camera stream for local preview ──
            if (streamRef.current) setLocalStream(streamRef.current);
        } else {
            try {
                const scr = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
                screenRef.current = scr;
                setScreenOn(true);

                const screenVideoTrack = scr.getVideoTracks()[0];

                // Replace video track for all peers
                pcsRef.current.forEach(pc =>
                    pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(screenVideoTrack));

                // ── FIX: build a composite stream for local preview and store in state ──
                const previewStream = new MediaStream([
                    screenVideoTrack,
                    ...(streamRef.current?.getAudioTracks() ?? []),
                ]);
                setLocalStream(previewStream);

                // When the user stops sharing via the browser UI, revert automatically
                screenVideoTrack.onended = () => {
                    screenRef.current?.getTracks().forEach(t => t.stop());
                    screenRef.current = null;
                    setScreenOn(false);
                    const camTrack = streamRef.current?.getVideoTracks()[0];
                    if (camTrack) {
                        pcsRef.current.forEach(pc =>
                            pc.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(camTrack));
                    }
                    if (streamRef.current) setLocalStream(streamRef.current);
                };
            } catch { /* cancelled by user */ }
        }
    }, [screenOn]);

    const sendMsg = async () => {
        const text = chatInput.trim();
        if (!text || !activeRoomId || isArchived || isFuture) return;
        setFilterLoading(true);
        try {
            let msgText: string;
            try {
                msgText = await coreApi.generateTxt(
                    text,
                    "Send the new filtered msg without any words or explanation. Just filter all the bad words into *. Also if words is not related to greetings, question, technology , or computer don't send anything do nothing just send a four characters xnox that is all no more example: who are you => xnox."
                );
                if (msgText.trim().toLowerCase().includes("generative ai error")) {
                    throw new Error("AI generation failed");
                }
                if (msgText.trim().includes("xnox")) {
                    coreApi.alert("MSG must be related to programming only!", "#339");
                    return;
                }
            } catch {
                msgText = text + " (unfiltered: AI exhausted)";
            }
            if (!msgText) return;
            const optimisticMsg: ChatMsg = {
                id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                senderId: userId,
                senderName: displayName,
                text: msgText,
                timestamp: new Date().toISOString(),
            };
            addMsg(activeRoomId, optimisticMsg);
            socketRef.current?.emit("chat-message", {
                roomId: activeRoomId, text: msgText, senderId: userId, senderName: displayName,
            });
            setChatInput('');
        } catch (err) {
            console.error("message send error:", err);
        } finally {
            setFilterLoading(false);
        }
    };

    const copyRoom = () => {
        if (!activeRoomId) return;
        navigator.clipboard.writeText(activeRoomId);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
    useEffect(() => () => { socketRef.current?.disconnect(); }, []);

    const sortedRooms = [...rooms].sort((a, b) => {
        const order = { active: 0, future: 1, archived: 2 };
        const sa = getRoomStatus(a.id, now), sb = getRoomStatus(b.id, now);
        if (order[sa] !== order[sb]) return order[sa] - order[sb];
        const da = getRoomDate(a.id).getTime(), db = getRoomDate(b.id).getTime();
        return sa === 'archived' ? db - da : da - db;
    });

    const peerList = [...peers.values()];
    const initials = (name: string) =>
        name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const STATUS_META = {
        active: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Live' },
        future: { color: P.GOLD, bg: P.GOLD_GL, label: 'Upcoming' },
        archived: { color: P.GRAY, bg: light ? '#F0EBE322' : '#2A2A2A55', label: 'Archived' },
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100dvh',
            maxWidth: 430, margin: '0 auto',
            background: P.BG, color: P.DARK,
            fontFamily: "'Outfit','DM Sans',sans-serif",
            position: 'relative', overflow: 'hidden',
        }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{width:0;}
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

            <AnimatePresence initial={false} mode="wait">

                {/* ══════════════════ ROOM LIST ══════════════════ */}
                {!activeRoomId && (
                    <motion.div key="list"
                        initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -40, opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

                        <div style={{
                            background: P.CARD, borderBottom: `1px solid ${P.BORDER}`,
                            boxShadow: P.SHADOW, flexShrink: 0, padding: '16px 18px 14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <ChevronLeft size={20} style={{ cursor: 'pointer', color: P.GRAY }} onClick={() => router.back()} />
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: 22, color: P.DARK, letterSpacing: -0.5 }}>Messages</div>
                                    <div style={{ fontSize: 12, color: P.GRAY, marginTop: 1 }}>
                                        {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                            </div>
                            <button onClick={toggleTheme} style={{
                                width: 38, height: 38, borderRadius: '50%',
                                background: P.SOFT, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.GRAY,
                            }}>
                                {light ? <Moon size={16} /> : <Sun size={16} />}
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {rooms.length === 0 && (
                                <div style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    justifyContent: 'center', height: '100%', gap: 12, opacity: 0.35,
                                }}>
                                    <MessageSquare size={36} color={P.GOLD} />
                                    <span style={{ fontSize: 14, color: P.GRAY }}>No rooms yet</span>
                                </div>
                            )}

                            {sortedRooms.map((room, i) => {
                                const status = getRoomStatus(room.id, now);
                                const meta = STATUS_META[status];
                                const lastMsg = (msgCache[room.id] ?? []).at(-1);
                                const unread = unreadMap[room.id] ?? 0;
                                const disabled = status === 'future';
                                const dimmed = status === 'archived';
                                const roomStart = getRoomDate(room.id).getTime();
                                const msUntilOpen = roomStart - now;
                                const pctUsed = status === 'active'
                                    ? Math.max(0, Math.min(1, (now - roomStart) / ROOM_DURATION_MS))
                                    : 0;

                                return (
                                    <motion.button
                                        key={room.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        onClick={() => !disabled && openRoom(room)}
                                        disabled={disabled}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'flex-start', gap: 13,
                                            padding: '14px 18px', background: 'none', border: 'none',
                                            borderBottom: `1px solid ${P.BORDER}`,
                                            cursor: disabled ? 'not-allowed' : 'pointer',
                                            textAlign: 'left' as const,
                                            transition: 'background 0.12s',
                                            opacity: disabled ? 0.55 : dimmed ? 0.72 : 1,
                                        }}
                                        onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = P.HOVER; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>

                                        <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
                                            {room?.avatar
                                                ? <img src={room?.avatar} alt="" style={{
                                                    width: 48, height: 48, borderRadius: '50%', objectFit: 'cover',
                                                    filter: dimmed ? 'grayscale(55%)' : 'none',
                                                }} />
                                                : <div style={{
                                                    width: 48, height: 48, borderRadius: '50%',
                                                    background: dimmed || disabled
                                                        ? (light ? '#e0dbd3' : '#2e2e2e')
                                                        : `linear-gradient(135deg,${P.GOLD},${P.GOLD_DARK})`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: dimmed || disabled ? P.GRAY : '#fff',
                                                    fontWeight: 700, fontSize: 16,
                                                }}>{initials(room.name)}</div>
                                            }
                                            <div style={{
                                                position: 'absolute', bottom: 1, right: 1,
                                                width: 16, height: 16, borderRadius: '50%',
                                                background: P.CARD, border: `2px solid ${P.CARD}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {status === 'active' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />}
                                                {status === 'future' && <Lock size={8} color={P.GOLD} />}
                                                {status === 'archived' && <Archive size={8} color={P.GRAY} />}
                                            </div>
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                                                <span style={{
                                                    fontWeight: 700, fontSize: 15, color: P.DARK,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                                                }}>
                                                    {room.name}
                                                </span>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                                                    color: meta.color, background: meta.bg,
                                                    padding: '2px 8px', borderRadius: 20,
                                                    border: `1px solid ${meta.color}33`,
                                                }}>
                                                    {meta.label}
                                                </span>
                                            </div>

                                            <div style={{
                                                fontSize: 12, color: P.GRAY,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                display: 'flex', alignItems: 'center', gap: 5,
                                            }}>
                                                {status === 'future' && (
                                                    <>
                                                        <Clock size={11} color={P.GOLD} style={{ flexShrink: 0 }} />
                                                        <span style={{ color: P.GOLD, fontWeight: 600 }}>
                                                            Opens in {formatCountdown(msUntilOpen)}
                                                        </span>
                                                    </>
                                                )}
                                                {status === 'archived' && (
                                                    <>
                                                        <Archive size={11} style={{ flexShrink: 0 }} />
                                                        <span>
                                                            {lastMsg
                                                                ? `${lastMsg.senderName === displayName ? 'You' : lastMsg.senderName}: ${lastMsg.text}`
                                                                : 'View archived history'}
                                                        </span>
                                                    </>
                                                )}
                                                {status === 'active' && (
                                                    <span style={{
                                                        color: unread > 0 ? P.DARK : P.GRAY,
                                                        fontWeight: unread > 0 ? 500 : 400,
                                                    }}>
                                                        {lastMsg
                                                            ? `${lastMsg.senderName === displayName ? 'You' : lastMsg.senderName}: ${lastMsg.text}`
                                                            : room.subtitle ?? 'Tap to open'}
                                                    </span>
                                                )}
                                            </div>

                                            {status === 'active' && (
                                                <div style={{ marginTop: 6 }}>
                                                    <div style={{ height: 3, borderRadius: 2, background: P.SOFT, overflow: 'hidden' }}>
                                                        <div style={{
                                                            height: '100%', borderRadius: 2,
                                                            width: `${(1 - pctUsed) * 100}%`,
                                                            background: pctUsed > 0.75 ? '#ef4444' : `linear-gradient(90deg,${P.GOLD},${P.GOLD_DARK})`,
                                                            transition: 'width 1s linear',
                                                        }} />
                                                    </div>
                                                    <div style={{ fontSize: 10, color: pctUsed > 0.75 ? '#ef7070' : P.GRAY, marginTop: 2 }}>
                                                        {timeLeft(room.id, now)} left
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <AnimatePresence>
                                            {unread > 0 && status === 'active' && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                                    style={{
                                                        minWidth: 20, height: 20, borderRadius: 10, flexShrink: 0, alignSelf: 'center',
                                                        background: `linear-gradient(135deg,${P.GOLD},${P.GOLD_DARK})`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 11, fontWeight: 700, color: '#fff', padding: '0 6px',
                                                    }}>
                                                    {unread > 99 ? '99+' : unread}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* ══════════════════ ROOM VIEW ══════════════════ */}
                {activeRoomId && activeRoom && (
                    <motion.div key={`room-${activeRoomId}`}
                        initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.22 }}
                        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

                        {/* Header */}
                        <div style={{
                            background: P.CARD, borderBottom: `1px solid ${P.BORDER}`,
                            boxShadow: P.SHADOW, flexShrink: 0, zIndex: 10,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                                <button onClick={goBack} style={{
                                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                    background: P.SOFT, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.GRAY,
                                }}>
                                    <ChevronLeft size={20} />
                                </button>

                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    {activeRoom?.avatar
                                        ? <img src={activeRoom?.avatar} alt="" style={{
                                            width: 38, height: 38, borderRadius: '50%', objectFit: 'cover',
                                            filter: isArchived ? 'grayscale(55%)' : 'none',
                                        }} />
                                        : <div style={{
                                            width: 38, height: 38, borderRadius: '50%',
                                            background: isArchived
                                                ? (light ? '#e0dbd3' : '#2e2e2e')
                                                : `linear-gradient(135deg,${P.GOLD},${P.GOLD_DARK})`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isArchived ? P.GRAY : '#fff', fontWeight: 700, fontSize: 14,
                                        }}>{initials(activeRoom.name)}</div>
                                    }
                                    {inCall && <div style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: '#22c55e', border: `2px solid ${P.CARD}`,
                                    }} />}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, color: P.DARK }}>{activeRoom.name}</div>
                                    <div style={{ fontSize: 11, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {inCall ? (
                                            <>
                                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                                <span style={{ color: P.GOLD, fontWeight: 500 }}>{peerList.length + 1} in call · Live</span>
                                            </>
                                        ) : isArchived ? (
                                            <>
                                                <Archive size={10} color={P.GRAY} />
                                                <span style={{ color: P.GRAY }}>Archived · Read only</span>
                                            </>
                                        ) : (
                                            <>
                                                <Clock size={10} color={P.GOLD} />
                                                <span style={{ color: P.GOLD, fontWeight: 500 }}>{timeLeft(activeRoomId, now)} left</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {inCall && (
                                    <button onClick={copyRoom} style={{
                                        padding: '5px 9px', borderRadius: 20,
                                        background: P.GOLD_GL, border: `1px solid ${P.GOLD}44`,
                                        color: P.GOLD, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: 4,
                                    }}>
                                        {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
                                        {copied ? 'Copied' : activeRoomId.slice(0, 6) + '…'}
                                    </button>
                                )}

                                <button onClick={toggleTheme} style={{
                                    width: 34, height: 34, borderRadius: '50%',
                                    background: P.SOFT, border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.GRAY,
                                }}>
                                    {light ? <Moon size={15} /> : <Sun size={15} />}
                                </button>
                            </div>

                            {!isArchived && (
                                <div style={{ display: 'flex', borderTop: `1px solid ${P.BORDER}` }}>
                                    {(['chat', 'call'] as const).map(t => {
                                        const active = tab === t;
                                        const locked = t === 'call' && !inCall;
                                        return (
                                            <button key={t} onClick={() => !locked && setTab(t)} style={{
                                                flex: 1, padding: '9px 0', background: 'none', border: 'none',
                                                borderBottom: active ? `2.5px solid ${P.GOLD}` : '2.5px solid transparent',
                                                color: active ? P.GOLD : locked ? P.GRAY + '55' : P.GRAY,
                                                fontWeight: active ? 700 : 500, fontSize: 12,
                                                cursor: locked ? 'not-allowed' : 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                                textTransform: 'uppercase' as const, letterSpacing: 0.5,
                                                fontFamily: 'inherit', transition: 'color 0.15s',
                                            }}>
                                                {t === 'chat' ? <MessageSquare size={13} /> : <VideoIcon size={13} />}
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Tab content */}
                        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

                            {/* CHAT / ARCHIVE VIEW */}
                            <AnimatePresence initial={false}>
                                {(tab === 'chat' || isArchived) && (
                                    <motion.div key="chat"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>

                                        {isArchived && (
                                            <div style={{
                                                background: light ? '#F7F3EC' : '#1A1508',
                                                borderBottom: `1px solid ${P.GOLD}28`,
                                                padding: '10px 16px', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', gap: 10,
                                            }}>
                                                <div style={{
                                                    width: 32, height: 32, borderRadius: '50%',
                                                    background: P.GOLD_GL, flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Archive size={15} color={P.GOLD} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: P.GOLD }}>Archived Room</div>
                                                    <div style={{ fontSize: 11, color: P.GRAY, marginTop: 1 }}>
                                                        This room has closed. Chat history is read-only.
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <AnimatePresence>
                                            {error && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    style={{
                                                        background: '#ef444415', borderBottom: '1px solid #ef444433',
                                                        padding: '8px 16px', fontSize: 12, color: '#ef7070', flexShrink: 0,
                                                    }}>{error}</motion.div>
                                            )}
                                        </AnimatePresence>

                                        <div style={{
                                            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
                                            display: 'flex', flexDirection: 'column', gap: 6,
                                        }}>
                                            {msgs.length === 0 && (
                                                <div style={{
                                                    flex: 1, display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    gap: 14, opacity: 0.35, paddingBottom: 40,
                                                }}>
                                                    <MessageSquare size={32} color={P.GOLD} />
                                                    <p style={{ margin: 0, fontSize: 13, color: P.GRAY, textAlign: 'center', lineHeight: 1.6 }}>
                                                        {isArchived
                                                            ? 'No messages were sent in this room.'
                                                            : `No messages yet.\nStart the conversation!`}
                                                    </p>
                                                </div>
                                            )}
                                            <AnimatePresence initial={false}>
                                                {msgs.map(m => {
                                                    const mine = m.senderId === userId;
                                                    return (
                                                        <motion.div key={m.id}
                                                            initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                                                            style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                                                            {!mine && (
                                                                <span style={{ fontSize: 10, color: P.GOLD, fontWeight: 600, marginBottom: 3, paddingLeft: 4 }}>
                                                                    {m.senderName}
                                                                </span>
                                                            )}
                                                            <div style={{
                                                                maxWidth: '78%',
                                                                background: mine
                                                                    ? isArchived
                                                                        ? (light ? '#d8ccb0' : '#3d3220')
                                                                        : `linear-gradient(135deg,${P.GOLD},${P.GOLD_DARK})`
                                                                    : P.CARD,
                                                                color: mine
                                                                    ? isArchived ? (light ? '#6b5a3e' : '#c0a87a') : '#fff'
                                                                    : P.DARK,
                                                                borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                                padding: '9px 13px', fontSize: 14, lineHeight: 1.45,
                                                                boxShadow: mine ? `0 2px 10px ${P.GOLD}22` : P.SHADOW,
                                                                border: mine ? 'none' : `1px solid ${P.BORDER}`,
                                                            }}>{m.text}</div>
                                                            <span style={{
                                                                fontSize: 10, color: P.GRAY, marginTop: 3,
                                                                paddingRight: mine ? 4 : 0, paddingLeft: mine ? 0 : 4,
                                                            }}>
                                                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                            <div ref={chatEnd} />
                                        </div>

                                        {!isArchived && (
                                            <div style={{
                                                display: 'flex', gap: 8, padding: '10px 14px 16px',
                                                background: P.CARD, borderTop: `1px solid ${P.BORDER}`, alignItems: 'center',
                                            }}>
                                                {!inCall && (
                                                    <button onClick={joinCall} disabled={loading} style={{
                                                        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                                                        padding: '3px 5px', borderRadius: 22,
                                                        background: `linear-gradient(135deg,${P.GOLD},${P.GOLD_DARK})`,
                                                        border: 'none', color: '#fff',
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        fontWeight: 700, fontSize: 9, fontFamily: 'inherit',
                                                        boxShadow: `0 3px 12px ${P.GOLD}44`, opacity: loading ? 0.7 : 1,
                                                    }}>
                                                        {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <VideoIcon size={13} />}
                                                        {loading ? '…' : 'Join Call'}
                                                    </button>
                                                )}
                                                <div style={{
                                                    flex: 1, background: P.SOFT, borderRadius: 22,
                                                    border: `1px solid ${P.BORDER}`,
                                                    width: "50vw",
                                                    display: 'flex', alignItems: 'center', padding: '2px 6px 2px 14px',
                                                }}>
                                                    <input
                                                        value={chatInput}
                                                        onChange={e => setChatInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                                                        placeholder={filterLoading ? 'Filtering…' : 'Message…'}
                                                        disabled={filterLoading}
                                                        style={{
                                                            flex: 1, background: 'none', border: 'none', outline: 'none',
                                                            color: P.DARK, fontSize: 14, padding: '8px 0', fontFamily: 'inherit',
                                                            width: "40vw",
                                                        }}
                                                    />
                                                </div>
                                                <button onClick={sendMsg} disabled={!chatInput.trim() || filterLoading} style={{
                                                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                                                    background: chatInput.trim() ? `linear-gradient(135deg,${P.GOLD},${P.GOLD_DARK})` : P.SOFT,
                                                    border: 'none', color: chatInput.trim() ? '#fff' : P.GRAY,
                                                    cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: chatInput.trim() ? `0 3px 12px ${P.GOLD}44` : 'none',
                                                    transition: 'all 0.15s',
                                                }}>
                                                    <Send size={17} />
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* CALL TAB */}
                            <AnimatePresence initial={false}>
                                {tab === 'call' && inCall && !isArchived && (
                                    <motion.div key="call"
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>

                                        <div style={{
                                            flex: 1, overflow: 'hidden', padding: 3, gap: 3,
                                            display: 'grid',
                                            gridTemplateColumns: peerList.length === 0 ? '1fr' : 'repeat(2,1fr)',
                                            gridTemplateRows: peerList.length > 1 ? 'repeat(2,1fr)' : '1fr',
                                            alignContent: 'stretch',
                                        }}>
                                            {/* ── FIX: use LocalVideo component so srcObject is set after mount ── */}
                                            <LocalVideo
                                                stream={localStream}
                                                mirrored={!screenOn}   /* mirror cam; don't mirror screen */
                                                gold={P.GOLD}
                                                audioOn={audioOn}
                                                videoOn={videoOn}
                                                displayName={displayName}
                                                screenOn={screenOn}
                                            />

                                            <AnimatePresence>
                                                {peerList.map(p => (
                                                    <motion.div key={p.socketId}
                                                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#141414', minHeight: 0 }}>
                                                        {p.video === false
                                                            ? <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                                                <VideoOff size={20} color={P.GOLD} />
                                                                <span style={{ fontSize: 12, color: '#555' }}>Camera off</span>
                                                            </div>
                                                            : <PeerVideo stream={p.stream} gold={P.GOLD} />
                                                        }
                                                        <div style={{
                                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                                            background: 'linear-gradient(transparent,rgba(0,0,0,0.72))',
                                                            padding: '16px 10px 8px', display: 'flex', alignItems: 'center', gap: 5,
                                                        }}>
                                                            {p.audio === false && <MicOff size={11} color="#ef9090" />}
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{p.displayName}</span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>

                                        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                            style={{
                                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                                gap: 14, padding: '14px 20px 22px',
                                                background: 'rgba(10,10,10,0.96)', borderTop: '1px solid #1c1c1c', flexShrink: 0,
                                            }}>
                                            <CBtn active={audioOn} gold={P.GOLD} onClick={toggleAudio} title={audioOn ? 'Mute' : 'Unmute'}>
                                                {audioOn ? <Mic size={19} /> : <MicOff size={19} />}
                                            </CBtn>
                                            <CBtn active={videoOn} gold={P.GOLD} onClick={toggleVideo} title={videoOn ? 'Stop cam' : 'Start cam'}>
                                                {videoOn ? <Video size={19} /> : <VideoOff size={19} />}
                                            </CBtn>
                                            <CBtn active={!screenOn} gold={P.GOLD} onClick={toggleScreen} title={screenOn ? 'Stop share' : 'Share screen'}>
                                                {screenOn ? <MonitorOff size={19} /> : <Monitor size={19} />}
                                            </CBtn>
                                            <CBtn active gold={P.GOLD} onClick={() => setTab('chat')} title="Go to chat">
                                                <MessageSquare size={19} />
                                            </CBtn>
                                            <button onClick={leaveCall} style={{
                                                width: 52, height: 52, borderRadius: '50%',
                                                background: '#ef4444', border: 'none', color: '#fff',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 4px 18px rgba(239,68,68,0.45)', transition: 'transform 0.15s',
                                            }}
                                                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
                                                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                                                <PhoneOff size={21} />
                                            </button>
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── PeerVideo ────────────────────────────────────────────────────────────────
function PeerVideo({ stream, gold }: { stream?: MediaStream; gold: string }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
            ref.current.play().catch(() => { });
        }
    }, [stream]);
    if (!stream) return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Loader2 size={20} color={gold} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 11, color: '#444' }}>Connecting…</span>
        </div>
    );
    return <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}

// ─── CBtn ─────────────────────────────────────────────────────────────────────
function CBtn({ children, active, gold, onClick, title }: {
    children: React.ReactNode; active: boolean;
    gold: string; onClick: () => void; title?: string;
}) {
    return (
        <button onClick={onClick} title={title} style={{
            width: 44, height: 44, borderRadius: '50%',
            background: active ? '#1e1e1e' : 'rgba(200,169,110,0.18)',
            border: `1px solid ${active ? '#2a2a2a' : gold + '55'}`,
            color: active ? '#999' : gold,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
        }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            {children}
        </button>
    );
}