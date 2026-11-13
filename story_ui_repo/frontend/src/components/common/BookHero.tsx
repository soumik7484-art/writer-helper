import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const sheetACells = [
  { x: 6, y: 0, w: 386, h: 575, spine: '#2c4f63', title: 'THE LAST HARBOR', author: 'Elise Moreau' },
  { x: 401, y: 0, w: 376, h: 575, spine: '#195433', title: 'Bright Rivers', author: 'Hana Sato' },
  { x: 787, y: 0, w: 377, h: 575, spine: '#c62420', title: 'The Quiet Room', author: 'Lila Hart' },
  { x: 1175, y: 0, w: 379, h: 575, spine: '#f4f3ef', title: 'STILL LIFE', author: 'Juno Reed' },
  { x: 1564, y: 0, w: 377, h: 575, spine: '#2d86cf', title: 'The Salt Between Us', author: 'Lila Barron' },
  { x: 1949, y: 0, w: 383, h: 575, spine: '#f7d547', title: 'THE BRIGHTER SIDE', author: 'Cassia Wren' },
  { x: 6, y: 583, w: 386, h: 573, spine: '#494e68', title: 'City of Ash', author: 'Tomás Reyes' },
  { x: 401, y: 583, w: 376, h: 573, spine: '#f2ecde', title: 'The Weight of Tomorrow', author: 'Eliot Grant' },
  { x: 787, y: 583, w: 377, h: 573, spine: '#7893a3', title: 'Vanishing Light', author: 'Marlowe Pierce' },
  { x: 1175, y: 583, w: 379, h: 573, spine: '#0c0b0b', title: 'THE GLASS GARDEN', author: 'Adelaide Cross' },
  { x: 1564, y: 583, w: 377, h: 573, spine: '#ddd0c1', title: 'Fragments of Us', author: 'Nova Keller' },
  { x: 1949, y: 583, w: 383, h: 573, spine: '#013eb0', title: 'Blue Hours', author: 'Jasper Lane' },
  { x: 6, y: 1164, w: 386, h: 578, spine: '#f2f1ed', title: 'THE SILENT BELL', author: 'Kai Mori' },
  { x: 401, y: 1164, w: 376, h: 578, spine: '#0a291c', title: 'All That Remains', author: 'Iris Vale' },
  { x: 787, y: 1164, w: 377, h: 578, spine: '#c61111', title: 'The Red Departure', author: 'Pesse Hall' },
  { x: 1175, y: 1164, w: 379, h: 578, spine: '#7f7263', title: 'A Brighter Tomorrow', author: 'Mira Lowe' },
  { x: 1564, y: 1164, w: 377, h: 578, spine: '#ae4716', title: 'NORTH OF NOWHERE', author: 'Sam Ortega' },
  { x: 1949, y: 1164, w: 383, h: 578, spine: '#021f42', title: 'Paper Moons', author: 'Ada Finch' }
];

const sheetBCells = [
  { x: 3, y: 2, w: 383, h: 574, spine: '#d1cd8c', title: 'The Orchard Year', author: 'Clara Bell' },
  { x: 394, y: 2, w: 381, h: 574, spine: '#000621', title: 'SIGNAL', author: 'Theo Marsh' },
  { x: 784, y: 2, w: 381, h: 574, spine: '#b8acd3', title: 'Small Hours', author: 'June Park' },
  { x: 1172, y: 2, w: 381, h: 574, spine: '#e6bd7e', title: "The Cartographer's Daughter", author: 'Ines Duarte' },
  { x: 1562, y: 2, w: 381, h: 574, spine: '#076368', title: 'WILD SALT', author: 'Rory Quinn' },
  { x: 1952, y: 2, w: 382, h: 574, spine: '#ad8357', title: 'Low Tide', author: 'Mae Okafor' },
  { x: 3, y: 586, w: 383, h: 572, spine: '#cfa94d', title: 'The Long Field', author: 'Owen Hale' },
  { x: 394, y: 586, w: 381, h: 572, spine: '#497f9d', title: 'Houses of Glass', author: 'Vera Lind' },
  { x: 784, y: 586, w: 381, h: 572, spine: '#02878a', title: 'OPEN WATER', author: 'Lena Ruiz' },
  { x: 1172, y: 586, w: 381, h: 572, spine: '#170402', title: 'Nine Lanterns', author: 'Mei Tanaka' },
  { x: 1562, y: 586, w: 381, h: 572, spine: '#09150b', title: 'The Understory', author: 'Ash Kerr' },
  { x: 1952, y: 586, w: 382, h: 572, spine: '#f57664', title: 'Velvet Static', author: 'Remy Cole' },
  { x: 3, y: 1167, w: 383, h: 574, spine: '#f3f3f3', title: 'Lessons in Gravity', author: 'Noor Haddad' },
  { x: 394, y: 1167, w: 381, h: 574, spine: '#2a2929', title: 'THE ARCHIVE', author: 'Felix Brandt' },
  { x: 784, y: 1167, w: 381, h: 574, spine: '#3fb1b9', title: 'Summer, Elsewhere', author: 'Isla Grey' },
  { x: 1172, y: 1167, w: 381, h: 574, spine: '#6b1405', title: 'Ember & Bone', author: 'Kit Morrow' },
  { x: 1562, y: 1167, w: 381, h: 574, spine: '#ceba9f', title: 'A Map of Quiet Things', author: 'Sol Rivera' },
  { x: 1952, y: 1167, w: 382, h: 574, spine: '#1c565e', title: 'Northern Lights Hotel', author: 'Hugo Berg' }
];

const bookOrder = [
  0, 22, 5, 30, 9, 13, 26, 2, 19, 11, 33, 7, 15, 24, 4, 28,
  17, 21, 1, 31, 14, 8, 25, 35, 3, 18, 10, 29, 16, 23, 6, 34
];

export interface BookHeroProps {
  onContinue?: () => void;
}

export const BookHero: React.FC<BookHeroProps> = ({ onContinue }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Scene & Camera
    const scene = new THREE.Scene();
    const initialFov = (width < height || width <= 760) ? 40 : 19.5;
    const camera = new THREE.PerspectiveCamera(initialFov, width / height, 0.1, 100);
    camera.position.set(3.6, 2.15, 7.4);
    camera.lookAt(-1.4, 0.05, -0.6);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn("WebGL initialization prevented:", e);
      return;
    }

    // Environment Lighting
    try {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const roomEnv = new RoomEnvironment();
      const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTexture;
    } catch (e) {
      console.warn("PMREM environment lighting skipped:", e);
    }

    // Lights
    const keyLight = new THREE.DirectionalLight(0xfff3e4, 2.4);
    keyLight.position.set(-4, 6, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbfd2ff, 1.1);
    rimLight.position.set(6, 3, -4);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.12);
    scene.add(ambientLight);

    // Page Texture generator
    function createPageTexture(horizontal = true) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#efe7d6';
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 256; i += 2) {
          const alpha = 0.05 + Math.random() * 0.12;
          ctx.strokeStyle = `rgba(110, 80, 50, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (horizontal) {
            ctx.moveTo(0, i + 0.5);
            ctx.lineTo(256, i + 0.5);
          } else {
            ctx.moveTo(i + 0.5, 0);
            ctx.lineTo(i + 0.5, 256);
          }
          ctx.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const foreEdgeTex = createPageTexture(true);
    const topBottomTex = createPageTexture(false);
    const bookGeometry = new THREE.BoxGeometry(1, 1.5, 0.2);

    function createFallbackCoverTexture(cell: (typeof sheetACells)[0]) {
      const canvas = document.createElement('canvas');
      canvas.width = 380;
      canvas.height = 570;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = cell.spine;
        ctx.fillRect(0, 0, 380, 570);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 4;
        ctx.strokeRect(18, 18, 380 - 36, 570 - 36);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px serif';
        const words = cell.title.split(' ');
        let line = '';
        let y = 180;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 300 && n > 0) {
            ctx.fillText(line, 190, y);
            line = words[n] + ' ';
            y += 32;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 190, y);

        ctx.font = 'italic 16px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(cell.author, 190, y + 50);

        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('STORYWEAVE PRESS', 190, 500);
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    }

    interface BookItem {
      index: number;
      coverIndex: number;
      group: THREE.Group;
      mesh: THREE.Mesh;
      coverMat: THREE.MeshPhysicalMaterial;
      cell: (typeof sheetACells)[0];
      y: number;
      vy: number;
      z: number;
      vz: number;
    }

    const books: BookItem[] = [];
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    bookOrder.forEach((coverIndex, i) => {
      const isSheetB = coverIndex >= 18;
      const cell = isSheetB ? sheetBCells[coverIndex - 18] : sheetACells[coverIndex];
      const spineColorObj = new THREE.Color(cell.spine).multiplyScalar(0.62);

      const foreEdgeMat = new THREE.MeshStandardMaterial({
        map: foreEdgeTex,
        roughness: 0.9,
        envMapIntensity: 0.55
      });

      const spineMat = new THREE.MeshPhysicalMaterial({
        color: spineColorObj,
        roughness: 0.55,
        clearcoat: 0.3,
        envMapIntensity: 0.55
      });

      const topBottomMat = new THREE.MeshStandardMaterial({
        map: topBottomTex,
        roughness: 0.9,
        envMapIntensity: 0.55
      });

      const initialCoverTex = createFallbackCoverTexture(cell);
      const coverMat = new THREE.MeshPhysicalMaterial({
        map: initialCoverTex,
        roughness: 0.42,
        clearcoat: 0.55,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.55
      });

      const backMat = new THREE.MeshStandardMaterial({
        color: spineColorObj,
        roughness: 0.6,
        envMapIntensity: 0.55
      });

      const materials = [
        foreEdgeMat,
        spineMat,
        topBottomMat,
        topBottomMat,
        coverMat,
        backMat
      ];

      const group = new THREE.Group();
      group.position.set(1.55 + i * -0.5, -1.12, 0.9 + i * -0.2);
      group.rotation.y = 0.32;
      scene.add(group);

      const mesh = new THREE.Mesh(bookGeometry, materials);
      mesh.position.y = -3;
      group.add(mesh);

      books.push({
        index: i,
        coverIndex,
        group,
        mesh,
        coverMat,
        cell,
        y: -3,
        vy: 0,
        z: 0,
        vz: 0
      });
    });

    // Texture Sheets loader
    const sheetA_URL = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_003447_7862e2d0-751c-4d7c-9c8a-e682415d908f.png&w=2336&q=90';
    const sheetB_URL = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261030_003448_95f1eed5-2ae5-4736-a53c-f3b3f87acd3b.png&w=2336&q=90';

    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin('anonymous');

    function applySheetTexture(texture: THREE.Texture, isB: boolean) {
      texture.colorSpace = THREE.SRGBColorSpace;
      books.forEach(b => {
        const bookIsB = b.coverIndex >= 18;
        if (bookIsB === isB) {
          const clone = texture.clone();
          clone.colorSpace = THREE.SRGBColorSpace;
          clone.anisotropy = maxAnisotropy;
          clone.repeat.set((b.cell.w - 6) / 2336, (b.cell.h - 6) / 1744);
          clone.offset.set((b.cell.x + 3) / 2336, 1 - (b.cell.y + b.cell.h - 3) / 1744);
          clone.needsUpdate = true;

          b.coverMat.map = clone;
          b.coverMat.needsUpdate = true;
        }
      });
    }

    texLoader.load(sheetA_URL, tex => applySheetTexture(tex, false));
    texLoader.load(sheetB_URL, tex => applySheetTexture(tex, true));

    // Pointer tracking & Idle
    let pointerInside = false;
    let pointerX = -9999;
    let pointerY = -9999;
    let lastPointerTime = performance.now();
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;

    const onPointerMove = (e: PointerEvent) => {
      // Only track pointer when inside Section 1 hero
      if (window.scrollY < height) {
        pointerInside = true;
        pointerX = e.clientX;
        pointerY = e.clientY;
        lastPointerTime = performance.now();
      }
    };

    const onMouseLeave = () => { pointerInside = false; };
    const onBlur = () => { pointerInside = false; };

    window.addEventListener('pointermove', onPointerMove);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('blur', onBlur);

    // Intro Animations via Web Animations API
    if (wordmarkRef.current) {
      try {
        wordmarkRef.current.animate([
          { opacity: 0, transform: 'translateY(4vh)', filter: 'blur(14px)' },
          { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' }
        ], {
          duration: 1400,
          delay: 150,
          easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
          fill: 'both'
        });
      } catch {
        wordmarkRef.current.style.opacity = '1';
      }
    }

    const tempVec = new THREE.Vector3();
    const startTime = performance.now();
    let lastFrameTime = performance.now();
    let animationFrameId: number;

    const K = 70;
    const C = 12.5;

    function getBookScreenPoint(book: BookItem) {
      tempVec.set(0, 0.1, 0);
      book.mesh.localToWorld(tempVec);
      tempVec.project(camera);
      return {
        x: (tempVec.x * 0.5 + 0.5) * width,
        y: (-tempVec.y * 0.5 + 0.5) * height
      };
    }

    function getBookRestingScreenPoint(book: BookItem) {
      tempVec.set(0, 0.1, 0);
      book.group.localToWorld(tempVec);
      tempVec.project(camera);
      return {
        x: (tempVec.x * 0.5 + 0.5) * width,
        y: (-tempVec.y * 0.5 + 0.5) * height
      };
    }

    // Animation loop
    function animate() {
      animationFrameId = requestAnimationFrame(animate);

      // Pause rendering if Section 1 is completely scrolled out of view
      if (window.scrollY > height + 50) return;

      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;
      const t = (now - startTime) / 1000;

      const isIdle = (now - lastPointerTime) > 4000;
      let activeX = pointerX;
      let activeY = pointerY;
      let waveActive = pointerInside;

      if (isCoarse || isIdle || !pointerInside) {
        waveActive = true;
        const p29 = getBookRestingScreenPoint(books[29]);
        const p1 = getBookRestingScreenPoint(books[1]);
        const u = (Math.sin(t * 0.45) + 1) / 2;
        activeX = p29.x + (p1.x - p29.x) * u;
        activeY = p29.y + (p1.y - p29.y) * u;
      }

      const s = Math.max(width, height) * 0.085;
      const sSq = s * s;
      const subSteps = 4;
      const h = dt / subSteps;

      books.forEach(b => {
        const screenP = getBookScreenPoint(b);
        let influence = 0;
        if (waveActive) {
          const dx = screenP.x - activeX;
          const dy = (screenP.y - activeY) * 0.55;
          influence = Math.exp(-(dx * dx + dy * dy) / sSq);
        }

        const targetLift = 0.78 * influence;
        const introThreshold = 0.25 + (32 - b.index) * 0.035;
        let targetY = -3;
        let targetZ = 0;

        if (t > introThreshold) {
          targetY = targetLift;
          targetZ = targetLift * 0.35;
        }

        for (let step = 0; step < subSteps; step++) {
          const ay = (targetY - b.y) * K - b.vy * C;
          b.vy += ay * h;
          b.y += b.vy * h;

          const az = (targetZ - b.z) * K - b.vz * C;
          b.vz += az * h;
          b.z += b.vz * h;
        }

        b.mesh.position.y = b.y;
        b.mesh.position.z = b.z;
        b.mesh.rotation.x = -b.vy * 0.012;
      });

      renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.fov = (width < height || width <= 760) ? 40 : 19.5;
      camera.updateProjectionMatrix();
      camera.lookAt(-1.4, 0.05, -0.6);

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleEnterStudio = () => {
    if (onContinue) {
      onContinue();
      return;
    }
    const isStatic = window.location.pathname.includes('.html') || window.location.port === '3000';
    if (isStatic) {
      window.location.href = './studio.html';
    } else {
      window.location.search = '?view=studio';
    }
  };

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full h-screen overflow-hidden bg-black select-none z-20 flex flex-col justify-between"
      style={{
        ['--fs' as string]: 'min(22vh, 11vw)'
      }}
    >
      {/* 3D WebGL Canvas */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-[2] pointer-events-none" 
      />

      {/* Wordmark (z 1) */}
      <div 
        ref={wordmarkRef}
        className="absolute left-0 w-full text-center z-[1] pointer-events-none"
        style={{
          top: 'calc(46.5vh - var(--fs) * 0.8)'
        }}
      >
        <h1 
          className="inline-block text-white font-normal whitespace-nowrap tracking-[-0.02em] leading-none"
          style={{
            fontFamily: "'Libre Caslon Display', serif",
            fontSize: 'var(--fs)'
          }}
        >
          StoryWeave AI
        </h1>
      </div>

      {/* Beautiful, Luxurious Enter Studio Button */}
      <button 
        onClick={handleEnterStudio}
        className="absolute bottom-9 left-1/2 -translate-x-1/2 z-[30] cursor-pointer group flex items-center gap-3.5 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#18120C]/95 via-[#231A12]/95 to-[#18120C]/95 backdrop-blur-xl border border-[#C49A61]/60 hover:border-[#F3D4A0] ring-1 ring-[#C49A61]/25 hover:ring-[#F3D4A0]/50 shadow-[0_4px_30px_rgba(0,0,0,0.85),0_0_28px_rgba(196,154,97,0.38)] hover:shadow-[0_4px_35px_rgba(0,0,0,0.9),0_0_48px_rgba(196,154,97,0.7)] hover:scale-[1.04] active:scale-[0.97] transition-all duration-300 pointer-events-auto"
        title="Enter StoryWeave AI Studio"
      >
        {/* Subtle decorative gold sparkle */}
        <span className="text-[#C49A61] group-hover:text-[#F3D4A0] text-xs transition-colors duration-300 select-none">
          ✦
        </span>

        {/* Button Label */}
        <span className="text-xs sm:text-[13px] tracking-[0.28em] uppercase font-sans font-bold text-[#F3D4A0] group-hover:text-white transition-colors duration-300 drop-shadow-sm select-none">
          Enter Studio
        </span>

        {/* Circular Gold Badge with Forward Arrow */}
        <div className="w-5 h-5 rounded-full bg-[#C49A61]/20 group-hover:bg-[#C49A61]/40 border border-[#C49A61]/50 group-hover:border-[#F3D4A0] flex items-center justify-center transition-all duration-300">
          <svg 
            className="w-3 h-3 text-[#F3D4A0] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.4" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </section>
  );
};
