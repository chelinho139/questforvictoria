import Phaser from 'phaser';
import { ambientDarkness, ringDarkness } from '../../sim/daylight';
import type { DayCycle } from '../../sim/daylight';
import { LightingPostFX } from './LightingPostFX';

type TexWrapper = Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper;

const RADIAL_KEY = 'light-radial';
const RADIAL_SIZE = 256;
/** Lightmap resolution = camera size ÷ this. Bigger is softer and cheaper. */
const DOWNSCALE = 4;
const MAX_LIGHTS = 32;

/**
 * A point light in the game scene's (projected) coordinates. `r/g/b` (0..1) is the
 * residual darkness left inside the pool: (0,0,0) reveals the scene's true colours,
 * a bluish residual leaves a warm torch-coloured pool.
 */
export interface LightSource {
  id: string;
  x: number;
  y: number;
  radius: number;
  r: number;
  g: number;
  b: number;
  intensity: number;
  flickerHz?: number;
  flickerAmount?: number;
}

/**
 * Time-of-day tint plus point lights, Stardew-style. Each frame: fill a low-res
 * screen-space lightmap with the darkness colour for the current time, stamp every
 * visible light as a soft dark hole, and let LightingPostFX subtract it from the scene.
 */
export class Lighting {
  readonly lights: LightSource[] = [];
  private readonly pipeline: LightingPostFX | null;
  private rt: Phaser.GameObjects.RenderTexture | null = null;
  private rtW = 0;
  private rtH = 0;
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private elapsed = 0;
  private enabled = true;
  private strength = 1;

  constructor(private readonly scene: Phaser.Scene, private readonly camera: Phaser.Cameras.Scene2D.Camera, private readonly day: DayCycle) {
    Lighting.ensureRadialTexture(scene);
    this.pipeline = LightingPostFX.attach(scene, camera);
    if (!this.pipeline) return;
    this.ensureTarget();
    for (let i = 0; i < MAX_LIGHTS; i++) {
      // Off-list draw fodder for the render texture; never on the scene's display list.
      const img = new Phaser.GameObjects.Image(scene, 0, 0, RADIAL_KEY).setOrigin(0.5);
      this.pool.push(img);
    }
  }

  /** White disc with a soft radial alpha falloff. */
  private static ensureRadialTexture(scene: Phaser.Scene): void {
    if (scene.textures.exists(RADIAL_KEY)) return;
    const cv = document.createElement('canvas');
    cv.width = RADIAL_SIZE;
    cv.height = RADIAL_SIZE;
    const c = cv.getContext('2d')!;
    const img = c.createImageData(RADIAL_SIZE, RADIAL_SIZE);
    const half = RADIAL_SIZE / 2;
    for (let y = 0; y < RADIAL_SIZE; y++)
      for (let x = 0; x < RADIAL_SIZE; x++) {
        const d = Math.hypot(x + 0.5 - half, y + 0.5 - half) / half;
        const a = Math.pow(Math.max(0, 1 - d), 1.6);
        const i = (y * RADIAL_SIZE + x) * 4;
        img.data[i] = 255;
        img.data[i + 1] = 255;
        img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    c.putImageData(img, 0, 0);
    const tex = scene.textures.addCanvas(RADIAL_KEY, cv);
    tex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    this.pipeline?.setStrength(v ? this.strength : 0);
  }

  /** How deep into the Blackthorn the current region is (0-5); darkens the light. */
  private ring = 0;
  /** How deep in the Blackthorn we are; indoors it is as dim as dusk all day. */
  setRing(ring: number, indoor = false): void {
    this.ring = ring;
    this.indoor = indoor;
  }
  private indoor = false;

  /** How strongly the darkness applies, 0..1. */
  setStrength(v: number): void {
    this.strength = Math.max(0, Math.min(1, v));
    if (this.enabled) this.pipeline?.setStrength(this.strength);
  }

  getStrength(): number {
    return this.strength;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  removeLight(id: string): void {
    const i = this.lights.findIndex(l => l.id === id);
    if (i >= 0) this.lights.splice(i, 1);
  }

  /** Add or replace a light by id. */
  setLight(light: LightSource): void {
    const i = this.lights.findIndex(l => l.id === light.id);
    if (i >= 0) this.lights[i] = light;
    else this.lights.push(light);
  }

  private targetSize(): { w: number; h: number } {
    return { w: Math.max(1, Math.ceil(this.camera.width / DOWNSCALE)), h: Math.max(1, Math.ceil(this.camera.height / DOWNSCALE)) };
  }

  private ensureTarget(): void {
    const { w, h } = this.targetSize();
    if (this.rt && w === this.rtW && h === this.rtH) return;
    this.rt?.destroy();
    try {
      const rt = this.scene.make.renderTexture({ x: 0, y: 0, width: w, height: h }, false);
      rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      this.rt = rt;
      this.rtW = w;
      this.rtH = h;
      this.pipeline?.setLightmap(glTextureOf(rt));
    } catch {
      this.rt = null;
      this.pipeline?.setLightmap(null);
    }
  }

  /** Call once per frame after the camera has been positioned. */
  update(dt: number): void {
    if (!this.pipeline || !this.enabled) return;
    this.elapsed += dt;
    this.ensureTarget();
    const target = this.rt;
    if (!target) return;

    const amb = this.indoor ? ringDarkness(ambientDarkness(0.83), this.ring) : ringDarkness(ambientDarkness(this.day.t), this.ring);
    const ambR = Math.round(amb.r);
    const ambG = Math.round(amb.g);
    const ambB = Math.round(amb.b);
    const cam = this.camera;
    const rtCam = target.camera;
    // Zoom scales around the camera centre, so the smaller lightmap camera must share
    // the main camera's world centre (not its scroll) to see exactly the same view.
    rtCam.setScroll(cam.scrollX + (cam.width - target.width) / 2, cam.scrollY + (cam.height - target.height) / 2);
    rtCam.setZoom(cam.zoom / DOWNSCALE);
    rtCam.originX = cam.originX;
    rtCam.originY = cam.originY;
    target.fill(Phaser.Display.Color.GetColor(ambR, ambG, ambB), 1);
    if (ambR + ambG + ambB === 0) return; // full daylight: nothing to carve

    const pad = 160;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    const left = cam.worldView.x - pad;
    const right = cam.worldView.x + viewW + pad;
    const top = cam.worldView.y - pad;
    const bottom = cam.worldView.y + viewH + pad;
    const texHalf = RADIAL_SIZE / 2;
    let n = 0;
    for (const L of this.lights) {
      if (n >= this.pool.length) break;
      if (L.x < left || L.x > right || L.y < top || L.y > bottom || !(L.radius > 0)) continue;
      const alpha = flickerAlpha(L.intensity, L.flickerHz ?? 0, L.flickerAmount ?? 0, this.elapsed, L.id);
      if (alpha <= 0.001) continue;
      // a light can only lessen darkness, never add it: cap the residual at the ambient
      const tint = Phaser.Display.Color.GetColor(
        Math.min(Math.round(L.r * 255), ambR),
        Math.min(Math.round(L.g * 255), ambG),
        Math.min(Math.round(L.b * 255), ambB)
      );
      const img = this.pool[n++];
      img.setPosition(L.x, L.y).setScale(L.radius / texHalf).setAlpha(alpha).setTint(tint);
    }
    if (n > 0) {
      target.beginDraw();
      for (let i = 0; i < n; i++) target.batchDraw(this.pool[i]);
      target.endDraw();
    }
  }

  destroy(): void {
    this.pipeline?.setLightmap(null);
    for (const img of this.pool) img.destroy();
    this.pool.length = 0;
    this.rt?.destroy();
    this.rt = null;
  }
}

/** Two incommensurate sines, so a torch wobbles organically rather than pulsing. */
function flickerAlpha(intensity: number, hz: number, amount: number, elapsed: number, id: string): number {
  let a = Math.max(0, Math.min(1, intensity));
  if (hz > 0 && amount > 0) {
    const phase = elapsed * hz * Math.PI * 2 + phaseOffset(id);
    const wobble = (Math.sin(phase) + 0.5 * Math.sin(phase * 1.7)) / 1.5;
    a = Math.max(0, Math.min(1, a * (1 + amount * wobble)));
  }
  return a;
}

function phaseOffset(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h >>> 0) % 997) / 997) * Math.PI * 2;
}

/** WebGL texture wrapper backing a RenderTexture's render target. */
function glTextureOf(rt: Phaser.GameObjects.RenderTexture): TexWrapper | null {
  const dt = rt.texture as unknown as { renderTarget?: { texture?: TexWrapper | null }; source?: Array<{ glTexture?: TexWrapper | null }> };
  if (dt?.renderTarget?.texture) return dt.renderTarget.texture;
  const src = dt?.source?.[0];
  return (src && src.glTexture) || null;
}
