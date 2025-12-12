
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Layers, Grid, Maximize, Home, Monitor, Utensils, Bed, Bath, User } from 'lucide-react';

export default function Demo3DView() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState('perspective');
  const [showGrid, setShowGrid] = useState(true);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number>(0);
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Cleanup previous scene if any
    if (rendererRef.current) {
        try {
            mountRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
        } catch(e) {}
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Slate-50 match
    sceneRef.current = scene;
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    camera.position.set(14, 10, 14);
    camera.lookAt(0, 1.5, 0);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.55);
    mainLight.position.set(8, 12, 8);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -18;
    mainLight.shadow.camera.right = 18;
    mainLight.shadow.camera.top = 18;
    mainLight.shadow.camera.bottom = -18;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffd7a3, 0.25);
    fillLight.position.set(-6, 6, -6);
    scene.add(fillLight);
    
    // Materials
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.85, metalness: 0.05 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.9, metalness: 0.05 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9, metalness: 0.05 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc19a6b, roughness: 0.7, metalness: 0.1 });
    const greyMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.6, metalness: 0.15 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.3, metalness: 0.1 });
    
    // ==== GEOMETRY ====
    
    // FLOORS
    const mainFloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 10), floorMat);
    mainFloor.rotation.x = -Math.PI / 2;
    mainFloor.receiveShadow = true;
    scene.add(mainFloor);
    
    const hallwayFloor = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), floorMat);
    hallwayFloor.rotation.x = -Math.PI / 2;
    hallwayFloor.position.set(-1, 0, 7.5);
    hallwayFloor.receiveShadow = true;
    scene.add(hallwayFloor);
    
    const bedroomFloor = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), floorMat);
    bedroomFloor.rotation.x = -Math.PI / 2;
    bedroomFloor.position.set(-6, 0, 7.5);
    bedroomFloor.receiveShadow = true;
    scene.add(bedroomFloor);
    
    const bathroomFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 3),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.2 })
    );
    bathroomFloor.rotation.x = -Math.PI / 2;
    bathroomFloor.position.set(3, 0, 8.5);
    bathroomFloor.receiveShadow = true;
    scene.add(bathroomFloor);
    
    // WALLS
    const addWall = (w: number, h: number, d: number, x: number, y: number, z: number, ry: number = 0) => {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        wall.position.set(x, y + h/2, z);
        wall.rotation.y = ry;
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
    }

    // Outer Shell (Simplified for cutaway view)
    addWall(12, 3, 0.2, 0, 0, -5); // Back Living
    addWall(15, 3, 0.2, -8.5, 0, 2.5, Math.PI/2); // Left Living
    addWall(15, 3, 0.2, 6, 0, 2.5, -Math.PI/2); // Right Living
    
    // Internal Partitions
    addWall(5, 3, 0.1, 0.5, 0, 7.5, -Math.PI/2); // Hallway Right
    addWall(5, 3, 0.1, -6, 0, 10); // Bedroom Back
    addWall(3, 3, 0.1, -3.5, 0, 8.5, -Math.PI/2); // Bedroom Right
    addWall(3, 3, 0.1, 3, 0, 10); // Bathroom Back
    addWall(3, 3, 0.1, 1.5, 0, 8.5, Math.PI/2); // Bathroom Left

    // ==== FURNITURE ====
    
    // Desk
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.9), woodMat);
    deskTop.position.set(-3.5, 0.75, 3.5);
    deskTop.castShadow = true;
    scene.add(deskTop);
    
    const deskLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x999999 }));
    deskLeg1.position.set(-4.4, 0.375, 3.1);
    scene.add(deskLeg1);
    const deskLeg2 = deskLeg1.clone();
    deskLeg2.position.set(-2.6, 0.375, 3.1);
    scene.add(deskLeg2);
    
    // Monitors
    const monitorGeo = new THREE.BoxGeometry(0.65, 0.45, 0.05);
    const monitorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.4 });
    
    const mon1 = new THREE.Mesh(monitorGeo, monitorMat);
    mon1.position.set(-4, 1.25, 3.5);
    mon1.castShadow = true;
    scene.add(mon1);
    const scr1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), screenMat);
    scr1.position.set(0, 0, 0.03);
    mon1.add(scr1);

    const mon2 = mon1.clone();
    mon2.position.set(-3, 1.25, 3.5);
    mon2.rotation.y = -0.2;
    scene.add(mon2);

    // Sofa
    const sofa = new THREE.Group();
    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.9), greyMat);
    sofaBase.castShadow = true;
    sofa.add(sofaBase);
    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.2), greyMat);
    sofaBack.position.set(0, 0.5, -0.35);
    sofaBack.castShadow = true;
    sofa.add(sofaBack);
    // Red Blanket
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.6), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    blanket.position.set(0.5, 0.25, 0);
    blanket.rotation.y = 0.2;
    sofa.add(blanket);
    
    sofa.position.set(3, 0.2, 0.5);
    scene.add(sofa);

    // Kitchen Units
    const kitchen = new THREE.Group();
    const kUnit = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    kUnit.position.set(-2.5, 0.45, -4.7);
    kUnit.castShadow = true;
    kitchen.add(kUnit);
    const kUnit2 = kUnit.clone();
    kUnit2.position.set(1.5, 0.45, -4.7);
    kitchen.add(kUnit2);
    // Countertop
    const counter = new THREE.Mesh(new THREE.BoxGeometry(7, 0.05, 0.7), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    counter.position.set(-0.5, 0.92, -4.7);
    counter.castShadow = true;
    kitchen.add(counter);
    scene.add(kitchen);

    // Bed
    const bed = new THREE.Group();
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 2.8), woodMat);
    bedFrame.castShadow = true;
    bed.add(bedFrame);
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 2.7), whiteMat);
    mattress.position.set(0, 0.35, 0);
    bed.add(mattress);
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.1, 2.0), new THREE.MeshStandardMaterial({ color: 0xef4444 })); // Red
    duvet.position.set(0, 0.45, 0.3);
    bed.add(duvet);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0xfacc15 })); // Yellow
    pillow.position.set(-0.5, 0.5, -1);
    bed.add(pillow);
    const pillow2 = pillow.clone();
    pillow2.position.set(0.5, 0.5, -1);
    bed.add(pillow2);

    bed.position.set(-6.5, 0.25, 8);
    scene.add(bed);

    // Grid
    const gridHelper = new THREE.GridHelper(24, 48, 0xcbd5e1, 0xf1f5f9);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
    
    // Mouse interaction variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      // Normalized coordinates relative to container
      mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    
    // Attach listener to window but use bounds check inside, or attach to container?
    // Attaching to window ensures smooth rotation even if mouse leaves container slightly
    window.addEventListener('mousemove', handleMouseMove);
    
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (gridHelper) gridHelper.visible = showGrid;

      if (camera && renderer && scene) {
          if (view === 'perspective') {
            // Smooth easing
            targetX = mouseX * 4;
            targetY = mouseY * 2;
            
            camera.position.x += (targetX * 0.5 - camera.position.x + 14) * 0.05;
            camera.position.y += (targetY * 0.3 - camera.position.y + 10) * 0.05;
            camera.lookAt(0, 1.5, 0);
          }
          renderer.render(scene, camera);
      }
    };
    
    animate();
    
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [view, showGrid]);
  
  // View Switch Effect
  useEffect(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const pos = {x: 14, y: 10, z: 14};
    const look = {x: 0, y: 1.5, z: 0};

    switch(view) {
      case 'top': pos.x=0; pos.y=18; pos.z=3; look.x=0; look.y=0; look.z=3; break;
      case 'living': pos.x=3; pos.y=2; pos.z=4; look.x=3; look.y=1; look.z=0.5; break;
      case 'office': pos.x=-3.5; pos.y=2; pos.z=6; look.x=-3.5; look.y=1; look.z=3.5; break;
      case 'bedroom': pos.x=-6.5; pos.y=2; pos.z=12; look.x=-6.5; look.y=1; look.z=8; break;
      case 'bathroom': pos.x=3; pos.y=2; pos.z=12; look.x=3; look.y=1; look.z=8.5; break;
      case 'perspective': 
      default:
        // Handled in animate loop
        break;
    }

    if (view !== 'perspective') {
        camera.position.set(pos.x, pos.y, pos.z);
        camera.lookAt(look.x, look.y, look.z);
    }
  }, [view]);
  
  return (
    <div className="w-full h-full relative group">
      {/* 3D Canvas Container */}
      <div className="w-full h-full" ref={mountRef} />
      
      {/* Overlay UI */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-between mb-2">
             <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Camera Views</h3>
             <button onClick={() => setShowGrid(!showGrid)} className={`p-1 rounded ${showGrid ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Grid className="w-3.5 h-3.5" />
             </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <button onClick={() => setView('perspective')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === 'perspective' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Layers className="w-3 h-3" /> Overview
             </button>
             <button onClick={() => setView('top')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === 'top' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Maximize className="w-3 h-3" /> Top Plan
             </button>
             <button onClick={() => setView('living')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === 'living' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Home className="w-3 h-3" /> Living
             </button>
             <button onClick={() => setView('office')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === 'office' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Monitor className="w-3 h-3" /> Office
             </button>
             <button onClick={() => setView('bedroom')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === 'bedroom' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Bed className="w-3 h-3" /> Bedroom
             </button>
             <button onClick={() => setView('bathroom')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === 'bathroom' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Bath className="w-3 h-3" /> Bath
             </button>
          </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold pointer-events-none">
         Interactive WebGL Model
      </div>
    </div>
  );
}
