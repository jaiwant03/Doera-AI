import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowUpRight, 
  Cpu, 
  Search, 
  Zap, 
  ShieldCheck, 
  Layers, 
  CheckCircle2, 
  ChevronRight, 
  Workflow, 
  Database, 
  Bot,
  MousePointer,
  MessageSquare,
  DollarSign,
  Calendar,
  RotateCcw,
  Check,
  Copy,
  Terminal,
  Code2,
  Radio,
  FileCode,
  Lock
} from 'lucide-react';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const [isHolding, setIsHolding] = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [activeSection, setActiveSection] = useState('capabilities');
  const [activeDocTab, setActiveDocTab] = useState('curl');
  const [copied, setCopied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Mutable animation state ref for 60fps canvas loop
  const animState = useRef({
    t: 0.15,
    speed: 0.0032,
    charge: 0,
    isHolding: false,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    sparks: [],
    dust: []
  });

  // Handle Click and Hold interaction
  const handleHoldStart = () => {
    setIsHolding(true);
    animState.current.isHolding = true;
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    animState.current.isHolding = false;
  };

  // Scroll spy to highlight active nav pill link and header shadow as user scrolls
  useEffect(() => {
    const sectionIds = ['capabilities', 'architecture', 'agents', 'pricing', 'docs'];
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const scrollPos = window.scrollY + 180;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll handler with persistent header offset
  const scrollToSection = (e, id) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 76;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSection(id);
    }
  };

  // Copy code helper
  const handleCopyCode = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const codeSnippets = {
    curl: `curl -X POST https://api.doera.ai/api/v1/tasks/execute \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Find top 3 licensed electricians in Seattle and get quotes",
    "mode": "autonomous",
    "requireApproval": true
  }'`,
    ts: `import { DoeraClient } from '@doera/sdk';

const doera = new DoeraClient({ 
  apiKey: process.env.DOERA_API_KEY 
});

// Launch autonomous multi-agent task execution
const execution = await doera.tasks.run({
  prompt: 'Schedule HVAC maintenance for Friday at 2 PM',
  onAgentEvent: (event) => {
    console.log(\`[\${event.agent}] \${event.action}: \${event.message}\`);
  }
});`,
    py: `from doera import DoeraClient

client = DoeraClient(api_key="your_api_key")

# Run deep research with verification & safety boundaries
task = client.tasks.execute(
    prompt="Compare commercial liability insurances for tech startup",
    require_approval=True
)

for event in task.stream_events():
    print(f"[{event.agent_name}] -> {event.status}: {event.summary}")`,
    ws: `const ws = new WebSocket('wss://api.doera.ai/v1/stream?token=' + token);

ws.onmessage = (event) => {
  const { type, agent, payload } = JSON.parse(event.data);
  if (type === 'AGENT_THINK') console.log(\`[\${agent}] Thinking:\`, payload);
  if (type === 'ACTION_REQUIRED') handleApproval(payload);
  if (type === 'TASK_COMPLETE') console.log('Finished:', payload.result);
};`
  };

  // 3D Cerebrium Ribbon Arches Procedural Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      animState.current.targetMouseX = (e.clientX - width / 2) * 0.05;
      animState.current.targetMouseY = (e.clientY - height / 2) * 0.05;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize ambient floating dust motes
    const dustCount = 45;
    animState.current.dust = [];
    for (let i = 0; i < dustCount; i++) {
      animState.current.dust.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.6 + 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        alpha: Math.random() * 0.6 + 0.2
      });
    }

    // Helper: Parametric 3D Arch Curve Calculation
    const getArchPoint = (u, zOffset, pX, pY) => {
      // 3D curved portal arch geometry
      const x0 = width * (0.94 - zOffset * 0.13) + pX * (1 - zOffset * 0.3);
      const y0 = height * 1.15 + pY * (1 - zOffset * 0.3);

      const x1 = width * (0.86 - zOffset * 0.14) + pX;
      const y1 = height * 0.22 + pY;

      const x2 = width * (0.64 - zOffset * 0.16) + pX;
      const y2 = height * 0.20 + pY;

      const x3 = width * (0.42 - zOffset * 0.20) + pX;
      const y3 = height * 1.20 + pY;

      // Cubic Bezier interpolation
      const inv = 1 - u;
      const x = inv * inv * inv * x0 + 3 * inv * inv * u * x1 + 3 * inv * u * u * x2 + u * u * u * x3;
      const y = inv * inv * inv * y0 + 3 * inv * inv * u * y1 + 3 * inv * u * u * y2 + u * u * u * y3;
      return { x, y };
    };

    // Render loop
    const render = () => {
      const state = animState.current;

      // Smooth mouse parallax lerp
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;

      // Click & Hold acceleration & charge ramp
      if (state.isHolding) {
        state.charge = Math.min(1, state.charge + 0.035);
        state.speed = 0.0032 + state.charge * 0.014; // surge up to ~5x speed
      } else {
        state.charge = Math.max(0, state.charge - 0.04);
        state.speed = 0.0032 + state.charge * 0.014;
      }
      setChargeLevel(state.charge);

      // Advance beam progression
      state.t = (state.t + state.speed) % 1;

      // Clear dark void canvas
      ctx.fillStyle = '#060309';
      ctx.fillRect(0, 0, width, height);

      // 1. Ambient Volumetric Deep Magenta Nebula
      const glowX = width * 0.72 + state.mouseX;
      const glowY = height * 0.55 + state.mouseY;
      const nebulaRadius = Math.max(width, height) * (0.6 + state.charge * 0.15);
      const nebula = ctx.createRadialGradient(glowX, glowY, 50, glowX, glowY, nebulaRadius);
      nebula.addColorStop(0, `rgba(142, 29, 114, ${0.42 + state.charge * 0.25})`);
      nebula.addColorStop(0.35, `rgba(241, 45, 152, ${0.16 + state.charge * 0.12})`);
      nebula.addColorStop(0.7, 'rgba(30, 8, 25, 0.45)');
      nebula.addColorStop(1, 'transparent');
      ctx.fillStyle = nebula;
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient Floating Dust Motes
      state.dust.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < -10) d.y = height + 10;
        if (d.x < -10) d.x = width + 10;
        if (d.x > width + 10) d.x = -10;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 180, 220, ${d.alpha * (0.6 + state.charge * 0.4)})`;
        ctx.fill();
      });

      // 3. Render 3 Concentric Curved 3D Ribbon Arches
      const arches = [
        { z: 1.8, ribbonWidth: 54, alpha: 0.35, colorDark: '#230419', colorLight: '#460B32' },
        { z: 1.0, ribbonWidth: 70, alpha: 0.65, colorDark: '#350626', colorLight: '#68114D' },
        { z: 0.0, ribbonWidth: 86, alpha: 1.0,  colorDark: '#4A0836', colorLight: '#8E1D72', isFore: true }
      ];

      arches.forEach((arch) => {
        const steps = 60;
        const outerPoints = [];
        const innerPoints = [];

        for (let i = 0; i <= steps; i++) {
          const u = i / steps;
          const p = getArchPoint(u, arch.z, state.mouseX, state.mouseY);
          outerPoints.push(p);

          // Calculate normal displacement for 3D ribbon thickness
          const du = 0.01;
          const pNext = getArchPoint(Math.min(1, u + du), arch.z, state.mouseX, state.mouseY);
          const dx = pNext.x - p.x;
          const dy = pNext.y - p.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          innerPoints.push({
            x: p.x + nx * arch.ribbonWidth,
            y: p.y + ny * arch.ribbonWidth
          });
        }

        // Draw 3D Ribbon Body
        ctx.beginPath();
        ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
        for (let i = 1; i <= steps; i++) {
          ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
        }
        for (let i = steps; i >= 0; i--) {
          ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
        }
        ctx.closePath();

        const ribbonGrad = ctx.createLinearGradient(
          outerPoints[0].x, outerPoints[0].y,
          outerPoints[steps].x, outerPoints[steps].y
        );
        ribbonGrad.addColorStop(0, arch.colorDark);
        ribbonGrad.addColorStop(0.3, arch.colorLight);
        ribbonGrad.addColorStop(0.7, arch.colorDark);
        ribbonGrad.addColorStop(1, '#10020D');

        ctx.fillStyle = ribbonGrad;
        ctx.globalAlpha = arch.alpha;
        ctx.fill();

        // Top Outer Specular Bevel Rim
        ctx.beginPath();
        ctx.moveTo(outerPoints[0].x, outerPoints[0].y);
        for (let i = 1; i <= steps; i++) {
          ctx.lineTo(outerPoints[i].x, outerPoints[i].y);
        }
        ctx.strokeStyle = arch.isFore ? 'rgba(241, 45, 152, 0.45)' : 'rgba(142, 29, 114, 0.25)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 4. Foremost Arch: Dynamic Traveling White-Hot Neon Laser Beam
        if (arch.isFore) {
          const beamSpan = 0.22; // beam length along curve
          const headU = state.t;
          const tailU = Math.max(0, headU - beamSpan);

          // Sample beam path
          const beamSteps = 30;
          ctx.beginPath();
          let started = false;

          for (let b = 0; b <= beamSteps; b++) {
            const currentU = tailU + (b / beamSteps) * (headU - tailU);
            if (currentU >= 0 && currentU <= 1) {
              const bp = getArchPoint(currentU, arch.z, state.mouseX, state.mouseY);
              if (!started) {
                ctx.moveTo(bp.x, bp.y);
                started = true;
              } else {
                ctx.lineTo(bp.x, bp.y);
              }
            }
          }

          if (started) {
            // Outer Neon Pink Atmospheric Bloom
            ctx.shadowColor = '#F12D98';
            ctx.shadowBlur = 40 + state.charge * 30;
            ctx.strokeStyle = `rgba(241, 45, 152, ${0.85 + state.charge * 0.15})`;
            ctx.lineWidth = 14 + state.charge * 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Core White-Hot Laser Center
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4.5 + state.charge * 2;
            ctx.stroke();

            ctx.shadowBlur = 0; // reset
          }

          // Beam Head Specular Flare
          const headPt = getArchPoint(headU, arch.z, state.mouseX, state.mouseY);
          const flareRadius = 24 + state.charge * 18;
          const flare = ctx.createRadialGradient(headPt.x, headPt.y, 0, headPt.x, headPt.y, flareRadius);
          flare.addColorStop(0, '#FFFFFF');
          flare.addColorStop(0.3, '#FF8CCB');
          flare.addColorStop(0.7, 'rgba(241, 45, 152, 0.6)');
          flare.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(headPt.x, headPt.y, flareRadius, 0, Math.PI * 2);
          ctx.fillStyle = flare;
          ctx.fill();

          // Spawn trailing sparks when holding or moving
          if (state.isHolding || Math.random() < 0.3) {
            state.sparks.push({
              x: headPt.x,
              y: headPt.y,
              vx: (Math.random() - 0.5) * 4 - 2,
              vy: (Math.random() - 0.5) * 4 + 1,
              life: 1.0,
              decay: Math.random() * 0.04 + 0.02,
              size: Math.random() * 3 + 1
            });
          }
        }
      });

      // 5. Render Particle Sparks
      for (let s = state.sparks.length - 1; s >= 0; s--) {
        const spark = state.sparks[s];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.life -= spark.decay;

        if (spark.life <= 0) {
          state.sparks.splice(s, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * spark.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 230, 245, ${spark.life})`;
        ctx.shadowColor = '#F12D98';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="landing-container">
      {/* 3D Cerebrium Curved Ribbon Arches Canvas */}
      <canvas ref={canvasRef} className="landing-canvas" />

      {/* 1. Cerebrium Persistent Floating Pill Dock Header */}
      <header className={`cerebrium-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="cerebrium-header-inner">
          {/* Brand Logo */}
          <div className="cerebrium-brand" onClick={() => navigate('/')}>
            <div className="cerebrium-logo-icon">
              <span className="logo-pulse-bar left" />
              <span className="logo-pulse-bar center" />
              <span className="logo-pulse-bar right" />
            </div>
            <span className="cerebrium-brand-text">DOERA AI</span>
          </div>

          {/* Center Floating Dark Glass Pill Dock */}
          <nav className="cerebrium-pill-dock">
            <a 
              href="#capabilities" 
              className={activeSection === 'capabilities' ? 'active' : ''}
              onClick={(e) => scrollToSection(e, 'capabilities')}
            >
              CAPABILITIES
            </a>
            <span className="dock-bullet">·</span>
            <a 
              href="#architecture" 
              className={activeSection === 'architecture' ? 'active' : ''}
              onClick={(e) => scrollToSection(e, 'architecture')}
            >
              ARCHITECTURE
            </a>
            <a 
              href="#agents" 
              className={activeSection === 'agents' ? 'active' : ''}
              onClick={(e) => scrollToSection(e, 'agents')}
            >
              AGENTS
            </a>
            <a 
              href="#pricing" 
              className={activeSection === 'pricing' ? 'active' : ''}
              onClick={(e) => scrollToSection(e, 'pricing')}
            >
              PRICING
            </a>
            <a 
              href="#docs" 
              className={activeSection === 'docs' ? 'active' : ''}
              onClick={(e) => scrollToSection(e, 'docs')}
            >
              DOCS
            </a>
            <span className="dock-grid-icon">
              <span className="grid-dot" />
              <span className="grid-dot" />
              <span className="grid-dot" />
              <span className="grid-dot" />
            </span>
          </nav>

          {/* Right Action Buttons */}
          <div className="cerebrium-header-actions">
            <Link to="/login" className="btn-cerebrium-login">
              LOG IN
            </Link>
            <Link to="/signup" className="btn-cerebrium-signup">
              SIGN UP
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section matching Cerebrium Reference Split Layout */}
      <main className="cerebrium-hero-split">
        {/* Left Side: Large Bold Headline */}
        <div className="cerebrium-hero-left">
          <h1 className="cerebrium-hero-heading">
            Real-time AI<br />
            infrastructure that<br />
            <span className="cerebrium-gradient-text">scales with you</span>
          </h1>
        </div>

        {/* Center: Interactive "CLICK AND HOLD" Target Reticle */}
        <div 
          className={`cerebrium-hold-target ${isHolding ? 'holding' : ''}`}
          onMouseDown={handleHoldStart}
          onMouseUp={handleHoldEnd}
          onMouseLeave={handleHoldEnd}
          onTouchStart={handleHoldStart}
          onTouchEnd={handleHoldEnd}
        >
          <div className="reticle-circle">
            <span className="reticle-dot dot-n" />
            <span className="reticle-dot dot-e" />
            <span className="reticle-dot dot-s" />
            <span className="reticle-dot dot-w" />
            <div className="reticle-center-cursor">
              <MousePointer size={14} />
            </div>
          </div>
          <span className="reticle-label">
            {isHolding ? `SURGE ACTIVE · ${Math.round(chargeLevel * 100)}%` : 'CLICK AND HOLD'}
          </span>
        </div>

        {/* Right Side: Hero Paragraph & Dual CTAs */}
        <div className="cerebrium-hero-right">
          <p className="cerebrium-hero-desc">
            Deploy autonomous agent swarms, real-time web execution, deep research, and instant scheduling with verified human-in-the-loop controls. Built for teams that need reliability at scale.
          </p>
          <div className="cerebrium-cta-row">
            <button onClick={() => navigate('/chat')} className="btn-cerebrium-primary">
              TRY IT NOW
            </button>
            <button onClick={() => navigate('/chat')} className="btn-cerebrium-secondary">
              BOOK A DEMO
            </button>
          </div>
        </div>
      </main>

      {/* 3. Autonomous Agent Network Pill Dock (Active Infrastructure) */}
      <div className="landing-sub-hero-dock">
        <div className="agent-network-dock">
          <div className="dock-header">
            <span className="dock-title">AUTONOMOUS AGENT NETWORK</span>
            <span className="dock-status-tag">ACTIVE</span>
          </div>
          <div className="dock-items">
            <div className="dock-item">
              <div className="dock-icon-box">
                <Cpu size={20} />
              </div>
              <span>Think</span>
            </div>
            <div className="dock-divider" />
            <div className="dock-item">
              <div className="dock-icon-box">
                <Search size={20} />
              </div>
              <span>Research</span>
            </div>
            <div className="dock-divider" />
            <div className="dock-item">
              <div className="dock-icon-box">
                <Workflow size={20} />
              </div>
              <span>Execute</span>
            </div>
            <div className="dock-divider" />
            <div className="dock-item">
              <div className="dock-icon-box">
                <ShieldCheck size={20} />
              </div>
              <span>Verify</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Capabilities Section */}
      <section id="capabilities" className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">CAPABILITIES</span>
          <h2 className="section-title">Engineered for autonomous precision</h2>
          <p className="section-desc">Experience an AI assistant that goes beyond text generation into real-world accomplishment.</p>
        </div>

        <div className="capabilities-grid">
          <div className="cap-card">
            <div className="cap-icon pink">
              <Zap size={24} />
            </div>
            <h3>Real-World Task Execution</h3>
            <p>From booking verified local electricians to checking flight schedules, DOERA interacts with external tools and services autonomously.</p>
          </div>

          <div className="cap-card">
            <div className="cap-icon magenta">
              <Layers size={24} />
            </div>
            <h3>Autonomous LangGraph Swarm</h3>
            <p>9 specialized agents collaborate in real time: Orchestrator, Intent Understanding, Research, Discovery, Communication, and Verification.</p>
          </div>

          <div className="cap-card">
            <div className="cap-icon pink">
              <Database size={24} />
            </div>
            <h3>Persistent Personal Memory</h3>
            <p>DOERA remembers user preferences, ongoing tasks, and project context across sessions with full privacy controls and consent isolation.</p>
          </div>

          <div className="cap-card">
            <div className="cap-icon magenta">
              <Bot size={24} />
            </div>
            <h3>Proactive Intelligence</h3>
            <p>Monitors background automations, sends reminders before appointments, and resumes multi-step workflows when external dependencies complete.</p>
          </div>
        </div>
      </section>

      {/* 6. Execution Architecture Pipeline */}
      <section id="architecture" className="landing-section alt-bg">
        <div className="section-header">
          <span className="section-eyebrow">PIPELINE</span>
          <h2 className="section-title">Deterministic Agentic Architecture</h2>
          <p className="section-desc">Every request flows through a 5-stage verified execution lifecycle.</p>
        </div>

        <div className="pipeline-flow">
          <div className="pipeline-step">
            <span className="step-num">01</span>
            <h4>Intent Analysis</h4>
            <p>Extracts goals, entities, and execution boundaries.</p>
          </div>
          <div className="pipeline-arrow"><ChevronRight size={20} /></div>

          <div className="pipeline-step">
            <span className="step-num">02</span>
            <h4>Agent Delegation</h4>
            <p>Dispatches subtasks to specialized LangGraph agents.</p>
          </div>
          <div className="pipeline-arrow"><ChevronRight size={20} /></div>

          <div className="pipeline-step">
            <span className="step-num">03</span>
            <h4>External Execution</h4>
            <p>Performs web research, n8n webhook calls, or data analysis.</p>
          </div>
          <div className="pipeline-arrow"><ChevronRight size={20} /></div>

          <div className="pipeline-step">
            <span className="step-num">04</span>
            <h4>Verification</h4>
            <p>Validates outcomes and requests explicit user approval when needed.</p>
          </div>
          <div className="pipeline-arrow"><ChevronRight size={20} /></div>

          <div className="pipeline-step active">
            <span className="step-num">05</span>
            <h4>Delivery</h4>
            <p>Presents concise conversational responses with full audit logs.</p>
          </div>
        </div>
      </section>

      {/* 7. Specialized Agent Swarm Section */}
      <section id="agents" className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">AUTONOMOUS SWARM</span>
          <h2 className="section-title">Nine Coordinated Agents Working for You</h2>
          <p className="section-desc">
            Rather than relying on a single monolithic prompt, DOERA AI orchestrates specialized autonomous agents with dedicated domain expertise.
          </p>
        </div>

        <div className="agents-grid">
          {/* Agent 1 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box pink">
                <Workflow size={22} />
              </div>
              <span className="agent-status-badge live">ORCHESTRATING</span>
            </div>
            <h3>Orchestrator Agent</h3>
            <p>Master task planner. Deconstructs complex user prompts into directed acyclic graphs (DAG) and coordinates dynamic multi-agent execution.</p>
            <div className="agent-tags">
              <span>DAG Planner</span>
              <span>State Graph</span>
              <span>Fast Dispatch</span>
            </div>
          </div>

          {/* Agent 2 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box magenta">
                <Bot size={22} />
              </div>
              <span className="agent-status-badge">ONLINE</span>
            </div>
            <h3>Intent Understanding Agent</h3>
            <p>Analyzes nuanced natural language, extracts entities and constraints, verifies feasibility, and requests user clarification when needed.</p>
            <div className="agent-tags">
              <span>NLP Parsing</span>
              <span>Context Bound</span>
              <span>Clarification</span>
            </div>
          </div>

          {/* Agent 3 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box pink">
                <Search size={22} />
              </div>
              <span className="agent-status-badge live">ACTIVE</span>
            </div>
            <h3>Discovery & Research Agent</h3>
            <p>Scours live web indices, local Google Places APIs, and verified directory databases to find legitimate providers and real-time facts.</p>
            <div className="agent-tags">
              <span>Web Scrape</span>
              <span>Places API</span>
              <span>Deep Research</span>
            </div>
          </div>

          {/* Agent 4 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box magenta">
                <MessageSquare size={22} />
              </div>
              <span className="agent-status-badge">STANDBY</span>
            </div>
            <h3>Communication Agent</h3>
            <p>Conducts external outreach via automated WhatsApp, SMS, and transactional email with strict consent verification and audit logs.</p>
            <div className="agent-tags">
              <span>WhatsApp</span>
              <span>Email</span>
              <span>HITL Gates</span>
            </div>
          </div>

          {/* Agent 5 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box pink">
                <DollarSign size={22} />
              </div>
              <span className="agent-status-badge">STANDBY</span>
            </div>
            <h3>Quotation & Estimation Agent</h3>
            <p>Extracts pricing proposals, normalizes quotes across vendors, benchmarks competitive rates, and provides clear cost breakdowns.</p>
            <div className="agent-tags">
              <span>Rate Normalize</span>
              <span>Cost Model</span>
              <span>Budget Guard</span>
            </div>
          </div>

          {/* Agent 6 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box magenta">
                <Calendar size={22} />
              </div>
              <span className="agent-status-badge">STANDBY</span>
            </div>
            <h3>Scheduling & Calendar Agent</h3>
            <p>Synchronizes with Google Calendar, resolves scheduling conflicts across timezones, and locks in appointment reservations automatically.</p>
            <div className="agent-tags">
              <span>Google Cal</span>
              <span>Conflict Detect</span>
              <span>Auto-Booking</span>
            </div>
          </div>

          {/* Agent 7 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box pink">
                <ShieldCheck size={22} />
              </div>
              <span className="agent-status-badge verified">VERIFIED</span>
            </div>
            <h3>Verification & Safety Agent</h3>
            <p>Audits every proposed action against user safety policies, validates outputs, and halts high-risk writes until explicit user confirmation.</p>
            <div className="agent-tags">
              <span>Safety Guard</span>
              <span>Schema Check</span>
              <span>Approval Gate</span>
            </div>
          </div>

          {/* Agent 8 */}
          <div className="agent-card">
            <div className="agent-card-header">
              <div className="agent-icon-box magenta">
                <RotateCcw size={22} />
              </div>
              <span className="agent-status-badge">STANDBY</span>
            </div>
            <h3>Self-Healing Recovery Agent</h3>
            <p>Monitors execution health in real time. Detects tool timeouts, rate limits, or network failures, dynamically rerouting execution without human intervention.</p>
            <div className="agent-tags">
              <span>Auto-Retry</span>
              <span>Circuit Breaker</span>
              <span>Fallback</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Pricing Section */}
      <section id="pricing" className="landing-section alt-bg">
        <div className="section-header">
          <span className="section-eyebrow">TRANSPARENT PLANS</span>
          <h2 className="section-title">Choose your intelligence level</h2>
          <p className="section-desc">Predictable quotas backed by real-world autonomous computing.</p>
        </div>

        <div className="pricing-grid">
          {/* Free Tier */}
          <div className="pricing-card">
            <div className="plan-badge">STARTER</div>
            <h3 className="plan-name">Free</h3>
            <div className="plan-price">
              <span className="amount">$0</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">For daily workflows and exploring DOERA AI capabilities.</p>
            <ul className="plan-features">
              <li><CheckCircle2 size={16} /> 20 daily requests (auto-resets daily)</li>
              <li><CheckCircle2 size={16} /> Standard Groq & Gemini models</li>
              <li><CheckCircle2 size={16} /> Basic web research</li>
              <li><CheckCircle2 size={16} /> Single session memory</li>
            </ul>
            <button onClick={() => navigate('/chat')} className="btn-plan-secondary">
              Get Started Free
            </button>
          </div>

          {/* DOERA Pro */}
          <div className="pricing-card featured">
            <div className="plan-badge featured-badge">MOST POPULAR</div>
            <h3 className="plan-name">DOERA Pro</h3>
            <div className="plan-price">
              <span className="amount">$12</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">For power users needing autonomous scheduling, deep research, and voice mode.</p>
            <ul className="plan-features">
              <li><CheckCircle2 size={16} /> 300 daily requests (auto-resets daily)</li>
              <li><CheckCircle2 size={16} /> Web research & multi-agent execution</li>
              <li><CheckCircle2 size={16} /> Persistent cross-session memory</li>
              <li><CheckCircle2 size={16} /> Voice input & high-quality TTS</li>
              <li><CheckCircle2 size={16} /> Project workspaces & file attachments</li>
            </ul>
            <button onClick={() => navigate('/chat')} className="btn-plan-primary">
              Upgrade to Pro
            </button>
          </div>

          {/* DOERA Max */}
          <div className="pricing-card">
            <div className="plan-badge">ENTERPRISE POWER</div>
            <h3 className="plan-name">DOERA Max</h3>
            <div className="plan-price">
              <span className="amount">$25</span>
              <span className="period">/ month</span>
            </div>
            <p className="plan-desc">Maximum execution allowances, scheduled proactive automations, and deep multi-agent swarms.</p>
            <ul className="plan-features">
              <li><CheckCircle2 size={16} /> 500 daily requests (auto-resets daily)</li>
              <li><CheckCircle2 size={16} /> Advanced reasoning & deep research</li>
              <li><CheckCircle2 size={16} /> Priority multi-agent orchestration</li>
              <li><CheckCircle2 size={16} /> Scheduled & background automations</li>
              <li><CheckCircle2 size={16} /> Detailed execution history & priority support</li>
            </ul>
            <button onClick={() => navigate('/chat')} className="btn-plan-secondary">
              Upgrade to Max
            </button>
          </div>
        </div>
      </section>

      {/* 9. Developer & Platform Documentation Section */}
      <section id="docs" className="landing-section">
        <div className="section-header">
          <span className="section-eyebrow">DEVELOPER & PLATFORM DOCS</span>
          <h2 className="section-title">Built for Seamless Integration</h2>
          <p className="section-desc">
            Integrate DOERA AI autonomous execution swarms into your software stack, workflows, or custom apps with REST, WebSockets, and SDKs.
          </p>
        </div>

        <div className="docs-container">
          {/* Code Showcase Terminal */}
          <div className="docs-code-showcase">
            <div className="docs-terminal-header">
              <div className="terminal-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              
              <div className="code-tabs">
                <button 
                  type="button"
                  className={`code-tab-btn ${activeDocTab === 'curl' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('curl')}
                >
                  <Terminal size={13} />
                  <span>cURL</span>
                </button>
                <button 
                  type="button"
                  className={`code-tab-btn ${activeDocTab === 'ts' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('ts')}
                >
                  <Code2 size={13} />
                  <span>TypeScript</span>
                </button>
                <button 
                  type="button"
                  className={`code-tab-btn ${activeDocTab === 'py' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('py')}
                >
                  <FileCode size={13} />
                  <span>Python</span>
                </button>
                <button 
                  type="button"
                  className={`code-tab-btn ${activeDocTab === 'ws' ? 'active' : ''}`}
                  onClick={() => setActiveDocTab('ws')}
                >
                  <Radio size={13} />
                  <span>WebSocket</span>
                </button>
              </div>

              <button 
                type="button"
                className="btn-copy-code"
                onClick={() => handleCopyCode(codeSnippets[activeDocTab])}
                title="Copy code to clipboard"
              >
                {copied ? <Check size={14} style={{ color: '#10B981' }} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="docs-terminal-body">
              <pre>
                <code>{codeSnippets[activeDocTab]}</code>
              </pre>
            </div>
          </div>

          {/* Docs Features Grid */}
          <div className="docs-features-grid">
            <div className="docs-feature-card">
              <div className="docs-feat-icon pink">
                <Radio size={20} />
              </div>
              <h4>Low-Latency WebSocket Streaming</h4>
              <p>Subscribe to live thought tokens, agent state updates, and tool call traces with sub-50ms latency over persistent WebSocket connections.</p>
            </div>

            <div className="docs-feature-card">
              <div className="docs-feat-icon magenta">
                <ShieldCheck size={20} />
              </div>
              <h4>Human-In-The-Loop Webhooks</h4>
              <p>Configure webhook endpoints that trigger when high-stakes operations require explicit cryptographic approval or two-factor sign-off.</p>
            </div>

            <div className="docs-feature-card">
              <div className="docs-feat-icon pink">
                <Workflow size={20} />
              </div>
              <h4>n8n & Native Automations</h4>
              <p>Seamlessly dispatch background workflows, sync CRM pipelines, and trigger automated follow-ups with our pre-built n8n templates.</p>
            </div>

            <div className="docs-feature-card">
              <div className="docs-feat-icon magenta">
                <Lock size={20} />
              </div>
              <h4>256-Bit TLS & Encrypted Memory</h4>
              <p>Every conversation, personal preference, and credential is encrypted at rest using AES-256 with tenant isolation and strict privacy guarantees.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Final Call to Action */}
      <section className="landing-final-cta">
        <div className="final-cta-box">
          <h2>Ready to automate your daily tasks?</h2>
          <p>Join thousands experiencing next-generation autonomous AI execution today.</p>
          <button onClick={() => navigate('/chat')} className="btn-cerebrium-primary large">
            <span>Launch DOERA AI Workspace</span>
            <ArrowUpRight size={18} />
          </button>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <span className="footer-logo">DOERA AI 3.0</span>
            <span className="footer-copy">© 2026 DOERA AI Inc. All rights reserved.</span>
          </div>
          <div className="footer-links">
            <a href="#capabilities" onClick={(e) => scrollToSection(e, 'capabilities')}>Capabilities</a>
            <a href="#architecture" onClick={(e) => scrollToSection(e, 'architecture')}>Architecture</a>
            <a href="#agents" onClick={(e) => scrollToSection(e, 'agents')}>Agents</a>
            <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')}>Pricing</a>
            <a href="#docs" onClick={(e) => scrollToSection(e, 'docs')}>Docs</a>
            <Link to="/login">Sign In</Link>
            <Link to="/signup">Create Account</Link>
            <Link to="/chat">Launch Chat</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
