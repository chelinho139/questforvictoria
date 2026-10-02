import Phaser from 'phaser';

/**
 * Post-effect that composites a "darkness mask" over the rendered scene:
 *
 *     out.rgb = scene.rgb − lightmap.rgb² · strength
 *
 * The lightmap is filled with the time-of-day darkness colour and has point lights
 * stamped into it as dark holes. A bright lightmap pixel subtracts a lot (night); a
 * near-black one subtracts nothing (noon, or inside a light pool). Because the
 * subtraction is coloured, the complement survives: subtracting warm gives a blue
 * night, subtracting blue gives a golden dusk. Adapted from the realms engine.
 */
const fragShader = `
#define SHADER_NAME QFV_LIGHTING_FS
precision mediump float;
uniform sampler2D uMainSampler;
uniform sampler2D uLightmap;
uniform float uStrength;
varying vec2 outTexCoord;
// The lightmap's render target uses the opposite Y convention from the scene sampler.
vec2 lightmapUV(vec2 uv) { return vec2(uv.x, 1.0 - uv.y); }
void main () {
  vec4 scene = texture2D(uMainSampler, outTexCoord);
  if (uStrength < 0.001) { gl_FragColor = scene; return; }
  vec3 darkness = texture2D(uLightmap, lightmapUV(outTexCoord)).rgb;
  vec3 outRgb = scene.rgb - darkness * darkness * uStrength;
  gl_FragColor = vec4(clamp(outRgb, 0.0, 1.0), scene.a);
}
`;

type TexWrapper = Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper;

export class LightingPostFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  static readonly KEY = 'QfvLightingPostFX';
  private strength = 1;
  private lightmapTex: TexWrapper | null = null;

  constructor(game: Phaser.Game) {
    super({ game, fragShader });
  }

  /** Register (once per renderer) and attach to a camera. Null without WebGL. */
  static attach(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera): LightingPostFX | null {
    const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (!renderer?.pipelines) return null;
    if (!renderer.pipelines.has(LightingPostFX.KEY)) renderer.pipelines.addPostPipeline(LightingPostFX.KEY, LightingPostFX);
    try {
      camera.setPostPipeline(LightingPostFX.KEY);
      const p = camera.getPostPipeline(LightingPostFX.KEY);
      const pipeline = Array.isArray(p) ? p[0] : p;
      return pipeline instanceof LightingPostFX ? pipeline : null;
    } catch {
      return null;
    }
  }

  setStrength(v: number): void {
    this.strength = Math.max(0, Math.min(1, v));
  }

  setLightmap(tex: TexWrapper | null): void {
    this.lightmapTex = tex;
  }

  override onPreRender(): void {
    this.set1f('uStrength', this.lightmapTex ? this.strength : 0);
    this.set1i('uLightmap', 1);
  }

  override onDraw(renderTarget: Phaser.Renderer.WebGL.RenderTarget): void {
    if (this.lightmapTex) this.bindTexture(this.lightmapTex, 1);
    this.bindAndDraw(renderTarget);
  }
}
