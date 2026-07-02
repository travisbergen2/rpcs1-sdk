'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { cn } from '@/lib/cn';

type ArtifactKey = 'scanner' | 'memo' | 'portal' | 'prism';

const ARTIFACTS: Array<{
  key: ArtifactKey;
  label: string;
  subtitle: string;
  color: string;
  accent: string;
  position: [number, number, number];
}> = [
  {
    key: 'scanner',
    label: 'Scanner',
    subtitle: 'Live tuner',
    color: '#7dd3fc',
    accent: '#0284c7',
    position: [-4.7, 0.55, -1.8],
  },
  {
    key: 'memo',
    label: 'Memo',
    subtitle: '$99 founding pilot',
    color: '#fbbf24',
    accent: '#d97706',
    position: [4.7, 0.65, -1.4],
  },
  {
    key: 'portal',
    label: 'Portal',
    subtitle: 'MCP access',
    color: '#86efac',
    accent: '#10b981',
    position: [-4.6, 0.15, 3.2],
  },
  {
    key: 'prism',
    label: 'Prism',
    subtitle: 'Translation layer',
    color: '#f0abfc',
    accent: '#c026d3',
    position: [4.5, 0.2, 3.1],
  },
];

function createTextPlane(text: string, color: string, bg: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.Texture();
  }

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  ctx.fillStyle = color;
  ctx.font = 'bold 40px Arial';
  ctx.fillText(text, 34, 96);
  ctx.font = '24px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(text === 'Memo' ? '$99 written diagnostic' : text === 'Scanner' ? 'Live tuner' : text === 'Portal' ? 'Public MCP access' : 'Face-preserving translation', 34, 154);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function Homepage3DShowroom() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05101d');
    scene.fog = new THREE.Fog('#05101d', 10, 42);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 6.2, 14.5);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = false;
    const root = new THREE.Group();
    scene.add(root);

    const room = new THREE.Group();
    root.add(room);

    const floorMat = new THREE.MeshStandardMaterial({
      color: '#0b1a2e',
      roughness: 0.65,
      metalness: 0.14,
    });
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#111d33',
      roughness: 0.84,
      metalness: 0.04,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    room.add(floor);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(40, 14, 0.6), wallMat);
    backWall.position.set(0, 7, -12);
    backWall.receiveShadow = true;
    room.add(backWall);

    const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 28), wallMat);
    sideWallL.position.set(-20, 7, 2);
    room.add(sideWallL);

    const sideWallR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 28), wallMat);
    sideWallR.position.set(20, 7, 2);
    room.add(sideWallR);

    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 28), new THREE.MeshStandardMaterial({
      color: '#050814',
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.86,
    }));
    ceiling.position.set(0, 14, 2);
    room.add(ceiling);

    const grid = new THREE.GridHelper(40, 40, 0x2b82c8, 0x16314f);
    grid.position.y = 0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.52;
    room.add(grid);

    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 14),
      new THREE.MeshBasicMaterial({ color: '#0b1d33', transparent: true, opacity: 0.88 })
    );
    backdrop.position.set(0, 6, -11.6);
    room.add(backdrop);

    const skylight = new THREE.Mesh(
      new THREE.CircleGeometry(5.5, 32),
      new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.18 })
    );
    skylight.rotation.x = -Math.PI / 2;
    skylight.position.set(0, 13.9, 0);
    room.add(skylight);

    const ceilingGlow = new THREE.PointLight('#67e8f9', 2.8, 60);
    ceilingGlow.position.set(0, 12, 3);
    scene.add(ceilingGlow);

    const ambient = new THREE.AmbientLight('#c8e4ff', 1.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight('#f8fafc', 2.2);
    keyLight.position.set(-7, 13, 11);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.PointLight('#8b5cf6', 1.7, 48);
    fillLight.position.set(9, 5, 9);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight('#34d399', 1.6, 48);
    rimLight.position.set(0, 2, -10);
    scene.add(rimLight);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(4.2, 0.26, 12, 40),
      new THREE.MeshStandardMaterial({
        color: '#67e8f9',
        emissive: '#67e8f9',
        emissiveIntensity: 1.2,
        roughness: 0.18,
        metalness: 0.2,
      })
    );
    halo.position.set(0, 4.2, -4.5);
    halo.rotation.x = Math.PI / 2;
    room.add(halo);

    const avatarRig = new THREE.Group();
    avatarRig.position.set(0, 0, 0);
    room.add(avatarRig);

    const avatarBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.8, 1.8),
      new THREE.MeshStandardMaterial({
        color: '#091426',
        roughness: 0.28,
        metalness: 0.18,
        emissive: '#12365e',
      })
    );
    avatarBody.position.y = 2.9;
    avatarBody.castShadow = true;
    avatarRig.add(avatarBody);

    const avatarHead = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.9, 1.9),
      new THREE.MeshStandardMaterial({
        color: '#0d1e31',
        roughness: 0.24,
        metalness: 0.2,
        emissive: '#163e65',
      })
    );
    avatarHead.position.y = 5.1;
    avatarHead.castShadow = true;
    avatarRig.add(avatarHead);

    const eyeMat = new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#7dd3fc', emissiveIntensity: 2.2 });
    const eyeGeo = new THREE.SphereGeometry(0.11, 18, 18);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.48, 5.1, 0.95);
    avatarRig.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.34;
    avatarRig.add(eyeR);

    const mouth = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.1, 0.14),
      new THREE.MeshStandardMaterial({ color: '#78f2cf', emissive: '#78f2cf', emissiveIntensity: 1.4 })
    );
    mouth.position.set(0, 4.6, 0.96);
    avatarRig.add(mouth);

    const pedestalGeo = new THREE.BoxGeometry(2.8, 0.55, 2.8);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: '#0d1728',
      roughness: 0.7,
      metalness: 0.1,
    });

    const artifactGroup = new THREE.Group();
    room.add(artifactGroup);

    ARTIFACTS.forEach((artifact, index) => {
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.set(artifact.position[0], 0.27, artifact.position[2]);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      room.add(pedestal);

      const glow = new THREE.PointLight(artifact.color, 2.1, 16);
      glow.position.set(artifact.position[0], 2.2, artifact.position[2]);
      room.add(glow);

      const core = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.05, 0),
        new THREE.MeshStandardMaterial({
          color: artifact.color,
          emissive: artifact.color,
          emissiveIntensity: 0.65,
          roughness: 0.16,
          metalness: 0.24,
        })
      );
      core.position.set(artifact.position[0], 2.0 + index * 0.09, artifact.position[2]);
      core.castShadow = true;
      room.add(core);
      artifactGroup.add(core);

      const labelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 2.2),
        new THREE.MeshBasicMaterial({
          map: createTextPlane(artifact.label, artifact.color, '#09111d'),
          transparent: true,
          opacity: 0.94,
          side: THREE.DoubleSide,
        })
      );
      labelPlane.position.set(artifact.position[0], 4.1, artifact.position[2]);
      labelPlane.rotation.y = artifact.position[0] > 0 ? -0.5 : 0.5;
      room.add(labelPlane);

      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.14, 0.14),
        new THREE.MeshStandardMaterial({
          color: artifact.accent,
          emissive: artifact.accent,
          emissiveIntensity: 0.65,
        })
      );
      ribbon.position.set(artifact.position[0], 4.9, artifact.position[2]);
      room.add(ribbon);
    });

    const portal = new THREE.Mesh(
      new THREE.TorusGeometry(2.1, 0.22, 12, 40),
      new THREE.MeshStandardMaterial({
        color: '#67e8f9',
        emissive: '#67e8f9',
        emissiveIntensity: 2,
        roughness: 0.18,
        metalness: 0.16,
      })
    );
    portal.position.set(0, 4.3, -6.5);
    portal.rotation.x = Math.PI / 2;
    portal.castShadow = true;
    room.add(portal);

    const portalCore = new THREE.Mesh(
      new THREE.CylinderGeometry(1.7, 1.7, 0.38, 28),
      new THREE.MeshStandardMaterial({
        color: '#0c1730',
        emissive: '#172554',
        emissiveIntensity: 1.2,
        roughness: 0.35,
      })
    );
    portalCore.position.set(0, 4.3, -6.5);
    portalCore.rotation.x = Math.PI / 2;
    room.add(portalCore);

    const pathBlocks: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i += 1) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.12, 0.9),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? '#0f172a' : '#13253a',
          emissive: '#0a1f33',
          emissiveIntensity: 0.1,
        })
      );
      block.position.set(0, 0.08, -5 + i * 1.2);
      block.castShadow = true;
      block.receiveShadow = true;
      room.add(block);
      pathBlocks.push(block);
    }

    const bots = new THREE.Group();
    room.add(bots);
    for (let i = 0; i < 3; i += 1) {
      const bot = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 1.25, 0.95),
        new THREE.MeshStandardMaterial({
          color: i === 0 ? '#0ea5e9' : i === 1 ? '#8b5cf6' : '#10b981',
          emissive: i === 0 ? '#0ea5e9' : i === 1 ? '#8b5cf6' : '#10b981',
          emissiveIntensity: 0.5,
          roughness: 0.42,
        })
      );
      bot.position.set(i === 0 ? -7.2 : i === 1 ? 7.2 : 0, 1.4, i === 2 ? 6.7 : -4.2);
      bot.castShadow = true;
      bots.add(bot);

      const botEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 14), eyeMat);
      botEye.position.set(0, 0.18, 0.38);
      bot.add(botEye);

      const botBubble = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 0.86),
        new THREE.MeshBasicMaterial({
          map: createTextPlane(i === 0 ? 'Need help?' : i === 1 ? 'Tune now' : 'Inspect memo', i === 0 ? '#7dd3fc' : i === 1 ? '#fbbf24' : '#86efac', '#07111d'),
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        })
      );
      botBubble.position.set(0, 1.8, 0.85);
      bot.add(botBubble);
    }

    const clock = new THREE.Clock();
    let raf = 0;

    const state = {
      scrollMix: 0,
      roomReveal: 0,
    };

    const updateScroll = () => {
      const rect = container.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const progress = THREE.MathUtils.clamp(1 - rect.top / (rect.height - viewport), 0, 1);
      state.scrollMix = progress;
      state.roomReveal = THREE.MathUtils.smoothstep(progress, 0.2, 0.78);
      container.style.setProperty('--room-progress', String(state.roomReveal));
    };

    const onScroll = () => updateScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    updateScroll();

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);
    const resizeObserver = new ResizeObserver(() => onResize());
    resizeObserver.observe(container);
    window.requestAnimationFrame(onResize);

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, (state.scrollMix - 0.5) * 0.36, 0.08);
      root.position.y = THREE.MathUtils.lerp(root.position.y, -state.roomReveal * 0.22, 0.06);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, (state.scrollMix - 0.5) * 2.3, 0.06);
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 5.8 + state.roomReveal * 0.35, 0.06);
        camera.position.z = THREE.MathUtils.lerp(camera.position.z, 12.2 - state.roomReveal * 3.1, 0.06);
      camera.lookAt(0, 1.6 + state.roomReveal * 0.2, -0.4);

      avatarRig.rotation.y = elapsed * 0.55 + state.scrollMix * 0.45;
      avatarRig.position.y = 0.1 + Math.sin(elapsed * 2.2) * 0.08;
      avatarBody.rotation.y = Math.sin(elapsed * 0.35) * 0.08;
      avatarHead.rotation.y = -Math.sin(elapsed * 0.3) * 0.06;
      eyeL.position.y = 4.18 + Math.sin(elapsed * 3.6) * 0.02;
      eyeR.position.y = 4.18 + Math.cos(elapsed * 3.2) * 0.02;
      mouth.scale.x = 1 + Math.sin(elapsed * 2.8) * 0.08;

      artifactGroup.children.forEach((mesh, index) => {
        mesh.rotation.y = elapsed * (0.3 + index * 0.06);
        mesh.rotation.x = Math.sin(elapsed * 0.7 + index) * 0.14;
        mesh.position.y += Math.sin(elapsed * 2 + index) * 0.003;
      });

      bots.children.forEach((bot, index) => {
        bot.position.y = 1.15 + Math.sin(elapsed * 2.3 + index) * 0.16;
        bot.rotation.y = Math.sin(elapsed * 0.7 + index * 0.6) * 0.22;
      });

      pathBlocks.forEach((block, index) => {
        block.position.y = 0.08 + Math.sin(elapsed * 1.6 + index * 0.4) * 0.03;
      });

      portal.rotation.z = elapsed * 0.42;
      portalCore.rotation.z = -elapsed * 0.22;

      if (!prefersReducedMotion) {
        renderer.render(scene, camera);
      } else if (raf === 0) {
        renderer.render(scene, camera);
      }

      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      resizeObserver.disconnect();
      window.cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);

  return (
    <section id="sales-room" className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-32">
      <div className="mb-6 max-w-3xl">
        <p className="text-xs font-mono text-sky-400 mb-3">2050 showroom</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          The page turns into a room.
        </h2>
        <p className="text-gray-400 leading-relaxed">
          The final section is a real 3D scene, not a decorated panel stack. The objects are the
          product surfaces: the tuner, the memo, the MCP portal, and the translation prism.
        </p>
      </div>

      <div className="relative h-[180vh]" ref={containerRef}>
        <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-sky-500/20 bg-[#02050b] shadow-[0_35px_130px_rgba(0,0,0,0.65)]">
          <div className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_18%,rgba(56,189,248,0.14),transparent_26%),radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.1),transparent_24%),radial-gradient(circle_at_80%_76%,rgba(16,185,129,0.08),transparent_24%)]" />
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          <div className="absolute inset-x-4 top-4 z-30 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-black/35 px-4 py-3 text-xs font-mono text-white/70 backdrop-blur-md">
            <span>RPCS-1 showroom</span>
            <span>3D / scroll-linked / playable</span>
          </div>

          <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
            <div className="grid w-full max-w-3xl gap-3 rounded-[1.5rem] border border-white/10 bg-black/35 p-3 backdrop-blur-md sm:grid-cols-3">
              <Link href="/tuner?preset=support" className={cn('rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-500/15')}>
                Start free
              </Link>
              <Link href="/api/checkout?tier=diagnostic" className={cn('rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15')}>
                Buy the memo
              </Link>
              <Link href="mailto:travisbergen2@gmail.com?subject=RPCS-1 Demo" className={cn('rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/15')}>
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
