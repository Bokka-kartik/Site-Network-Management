import { useState, useRef, useEffect, useCallback } from "react";

const COLORS = {
  study: { bg: "#2563eb", text: "#fff", dim: "#93c5fd", dimText: "#1e40af", line: "#93c5fd" },
  site: { bg: "#059669", text: "#fff", dim: "#6ee7b7", dimText: "#065f46", line: "#6ee7b7" },
  examiner: { bg: "#d97706", text: "#fff", dim: "#fcd34d", dimText: "#92400e", line: "#fcd34d" },
};

const typeLabel = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const getNodeLabel = (type, item) => {
  if (type === "study") return item.study_name || item.protocol_id || "Study";
  if (type === "site") return item.site_name || `Site ${item.site_id}`;
  if (type === "examiner") return item.name || `Examiner ${item.examiner_id}`;
  return "Unknown";
};

const getBranches = (type, data, allStudies, allSites, allExaminers) => {
  const branches = [];
  if (type === "study") {
    const full = allStudies?.find(s => s.protocol_id === data.protocol_id);
    (full?.sites || data.sites || []).forEach(s => {
      const node = { type: "site", data: s, label: s.site_name };
      node.children = (s.examiners || []).map(ex => ({ type: "examiner", data: ex, label: ex.name }));
      branches.push(node);
    });
  } else if (type === "site") {
    const full = allSites?.find(s => s.site_id == data.site_id);
    const studies = full?.studies || data.studies || [];
    const examiners = full?.examiners || data.examiners || [];
    if (studies.length >= examiners.length) {
      studies.forEach(s => branches.push({ type: "study", data: s, label: s.study_name }));
      examiners.forEach(ex => branches.push({ type: "examiner", data: ex, label: ex.name, children: [] }));
    } else {
      examiners.forEach(ex => branches.push({ type: "examiner", data: ex, label: ex.name }));
      studies.forEach(s => branches.push({ type: "study", data: s, label: s.study_name, children: [] }));
    }
  } else if (type === "examiner") {
    const full = allExaminers?.find(e => e.examiner_id == data.examiner_id);
    const sites = full?.sites || data.sites || [];
    const studies = full?.studies || data.studies || [];
    sites.forEach(s => {
      const node = { type: "site", data: s, label: s.site_name };
      const fullSite = allSites?.find(si => si.site_id == s.site_id);
      node.children = (fullSite?.studies || []).filter(st => studies.some(es => es.protocol_id === st.protocol_id))
        .map(st => ({ type: "study", data: st, label: st.study_name }));
      branches.push(node);
    });
    studies.filter(st => !sites.some(s => {
      const fs = allSites?.find(si => si.site_id == s.site_id);
      return (fs?.studies || []).some(f => f.protocol_id === st.protocol_id);
    })).forEach(s => branches.push({ type: "study", data: s, label: s.study_name }));
  }
  return branches;
};

const wrapText = (text, maxChars = 18) => {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines = []; let cur = "";
  words.forEach(w => {
    if ((cur + " " + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = cur ? cur + " " + w : w;
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
};

const buildLayout = (type, data, allStudies, allSites, allExaminers, dims) => {
  const branches = getBranches(type, data, allStudies, allSites, allExaminers);
  const totalChildren = branches.reduce((s, b) => s + (b.children?.length || 0), 0);
  const totalNodes = 1 + branches.length + totalChildren;

  // scale down when many nodes so nothing overflows
  const density = Math.max(1, totalNodes / 8);
  const scale = Math.max(0.45, 1 / Math.pow(density, 0.35));
  const base = Math.min(dims.w, dims.h);

  const centerR = Math.round(52 * scale);
  const branchR = Math.round(38 * scale);
  const childR = Math.round(26 * scale);
  const orbitR = base * Math.max(0.22, 0.34 * scale);
  const childOrbit = Math.max(50, 85 * scale);
  // spread children wider when there are many per branch
  const childSpread = branches.length <= 3 ? 0.5 : 0.4;

  const cx = dims.w / 2, cy = dims.h / 2;
  const nodes = [{ id: "center", kind: "center", nodeType: type, nodeData: data, homeX: cx, homeY: cy, r: centerR }];

  branches.forEach((b, i) => {
    const angle = (2 * Math.PI * i) / branches.length - Math.PI / 2;
    const bx = cx + orbitR * Math.cos(angle), by = cy + orbitR * Math.sin(angle);
    const bId = `b-${i}`;
    nodes.push({ id: bId, kind: "branch", nodeType: b.type, nodeData: b.data, label: b.label, homeX: bx, homeY: by, r: branchR, parentId: "center", angle });
    (b.children || []).forEach((ch, ci) => {
      const cAngle = angle + ((ci - ((b.children.length - 1) / 2)) * childSpread);
      nodes.push({ id: `c-${i}-${ci}`, kind: "child", nodeType: ch.type, nodeData: ch.data, label: ch.label,
        homeX: bx + childOrbit * Math.cos(cAngle), homeY: by + childOrbit * Math.sin(cAngle), r: childR, parentId: bId, angle: cAngle });
    });
  });
  return nodes;
};

// Physics constants
const SPRING = 0.08, DAMPING = 0.72, DRAG_THRESHOLD = 5;
// Idle floating
const FLOAT_AMP = 6, FLOAT_SPEED = 0.0008;
// Hover repulsion
const REPULSE_RADIUS = 100, REPULSE_STRENGTH = 2.5;
// Entrance
const ENTRANCE_DUR = 600;

const GraphView = ({ type, data, allStudies, allSites, allExaminers, onNavigate }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 700, h: 600 });
  const layoutRef = useRef([]);
  const posRef = useRef({});
  const dragRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const entranceRef = useRef(0); // timestamp when layout was set
  const [, forceRender] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setDims({ w: Math.max(r.width - 20, 500), h: Math.max(r.height - 20, 500) });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // rebuild layout
  useEffect(() => {
    const nodes = buildLayout(type, data, allStudies, allSites, allExaminers, dims);
    layoutRef.current = nodes;
    const cx = dims.w / 2, cy = dims.h / 2;
    const pos = {};
    // start all nodes at center for fly-in entrance
    nodes.forEach(n => {
      pos[n.id] = { x: cx, y: cy, vx: 0, vy: 0 };
    });
    posRef.current = pos;
    entranceRef.current = performance.now();
    forceRender(c => c + 1);
  }, [type, data, allStudies, allSites, allExaminers, dims]);

  // main animation loop
  useEffect(() => {
    let running = true;
    const tick = (now) => {
      if (!running) return;
      const pos = posRef.current;
      const layout = layoutRef.current;
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      const elapsed = now - entranceRef.current;
      const entranceT = Math.min(elapsed / ENTRANCE_DUR, 1);
      // easeOutBack for entrance
      const ease = entranceT < 1 ? 1 - Math.pow(1 - entranceT, 3) * (1 + 2.5 * (1 - entranceT)) : 1;
      let needsUpdate = false;

      layout.forEach(n => {
        const p = pos[n.id];
        if (!p) return;
        if (dragRef.current?.id === n.id) return;

        // idle floating offset (unique per node via angle seed)
        const seed = (n.angle || 0) + n.homeX * 0.01;
        const floatX = Math.sin(now * FLOAT_SPEED + seed) * FLOAT_AMP * (n.kind === "center" ? 0.5 : n.kind === "child" ? 1.3 : 1);
        const floatY = Math.cos(now * FLOAT_SPEED * 0.7 + seed + 1.5) * FLOAT_AMP * (n.kind === "center" ? 0.5 : n.kind === "child" ? 1.3 : 1);

        // target = home + float, eased during entrance
        const targetX = n.homeX + floatX * ease;
        const targetY = n.homeY + floatY * ease;

        // during entrance, lerp from center toward target
        let goalX = targetX, goalY = targetY;
        if (entranceT < 1) {
          const cx = dims.w / 2, cy = dims.h / 2;
          // stagger: center first, then branches, then children
          const delay = n.kind === "center" ? 0 : n.kind === "branch" ? 0.15 : 0.3;
          const localT = Math.max(0, Math.min(1, (entranceT - delay) / (1 - delay)));
          const easeLocal = 1 - Math.pow(1 - localT, 3);
          goalX = cx + (targetX - cx) * easeLocal;
          goalY = cy + (targetY - cy) * easeLocal;
        }

        // hover repulsion
        let repX = 0, repY = 0;
        const dmx = p.x - mx, dmy = p.y - my;
        const distMouse = Math.sqrt(dmx * dmx + dmy * dmy);
        if (distMouse < REPULSE_RADIUS && distMouse > 1 && !dragRef.current) {
          const force = (1 - distMouse / REPULSE_RADIUS) * REPULSE_STRENGTH;
          repX = (dmx / distMouse) * force;
          repY = (dmy / distMouse) * force;
        }

        const dx = (goalX + repX) - p.x;
        const dy = (goalY + repY) - p.y;

        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(p.vx) < 0.05 && Math.abs(p.vy) < 0.05 && entranceT >= 1 && distMouse >= REPULSE_RADIUS) {
          // still need float updates
        }

        p.vx = (p.vx + dx * SPRING) * DAMPING;
        p.vy = (p.vy + dy * SPRING) * DAMPING;
        p.x += p.vx;
        p.y += p.vy;
        needsUpdate = true;
      });

      if (needsUpdate || entranceT < 1) forceRender(c => c + 1);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [dims]);

  const onMouseMove = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onMouseLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 };
  }, []);

  const getSvgPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    // use SVG's own coordinate transform so viewBox scaling is handled
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const onPointerDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    const pt = getSvgPoint(e);
    const p = posRef.current[nodeId];
    if (!p) return;
    dragRef.current = { id: nodeId, startMouseX: pt.x, startMouseY: pt.y, startNodeX: p.x, startNodeY: p.y, moved: false };
    p.vx = 0; p.vy = 0;
    e.target.setPointerCapture?.(e.pointerId);
  }, [getSvgPoint]);

  const onPointerMove = useCallback((e) => {
    // update mouse for repulsion in SVG coords
    const svg = svgRef.current;
    if (svg) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse());
      mouseRef.current = { x: svgPt.x, y: svgPt.y };
    }
    const d = dragRef.current;
    if (!d) return;
    const pt = getSvgPoint(e);
    const dx = pt.x - d.startMouseX, dy = pt.y - d.startMouseY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) d.moved = true;
    const p = posRef.current[d.id];
    if (p) { p.x = d.startNodeX + dx; p.y = d.startNodeY + dy; }
    forceRender(c => c + 1);
  }, [getSvgPoint]);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    const wasDrag = d.moved;
    // give it a little velocity kick for bouncier snap-back
    const p = posRef.current[d.id];
    if (p) {
      const n = layoutRef.current.find(n => n.id === d.id);
      if (n) {
        p.vx = (n.homeX - p.x) * 0.05;
        p.vy = (n.homeY - p.y) * 0.05;
      }
    }
    dragRef.current = null;
    if (!wasDrag) {
      const node = layoutRef.current.find(n => n.id === d.id);
      if (node && node.kind !== "center") onNavigate(node.nodeType, node.nodeData);
    }
  }, [onNavigate]);

  const pos = posRef.current;
  const layout = layoutRef.current;
  const col = COLORS[type];
  const getPos = (id) => pos[id] || { x: 0, y: 0 };

  // compute viewBox that fits all nodes with padding
  let vb = { x: 0, y: 0, w: dims.w, h: dims.h };
  if (layout.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    layout.forEach(n => {
      const pad = n.r + 20;
      minX = Math.min(minX, n.homeX - pad);
      minY = Math.min(minY, n.homeY - pad);
      maxX = Math.max(maxX, n.homeX + pad);
      maxY = Math.max(maxY, n.homeY + pad);
    });
    // also account for current animated positions
    layout.forEach(n => {
      const p = pos[n.id];
      if (!p) return;
      const pad = n.r + 20;
      minX = Math.min(minX, p.x - pad);
      minY = Math.min(minY, p.y - pad);
      maxX = Math.max(maxX, p.x + pad);
      maxY = Math.max(maxY, p.y + pad);
    });
    const bw = maxX - minX, bh = maxY - minY;
    // only use custom viewBox if content exceeds container
    if (bw > dims.w || bh > dims.h) {
      const extra = 30;
      vb = { x: minX - extra, y: minY - extra, w: bw + extra * 2, h: bh + extra * 2 };
    }
  }

  // build particles for lines
  const lineData = layout.filter(n => n.parentId).map(n => {
    const p1 = getPos(n.parentId), p2 = getPos(n.id);
    return { id: n.id, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, color: COLORS[n.nodeType]?.bg || "#94a3b8", kind: n.kind };
  });

  return (
    <div ref={containerRef} className="xframe-graph-container">
      <svg ref={svgRef} width={dims.w} height={dims.h}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet"
        className="xframe-graph-svg"
        onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={(e) => { onPointerUp(); onMouseLeave(); }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.15" /></filter>
        </defs>

        {/* Connection lines */}
        {lineData.map(l => (
          <line key={`ln-${l.id}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={COLORS[layout.find(n => n.id === l.id)?.nodeType]?.line || "#cbd5e1"}
            strokeWidth={l.kind === "child" ? 1.5 : 2}
            opacity={l.kind === "child" ? 0.35 : 0.5}
            strokeDasharray={l.kind === "child" ? "4 3" : "6 3"} />
        ))}

        {/* Animated particles along lines */}
        {lineData.map(l => (
          <circle key={`dot-${l.id}`} r={l.kind === "child" ? 2 : 3} fill={l.color} opacity="0.6">
            <animateMotion dur={l.kind === "child" ? "3s" : "2.5s"} repeatCount="indefinite"
              path={`M${l.x1},${l.y1} L${l.x2},${l.y2}`} />
          </circle>
        ))}

        {/* Child nodes */}
        {layout.filter(n => n.kind === "child").map(n => {
          const p = getPos(n.id), c = COLORS[n.nodeType] || COLORS.study;
          const lines = wrapText(n.label, 14);
          const dragging = dragRef.current?.id === n.id;
          return (
            <g key={n.id} className={`xframe-graph-node xframe-graph-child${dragging ? " xframe-dragging" : ""}`}
              onPointerDown={(e) => onPointerDown(e, n.id)} style={{ cursor: dragging ? "grabbing" : "grab" }}>
              <circle cx={p.x} cy={p.y} r={n.r} fill={c.dim} stroke={c.bg} strokeWidth="1.5" opacity="0.7" />
              {lines.map((l, li) => (
                <text key={li} x={p.x} y={p.y + (li - (lines.length - 1) / 2) * 11}
                  textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="600" fill={c.dimText} opacity="0.85" style={{ pointerEvents: "none" }}>
                  {l.length > 16 ? l.slice(0, 15) + "…" : l}
                </text>
              ))}
            </g>
          );
        })}

        {/* Branch nodes */}
        {layout.filter(n => n.kind === "branch").map(n => {
          const p = getPos(n.id), c = COLORS[n.nodeType];
          const lines = wrapText(n.label, 16);
          const dragging = dragRef.current?.id === n.id;
          return (
            <g key={n.id} className={`xframe-graph-node xframe-graph-branch${dragging ? " xframe-dragging" : ""}`}
              onPointerDown={(e) => onPointerDown(e, n.id)} style={{ cursor: dragging ? "grabbing" : "grab" }}>
              <circle cx={p.x} cy={p.y} r={n.r} fill={c.dim} stroke={c.bg} strokeWidth="2" filter="url(#shadow)" />
              {lines.map((l, li) => (
                <text key={li} x={p.x} y={p.y - 2 + (li - (lines.length - 1) / 2) * 13}
                  textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="600" fill={c.dimText} style={{ pointerEvents: "none" }}>
                  {l.length > 18 ? l.slice(0, 17) + "…" : l}
                </text>
              ))}
              <text x={p.x} y={p.y + (lines.length > 1 ? 18 : 12)}
                textAnchor="middle" fontSize="7" fill={c.dimText} opacity="0.6" style={{ pointerEvents: "none" }}>
                {typeLabel(n.nodeType)}
              </text>
            </g>
          );
        })}

        {/* Center node */}
        {layout.filter(n => n.kind === "center").map(n => {
          const p = getPos(n.id);
          const dragging = dragRef.current?.id === n.id;
          return (
            <g key={n.id} className={`xframe-graph-center${dragging ? " xframe-dragging" : ""}`}
              filter="url(#glow)" onPointerDown={(e) => onPointerDown(e, n.id)} style={{ cursor: dragging ? "grabbing" : "grab" }}>
              <circle cx={p.x} cy={p.y} r={n.r + 8} fill="none" stroke={col.bg} strokeWidth="2" opacity="0.15">
                <animate attributeName="r" values={`${n.r + 4};${n.r + 12};${n.r + 4}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.05;0.15" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx={p.x} cy={p.y} r={n.r + 3} fill="none" stroke={col.bg} strokeWidth="1" opacity="0.08">
                <animate attributeName="r" values={`${n.r + 8};${n.r + 18};${n.r + 8}`} dur="4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.08;0.02;0.08" dur="4s" repeatCount="indefinite" />
              </circle>
              <circle cx={p.x} cy={p.y} r={n.r} fill={col.bg} stroke="#fff" strokeWidth="3" filter="url(#shadow)" />
              {wrapText(getNodeLabel(type, data), 14).map((l, li, arr) => (
                <text key={li} x={p.x} y={p.y - 4 + (li - (arr.length - 1) / 2) * Math.min(14, n.r * 0.28)}
                  textAnchor="middle" dominantBaseline="central" fontSize={Math.min(11, n.r * 0.22)} fontWeight="700" fill={col.text} style={{ pointerEvents: "none" }}>
                  {l.length > 16 ? l.slice(0, 15) + "…" : l}
                </text>
              ))}
              <text x={p.x} y={p.y + Math.min(20, n.r * 0.4)} textAnchor="middle" fontSize={Math.min(8, n.r * 0.16)} fill={col.text} opacity="0.75" fontWeight="600" letterSpacing="1" style={{ pointerEvents: "none" }}>
                {typeLabel(type).toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Legend */}
        {[{ t: "study", y: 0 }, { t: "site", y: 18 }, { t: "examiner", y: 36 }].map(({ t, y }) => (
          <g key={t} transform={`translate(${vb.x + 12}, ${vb.y + 14 + y})`}>
            <circle cx={0} cy={0} r={6} fill={COLORS[t].bg} />
            <text x={12} y={0} dominantBaseline="central" fontSize="9" fill="#64748b" fontWeight="500">{typeLabel(t)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const MetaBar = ({ type, data }) => {
  const items = [];
  if (type === "study") {
    items.push({ l: "Protocol", v: data.protocol_id }, { l: "Sponsor", v: data.sponsor },
      { l: "Phase", v: data.phase }, { l: "Status", v: data.status, badge: true });
  } else if (type === "site") {
    items.push({ l: "Location", v: [data.city, data.country].filter(Boolean).join(", ") },
      { l: "Status", v: data.status, badge: true });
  } else if (type === "examiner") {
    items.push({ l: "Role", v: data.role },
      { l: "Site", v: data.site_status || "", badge: true },
      { l: "Study", v: data.study_status || "", badge: true });
  }
  return (
    <div className="xframe-meta-bar">
      {items.filter(i => i.v).map((it, i) => (
        <span key={i} className="xframe-meta-chip">
          <span className="xframe-meta-chip-label">{it.l}:</span>
          {it.badge
            ? <span className={`badge badge-${it.v?.toLowerCase()}`}>{it.v}</span>
            : <span className="xframe-meta-chip-value">{it.v}</span>
          }
        </span>
      ))}
    </div>
  );
};

const CardView = ({ type, data, allStudies, allSites, allExaminers, onNavigate }) => {
  const branches = getBranches(type, data, allStudies, allSites, allExaminers);
  return (
    <div className="xframe-card-view">
      {branches.length === 0 && <div className="no-data">No related items</div>}
      {branches.map((b, i) => (
        <div key={i}>
          <div className="xframe-card xframe-card-clickable" onClick={() => onNavigate(b.type, b.data)}>
            <div className="flex items-center gap-2">
              <span className={`xframe-type-dot xframe-type-dot-${b.type}`} />
              <span className="xframe-card-name">{b.label}</span>
            </div>
            <div className="xframe-card-sub">{typeLabel(b.type)}</div>
          </div>
          {(b.children || []).map((ch, ci) => (
            <div key={ci} className="xframe-card xframe-card-clickable xframe-card-nested" onClick={() => onNavigate(ch.type, ch.data)}>
              <div className="flex items-center gap-2">
                <span className={`xframe-type-dot xframe-type-dot-${ch.type}`} />
                <span className="xframe-card-name">{ch.label}</span>
              </div>
              <div className="xframe-card-sub">{typeLabel(ch.type)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const XFrame = ({ type, data, allStudies, allSites, allExaminers, onClose, onOpenXFrame }) => {
  const [view, setView] = useState("graph");
  if (!data) return null;
  return (
    <div className="xframe-overlay" onClick={onClose}>
      <div className="xframe-panel xframe-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="xframe-header">
          <div className="flex items-center gap-2">
            <span className={`xframe-type-dot xframe-type-dot-${type}`} />
            <span className="xframe-type-badge">{type}</span>
            <span className="xframe-header-name">{getNodeLabel(type, data)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="xframe-view-toggle">
              <button className={`xframe-view-btn${view === "card" ? " xframe-view-btn-active" : ""}`} onClick={() => setView("card")}>Cards</button>
              <button className={`xframe-view-btn${view === "graph" ? " xframe-view-btn-active" : ""}`} onClick={() => setView("graph")}>Graph</button>
            </div>
            <button className="xframe-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <MetaBar type={type} data={data} />
        {view === "graph"
          ? <GraphView type={type} data={data} allStudies={allStudies} allSites={allSites} allExaminers={allExaminers} onNavigate={onOpenXFrame} />
          : <CardView type={type} data={data} allStudies={allStudies} allSites={allSites} allExaminers={allExaminers} onNavigate={onOpenXFrame} />
        }
      </div>
    </div>
  );
};

export default XFrame;
