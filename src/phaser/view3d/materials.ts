import { ShaderMaterial, Vector2, Vector3, Vector4, Color, DoubleSide } from 'three';
import type { Texture, IUniform } from 'three';

/** The most point lights a 3D view lights by at once (the nearest to the camera). */
export const MAX_LIGHTS = 24;

/**
 * The light every 3D material shares, the same as the 2D view's: the scene minus the square
 * of a darkness colour (the time of day), with soft pools where lights leave less darkness,
 * then fog toward the sky colour (the PoV view's horizon).
 */
export const LIGHT = {
  uAmb: { value: new Vector3() },
  uStrength: { value: 1 },
  uNL: { value: 0 },
  uL: { value: Array.from({ length: MAX_LIGHTS }, () => new Vector4()) },
  uLC: { value: Array.from({ length: MAX_LIGHTS }, () => new Vector3()) },
  uFogCol: { value: new Color() },
  uFog: { value: new Vector2() },
};

const LIGHT_GLSL = /* glsl */ `
uniform vec3 uAmb;
uniform float uStrength;
uniform int uNL;
uniform vec4 uL[${MAX_LIGHTS}];
uniform vec3 uLC[${MAX_LIGHTS}];
uniform vec3 uFogCol;
uniform vec2 uFog;
vec3 lit(vec3 col, vec3 wp, float dist) {
  vec3 dk = uAmb;
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uNL) break;
    vec4 L = uL[i];
    float d = length(wp.xz - L.xy) / L.z;
    dk = mix(dk, uLC[i], pow(max(0.0, 1.0 - d), 1.6) * L.w);
  }
  col = clamp(col - dk * dk * uStrength, 0.0, 1.0);
  if (uFog.y > 0.0) col = mix(col, uFogCol, smoothstep(uFog.x, uFog.y, dist));
  return col;
}
`;

function uniforms(own: Record<string, IUniform>): Record<string, IUniform> {
  return { ...LIGHT, ...own };
}

/**
 * A sprite standing up in the world, turned to face the camera about its own upright axis (so
 * it never leans into a wall). Sized in art px and scaled to world units by `uK`; the mesh's
 * position is the sprite's origin (`uOrigin`, 0..1 from its bottom-left), which it turns about.
 */
export function billboardMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: uniforms({
      map: { value: null },
      uSize: { value: new Vector2(1, 1) },
      uOrigin: { value: new Vector2(0.5, 0) },
      uRot: { value: 0 },
      uRight: { value: new Vector3(1, 0, 0) },
      uK: { value: new Vector2(1, 1) },
      uUv: { value: new Vector4(0, 0, 1, 1) },
      uFlip: { value: 0 },
      uCrop: { value: new Vector4(0, 0, 1, 1) },
      uAlpha: { value: 1 },
      uTint: { value: new Vector4(1, 1, 1, 0) },
      uLit: { value: 1 },
      uText: { value: 0 },
    }),
    vertexShader: /* glsl */ `
      uniform vec2 uSize;
      uniform vec2 uOrigin;
      uniform float uRot;
      uniform vec3 uRight;
      uniform vec2 uK;
      uniform vec4 uUv;
      uniform float uFlip;
      varying vec2 vUv;
      varying vec2 vT;
      varying vec3 vWorld;
      varying float vDist;
      void main() {
        vec2 q = position.xy;
        vec2 p = (q - uOrigin) * uSize;
        float c = cos(uRot), s = sin(uRot);
        // Phaser turns clockwise on screen for a positive angle
        p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
        vec3 base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec3 wp = base + uRight * (p.x * uK.x) + vec3(0.0, p.y * uK.y, 0.0);
        float u = uFlip > 0.5 ? 1.0 - q.x : q.x;
        vT = vec2(u, 1.0 - q.y);
        vUv = vec2(mix(uUv.x, uUv.z, u), mix(uUv.w, uUv.y, q.y));
        vWorld = wp;
        vec4 mv = viewMatrix * vec4(wp, 1.0);
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec4 uCrop;
      uniform float uAlpha;
      uniform vec4 uTint;
      uniform float uLit;
      uniform float uText;
      varying vec2 vUv;
      varying vec2 vT;
      varying vec3 vWorld;
      varying float vDist;
      ${LIGHT_GLSL}
      void main() {
        if (vT.x < uCrop.x || vT.x > uCrop.z || vT.y < uCrop.y || vT.y > uCrop.w) discard;
        vec4 t = texture2D(map, vUv);
        if (t.a < (uText > 0.5 ? 0.02 : 0.5)) discard;
        vec3 col = mix(t.rgb, uTint.rgb, uTint.a);
        if (uLit > 0.5) col = lit(col, vWorld, vDist);
        gl_FragColor = vec4(col, (uText > 0.5 ? t.a : 1.0) * uAlpha);
      }
    `,
    transparent: true,
  });
}

/** Something flat on the ground (the ground itself, water, shadows, the effects canvas). */
export function groundMaterial(map: Texture | null, opts: { alpha?: number; cut?: number; clip?: Vector4 } = {}): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: uniforms({
      map: { value: map },
      uAlpha: { value: opts.alpha ?? 1 },
      uCut: { value: opts.cut ?? 0.5 },
      // the region's ground in world px (x0, y0, x1, y1): the art past its edges is not ground
      uClip: { value: opts.clip ?? new Vector4(-1e9, -1e9, 1e9, 1e9) },
    }),
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vDist;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float uAlpha;
      uniform float uCut;
      uniform vec4 uClip;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying float vDist;
      ${LIGHT_GLSL}
      void main() {
        if (vWorld.x < uClip.x || vWorld.z < uClip.y || vWorld.x > uClip.z || vWorld.z > uClip.w) discard;
        vec4 t = texture2D(map, vUv);
        if (t.a < uCut) discard;
        gl_FragColor = vec4(lit(t.rgb, vWorld, vDist), t.a * uAlpha);
      }
    `,
    transparent: (opts.alpha ?? 1) < 1 || (opts.cut ?? 0.5) < 0.5,
    depthWrite: (opts.cut ?? 0.5) >= 0.5,
  });
}

/** One colour, lit (the land past the region's edge). */
export function flatMaterial(color: Color): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: uniforms({ uCol: { value: color } }),
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying float vDist;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uCol;
      varying vec3 vWorld;
      varying float vDist;
      ${LIGHT_GLSL}
      void main() { gl_FragColor = vec4(lit(uCol, vWorld, vDist), 1.0); }
    `,
  });
}

/** The voxel buildings: a colour per face, and a second one their windows turn at night. */
export function voxelMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: uniforms({ uNight: { value: 0 } }),
    vertexShader: /* glsl */ `
      attribute vec3 col;
      attribute vec3 colLit;
      uniform float uNight;
      varying vec3 vCol;
      varying vec3 vWorld;
      varying float vDist;
      void main() {
        vCol = mix(col, colLit, uNight);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vDist = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vCol;
      varying vec3 vWorld;
      varying float vDist;
      ${LIGHT_GLSL}
      void main() { gl_FragColor = vec4(lit(vCol, vWorld, vDist), 1.0); }
    `,
  });
}

/** Faces of a model drawn from both sides (the mill wheel's thin disc). */
export function twoSided(m: ShaderMaterial): ShaderMaterial {
  m.side = DoubleSide;
  return m;
}
