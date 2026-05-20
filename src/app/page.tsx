// @ts-nocheck 
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  motion, AnimatePresence, useMotionValue, useSpring, useTransform,
  useScroll, useInView
} from "framer-motion";
import {
  Heart, Sparkles, Star, Gift, MapPin, Camera, Watch, Moon, Sun,
  Music, Play, Pause, Volume2, VolumeX, ChevronDown, Quote,
  Zap, Coffee, BookOpen, Palette, Smile, Wind, Feather,
  Clock, Globe, Mail, MessageCircle, Infinity
} from "lucide-react";
import coreApi from "@/utils/coreApi"
import { form } from "framer-motion/client";
// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS (Purple Luxury — deep violet night sky meets morning rose)
// ─────────────────────────────────────────────────────────────────────────────
const DARK = {
  bg: "#06030d",
  bgAlt: "#0d0818",
  surface: "#130d1e",
  surfaceHover: "#1c1429",
  border: "rgba(200,130,255,0.14)",
  borderHover: "rgba(200,130,255,0.35)",
  text: "#f5eeff",
  textSub: "#b89acc",
  textMuted: "#7a5d96",
  accent: "#c084fc",
  accentSoft: "#a855f7",
  accentGlow: "rgba(192,132,252,0.18)",
  rose: "#f472b6",
  roseSoft: "#ec4899",
  gold: "#fbbf24",
  cyan: "#67e8f9",
};

const LIGHT = {
  bg: "#fdf8ff",
  bgAlt: "#f5edff",
  surface: "#ffffff",
  surfaceHover: "#f0e6ff",
  border: "rgba(167,60,220,0.15)",
  borderHover: "rgba(167,60,220,0.4)",
  text: "#1a0a2e",
  textSub: "#5b3a7e",
  textMuted: "#9b72c0",
  accent: "#9333ea",
  accentSoft: "#a855f7",
  accentGlow: "rgba(147,51,234,0.12)",
  rose: "#db2777",
  roseSoft: "#ec4899",
  gold: "#d97706",
  cyan: "#0891b2",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(min, max) { return Math.random() * (max - min) + min; }
function rndInt(min, max) { return Math.floor(rnd(min, max + 1)); }

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM CURSOR
// ─────────────────────────────────────────────────────────────────────────────
function CustomCursor({ c }) {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 30 });
  const xTrail = useSpring(x, { stiffness: 80, damping: 20 });
  const yTrail = useSpring(y, { stiffness: 80, damping: 20 });

  useEffect(() => {
    const move = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <>
      <motion.div style={{
        position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none",
        x: useTransform(xSpring, v => v - 6), y: useTransform(ySpring, v => v - 6),
        width: 12, height: 12, borderRadius: "50%", background: c.accent,
        mixBlendMode: "screen",
      }} />
      <motion.div style={{
        position: "fixed", top: 0, left: 0, zIndex: 9998, pointerEvents: "none",
        x: useTransform(xTrail, v => v - 20), y: useTransform(yTrail, v => v - 20),
        width: 40, height: 40, borderRadius: "50%",
        border: `1.5px solid ${c.accent}66`,
        mixBlendMode: "screen",
      }} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTICLE FIELD
// ─────────────────────────────────────────────────────────────────────────────
function ParticleField({ c, count = 60 }) {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rnd(0, 100),
    y: rnd(0, 100),
    size: rnd(1, 3.5),
    duration: rnd(3, 8),
    delay: rnd(0, 6),
    color: [c.accent, c.rose, c.cyan, c.gold][rndInt(0, 3)],
    opacity: rnd(0.2, 0.8),
  })), []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map(p => (
        <motion.div key={p.id} style={{
          position: "absolute", left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: p.color, opacity: p.opacity,
        }}
          animate={{ opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3], scale: [0.7, 1.4, 0.7], y: [0, -20, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLING PETALS
// ─────────────────────────────────────────────────────────────────────────────
function FallingPetals({ c }) {
  const petals = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: rnd(0, 100),
    delay: rnd(0, 12),
    duration: rnd(10, 18),
    size: rnd(8, 18),
    rotate: rnd(0, 360),
    color: [c.accent, c.rose, `${c.accent}99`, `${c.rose}88`][i % 4],
    skew: rnd(-30, 30),
  })), []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {petals.map(p => (
        <motion.div key={p.id} style={{
          position: "absolute", left: `${p.x}vw`, top: -40,
          width: p.size, height: p.size * 1.6,
          borderRadius: "50% 0 50% 0",
          background: p.color, opacity: 0.5,
          rotate: p.rotate,
        }}
          animate={{
            y: ["0vh", "110vh"],
            x: [0, Math.sin(p.id * 0.9) * 120],
            rotate: [p.rotate, p.rotate + 540],
            opacity: [0, 0.6, 0.5, 0.1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIREWORKS CANVAS
// ─────────────────────────────────────────────────────────────────────────────
function FireworksCanvas({ active, c }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particles = useRef([]);

  const burst = useCallback((x, y) => {
    const colors = [c.accent, c.rose, c.gold, c.cyan, "#fff"];
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2;
      const speed = rnd(2, 8);
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, decay: rnd(0.012, 0.025),
        size: rnd(2, 5),
        color: colors[rndInt(0, colors.length - 1)],
        tail: [],
      });
    }
  }, [c]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const positions = [
      [canvas.width * 0.2, canvas.height * 0.3],
      [canvas.width * 0.5, canvas.height * 0.2],
      [canvas.width * 0.8, canvas.height * 0.3],
      [canvas.width * 0.35, canvas.height * 0.5],
      [canvas.width * 0.65, canvas.height * 0.4],
    ];
    positions.forEach(([x, y], i) => setTimeout(() => burst(x, y), i * 300));

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter(p => p.life > 0);


      particles.current.forEach((p) => {
        p.tail.push({ x: p.x, y: p.y });

        if (p.tail.length > 6) p.tail.shift();

        p.x += p.vx;
        p.y += p.vy;

        p.vy += 0.12;
        p.vx *= 0.98;

        p.life -= p.decay;

        // remove dead particles
        if (p.life <= 0) return;

        p.tail.forEach((t, i) => {
          const tailRadius = Math.max(
            0,
            p.size * (i / p.tail.length) * 0.7 * p.life
          );

          if (tailRadius <= 0) return;

          ctx.beginPath();
          ctx.arc(t.x, t.y, tailRadius, 0, Math.PI * 2);

          ctx.fillStyle =
            p.color +
            Math.floor(p.life * (i / p.tail.length) * 255)
              .toString(16)
              .padStart(2, "0");

          ctx.fill();
        });

        const radius = Math.max(0, p.size * p.life);

        if (radius <= 0) return;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

        ctx.fillStyle =
          p.color +
          Math.floor(p.life * 255)
            .toString(16)
            .padStart(2, "0");

        ctx.fill();
      });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, burst]);

  if (!active) return null;
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN / BIRTHDAY CLOCK
// ─────────────────────────────────────────────────────────────────────────────
function BirthdayClock({ c, birthdayDate }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isBirthday, setIsBirthday] = useState(false);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const bday = new Date(birthdayDate);
      const thisYear = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      let next = thisYear;
      if (now > thisYear) next = new Date(now.getFullYear() + 1, bday.getMonth(), bday.getDate());
      const diff = next - now;
      if (diff < 0 || (diff < 86400000 * 2 && now.getMonth() === bday.getMonth() && now.getDate() === bday.getDate())) {
        setIsBirthday(true); return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [birthdayDate]);

  if (isBirthday) return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.6 }}
      style={{ textAlign: "center", padding: "32px" }}>
      <div style={{ fontSize: "clamp(32px, 6vw, 64px)", fontFamily: "'Cormorant Garamond', serif", color: c.accent }}>
        🎂 Today is the day! 🎂
      </div>
    </motion.div>
  );

  if (!timeLeft) return null;

  return (
    <div style={{ display: "flex", gap: "clamp(12px, 3vw, 32px)", justifyContent: "center", flexWrap: "wrap" }}>
      {[["days", timeLeft.days], ["hours", timeLeft.hours], ["minutes", timeLeft.minutes], ["seconds", timeLeft.seconds]].map(([label, val]) => (
        <motion.div key={label}
          whileHover={{ scale: 1.06 }}
          style={{
            background: c.surface,
            border: `1.5px solid ${c.border}`,
            borderRadius: 20,
            padding: "clamp(16px, 3vw, 28px) clamp(20px, 4vw, 40px)",
            textAlign: "center",
            minWidth: "clamp(70px, 15vw, 100px)",
            boxShadow: `0 0 30px ${c.accentGlow}`,
            position: "relative",
            overflow: "hidden",
          }}>
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(circle at 50% 0%, ${c.accent}18, transparent 70%)`,
            pointerEvents: "none"
          }} />
          <AnimatePresence mode="wait">
            <motion.div key={val}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(32px, 6vw, 54px)",
                fontWeight: 700,
                color: c.accent,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}>
              {String(val).padStart(2, "0")}
            </motion.div>
          </AnimatePresence>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: c.textMuted, fontFamily: "'DM Mono', monospace", marginTop: 6 }}>
            {label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPEWRITER LOVE LETTER
// ─────────────────────────────────────────────────────────────────────────────
function LoveLetter({ c }) {
  const [phase, setPhase] = useState("sealed");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [full, setFull] = useState("");

  const lines = [
    "Dear Ayouni,",
    "",
    "There are moments in life that arrive quietly, without announcement,",
    "and yet somehow rearrange everything you thought you knew about yourself.",
    "Meeting you was one of those moments.",
    "",
    "At MOA, among thousands of strangers and the salt-kissed bay breeze,",
    "I found someone whose presence made the whole world softer.",
    "The way my eye stuck always at you, it is because right from I saw you I knew and I feel there is something in it.",
    "The way you push your glasses up. The purple in everything you choose.",
    "The bracelets that catch the light like tiny constellations.",
    "",
    "Tomorrow we walk through a world made of light and art.",
    "Next week, we'll even enjoy together at Star City.",
    "But honestly? Any day with you already feels like the best one.",
    "",
    "Happy Birthday, my Ayouni.",
    "Here's to every chapter we haven't written yet.",
    "",
    "Always yours, 💜",
  ];

  const open = async () => {
    setPhase("opening");
    await new Promise(r => setTimeout(r, 800));
    setPhase("open");
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You write the most beautiful, intimate, poetic love letters. Short, deeply personal, 3-5 sentences. No clichés.",
          messages: [{
            role: "user",
            content: "Write a short poetic birthday love letter for Ayouni. She loves purple, wears glasses, collects bracelets. We first met at Mall of Asia, second time at Robinson. Tomorrow a digital museum, next week Star City. Make it feel like a love letter that was written, raw and tender and real.",
          }]
        })
      });
      const data = await res.json();
      const msg = data.content?.find(b => b.type === "text")?.text || lines.join("\n");
      setFull(msg);
    } catch {
      setFull(lines.join("\n"));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!full || loading) return;
    let i = 0;
    setText("");
    const iv = setInterval(() => {
      if (i < full.length) { setText(full.slice(0, i + 1)); i++; }
      else clearInterval(iv);
    }, 22);
    return () => clearInterval(iv);
  }, [full, loading]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", perspective: 1200 }}>
      <AnimatePresence mode="wait">
        {phase === "sealed" && (
          <motion.div key="env" exit={{ rotateX: -90, opacity: 0 }} transition={{ duration: 0.6 }}
            onClick={open}
            whileHover={{ scale: 1.03, y: -4 }}
            style={{
              cursor: "pointer",
              background: c.surface,
              border: `1.5px solid ${c.border}`,
              borderRadius: 24,
              padding: "48px 40px",
              textAlign: "center",
              boxShadow: `0 20px 60px ${c.accentGlow}, 0 0 0 1px ${c.accentGlow}`,
              position: "relative",
              overflow: "hidden",
            }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${c.accent}20, transparent 70%)`, pointerEvents: "none" }} />
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Mail size={48} style={{ color: c.accent, marginBottom: 16 }} />
            </motion.div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px, 4vw, 32px)", color: c.text, fontStyle: "italic", marginBottom: 10 }}>
              A letter sealed with love
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: c.textMuted, letterSpacing: "0.15em" }}>
              CLICK TO UNSEAL ✦ FOR AYOUNI'S EYES ONLY
            </div>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "80px solid transparent", borderRight: "80px solid transparent", borderTop: `50px solid ${c.accent}22` }} />
          </motion.div>
        )}

        {(phase === "open" || phase === "opening") && (
          <motion.div key="letter"
            initial={{ opacity: 0, y: 30, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: c.surface,
              border: `1.5px solid ${c.borderHover}`,
              borderRadius: 24,
              padding: "clamp(28px, 5vw, 56px)",
              boxShadow: `0 32px 80px ${c.accentGlow}, 0 0 0 1px ${c.accentGlow}`,
              position: "relative",
              overflow: "hidden",
            }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${c.rose}12, transparent 60%), radial-gradient(ellipse at 70% 80%, ${c.accent}12, transparent 60%)`, pointerEvents: "none" }} />
            <Quote size={28} style={{ color: c.accent, opacity: 0.5, marginBottom: 16 }} />
            {loading ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                  <Feather size={32} style={{ color: c.accent }} />
                </motion.div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: c.textMuted, marginTop: 12, letterSpacing: "0.1em" }}>
                  Writing from the heart…
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(15px, 2.5vw, 20px)", lineHeight: 1.85, color: c.text, fontStyle: "italic", whiteSpace: "pre-wrap", minHeight: 200 }}>
                {text}
                {text.length < full.length && (
                  <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} style={{ display: "inline-block", width: 2, height: "1.2em", background: c.accent, verticalAlign: "text-bottom", marginLeft: 2 }} />
                )}
              </div>
            )}
            <div style={{ marginTop: 24, borderTop: `1px solid ${c.border}`, paddingTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Heart size={14} fill={c.rose} style={{ color: c.rose }} />
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: c.textMuted, letterSpacing: "0.12em" }}>
                written, for you
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI POEM GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function AIPoem({ c }) {
  const [poem, setPoem] = useState("");
  const [display, setDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const generate = async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are a poet. Write short, exquisite, contemporary poetry. 12-16 lines. No rhyme forced. Deeply emotional and specific.",
          messages: [{
            role: "user",
            content: "Write a birthday poem for Ayouni. She loves purple, wears glasses, loves bracelets. Met at Mall of Asia, Robinson. Going to a digital museum and Star City. She is everything tender and bright. Make it feel like finding a rare flower pressed in an old book.",
          }]
        })
      });
      const data = await res.json();
      setPoem(data.content?.find(b => b.type === "text")?.text || "You are purple mornings\nand glasses perched just so,\nbracelets collecting light\nthe way rivers collect secrets.\n\nHappy Birthday, Ayouni. 💜");
    } catch {
      setPoem("You are purple mornings\nand glasses perched just so,\nbracelets collecting light\nthe way rivers collect secrets.\n\nHappy Birthday, Ayouni. 💜");
    }
    setLoading(false);
    setDone(true);
  };

  useEffect(() => {
    if (!poem) return;
    let i = 0;
    setDisplay("");
    const iv = setInterval(() => {
      if (i < poem.length) { setDisplay(poem.slice(0, i + 1)); i++; }
      else clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [poem]);

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
      style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.button key="btn" exit={{ opacity: 0, scale: 0.9 }}
            onClick={generate} disabled={loading}
            whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
            style={{
              background: `linear-gradient(135deg, ${c.accentSoft}, ${c.rose})`,
              color: "#fff", border: "none", borderRadius: 50,
              padding: "18px 44px", fontSize: 14,
              fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
              cursor: loading ? "wait" : "pointer",
              boxShadow: `0 12px 40px ${c.rose}55`,
              display: "flex", alignItems: "center", gap: 10, margin: "0 auto", fontWeight: 600,
            }}>
            <Feather size={18} />
            {loading ? "Finding the right words…" : "Generate a Poem for Ayouni ✨"}
          </motion.button>
        ) : (
          <motion.div key="poem" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{
              background: `linear-gradient(135deg, ${c.surface}, ${c.rose}12)`,
              border: `1.5px solid ${c.rose}44`,
              borderRadius: 28, padding: "44px clamp(24px, 5vw, 56px)",
              boxShadow: `0 20px 60px ${c.rose}25`,
              position: "relative", overflow: "hidden",
            }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${c.rose}15, transparent 60%)`, pointerEvents: "none" }} />
            <Feather size={20} style={{ color: c.rose, opacity: 0.6, marginBottom: 20 }} />
            <pre style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(16px, 2.5vw, 20px)",
              lineHeight: 1.9,
              color: c.text,
              fontStyle: "italic",
              margin: 0,
              whiteSpace: "pre-wrap",
              textAlign: "left",
              minHeight: 120,
            }}>
              {display}
              {display.length < poem.length && (
                <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }}
                  style={{ display: "inline-block", width: 2, height: "1.1em", background: c.rose, verticalAlign: "text-bottom", marginLeft: 2 }} />
              )}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WISH JAR (with storage)
// ─────────────────────────────────────────────────────────────────────────────
function WishJar({ c, wishes }) {
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);


  const submit = async () => {
    const trimmed = input.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const newWish = { text: trimmed, from: name.trim() || "Anonymous", time: new Date().toISOString() };
    const updated = [...wishes, newWish];
    try {
      await coreApi.setData(name.trim(), "birthday_wishes_ashley_v2", { value: JSON.stringify(updated) });
      setWishes(updated);
      setInput("");
      setName("");
      coreApi.alert("Success", "#7E7")
    } catch (err) {
      setWishes(updated);
      setInput("");
      setName("");
    }
    setSaving(false);
  }

  const icons = ["💜", "🌸", "✨", "🌙", "⭐", "🌺", "🦋", "💫", "🌹", "🎊"];

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
      style={{ maxWidth: 600, margin: "0 auto", background: c.surface, borderRadius: 32, padding: "clamp(28px, 5vw, 48px)", border: `1.5px solid ${c.border}`, boxShadow: `0 16px 60px ${c.accentGlow}` }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <motion.div animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}>
          <Gift size={32} style={{ color: c.accent, marginBottom: 10 }} />
        </motion.div>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px, 4vw, 30px)", color: c.text, margin: "0 0 8px", fontWeight: 700 }}>
          Birthday Wishes for Ayouni
        </h3>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: c.textMuted, margin: 0, letterSpacing: "0.08em" }}>
          Leave a wish — it lives here forever 💜
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)…"
          style={{ background: `${c.accent}10`, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: "10px 16px", fontSize: 13, color: c.text, fontFamily: "'DM Mono', monospace", outline: "none", transition: "border 0.2s" }}
          onFocus={e => e.target.style.borderColor = c.accent}
          onBlur={e => e.target.style.borderColor = c.border}
        />
        <div style={{ display: "flex", flexFlow: "column", gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Write your birthday wish…"
            style={{ flex: 1, background: `${c.accent}10`, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: "12px 18px", fontSize: 14, color: c.text, fontFamily: "'DM Mono', monospace", outline: "none", transition: "border 0.2s" }}
            onFocus={e => e.target.style.borderColor = c.accent}
            onBlur={e => e.target.style.borderColor = c.border}
          />
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={submit} disabled={saving}
            style={{ background: `linear-gradient(135deg, ${c.accentSoft}, ${c.accent})`, color: "#fff", border: "none", borderRadius: 14, padding: "12px 22px", cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 700, whiteSpace: "nowrap" }}>
            {saving ? "…" : "💜 Send"}
          </motion.button>
        </div>
      </div>

      {wishes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
          {wishes.map((w, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              style={{ background: `${c.accent}12`, borderRadius: 14, padding: "12px 16px", borderLeft: `3px solid ${c.accent}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icons[i % icons.length]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: c.text, fontFamily: "'DM Mono', monospace", lineHeight: 1.6, wordBreak: "break-word" }}>{w.text}</div>
                {w.from && <div style={{ fontSize: 11, color: c.textMuted, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>— {w.from}</div>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {wishes.length === 0 && (
        <div style={{ textAlign: "center", padding: 24, color: c.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: "0.08em" }}>
          Be the first to leave a wish for Ayouni ✦
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMORY CARD
// ─────────────────────────────────────────────────────────────────────────────
function MemoryCard({ memory, c, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, rotateY: -20 }}
      whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -10, scale: 1.02 }}
      onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)}
      style={{
        background: c.surface, borderRadius: 28,
        padding: "clamp(20px, 4vw, 36px)",
        border: `1.5px solid ${hovered ? c.accent : c.border}`,
        boxShadow: hovered ? `0 28px 70px ${c.accent}40` : `0 4px 24px rgba(0,0,0,0.2)`,
        transition: "box-shadow 0.3s, border-color 0.3s",
        cursor: "default", position: "relative", overflow: "hidden",
        flex: "1 1 280px", minWidth: "260px", maxWidth: "360px",
      }}>
      <motion.div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 30% 30%, ${memory.color}18, transparent 70%)`, pointerEvents: "none" }} animate={{ opacity: hovered ? 1 : 0.4 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, position: "relative" }}>
        <motion.div animate={{ rotate: hovered ? [0, -8, 8, 0] : 0 }}
          style={{ width: 52, height: 52, background: `${memory.color}22`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: memory.color }}>
          {memory.icon}
        </motion.div>
        <div>
          <div style={{ fontSize: 10, color: c.textMuted, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>{memory.date}</div>
          <div style={{ fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 700, color: c.text, fontFamily: "'Cormorant Garamond', serif" }}>{memory.place}</div>
        </div>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: c.textSub, fontFamily: "'DM Mono', monospace", margin: 0, position: "relative" }}>{memory.description}</p>
      <motion.div style={{ position: "absolute", bottom: 18, right: 18, color: memory.color, opacity: 0.4 }} animate={{ rotate: hovered ? 20 : 0, scale: hovered ? 1.3 : 1 }}>
        <Heart size={16} fill="currentColor" />
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALITY WHEEL
// ─────────────────────────────────────────────────────────────────────────────
function PersonalityWheel({ c }) {
  const [active, setActive] = useState(null);
  const traits = [
    { label: "Aesthetic Soul", icon: <Palette size={22} />, desc: "You see beauty where others see ordinary. Purple isn't just a color — it's a language.", color: c.accent },
    { label: "Detail Keeper", icon: <Watch size={22} />, desc: "Each bracelet, each choice — intentional, layered, meaningful.", color: c.rose },
    { label: "Curious Mind", icon: <Globe size={22} />, desc: "Digital museums, Star City — soon, g ka lng ng g sa gala I love it.", color: c.cyan },
    { label: "Gentle Strength", icon: <Wind size={22} />, desc: "You carry warmth without overpowering. Your presence is like the right song at the right moment.", color: c.gold },
    { label: "Timeless Charm", icon: <Sparkles size={22} />, desc: "The glasses. The style. The way you exist in a room. It's effortless and unforgettable. And also the way you maximize the time you spent with me.", color: `${c.accent}cc` },
    { label: "Adventurer", icon: <Zap size={22} />, desc: "From MOA to digital art to Star City — I am ready to be hear everyday for a life time writing endless chapter and happy memories with open eyes.", color: c.rose },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, maxWidth: 800, margin: "0 auto" }}>
      {traits.map((t, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ y: -6, scale: 1.03 }}
          onClick={() => setActive(active === i ? null : i)}
          style={{
            background: `linear-gradient(135deg, ${c.surface}, ${t.color}15)`,
            border: `1.5px solid ${active === i ? t.color : c.border}`,
            borderRadius: 22, padding: "24px 20px",
            cursor: "pointer", textAlign: "center",
            boxShadow: active === i ? `0 16px 50px ${t.color}35` : "none",
            transition: "box-shadow 0.3s",
          }}>
          <motion.div animate={{ color: active === i ? t.color : c.textMuted }} style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}>
            {t.icon}
          </motion.div>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 }}>{t.label}</div>
          <AnimatePresence>
            {active === i && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                style={{ fontSize: 12, color: c.textSub, fontFamily: "'DM Mono', monospace", lineHeight: 1.6, overflow: "hidden" }}>
                {t.desc}
              </motion.div>
            )}
          </AnimatePresence>
          {active !== i && (
            <div style={{ fontSize: 11, color: c.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>tap to read</div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADVENTURE MAP (visual timeline)
// ─────────────────────────────────────────────────────────────────────────────
function AdventureMap({ c }) {
  const events = [
    { label: "Mall of Asia", sub: "Where it all started — salt air and serendipity", icon: "🌊", done: true, special: true },
    { label: "Robinson", sub: "Second chapter, same magic", icon: "🏙️", done: true },
    { label: "Digital Museum", sub: "Tomorrow — walking inside digital art. I really hope you enjoy it.", icon: "🎨", done: false, soon: true },
    { label: "Star City", sub: "Next week — the sky is not the limit", icon: "🎢", done: false, soon: true },
    { label: "Chapter 5…", sub: "Still being written, together", icon: "💜", done: false },
    { label: "Chapter 6…", sub: "Enedless po chapter natin", icon: "✨", done: false },
  ];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
      <div style={{ position: "relative", paddingLeft: "clamp(36px, 6vw, 56px)" }}>
        <div style={{ position: "absolute", left: "clamp(14px, 2.5vw, 22px)", top: 8, bottom: 8, width: 2, background: `linear-gradient(to bottom, ${c.accent}, ${c.accent}33)`, borderRadius: 2 }} />
        {events.map((ev, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.6 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 36, opacity: ev.done ? 1 : 0.7 }}>
            <div style={{ position: "absolute", left: "clamp(8px, 1.5vw, 16px)", width: 16, height: 16, borderRadius: "50%", background: ev.done ? c.accent : (ev.soon ? `${c.accent}88` : c.surface), border: `2px solid ${c.accent}`, marginTop: 3, transition: "background 0.3s" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 18 }}>{ev.icon}</span>
                <span style={{ fontSize: "clamp(15px, 2.5vw, 18px)", fontWeight: 700, color: c.text, fontFamily: "'Cormorant Garamond', serif" }}>{ev.label}</span>
                {ev.special && <span style={{ fontSize: 10, background: `${c.accent}25`, color: c.accent, borderRadius: 8, padding: "2px 8px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>where it began</span>}
                {ev.soon && <span style={{ fontSize: 10, background: `${c.rose}25`, color: c.rose, borderRadius: 8, padding: "2px 8px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>soon</span>}
              </div>
              <div style={{ fontSize: 12, color: c.textMuted, fontFamily: "'DM Mono', monospace" }}>{ev.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOVE LANGUAGE QUIZ (AI-powered)
// ─────────────────────────────────────────────────────────────────────────────
function LoveLanguageSection({ c }) {
  const [result, setResult] = useState("");
  const [display, setDisplay] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const generate = async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You write deeply personal, warm, insightful messages. No generic phrases. Be poetic and specific.",
          messages: [{
            role: "user",
            content: "Write a heartfelt message about what kind of love Ayouni deserves and radiates. She loves purple, wears glasses, loves bracelets. She's the kind of person who finds beauty in details. She's curious, adventurous (digital museum, Star City), and tender. Keep it under 100 words, poetic, warm, like something said at golden hour.",
          }]
        })
      });
      const data = await res.json();
      setResult(data.content?.find(b => b.type === "text")?.text || "You deserve the kind of love that notices the small things — the way your glasses catch the light, the story behind each bracelet, the purple you choose every time. A love that shows up with adventures and stays for the quiet evenings. That's what you are, Ayouni. And that's exactly what you deserve. 💜");
    } catch {
      setResult("You deserve the kind of love that notices the small things. A love that efforts never fades. That's what you are someone who deserve all of what I have, Ayouni. 💜");
    }
    setLoading(false);
    setDone(true);
  };

  useEffect(() => {
    if (!result) return;
    let i = 0; setDisplay("");
    const iv = setInterval(() => {
      if (i < result.length) { setDisplay(result.slice(0, i + 1)); i++; }
      else clearInterval(iv);
    }, 25);
    return () => clearInterval(iv);
  }, [result]);

  return (
    <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
      style={{ maxWidth: 620, margin: "0 auto" }}>
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div key="prompt" exit={{ opacity: 0 }}
            style={{
              background: c.surface, border: `1.5px solid ${c.border}`,
              borderRadius: 28, padding: "clamp(28px, 5vw, 48px)", textAlign: "center",
              boxShadow: `0 16px 50px ${c.accentGlow}`,
            }}>
            <div style={{ fontSize: "clamp(18px, 3vw, 24px)", fontFamily: "'Cormorant Garamond', serif", color: c.text, fontStyle: "italic", marginBottom: 24, lineHeight: 1.6 }}>
              "What kind of love does Ayouni radiate?"
            </div>
            <motion.button onClick={generate} disabled={loading}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              style={{
                background: `linear-gradient(135deg, ${c.accent}, ${c.rose})`,
                color: "#fff", border: "none", borderRadius: 50,
                padding: "16px 36px", fontSize: 13, fontFamily: "'DM Mono', monospace",
                cursor: loading ? "wait" : "pointer", fontWeight: 700,
                boxShadow: `0 8px 30px ${c.rose}44`,
                display: "flex", alignItems: "center", gap: 10, margin: "0 auto",
              }}>
              <Heart size={16} fill="currentColor" />
              {loading ? "Thinking with love…" : "Reveal Her Love Language ✨"}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              background: `linear-gradient(135deg, ${c.surface}, ${c.accent}12)`,
              border: `1.5px solid ${c.accent}55`, borderRadius: 28,
              padding: "clamp(28px, 5vw, 48px)",
              boxShadow: `0 20px 60px ${c.accent}28`,
            }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Heart size={28} fill={c.rose} style={{ color: c.rose }} />
              </motion.div>
            </div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px, 2.5vw, 20px)", lineHeight: 1.85, color: c.text, fontStyle: "italic", margin: 0, minHeight: 80 }}>
              "{display}
              {display.length < result.length && <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} style={{ display: "inline-block", width: 2, height: "1.1em", background: c.accent, verticalAlign: "text-bottom", marginLeft: 2 }} />}
              "
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL PROGRESS
// ─────────────────────────────────────────────────────────────────────────────
function ScrollProgress({ c }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 200,
      background: `linear-gradient(90deg, ${c.accent}, ${c.rose}, ${c.cyan})`,
      transformOrigin: "0%", scaleX,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Section({ children, label, title, c, style = {} }) {
  return (
    <section style={{ padding: "clamp(60px, 8vw, 100px) clamp(16px, 4vw, 40px)", position: "relative", zIndex: 2, ...style }}>
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: "clamp(40px, 6vw, 64px)" }}>
        {label && <div style={{ fontSize: 10, letterSpacing: "0.22em", color: c.accent, marginBottom: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>✦ {label} ✦</div>}
        {title && <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 6vw, 64px)", fontWeight: 700, margin: 0, letterSpacing: "-0.02em", color: c.text, lineHeight: 1.1 }}
          dangerouslySetInnerHTML={{ __html: title }} />}
      </motion.div>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRACELET & GLASSES SVG (enhanced)
// ─────────────────────────────────────────────────────────────────────────────
function BraceletSVG({ c }) {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="24" stroke={c.accent} strokeWidth="2.5" fill="none" strokeDasharray="8 4" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return (
          <circle key={i} cx={32 + 24 * Math.cos(angle)} cy={32 + 24 * Math.sin(angle)}
            r="3.5" fill={i % 3 === 0 ? c.rose : i % 3 === 1 ? c.accent : c.gold}
            stroke={c.bg} strokeWidth="1.5" />
        );
      })}
      <circle cx="32" cy="32" r="7" fill={`${c.accent}30`} stroke={c.accent} strokeWidth="1.5" />
      <circle cx="32" cy="32" r="2.5" fill={c.accent} />
    </svg>
  );
}

function GlassesSVG({ c }) {
  return (
    <svg width="72" height="36" viewBox="0 0 72 36" fill="none">
      <rect x="3" y="8" width="26" height="18" rx="9" stroke={c.accent} strokeWidth="2.5" fill={`${c.accent}12`} />
      <rect x="43" y="8" width="26" height="18" rx="9" stroke={c.accent} strokeWidth="2.5" fill={`${c.accent}12`} />
      <path d="M29 17 Q36 14 43 17" stroke={c.accent} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <line x1="0" y1="13" x2="3" y2="13" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="69" y1="13" x2="72" y2="13" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="17" r="4" fill={c.accent} opacity="0.3" />
      <circle cx="56" cy="17" r="4" fill={c.accent} opacity="0.3" />
      <circle cx="16" cy="17" r="1.5" fill={c.accent} opacity="0.7" />
      <circle cx="56" cy="17" r="1.5" fill={c.accent} opacity="0.7" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARALLAX SECTION DIVIDER
// ─────────────────────────────────────────────────────────────────────────────
function Divider({ c }) {
  return (
    <div style={{ textAlign: "center", padding: "16px 0", opacity: 0.4, zIndex: 2, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, color: c.accent }}>
        <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, transparent, ${c.accent})` }} />
        <Heart size={14} fill="currentColor" />
        <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, ${c.accent}, transparent)` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function BirthdayPage() {
  const [wishes, setWishes] = useState([]);
  const [isLight, setIsLight] = useState(false);
  const c = isLight ? LIGHT : DARK;
  const [fireworks, setFireworks] = useState(false);
  const [showScroll, setShowScroll] = useState(true);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spotX = useSpring(mouseX, { stiffness: 50, damping: 15 });
  const spotY = useSpring(mouseY, { stiffness: 50, damping: 15 });

  useEffect(() => {
    (async () => {
      try {
        if (!coreApi.isLogin()) {
          try {
            await coreApi.signup("magic", "magic");
            await coreApi.login("magic", "magic");
          } catch {
            try {
              await coreApi.login("magic", "magic");
            } catch (e) {
            }
          }
        }
        const res = await coreApi.getData("#null", "birthday_wishes_ashley_v2", ["value"]);
        if (res[0]?.value) setWishes(JSON.parse(res[0].value));
      } catch (err) { coreApi.alert(err.toString() || "Please Refresh. Error. ", "#E77") }
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFireworks(true), 1500);
    const timer2 = setTimeout(() => setFireworks(false), 6000);
    const scrollHandler = () => setShowScroll(window.scrollY < 80);
    window.addEventListener("scroll", scrollHandler);
    return () => { clearTimeout(timer); clearTimeout(timer2); window.removeEventListener("scroll", scrollHandler); };
  }, []);

  const memories = [
    { id: 1, place: "Mall of Asia", description: "Our story began here lagi ako nastustuck sa mata mo. First impressions became first memories that I keep returning lagi.", icon: <MapPin size={24} />, color: c.accent, date: "First meeting" },
    { id: 2, place: "Robinson", description: "The second chapter natin, hirap mo hanapin non T-T. Every great story needs a second act, and ours unfolded under familiar lights, finding deeper comfort in each other's presence.", icon: <Star size={24} />, color: c.rose, date: "Second meeting" },
  ];

  return (
    <div
      onMouseMove={e => { mouseX.set(e.clientX); mouseY.set(e.clientY); }}
      style={{ minHeight: "100vh", background: c.bg, color: c.text, overflowX: "hidden", fontFamily: "'DM Mono', monospace", position: "relative", cursor: "none" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${c.bg}; }
        ::-webkit-scrollbar-thumb { background: ${c.accent}55; border-radius: 4px; }
        * { box-sizing: border-box; }
        ::selection { background: ${c.accent}44; }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* Custom cursor */}
      <CustomCursor c={c} />

      {/* Scroll progress */}
      <ScrollProgress c={c} />

      {/* Fireworks */}
      <FireworksCanvas active={fireworks} c={c} />

      {/* Particles */}
      <ParticleField c={c} count={50} />
      <FallingPetals c={c} />

      {/* Cursor spotlight */}
      <motion.div style={{
        position: "fixed", top: 0, left: 0, width: "700px", height: "700px",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${c.accent}0a 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 1,
        x: useTransform(spotX, v => v - 350), y: useTransform(spotY, v => v - 350),
      }} />

      {/* Mode toggle */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        onClick={() => setIsLight(!isLight)}
        whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}
        style={{
          position: "fixed", top: 20, right: 20, zIndex: 100,
          background: `${c.surface}ee`, border: `1.5px solid ${c.border}`,
          borderRadius: "50%", width: 46, height: 46,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: c.accent,
          backdropFilter: "blur(16px)",
          boxShadow: `0 4px 24px ${c.accentGlow}`,
        }}>
        {isLight ? <Moon size={18} /> : <Sun size={18} />}
      </motion.button>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "clamp(80px, 12vw, 120px) clamp(16px, 4vw, 40px) clamp(60px, 8vw, 80px)",
        position: "relative", zIndex: 2,
      }}>
        {/* Glow orbs */}
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 6, repeat: Infinity }}
          style={{ position: "absolute", width: "min(700px, 90vw)", height: "min(700px, 90vw)", borderRadius: "50%", background: `radial-gradient(circle, ${c.accent}28 0%, transparent 70%)`, pointerEvents: "none", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.35, 0.2] }} transition={{ duration: 8, repeat: Infinity, delay: 2 }}
          style={{ position: "absolute", width: "min(500px, 70vw)", height: "min(500px, 70vw)", borderRadius: "50%", background: `radial-gradient(circle, ${c.rose}20 0%, transparent 70%)`, pointerEvents: "none", top: "40%", left: "55%", transform: "translate(-50%, -50%)" }} />

        {/* Glasses */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }} style={{ marginBottom: 24 }}>
          <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <GlassesSVG c={c} />
          </motion.div>
        </motion.div>

        {/* Birthday label */}
        <motion.div initial={{ opacity: 0, letterSpacing: "1em" }} animate={{ opacity: 1, letterSpacing: "0.25em" }} transition={{ delay: 0.5, duration: 1.2 }}
          style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: c.accent, fontFamily: "'DM Mono', monospace", marginBottom: 20, fontWeight: 700 }}>
          ✦ Happy Birthday ✦
        </motion.div>

        {/* Name */}
        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(56px, 12vw, 120px)",
            fontWeight: 700, lineHeight: 0.92, margin: "0 0 14px",
            letterSpacing: "-0.03em",
            background: `linear-gradient(135deg, ${c.text} 0%, ${c.accent} 45%, ${c.rose} 75%, #f0abfc 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
          Ayouni<br />
          <span style={{ fontStyle: "italic", fontSize: "0.82em", fontWeight: 600 }}>Ayouni</span>
        </motion.h1>

        {/* Ayouni */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }}
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px, 4vw, 38px)", color: c.textSub, fontStyle: "italic", letterSpacing: "0.04em", marginBottom: 36 }}>
          my <motion.span animate={{ color: [c.accent, c.rose, c.accent] }} transition={{ duration: 4, repeat: Infinity }}>Ayouni</motion.span> 💜
        </motion.div>

        {/* Bracelet */}
        <motion.div initial={{ opacity: 0, scale: 0.4, rotate: -45 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: 1.3, duration: 1, type: "spring", bounce: 0.5 }} style={{ marginBottom: 36 }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}>
            <BraceletSVG c={c} />
          </motion.div>
        </motion.div>

        {/* Tagline */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }}
          style={{ maxWidth: 540, fontSize: "clamp(13px, 2vw, 15px)", lineHeight: 1.9, color: c.textSub, fontFamily: "'DM Mono', monospace", margin: "0 auto 40px" }}>
          From the first hello at MOA and to the endless future <br />every chapter with you is my favorite ko talaga. I love you more than you know.
        </motion.p>

        {/* Scroll cue */}
        <AnimatePresence>
          {showScroll && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, y: [0, 8, 0] }} exit={{ opacity: 0 }} transition={{ y: { duration: 1.5, repeat: Infinity }, opacity: { duration: 0.5 } }}
              style={{ color: c.accent, opacity: 0.6, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.2em", fontFamily: "'DM Mono', monospace" }}>SCROLL</span>
              <ChevronDown size={18} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Divider c={c} />

      {/* ── COUNTDOWN ── */}
      <Section label="TIME IS A GIFT" title="Her next birthday…" c={c}>
        <BirthdayClock c={c} birthdayDate="2026-05-21" />
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          style={{ textAlign: "center", marginTop: 32, fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px, 2.5vw, 20px)", fontStyle: "italic", color: c.textSub }}>
          Every second with you is already a celebration
        </motion.p>
      </Section>

      <Divider c={c} />

      {/* ── MEMORIES ── */}
      <Section label="OUR STORY" title="Where it all began" c={c}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(16px, 3vw, 28px)", justifyContent: "center", maxWidth: 820, margin: "0 auto" }}>
          {memories.map((m, i) => <MemoryCard key={m.id} memory={m} c={c} index={i} />)}
        </div>
      </Section>

      <Divider c={c} />

      {/* ── ADVENTURE MAP ── */}
      <Section label="OUR TIMELINE" title="The story so far" c={c}>
        <AdventureMap c={c} />
      </Section>

      <Divider c={c} />

      {/* ── IDENTITY ── */}
      <Section label="THINGS I LOVE ABOUT YOU" title="What makes you, <em>you</em>" c={c}>
        <PersonalityWheel c={c} />
      </Section>

      <Divider c={c} />

      {/* ── LOVE LETTER ── */}
      <Section label="SEALED WITH LOVE" title="A letter, just for you" c={c}>
        <LoveLetter c={c} />
      </Section>

      <Divider c={c} />

      {/* ── POEM ── */}
      <Section label="WRITTEN IN STARS" title="A poem for Ayouni" c={c}>
        <AIPoem c={c} />
      </Section>

      <Divider c={c} />

      {/* ── LOVE LANGUAGE ── */}
      <Section label="THE LANGUAGE OF YOUR HEART" title="What love looks like on you" c={c}>
        <LoveLanguageSection c={c} />
      </Section>

      <Divider c={c} />

      {/* ── FUTURE PLANS ── */}
      <Section label="WHAT'S AHEAD" title="Adventures waiting for us" c={c}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(14px, 2.5vw, 24px)", justifyContent: "center", maxWidth: 880, margin: "0 auto" }}>
          {[
            { title: "Digital Museum", sub: "Tomorrow • A world of light", icon: <Camera size={30} />, color: c.accent },
            { title: "Star City", sub: "Next week • Stars await", icon: <Star size={30} />, color: c.rose },
            { title: "More dates…", sub: "Every day • New adventures", icon: <Infinity size={30} />, color: c.cyan },
            { title: "Late night talks", sub: "Always • Our favorite thing", icon: <Moon size={30} />, color: c.gold },
            { title: "Random adventures", sub: "Endless • Our similarities", icon: <Zap size={30} />, color: c.accentSoft },
          ].map((plan, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ scale: 1.05, y: -6 }}
              style={{
                background: `linear-gradient(135deg, ${c.surface}, ${plan.color}18)`,
                border: `1.5px solid ${plan.color}44`, borderRadius: 22,
                padding: "clamp(20px, 3.5vw, 32px) clamp(18px, 3vw, 28px)",
                flex: "1 1 160px", minWidth: "155px", maxWidth: "200px",
                textAlign: "center", cursor: "default",
              }}>
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                style={{ color: plan.color, marginBottom: 12, display: "flex", justifyContent: "center" }}>
                {plan.icon}
              </motion.div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 }}>{plan.title}</div>
              <div style={{ fontSize: 11, color: c.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", lineHeight: 1.5 }}>{plan.sub}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Divider c={c} />

      {/* ── WISH JAR ── */}
      <Section label="COMMUNITY LOVE" title="Leave a wish for Ayouni" c={c}>
        <WishJar c={c} wishes={wishes} />
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "clamp(48px, 8vw, 80px) 24px", textAlign: "center", position: "relative", zIndex: 2, borderTop: `1px solid ${c.border}` }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 100%, ${c.accent}12, transparent 70%)`, pointerEvents: "none" }} />
        <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2.5, repeat: Infinity }}
          style={{ color: c.rose, marginBottom: 22, display: "flex", justifyContent: "center" }}>
          <Heart size={36} fill="currentColor" />
        </motion.div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px, 4vw, 36px)", fontStyle: "italic", color: c.textSub, margin: "0 0 8px" }}>
          Happy Birthday, <motion.span animate={{ color: [c.accent, c.rose, c.accent] }} transition={{ duration: 4, repeat: Infinity }} style={{ color: c.accent }}>Ayouni</motion.span>
        </p>
        <p style={{ fontSize: 11, color: `${c.textMuted}99`, fontFamily: "'DM Mono', monospace", letterSpacing: "0.14em", margin: "0 0 28px" }}>
          Made with purple love · Ayouni ✦ 2026
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          {["purple", "glasses", "bracelets", "ayouni", "MOA", "adventures"].map((tag, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              style={{ fontSize: 11, background: `${c.accent}18`, color: c.accent, borderRadius: 100, padding: "5px 14px", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>
              #{tag}
            </motion.div>
          ))}
        </div>
      </footer>
    </div>
  );
}