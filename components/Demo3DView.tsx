
import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Layers, Grid, Maximize, Home, Monitor, Bed, Bath, Move, Rotate3d, CheckCircle2, Info } from 'lucide-react';
import { AnalysisResult } from '../types';

// Helper for texture creation (kept for labels)
const createLabelTexture = (text: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; 
    canvas.height = 128; 
    const ctx = canvas.getContext('2d');
    if(!ctx) return new THREE.Texture();

    ctx.clearRect(0,0,512,128);
    
    // Glass Pill
    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 108, 54);
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.font = 'bold 48px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; 
    ctx.fillText(text, 256, 64);

    return new THREE.CanvasTexture(canvas);
};

interface InteractiveApartmentViewProps {
    analysisData?: AnalysisResult;
    isDemoMode?: boolean;
}

export default function InteractiveApartmentView({ analysisData, isDemoMode = false }: InteractiveApartmentViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState('perspective');
  const [showGrid, setShowGrid] = useState(false);
  const [isHoveringLabel, setIsHoveringLabel] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // THREE References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const labelSpritesRef = useRef<THREE.Sprite[]>([]);
  const frameIdRef = useRef<number>(0);
  
  // Camera Orbit State
  const cameraState = useRef({ r: 24, theta: Math.PI / 4, phi: Math.PI / 3.5, target: new THREE.Vector3(0, 1.5, 0) });
  const dragStart = useRef({ x: 0, y: 0 });
  
  // Targets for animation smooth damping
  const targetCamPos = useRef(new THREE.Vector3(14, 10, 14));
  const targetLookAt = useRef(new THREE.Vector3(0, 1.5, 0));

  useEffect(() => {
    if (!mountRef.current) return;
    
    // Cleanup
    if (rendererRef.current) {
        try {
            mountRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
        } catch(e) {}
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); 
    scene.fog = new THREE.Fog(0xf8fafc, 20, 60);
    sceneRef.current = scene;
    
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(14, 10, 14);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // ==== LIGHTING ====
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
    mainLight.position.set(8, 12, 8);
    mainLight.castShadow = true;
    mainLight.shadow.camera.left = -18;
    mainLight.shadow.camera.right = 18;
    mainLight.shadow.camera.top = 18;
    mainLight.shadow.camera.bottom = -18;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffd7a3, 0.3);
    fillLight.position.set(-6, 6, -6);
    scene.add(fillLight);

    // ==== MATERIALS ====
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.85, metalness: 0.05 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.9, metalness: 0.05 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9, metalness: 0.05 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.1 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xc19a6b, roughness: 0.7, metalness: 0.1 });
    const greyMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, roughness: 0.6, metalness: 0.15 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.3, metalness: 0.1 });
    
    // ==== HELPERS ====
    const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x:number, y:number, z:number, rx:number=0, ry:number=0, rz:number=0, parent: THREE.Object3D = scene) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };

    const addLabel = (text: string, x: number, y: number, z: number, viewId: string) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: createLabelTexture(text), depthTest: false }));
        sprite.position.set(x, y, z);
        sprite.scale.set(2.5, 0.6, 1);
        sprite.userData = { targetView: viewId };
        sprite.renderOrder = 999;
        scene.add(sprite);
        labelSpritesRef.current.push(sprite);
    };

    // Plant Helper
    const createPlant = (x: number, y: number, z: number, size: number) => {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(size * 0.7, size * 0.5, size * 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0x8b7355 })
      );
      pot.position.set(x, y, z);
      pot.castShadow = true;
      scene.add(pot);
      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(size * 1.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d5a2d })
      );
      leaves.position.set(x, y + size * 1.8, z);
      leaves.scale.y = 1.3;
      leaves.castShadow = true;
      scene.add(leaves);
    };

    // ==== SCENE CONSTRUCTION ====

    // FLOORS
    addMesh(new THREE.PlaneGeometry(12, 10), floorMat, 0, 0, 0, -Math.PI/2);
    addMesh(new THREE.PlaneGeometry(3, 5), floorMat, -1, 0, 7.5, -Math.PI/2);
    addMesh(new THREE.PlaneGeometry(5, 5), floorMat, -6, 0, 7.5, -Math.PI/2);
    addMesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.3, metalness: 0.2 }), 3, 0, 8.5, -Math.PI/2);

    // CEILINGS (Rotated to face down, so invisible from top)
    addMesh(new THREE.PlaneGeometry(12, 10), ceilingMat, 0, 3, 0, Math.PI/2);
    addMesh(new THREE.PlaneGeometry(3, 5), ceilingMat, -1, 3, 7.5, Math.PI/2);
    addMesh(new THREE.PlaneGeometry(5, 5), ceilingMat, -6, 3, 7.5, Math.PI/2);
    addMesh(new THREE.PlaneGeometry(3, 3), ceilingMat, 3, 3, 8.5, Math.PI/2);

    // EXTERIOR WALLS
    addMesh(new THREE.PlaneGeometry(12, 3), wallMat, 0, 1.5, -5); // Back
    addMesh(new THREE.PlaneGeometry(15, 3), wallMat, -8.5, 1.5, 2.5, 0, Math.PI/2); // Left
    
    // Right Wall (Complex with Window)
    addMesh(new THREE.PlaneGeometry(10, 0.8), wallMat, 6, 2.6, 0, 0, -Math.PI/2); // Top
    addMesh(new THREE.PlaneGeometry(10, 1), wallMat, 6, 0.5, 0, 0, -Math.PI/2); // Bottom
    addMesh(new THREE.PlaneGeometry(2.5, 3), wallMat, 6, 1.5, -3.75, 0, -Math.PI/2); // Left of window
    addMesh(new THREE.PlaneGeometry(5, 3), wallMat, 6, 1.5, 5.5, 0, -Math.PI/2); // Right of window

    // Window & Shutters
    addMesh(new THREE.BoxGeometry(0.15, 2.2, 2.5), whiteMat, 5.93, 1.5, -1); // Frame
    addMesh(new THREE.PlaneGeometry(2.3, 2), new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }), 5.92, 1.5, -1, 0, -Math.PI/2); // Glass
    
    for (let i = 0; i < 3; i++) {
        const z = -1.75 + i * 0.85;
        const panel = addMesh(new THREE.BoxGeometry(0.08, 2, 0.75), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), 5.85, 1, z);
        for (let j = 0; j < 10; j++) {
            addMesh(new THREE.BoxGeometry(0.06, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }), 5.85, 0.2 + j * 0.19, z);
        }
    }

    // Radiator
    addMesh(new THREE.BoxGeometry(0.15, 0.5, 2), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.3, roughness: 0.6 }), 5.85, 0.25, -1);
    for (let i = 0; i < 15; i++) {
        addMesh(new THREE.BoxGeometry(0.12, 0.45, 0.02), new THREE.MeshStandardMaterial({ color: 0xdddddd }), 5.85, 0.25, -1.9 + i * 0.13);
    }

    // Plants on Sill
    createPlant(5.75, 1.05, -1.8, 0.08);
    createPlant(5.75, 1.05, -0.5, 0.09);
    createPlant(5.75, 1.05, 0.8, 0.07);

    // Front Walls
    addMesh(new THREE.PlaneGeometry(4, 3), wallMat, -4, 1.5, 5, 0, Math.PI);
    addMesh(new THREE.PlaneGeometry(6, 3), wallMat, 3, 1.5, 5, 0, Math.PI);

    // INTERIOR WALLS
    addMesh(new THREE.PlaneGeometry(5, 3), wallMat, 0.5, 1.5, 7.5, 0, -Math.PI/2); // Hall Right
    addMesh(new THREE.PlaneGeometry(5, 3), wallMat, -6, 1.5, 10); // Bed Back
    addMesh(new THREE.PlaneGeometry(3, 3), wallMat, -3.5, 1.5, 8.5, 0, -Math.PI/2); // Bed Right
    addMesh(new THREE.PlaneGeometry(3, 3), wallMat, 3, 1.5, 10); // Bath Back
    addMesh(new THREE.PlaneGeometry(3, 3), wallMat, 1.5, 1.5, 8.5, 0, Math.PI/2); // Bath Left

    // DOORS
    addMesh(new THREE.BoxGeometry(1.2, 2.5, 0.08), doorMat, -1, 1.25, 9.96); // Entry
    addMesh(new THREE.BoxGeometry(0.08, 2.3, 1), doorMat, -3.5, 1.15, 7); // Bed
    addMesh(new THREE.BoxGeometry(0.08, 2.3, 1), doorMat, 1.5, 1.15, 7); // Bath

    // HALLWAY ITEMS
    addMesh(new THREE.BoxGeometry(0.6, 1.2, 0.08), new THREE.MeshStandardMaterial({ color: 0xe0e0e0 }), 0.42, 1.2, 8); // Hook board
    addMesh(new THREE.BoxGeometry(0.4, 0.6, 0.2), new THREE.MeshStandardMaterial({ color: 0xc4a052 }), 0.35, 1.4, 8.2); // Jacket
    addMesh(new THREE.BoxGeometry(0.15, 0.08, 0.25), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), -1.5, 0.04, 9); // Shoe 1
    addMesh(new THREE.BoxGeometry(0.15, 0.08, 0.25), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), -1.2, 0.04, 9.2); // Shoe 2
    addMesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0xaabbcc, metalness: 0.9, roughness: 0.1 }), 0.48, 1.6, 7, 0, -Math.PI/2); // Mirror

    // OFFICE AREA
    addMesh(new THREE.BoxGeometry(2.2, 0.06, 0.9), woodMat, -3.5, 0.75, 3.5); // Desk Top
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x999999 }), -4.4, 0.375, 3.1); // Leg 1
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 8), new THREE.MeshStandardMaterial({ color: 0x999999 }), -2.6, 0.375, 3.1); // Leg 2
    
    // Monitors & Laptop
    addMesh(new THREE.BoxGeometry(0.65, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), -4, 1.25, 3.5);
    addMesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ color: 0xd5d5ff, emissive: 0x5a5a9a, emissiveIntensity: 0.25 }), -4, 1.25, 3.53);
    addMesh(new THREE.BoxGeometry(0.65, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), -3, 1.25, 3.5);
    addMesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ color: 0x2d2d2d, emissive: 0x1a1a1a, emissiveIntensity: 0.15 }), -3, 1.25, 3.53);
    addMesh(new THREE.BoxGeometry(0.35, 0.02, 0.25), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }), -3.8, 0.78, 3);
    addMesh(new THREE.BoxGeometry(0.35, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }), -3.8, 0.89, 3.12, -0.25);

    // Chair
    addMesh(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }), -3.5, 0.5, 2.2);
    addMesh(new THREE.BoxGeometry(0.6, 0.65, 0.08), new THREE.MeshStandardMaterial({ color: 0xe8e8e8 }), -3.5, 0.83, 1.88);

    // Lamp
    addMesh(new THREE.CylinderGeometry(0.03, 0.04, 1.75, 12), new THREE.MeshStandardMaterial({ color: 0xbbbbbb }), -2.2, 0.875, 3.8);
    addMesh(new THREE.CylinderGeometry(0.32, 0.38, 0.28, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffdd, emissiveIntensity: 0.5, side: THREE.DoubleSide }), -2.2, 1.87, 3.8);
    const lampLight = new THREE.PointLight(0xffffcc, 0.7, 5);
    lampLight.position.set(-2.2, 1.8, 3.8);
    scene.add(lampLight);

    // LIVING AREA
    // Sofa
    addMesh(new THREE.BoxGeometry(2.2, 0.4, 0.9), greyMat, 4.3, 0.2, -1);
    addMesh(new THREE.BoxGeometry(2.1, 0.25, 0.8), new THREE.MeshStandardMaterial({ color: 0x7a7a7a }), 4.3, 0.525, -1);
    addMesh(new THREE.BoxGeometry(2.1, 0.6, 0.2), greyMat, 4.3, 0.7, -1.4);
    addMesh(new THREE.BoxGeometry(0.15, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }), 3.3, 0.6, -1);
    addMesh(new THREE.BoxGeometry(0.15, 0.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x4a4a4a }), 5.3, 0.6, -1);
    addMesh(new THREE.BoxGeometry(0.8, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0xc43030, roughness: 0.8 }), 4.8, 0.72, -1); // Red Blanket

    // Shelving
    addMesh(new THREE.BoxGeometry(0.35, 1.8, 2.2), new THREE.MeshStandardMaterial({ color: 0xfafafa }), 1, 0.9, 1);
    createPlant(0.9, 0.36, 0.3, 0.06);
    createPlant(0.9, 0.36, 1.7, 0.07);
    createPlant(0.9, 0.86, 1, 0.06);

    // Table
    addMesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24), whiteMat, 3, 0.45, 0.5);
    addMesh(new THREE.CylinderGeometry(0.25, 0.3, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }), 3, 0.2, 0.5);

    // KITCHEN
    addMesh(new THREE.BoxGeometry(2.5, 0.9, 0.6), greyMat, -2.5, 0.45, -4.7);
    addMesh(new THREE.BoxGeometry(2.5, 0.9, 0.6), greyMat, 1.5, 0.45, -4.7);
    addMesh(new THREE.BoxGeometry(2.6, 0.08, 0.65), whiteMat, -2.5, 0.94, -4.7);
    addMesh(new THREE.BoxGeometry(2.6, 0.08, 0.65), whiteMat, 1.5, 0.94, -4.7);
    addMesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.15, metalness: 0.85 }), 1.5, 0.9, -4.7); // Sink
    addMesh(new THREE.BoxGeometry(1.6, 1.1, 0.1), whiteMat, 1.5, 1.75, -4.95); // Window Frame
    addMesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.3 }), 1.5, 1.75, -4.94); // Glass
    addMesh(new THREE.BoxGeometry(3.5, 0.8, 0.4), greyMat, -1, 2.3, -4.8); // Upper
    addMesh(new THREE.BoxGeometry(0.6, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }), -2.5, 1.6, -4.75); // Microwave
    addMesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x3a4a8a, roughness: 0.3, metalness: 0.7 }), -3.2, 1.08, -4.5); // Kettle
    createPlant(2.2, 1, -4.5, 0.06);
    createPlant(0.9, 1, -4.5, 0.05);

    // String Lights
    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const x = -5 + t * 10;
      const z = -2 + Math.sin(t * Math.PI * 3) * 2.5;
      const bulb = addMesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.8 }), x, 2.85, z);
      if (i % 2 === 0) {
        const light = new THREE.PointLight(0xffd700, 0.15, 1.8);
        light.position.copy(bulb.position);
        scene.add(light);
      }
    }

    // BEDROOM
    addMesh(new THREE.BoxGeometry(2, 0.5, 2.8), woodMat, -6.5, 0.25, 8); // Frame
    addMesh(new THREE.BoxGeometry(1.9, 0.3, 2.7), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 }), -6.5, 0.65, 8); // Mattress
    addMesh(new THREE.BoxGeometry(0.8, 0.15, 0.5), new THREE.MeshStandardMaterial({ color: 0xf8f8f8 }), -6.5, 0.88, 6.8); // Pillow
    addMesh(new THREE.BoxGeometry(1.8, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: 0xc43030 }), -6.5, 0.86, 8.5); // Blanket
    addMesh(new THREE.BoxGeometry(0.5, 0.6, 0.4), woodMat, -5.2, 0.3, 7); // Nightstand

    // BATHROOM
    addMesh(new THREE.BoxGeometry(0.4, 0.4, 0.6), whiteMat, 3.5, 0.2, 9.3); // Toilet Base
    addMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16), whiteMat, 3.5, 0.44, 9.3); // Seat
    addMesh(new THREE.BoxGeometry(0.35, 0.5, 0.2), whiteMat, 3.5, 0.65, 9.6); // Tank
    addMesh(new THREE.BoxGeometry(0.6, 0.15, 0.45), whiteMat, 2.3, 0.9, 7.5); // Sink
    addMesh(new THREE.CylinderGeometry(0.15, 0.2, 0.85, 12), whiteMat, 2.3, 0.425, 7.5); // Pedestal
    addMesh(new THREE.BoxGeometry(0.8, 0.5, 1.6), whiteMat, 4.2, 0.25, 8.3); // Tub

    // LABELS
    addLabel("Living Room", 3, 2.5, -1, 'living');
    addLabel("Office", -3.5, 2.5, 3.5, 'office');
    addLabel("Kitchen", 0, 2.5, -4, 'kitchen');
    addLabel("Bedroom", -6.5, 2.5, 8, 'bedroom');
    addLabel("Bathroom", 3.5, 2.5, 8.5, 'bathroom');

    // Grid
    const gridHelper = new THREE.GridHelper(40, 40, 0xcccccc, 0xe8e8e8);
    gridHelper.position.y = 0.01;
    gridHelper.visible = showGrid;
    scene.add(gridHelper);

    // EVENTS
    const handleResize = () => {
        if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
    };
    
    // ORBIT CONTROLS LOGIC
    const onMouseDown = (e: MouseEvent) => {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
    };
    
    const onMouseMove = (e: MouseEvent) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (isDragging) {
            const deltaX = e.clientX - dragStart.current.x;
            const deltaY = e.clientY - dragStart.current.y;
            dragStart.current = { x: e.clientX, y: e.clientY };
            
            cameraState.current.theta -= deltaX * 0.005; 
            cameraState.current.phi -= deltaY * 0.005; 
            cameraState.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraState.current.phi));
            
            if(view !== 'custom') setView('custom');
        } else {
            raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current!);
            const intersects = raycasterRef.current.intersectObjects(labelSpritesRef.current);
            setIsHoveringLabel(intersects.length > 0);
            mountRef.current!.style.cursor = intersects.length > 0 ? 'pointer' : (isDragging ? 'grabbing' : 'grab');
        }
    };
    
    const onMouseUp = () => {
        setIsDragging(false);
    };
    
    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        cameraState.current.r += e.deltaY * 0.01;
        cameraState.current.r = Math.max(5, Math.min(50, cameraState.current.r));
        if(view !== 'custom') setView('custom');
    };

    const handleClick = () => {
        if (!cameraRef.current || isDragging) return; 
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(labelSpritesRef.current);
        if (intersects.length > 0) {
            const target = intersects[0].object.userData.targetView;
            if(target) setView(target);
        }
    };

    mountRef.current.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mountRef.current.addEventListener('wheel', onWheel, { passive: false });
    mountRef.current.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);
        const cam = cameraRef.current;
        
        if (cam && rendererRef.current) {
            
            if (view === 'custom') {
                const { r, theta, phi, target } = cameraState.current;
                const x = r * Math.sin(phi) * Math.sin(theta);
                const y = r * Math.cos(phi);
                const z = r * Math.sin(phi) * Math.cos(theta);
                cam.position.lerp(new THREE.Vector3(x, y, z).add(target), 0.1);
                cam.lookAt(target);
            } else {
                cam.position.lerp(targetCamPos.current, 0.05);
                
                // Keep r synced for smooth manual takeover
                const dist = cam.position.distanceTo(targetLookAt.current);
                cameraState.current.r = dist;
                
                cam.lookAt(targetLookAt.current);
            }

            labelSpritesRef.current.forEach(sprite => {
                const scale = (isHoveringLabel && !isDragging) ? 3.0 : 2.5;
                sprite.scale.lerp(new THREE.Vector3(scale, scale * 0.24, 1), 0.1);
            });

            rendererRef.current.render(scene, cam);
        }
    };
    animate();

    return () => {
        if(mountRef.current) {
            mountRef.current.removeEventListener('mousedown', onMouseDown);
            mountRef.current.removeEventListener('wheel', onWheel);
            mountRef.current.removeEventListener('click', handleClick);
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(frameIdRef.current);
        if (mountRef.current && rendererRef.current) {
            mountRef.current.removeChild(rendererRef.current.domElement);
            rendererRef.current.dispose();
        }
    };
  }, [analysisData, isDemoMode]); 

  // View Controller Updates - Optimized for Clear Visibility
  useEffect(() => {
      const positions: Record<string, { pos: [number, number, number], look: [number, number, number] }> = {
          perspective: { pos: [16, 16, 16], look: [0, 0, 0] },
          top: { pos: [0, 24, 1], look: [0, 0, 0] },
          // Adjusted angles to be "over the wall" isometric
          living: { pos: [4, 8, 8], look: [4, 1, -1] }, 
          office: { pos: [0, 8, 8], look: [-3.5, 1, 3.5] },
          kitchen: { pos: [0, 6, 2], look: [0, 1, -4.7] },
          hallway: { pos: [-1, 9, 14], look: [-1, 1, 7.5] },
          bedroom: { pos: [-1, 9, 8], look: [-6.5, 1, 8] },
          bathroom: { pos: [3.5, 9, 13], look: [3.5, 1, 8.5] }
      };
      
      if (view !== 'custom' && positions[view]) {
          targetCamPos.current.set(...positions[view].pos);
          targetLookAt.current.set(...positions[view].look);
          cameraState.current.target.set(...positions[view].look); // Sync target
      }
  }, [view]);

  // Determine active features based on view
  const activeFeature = useMemo(() => {
      switch(view) {
          case 'living': return { title: "Living Room", desc: "Large window with white shutters, radiator, plants, grey sofa with red blanket" };
          case 'office': return { title: "Home Office", desc: "Dual monitors, laptop setup, wooden desk, floor lamp" };
          case 'kitchen': return { title: "Kitchen", desc: "Grey cabinetry, window above sink, microwave, kettle, string lights" };
          case 'bedroom': return { title: "Bedroom", desc: "Double bed, red duvet, yellow pillows, wooden nightstand" };
          case 'bathroom': return { title: "Bathroom", desc: "Bathtub, toilet, pedestal sink, tiled floor" };
          case 'hallway': return { title: "Hallway", desc: "Shoe rack, coat hooks, mirror" };
          default: return null;
      }
  }, [view]);

  return (
    <div className="w-full h-full relative group bg-slate-50 overflow-hidden rounded-xl cursor-grab active:cursor-grabbing">
      <div className="w-full h-full" ref={mountRef} />
      
      {/* UI Overlay */}
      <div 
        className={`absolute top-4 left-4 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 z-10 transition-opacity duration-300 ${isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
             <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Detailed Analysis</h3>
             <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded-md transition-colors ${showGrid ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                <Grid className="w-3.5 h-3.5" />
             </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
             <button onClick={() => setView('perspective')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'perspective' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Layers className="w-3 h-3" /> Overview
             </button>
             <button onClick={() => setView('top')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'top' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Maximize className="w-3 h-3" /> Top Plan
             </button>
             
             <button onClick={() => setView('living')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'living' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Home className="w-3 h-3"/> Living</button>
             <button onClick={() => setView('office')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'office' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Monitor className="w-3 h-3"/> Office</button>
             <button onClick={() => setView('bedroom')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'bedroom' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Bed className="w-3 h-3"/> Bed</button>
             <button onClick={() => setView('bathroom')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'bathroom' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Bath className="w-3 h-3"/> Bath</button>
          </div>
      </div>

      <div className={`absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-2 rounded-lg text-xs font-bold shadow-lg pointer-events-none flex flex-col gap-1 items-end transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100'}`}>
         <div className="flex items-center gap-1.5"><Move className="w-3 h-3"/> Drag to Rotate</div>
         <div className="flex items-center gap-1.5 opacity-80"><Rotate3d className="w-3 h-3"/> Scroll to Zoom</div>
      </div>

      <div className={`absolute bottom-4 right-4 z-20 transition-opacity duration-300 ${isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="group relative flex flex-col items-end">
            {/* Popup content */}
            <div className="absolute bottom-full mb-3 right-0 w-64 origin-bottom-right scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-slate-200 text-xs">
                    {activeFeature ? (
                        <>
                            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <span className="bg-emerald-100 text-emerald-700 p-1 rounded-md"><CheckCircle2 className="w-3 h-3" /></span>
                                {activeFeature.title} Verified
                            </h4>
                            <p className="text-slate-600 leading-relaxed">
                                {activeFeature.desc}
                            </p>
                        </>
                    ) : (
                        <div className="text-slate-500 text-center py-2">
                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Info className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="font-bold text-slate-700 mb-1">Full Layout View</p>
                            <p className="opacity-80">Select a specific room from the menu to see verified AI feature detection details.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Trigger: Circular Icon Only */}
            <div className={`backdrop-blur-md p-3 rounded-full shadow-lg border flex items-center justify-center cursor-help transition-all hover:scale-110 ${activeFeature ? 'bg-emerald-50/90 border-emerald-200 text-emerald-600' : 'bg-white/90 border-slate-200 text-slate-400'}`}>
                <CheckCircle2 className="w-5 h-5" />
            </div>
        </div>
      </div>
    </div>
  );
}
