import { useRef, useEffect, useState } from "react";

const THEMES = {
  // ── Page backgrounds ──
  studies: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sg1" cx="25%" cy="30%"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></radialGradient>
        <radialGradient id="sg2" cx="75%" cy="70%"><stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25"/><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/></radialGradient>
        <radialGradient id="sg3" cx="60%" cy="20%"><stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2"/><stop offset="100%" stopColor="#06b6d4" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#sg1)"/><rect width="100%" height="100%" fill="url(#sg2)"/><rect width="100%" height="100%" fill="url(#sg3)"/>
      {[{ cx:15,cy:20,r:60,color:"#3b82f6",dur:6 },{ cx:80,cy:35,r:45,color:"#8b5cf6",dur:7 },{ cx:45,cy:75,r:55,color:"#06b6d4",dur:8 },{ cx:70,cy:80,r:35,color:"#3b82f6",dur:5 },{ cx:25,cy:55,r:40,color:"#8b5cf6",dur:9 }].map((o,i)=>(
        <circle key={`orb${i}`} cx={`${o.cx}%`} cy={`${o.cy}%`} r={o.r} fill={o.color} opacity="0.08"><animate attributeName="r" values={`${o.r};${o.r+15};${o.r}`} dur={`${o.dur}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.08;0.15;0.08" dur={`${o.dur}s`} repeatCount="indefinite"/></circle>
      ))}
      {[...Array(24)].map((_,i)=>{const t=i/24,x=10+t*80,w1=35+Math.sin(t*Math.PI*4)*20,w2=35-Math.sin(t*Math.PI*4)*20,r=4+(i%3),dur=2.5+(i%5)*0.5;return(<g key={i}><circle cx={`${x}%`} cy={`${w1}%`} r={r} fill="#3b82f6" opacity="0.4"><animate attributeName="opacity" values="0.4;0.7;0.4" dur={`${dur}s`} repeatCount="indefinite"/><animate attributeName="r" values={`${r};${r+2};${r}`} dur={`${dur}s`} repeatCount="indefinite"/></circle><circle cx={`${x}%`} cy={`${w2}%`} r={r-1} fill="#8b5cf6" opacity="0.35"><animate attributeName="opacity" values="0.35;0.6;0.35" dur={`${dur+0.5}s`} repeatCount="indefinite"/></circle>{i<23&&<line x1={`${x}%`} y1={`${w1}%`} x2={`${x}%`} y2={`${w2}%`} stroke="#3b82f6" strokeWidth="1" opacity="0.15"><animate attributeName="opacity" values="0.15;0.3;0.15" dur={`${dur}s`} repeatCount="indefinite"/></line>}</g>);})}
      {[...Array(12)].map((_,i)=>{const x=5+i*8.5,y=70+Math.sin(i*0.8)*12,dur=3+(i%4)*0.6;return(<circle key={`b${i}`} cx={`${x}%`} cy={`${y}%`} r={3} fill="#06b6d4" opacity="0.3"><animate attributeName="cy" values={`${y}%;${y-5}%;${y}%`} dur={`${dur}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.55;0.3" dur={`${dur}s`} repeatCount="indefinite"/></circle>);})}
    </svg>
  ),
  sites: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="tg1" cx="40%" cy="40%"><stop offset="0%" stopColor="#059669" stopOpacity="0.3"/><stop offset="100%" stopColor="#059669" stopOpacity="0"/></radialGradient>
        <radialGradient id="tg2" cx="70%" cy="65%"><stop offset="0%" stopColor="#0d9488" stopOpacity="0.2"/><stop offset="100%" stopColor="#0d9488" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#tg1)"/><rect width="100%" height="100%" fill="url(#tg2)"/>
      {[{cx:20,cy:25,color:"#059669",dur:4},{cx:65,cy:40,color:"#0d9488",dur:5},{cx:40,cy:70,color:"#059669",dur:6},{cx:85,cy:20,color:"#0d9488",dur:4.5},{cx:15,cy:80,color:"#059669",dur:5.5}].map((p,i)=>(<g key={`ring${i}`}><circle cx={`${p.cx}%`} cy={`${p.cy}%`} r="5" fill="none" stroke={p.color} strokeWidth="2" opacity="0"><animate attributeName="r" values="5;40;70" dur={`${p.dur}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.15;0" dur={`${p.dur}s`} repeatCount="indefinite"/></circle><circle cx={`${p.cx}%`} cy={`${p.cy}%`} r="6" fill={p.color} opacity="0.5"><animate attributeName="r" values="6;8;6" dur={`${p.dur*0.6}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.7;0.5" dur={`${p.dur*0.6}s`} repeatCount="indefinite"/></circle></g>))}
      {[[20,25,65,40],[65,40,40,70],[40,70,15,80],[85,20,65,40],[20,25,15,80],[85,20,40,70],[20,25,40,70]].map(([x1,y1,x2,y2],i)=>(<line key={`net${i}`} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke="#059669" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.2"><animate attributeName="strokeDashoffset" values="0;10" dur={`${2+i*0.3}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.2;0.4;0.2" dur={`${3+i*0.4}s`} repeatCount="indefinite"/></line>))}
      {[[20,25,65,40,3],[65,40,40,70,4],[40,70,15,80,3.5],[85,20,65,40,2.5]].map(([x1,y1,x2,y2,dur],i)=>(<circle key={`td${i}`} r="3" fill="#059669" opacity="0.6"><animate attributeName="cx" values={`${x1}%;${x2}%;${x1}%`} dur={`${dur}s`} repeatCount="indefinite"/><animate attributeName="cy" values={`${y1}%;${y2}%;${y1}%`} dur={`${dur}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.6;0.3;0.6" dur={`${dur}s`} repeatCount="indefinite"/></circle>))}
    </svg>
  ),
  examiners: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="eg1" cx="35%" cy="30%"><stop offset="0%" stopColor="#d97706" stopOpacity="0.3"/><stop offset="100%" stopColor="#d97706" stopOpacity="0"/></radialGradient>
        <radialGradient id="eg2" cx="70%" cy="65%"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/></radialGradient>
        <radialGradient id="eg3" cx="20%" cy="75%"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.15"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#eg1)"/><rect width="100%" height="100%" fill="url(#eg2)"/><rect width="100%" height="100%" fill="url(#eg3)"/>
      {[{cx:15,cy:25,dur:4,color:"#d97706"},{cx:40,cy:20,dur:5,color:"#f59e0b"},{cx:70,cy:30,dur:4.5,color:"#d97706"},{cx:85,cy:50,dur:5.5,color:"#f59e0b"},{cx:25,cy:60,dur:4,color:"#d97706"},{cx:55,cy:65,dur:6,color:"#f59e0b"},{cx:80,cy:75,dur:5,color:"#d97706"},{cx:10,cy:85,dur:4.5,color:"#f59e0b"},{cx:50,cy:85,dur:5,color:"#d97706"}].map((p,i)=>(<g key={`person${i}`}><circle cx={`${p.cx}%`} cy={`${p.cy-3}%`} r="5" fill={p.color} opacity="0.35"><animate attributeName="opacity" values="0.35;0.55;0.35" dur={`${p.dur}s`} repeatCount="indefinite"/><animate attributeName="cy" values={`${p.cy-3}%;${p.cy-5}%;${p.cy-3}%`} dur={`${p.dur}s`} repeatCount="indefinite"/></circle><circle cx={`${p.cx}%`} cy={`${p.cy+4}%`} r="10" fill="none" stroke={p.color} strokeWidth="1.5" opacity="0.2"><animate attributeName="r" values="10;14;10" dur={`${p.dur}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.2;0.35;0.2" dur={`${p.dur}s`} repeatCount="indefinite"/></circle><circle cx={`${p.cx}%`} cy={`${p.cy}%`} r="0" fill="none" stroke={p.color} strokeWidth="1" opacity="0"><animate attributeName="r" values="0;30;55" dur={`${p.dur*1.5}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.1;0" dur={`${p.dur*1.5}s`} repeatCount="indefinite"/></circle></g>))}
      {[[15,25,40,20],[40,20,70,30],[70,30,85,50],[25,60,55,65],[55,65,80,75],[15,25,25,60],[40,20,55,65],[85,50,80,75]].map(([x1,y1,x2,y2],i)=>(<line key={`cl${i}`} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke="#d97706" strokeWidth="1" strokeDasharray="4 6" opacity="0.15"><animate attributeName="strokeDashoffset" values="0;10" dur={`${2.5+i*0.3}s`} repeatCount="indefinite"/></line>))}
    </svg>
  ),

  // ── XFrame-specific backgrounds (different style) ──
  xf_study: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="xs1" cx="50%" cy="50%"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.2"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#xs1)"/>
      {/* Floating hexagons — molecular/chemistry feel */}
      {[{cx:20,cy:15,s:28,dur:5},{cx:70,cy:25,s:22,dur:6},{cx:40,cy:50,s:35,dur:7},{cx:85,cy:60,s:20,dur:4.5},{cx:15,cy:75,s:25,dur:5.5},{cx:60,cy:80,s:30,dur:6.5},{cx:50,cy:20,s:18,dur:4}].map((h,i)=>{
        const pts=(s)=>[0,1,2,3,4,5].map(j=>{const a=Math.PI/3*j-Math.PI/6;return`${s*Math.cos(a)},${s*Math.sin(a)}`;}).join(" ");
        return(<g key={`hex${i}`} transform={`translate(0,0)`}><polygon points={pts(h.s)} fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.2" transform={`translate(${h.cx*7.2},${h.cy*6})`}><animate attributeName="opacity" values="0.2;0.45;0.2" dur={`${h.dur}s`} repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" values={`0 ${h.cx*7.2} ${h.cy*6};360 ${h.cx*7.2} ${h.cy*6}`} dur={`${h.dur*4}s`} repeatCount="indefinite"/></polygon></g>);
      })}
      {/* Floating particles */}
      {[...Array(20)].map((_,i)=>{const x=5+i*4.8,y=10+(i%5)*18,r=2+(i%3),dur=3+(i%4)*0.8;return(<circle key={`p${i}`} cx={`${x}%`} cy={`${y}%`} r={r} fill="#60a5fa" opacity="0.25"><animate attributeName="cy" values={`${y}%;${y-6}%;${y}%`} dur={`${dur}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.25;0.5;0.25" dur={`${dur}s`} repeatCount="indefinite"/></circle>);})}
    </svg>
  ),
  xf_site: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="xst1" cx="50%" cy="50%"><stop offset="0%" stopColor="#059669" stopOpacity="0.18"/><stop offset="100%" stopColor="#059669" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#xst1)"/>
      {/* Concentric expanding circles — sonar/location feel */}
      {[{cx:30,cy:35,dur:3},{cx:70,cy:55,dur:4},{cx:50,cy:20,dur:3.5},{cx:20,cy:75,dur:4.5},{cx:80,cy:80,dur:3.8}].map((s,i)=>([0,1,2].map(j=>(<circle key={`sn${i}_${j}`} cx={`${s.cx}%`} cy={`${s.cy}%`} r="0" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0"><animate attributeName="r" values="0;50;90" dur={`${s.dur}s`} begin={`${j*s.dur/3}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.35;0.12;0" dur={`${s.dur}s`} begin={`${j*s.dur/3}s`} repeatCount="indefinite"/></circle>))))}
      {/* Center dots */}
      {[{cx:30,cy:35},{cx:70,cy:55},{cx:50,cy:20},{cx:20,cy:75},{cx:80,cy:80}].map((s,i)=>(<circle key={`cd${i}`} cx={`${s.cx}%`} cy={`${s.cy}%`} r="4" fill="#059669" opacity="0.45"><animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/></circle>))}
      {/* Grid lines */}
      {[...Array(8)].map((_,i)=>(<><line key={`gh${i}`} x1="0" y1={`${12+i*12}%`} x2="100%" y2={`${12+i*12}%`} stroke="#059669" strokeWidth="0.5" opacity="0.06"/><line key={`gv${i}`} x1={`${12+i*12}%`} y1="0" x2={`${12+i*12}%`} y2="100%" stroke="#059669" strokeWidth="0.5" opacity="0.06"/></>))}
    </svg>
  ),
  xf_examiner: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="xe1" cx="50%" cy="40%"><stop offset="0%" stopColor="#d97706" stopOpacity="0.2"/><stop offset="100%" stopColor="#d97706" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#xe1)"/>
      {/* Heartbeat / EKG line */}
      {[0,1,2].map(row=>(<polyline key={`ekg${row}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" opacity="0.2" strokeLinejoin="round" points={`0,${30+row*25} 10,${30+row*25} 15,${30+row*25} 20,${20+row*25} 25,${40+row*25} 30,${25+row*25} 35,${35+row*25} 40,${30+row*25} 100,${30+row*25}`} transform="scale(7.2,6)"><animate attributeName="stroke-dashoffset" values="600;0" dur={`${3+row*0.5}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.2;0.45;0.2" dur={`${3+row*0.5}s`} repeatCount="indefinite"/></polyline>))}
      {/* Floating crosses — medical feel */}
      {[{cx:20,cy:20,s:12,dur:4},{cx:75,cy:30,s:10,dur:5},{cx:45,cy:60,s:14,dur:6},{cx:85,cy:70,s:9,dur:4.5},{cx:15,cy:80,s:11,dur:5.5},{cx:60,cy:15,s:8,dur:3.5}].map((c,i)=>(<g key={`cross${i}`}><line x1={`${c.cx-1.5}%`} y1={`${c.cy}%`} x2={`${c.cx+1.5}%`} y2={`${c.cy}%`} stroke="#d97706" strokeWidth="2" strokeLinecap="round" opacity="0.25"><animate attributeName="opacity" values="0.25;0.5;0.25" dur={`${c.dur}s`} repeatCount="indefinite"/></line><line x1={`${c.cx}%`} y1={`${c.cy-1.5}%`} x2={`${c.cx}%`} y2={`${c.cy+1.5}%`} stroke="#d97706" strokeWidth="2" strokeLinecap="round" opacity="0.25"><animate attributeName="opacity" values="0.25;0.5;0.25" dur={`${c.dur}s`} repeatCount="indefinite"/></line><circle cx={`${c.cx}%`} cy={`${c.cy}%`} r="0" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0"><animate attributeName="r" values="0;20;35" dur={`${c.dur*1.2}s`} repeatCount="indefinite"/><animate attributeName="opacity" values="0.3;0.08;0" dur={`${c.dur*1.2}s`} repeatCount="indefinite"/></circle></g>))}
    </svg>
  ),

  // ── Audit log background ──
  audit: (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ag1" cx="50%" cy="30%"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.15"/><stop offset="100%" stopColor="#6366f1" stopOpacity="0"/></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#ag1)"/>
      {/* Scrolling timeline dots */}
      {[...Array(16)].map((_,i)=>{const x=50,y=5+i*6,dur=2+(i%4)*0.5;return(<g key={`tl${i}`}><circle cx={`${x}%`} cy={`${y}%`} r="3" fill="#6366f1" opacity="0.2"><animate attributeName="opacity" values="0.2;0.45;0.2" dur={`${dur}s`} repeatCount="indefinite"/></circle><line x1={`${x-8}%`} y1={`${y}%`} x2={`${x-2}%`} y2={`${y}%`} stroke="#6366f1" strokeWidth="1" opacity="0.12"><animate attributeName="opacity" values="0.12;0.3;0.12" dur={`${dur}s`} repeatCount="indefinite"/></line><line x1={`${x+2}%`} y1={`${y}%`} x2={`${x+8}%`} y2={`${y}%`} stroke="#6366f1" strokeWidth="1" opacity="0.12"><animate attributeName="opacity" values="0.12;0.3;0.12" dur={`${dur}s`} repeatCount="indefinite"/></line></g>);})}
      {/* Vertical timeline line */}
      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#6366f1" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.1"><animate attributeName="strokeDashoffset" values="0;10" dur="2s" repeatCount="indefinite"/></line>
    </svg>
  ),
};

const ParallaxBg = ({ theme, src, intensity = 60, opacity = 0.6, children }) => {
  const containerRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId;
    const onMove = (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const cx = (e.clientX - rect.left) / rect.width - 0.5;
        const cy = (e.clientY - rect.top) / rect.height - 0.5;
        setOffset({ x: cx * intensity, y: cy * intensity });
      });
    };
    const onLeave = () => setOffset({ x: 0, y: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); cancelAnimationFrame(rafId); };
  }, [intensity]);

  const hasSvgTheme = theme && THEMES[theme];

  return (
    <div ref={containerRef} className="parallax-wrap">
      {hasSvgTheme ? (
        <div className="parallax-bg parallax-bg-svg" style={{ opacity, transform: `translate(${offset.x}px, ${offset.y}px) scale(1.15)` }}>
          {THEMES[theme]}
        </div>
      ) : src ? (
        <div className="parallax-bg" style={{ backgroundImage: `url(${src})`, opacity, transform: `translate(${offset.x}px, ${offset.y}px) scale(1.15)` }} />
      ) : null}
      <div className="parallax-content">{children}</div>
    </div>
  );
};

export default ParallaxBg;
