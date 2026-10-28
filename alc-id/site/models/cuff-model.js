// Silver cuff enclosure model, shared by cuff.html and the diamond-drop film.
// buildCuff(THREE) returns the untransformed model (units: mm, wrist axis = +Z) plus its geometry helpers.
window.buildCuff = function(THREE){
// ---------- Design parameters (mm). Change these to iterate. ----------
const P = {
  innerA: 30,        // interior oval half-width  (60 mm)
  innerB: 25,        // interior oval half-height (50 mm)
  width: 15,         // band width along the wrist
  thick: 6,          // radial thickness
  wall: 1.2,         // shell wall
  gapTarget: 27,     // opening between the ends
  endRound: 4.5,     // how far the rounded end cap reaches
  coverT: 1.0        // removable inner cover thickness
};

// ---------- Ellipse frame helpers ----------
const A = P.innerA, B = P.innerB;
const Z = new THREE.Vector3(0,0,1);
function frame(th){
  const p = new THREE.Vector3(A*Math.cos(th), B*Math.sin(th), 0);
  const t = new THREE.Vector3(-A*Math.sin(th), B*Math.cos(th), 0).normalize();
  const n = new THREE.Vector3(B*Math.cos(th), A*Math.sin(th), 0).normalize();
  return {p,t,n};
}
// arc-length table along the inner oval, s = 0 at the top (th = 90°)
const TAB = [];
(function(){
  const N = 4000; let s = 0, prev = frame(-Math.PI/2).p;
  for (let i=0;i<=N;i++){
    const th = -Math.PI/2 + 2*Math.PI*i/N, p = frame(th).p;
    s += p.distanceTo(prev); prev = p; TAB.push([th,s]);
  }
  const s0 = TAB[N/2][1]; TAB.forEach(r => r[1] -= s0);
})();
function thAt(s){
  let lo=0, hi=TAB.length-1;
  while (hi-lo>1){ const m=(lo+hi)>>1; (TAB[m][1]<s)?lo=m:hi=m; }
  const [t0,s0]=TAB[lo],[t1,s1]=TAB[hi];
  return t0 + (t1-t0)*(s-s0)/((s1-s0)||1);
}
function sAt(th){ return TAB[Math.round((th+Math.PI/2)/(2*Math.PI)*(TAB.length-1))][1]; }

// Superellipse cross-section. u = outward from inner oval, v = along the wrist.
// Different exponents let the outside dome gently while the skin side stays flatter.
function section(uc, hu, hv, nOut, nIn, M){
  const pts=[];
  for (let j=0;j<M;j++){
    const f = 2*Math.PI*j/M, c=Math.cos(f), s=Math.sin(f);
    const n = c>=0 ? nOut : nIn;
    pts.push([uc + hu*Math.sign(c)*Math.pow(Math.abs(c),2/n), hv*Math.sign(s)*Math.pow(Math.abs(s),2/n)]);
  }
  return pts;
}

// Sweep a section along the oval between two arc-length positions, with domed ends.
function sweep(prof, sA, sB, opts={}){
  const seg = opts.seg || Math.max(8, Math.ceil(Math.abs(sB-sA)*1.5));
  const cap = opts.cap ?? 0.6, K = opts.capSeg || 10;
  const uc = prof.reduce((a,p)=>a+p[0],0)/prof.length;
  const M = prof.length, pos=[], idx=[];
  const ring = (fr, adv, dir, scale) => {
    for (const [u,v] of prof){
      const q = fr.p.clone().addScaledVector(fr.t, adv*dir)
        .addScaledVector(fr.n, uc+(u-uc)*scale).addScaledVector(Z, v*scale);
      pos.push(q.x,q.y,q.z);
    }
  };
  const tip = (fr, adv, dir) => {
    const q = fr.p.clone().addScaledVector(fr.t, adv*dir).addScaledVector(fr.n, uc);
    pos.push(q.x,q.y,q.z);
  };
  const fA = frame(thAt(sA)), fB = frame(thAt(sB));
  // start tip + cap rings
  tip(fA, cap, -1);
  for (let k=K-1;k>=1;k--){ const a=k/K*Math.PI/2; ring(fA, cap*Math.sin(a), -1, Math.cos(a)); }
  for (let i=0;i<=seg;i++) ring(frame(thAt(sA+(sB-sA)*i/seg)), 0, 1, 1);
  for (let k=1;k<K;k++){ const a=k/K*Math.PI/2; ring(fB, cap*Math.sin(a), 1, Math.cos(a)); }
  tip(fB, cap, 1);
  const rings = (K-1)*2 + seg + 1, last = 1 + rings*M;
  const R = r => 1 + r*M;
  for (let j=0;j<M;j++){ const j1=(j+1)%M; idx.push(R(0)+j, R(0)+j1, 0); }
  for (let r=0;r<rings-1;r++) for (let j=0;j<M;j++){
    const j1=(j+1)%M, a=R(r)+j, b=R(r+1)+j, c=R(r)+j1, d=R(r+1)+j1;
    idx.push(a,b,c, b,d,c);
  }
  for (let j=0;j<M;j++){ const j1=(j+1)%M; idx.push(R(rings-1)+j, last, R(rings-1)+j1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function volume(g){
  const p=g.attributes.position.array, ix=g.index.array; let v=0;
  for (let i=0;i<ix.length;i+=3){
    const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3;
    v += p[a]*(p[b+1]*p[c+2]-p[b+2]*p[c+1]) - p[a+1]*(p[b]*p[c+2]-p[b+2]*p[c]) + p[a+2]*(p[b]*p[c+1]-p[b+1]*p[c]);
  }
  return v/6;
}

// ---------- Geometry ----------
// Pick the end angle so the measured gap between the rounded tips matches gapTarget.
const shellProf = section(P.thick/2, P.thick/2, P.width/2, 2.6, 6, 72);
let delta = 0.5;
function gapFor(d){
  const s = sAt(-Math.PI/2+d), f1=frame(thAt(s)), f2=frame(thAt(-s));
  const t1 = f1.p.clone().addScaledVector(f1.t,-P.endRound).addScaledVector(f1.n,P.thick/2);
  const t2 = f2.p.clone().addScaledVector(f2.t, P.endRound).addScaledVector(f2.n,P.thick/2);
  return t1.distanceTo(t2);
}
for (let lo=0.05, hi=1.4, i=0;i<40;i++){ delta=(lo+hi)/2; (gapFor(delta)<P.gapTarget)?lo=delta:hi=delta; }
const sEnd = -sAt(-Math.PI/2+delta);      // ends sit at s = ±sEnd (top is s = 0)

const W = P.wall, cavHu = P.thick/2-W, cavHv = P.width/2-W;
const cavProf  = section(P.thick/2, cavHu, cavHv, 2.6, 6, 48);
const sCav = sEnd - 5;                    // solid end walls ~5 mm before each tip

const group = new THREE.Group();

const silver = new THREE.MeshPhysicalMaterial({color:new THREE.Color(0.97,0.96,0.94), metalness:1, roughness:0.07,
  clearcoat:0.4, clearcoatRoughness:0.05, envMapIntensity:1.15});
const satin  = new THREE.MeshPhysicalMaterial({color:new THREE.Color(0.93,0.92,0.9), metalness:1, roughness:0.32, envMapIntensity:1});
const plain = (hex, o={}) => new THREE.MeshStandardMaterial(Object.assign({color:hex, roughness:.55, metalness:0}, o));

const parts = [];
function add(name, geo, mat, opts={}){
  const m = new THREE.Mesh(geo, mat); m.name = name; group.add(m);
  const rec = Object.assign({name, mesh:m, mat, internal:false}, opts); parts.push(rec); return rec;
}

const shell = add('Outer shell', sweep(shellProf, -sEnd, sEnd, {cap:P.endRound, capSeg:18, seg:420}), silver, {chip:'#d9d9d6', note:'sterling'});
const cavity = add('Internal cavity', sweep(cavProf, -sCav, sCav, {cap:1.2, seg:300}),
  new THREE.MeshStandardMaterial({color:0x6fd2ff, transparent:true, opacity:.16, depthWrite:false, side:THREE.DoubleSide}),
  {internal:true, chip:'#6fd2ff'});

// Inner cover: thin curved panel on the skin side; its seam only exists on the inside.
const coverProf = section(0.5, P.coverT/2+0.03, cavHv+0.3, 8, 8, 40);
const cover = add('Inner cover (removable)', sweep(coverProf, -(sCav-1), sCav-11, {cap:0.5, seg:260}), satin, {chip:'#bdbcb8'});

// Electronics placeholders (simple volumes, NOT real component sizes)
const box = (u0,u1,hv,sA,sB,cap=0.6) => sweep(section((u0+u1)/2,(u1-u0)/2,hv,8,8,32), sA, sB, {cap});
const uIn = W+0.15, uOut = P.thick-W-0.15;
// pulsē layout (s = mm along the band from the top of the wrist). The optical sensor sits on top of the wrist,
// where a cuff presses most firmly against the skin.
add('Flex PCB', box(uIn, uIn+0.15, cavHv-0.6, -(sCav-1.5), sCav-1.5, 0.3), plain(0xd99a2b,{roughness:.4}), {internal:true, chip:'#d99a2b', anchor:-30});
add('Infrared heart-rate sensor', box(uIn+0.35, uIn+1.6, 4.2, -6.5, 6.5), plain(0x8d5bc2), {internal:true, chip:'#8d5bc2', anchor:0});
add('Accelerometer', box(uIn+0.35, uIn+1.1, 1.8, 8, 11.5, 0.3), plain(0x2b9bb5), {internal:true, chip:'#2b9bb5', anchor:9.75});
add('Microcontroller + Bluetooth', box(uIn+0.35, uIn+1.6, cavHv-1.3, 14, 29), plain(0x2f8a5b), {internal:true, chip:'#2f8a5b', anchor:21});
add('Vibration motor (buzz alert)', box(uIn+0.35, uOut-0.2, 4, 33, 42), plain(0x6b6f78,{metalness:.6, roughness:.35}), {internal:true, chip:'#6b6f78', anchor:37.5});
add('Battery (curved LiPo)', box(uIn+0.35, uOut-0.1, cavHv-0.9, -50, -13), plain(0x5b6b8a), {internal:true, chip:'#5b6b8a', anchor:-31});
add('Bluetooth antenna', box(uIn+0.35, uIn+0.9, cavHv-1.5, sCav-9, sCav-1.5, 0.4), plain(0xe14b5a), {internal:true, chip:'#e14b5a', anchor:sCav-5});
// Visible-from-inside features
// Optical window: dark glass the infrared light shines through, with two emitters and a photodiode behind it
const opticalWin = add('Optical window', sweep(section(-0.05,0.12,3.6,8,8,32), -5, 5, {cap:0.8}),
  new THREE.MeshPhysicalMaterial({color:0x0c0d12, metalness:0, roughness:.05, clearcoat:1, clearcoatRoughness:.03}), {chip:'#1a1b22', anchor:0, onCover:true});
(function optics(){
  const led = plain(0x5a0d18, {emissive:0x3a0610, roughness:.3}), pd = plain(0x1d2433, {roughness:.25});
  for (const [sv, mat, r] of [[-2.6, led, 0.8], [0, pd, 1.1], [2.6, led, 0.8]]){
    const fr = frame(thAt(sv)), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 32), mat);
    c.position.copy(fr.p).addScaledVector(fr.n, -0.1);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), fr.n);
    opticalWin.mesh.add(c);
  }
})();
add('Antenna window (nonmetal)', sweep(section(0.5,P.coverT/2+0.03,cavHv+0.3,8,8,40), sCav-10, sCav-0.5, {cap:0.5}),
  plain(0xfafafa,{roughness:.25}), {chip:'#fafafa', anchor:sCav-5, onCover:true});
(function contacts(){
  const g = new THREE.Group(), mat = plain(0xd4af37,{metalness:1, roughness:.25});
  const fr = frame(thAt(-(sCav-6)));
  for (const v of [-3,3]){
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,0.4,32), mat);
    c.position.copy(fr.p).addScaledVector(fr.n,-0.1).addScaledVector(Z,v);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), fr.n);
    g.add(c);
  }
  g.name='Charging contacts'; group.add(g);
  parts.push({name:'Charging contacts', mesh:g, mat, chip:'#d4af37', anchor:-(sCav-6), onCover:true});
})();
// Optional status light ("screen or light system - potential"): a thin frosted light pipe on the side edge,
// so the outer face stays unbroken. Marked optional so it can be switched off.
add('Status light (optional)', sweep(section(P.thick/2, 0.55, 0.14, 8, 8, 24).map(([u,v]) => [u, v + P.width/2 - 0.06]), -16, -6, {cap:0.3}),
  plain(0xe8f4ff, {emissive:0x6fb8ff, emissiveIntensity:.6, roughness:.4}), {chip:'#9fd0ff', anchor:-11, optional:true});

return {P, A, B, Z, frame, thAt, sAt, section, sweep, volume, gapFor, delta, sEnd, sCav, W, cavHu, cavHv,
  shellProf, cavProf, group, parts, shell, cavity, cover, silver, satin};
};
