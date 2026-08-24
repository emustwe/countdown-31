"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "../../stores/settings-store";

interface TransparentVideoProps {
  src: string;
  className?: string;
  width?: number;
  height?: number;
  audioEnabled?: boolean;
  /** When false (default) the clip plays through once and holds its last frame. */
  loop?: boolean;
  /** Drives one-shot playback: flip to true to play from frame 0; false pauses + resets to
   * frame 0 (an idle pose). Undefined keeps the legacy autoplay behavior. */
  playing?: boolean;
  /** Fired once when a non-looping clip finishes. */
  onEnded?: () => void;
}

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

/*
 * MP4 cannot store transparency. This shader builds a soft matte from the dark
 * studio background on every frame. Looking at nearby pixels keeps the cow's
 * black markings opaque when they sit beside its brighter fur, while isolated
 * near-black compression noise becomes fully transparent.
 */
const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_video;
  uniform vec2 u_texel;
  varying vec2 v_texCoord;

  float lightness(vec3 color) {
    return max(color.r, max(color.g, color.b));
  }

  void main() {
    vec4 source = texture2D(u_video, v_texCoord);
    float localLight = lightness(source.rgb);

    for (int x = -2; x <= 2; x++) {
      for (int y = -2; y <= 2; y++) {
        vec2 offset = vec2(float(x), float(y)) * u_texel * 1.6;
        localLight = max(localLight, lightness(texture2D(u_video, v_texCoord + offset).rgb));
      }
    }

    float ownLight = lightness(source.rgb);
    float subjectMatte = smoothstep(0.055, 0.19, localLight);
    float detailMatte = smoothstep(0.018, 0.09, ownLight);
    float alpha = max(detailMatte, subjectMatte * 0.94);

    /* Remove the last dark halo without clipping antialiased fur edges. */
    alpha *= smoothstep(0.012, 0.055, ownLight + localLight * 0.18);

    gl_FragColor = vec4(source.rgb, alpha);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

export function TransparentVideo({
  src,
  className = "w-64 aspect-[9/16] sm:w-72",
  width = 360,
  height = 640,
  audioEnabled = true,
  loop = false,
  playing,
  onEnded,
}: TransparentVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  /* The video element stays visually hidden because WebGL draws its transparent
     picture, but its original audio is allowed through when game sound is on. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !soundEnabled || !audioEnabled;
    video.volume = 0.85;
  }, [audioEnabled, soundEnabled, src]);

  /* Playback control keyed on `loop`:
     - loop=true  → the clip plays continuously (the cow is always animating, e.g. on the side).
     - loop=false → the clip restarts from frame 0 and plays through exactly ONCE (`onEnded` fires),
       e.g. the full centre-stage performance on the local player's defeat.
     Restart from 0 on every mode change so a centre performance always plays the FULL clip. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playing !== undefined) return; // `playing` path (legacy) handled below
    video.loop = loop;
    try {
      video.currentTime = 0;
    } catch {
      /* seeking before metadata is loaded — ignored */
    }
    video.play().catch(() => undefined);
  }, [loop, playing]);

  /* Legacy one-shot control via `playing` (kept for any other callers). */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playing === undefined) return;
    if (playing) {
      video.currentTime = 0;
      video.play().catch(() => undefined);
    } else {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* ignored */
      }
    }
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    const textureBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!positionBuffer || !textureBuffer || !texture) return;

    gl.useProgram(program);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]), gl.STATIC_DRAW);
    const textureLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(textureLocation);
    gl.vertexAttribPointer(textureLocation, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, "u_video"), 0);
    gl.uniform2f(gl.getUniformLocation(program, "u_texel"), 1 / width, 1 / height);

    let frameId = 0;
    let stopped = false;

    const draw = () => {
      if (stopped) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      frameId = requestAnimationFrame(draw);
    };

    if (playing === undefined || playing) video.play().catch(() => undefined);
    draw();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(textureBuffer);
      gl.deleteProgram(program);
    };
  }, [src, width, height]);

  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay={playing === undefined}
        loop={loop}
        onEnded={() => onEndedRef.current?.()}
        muted={!soundEnabled || !audioEnabled}
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute h-px w-px opacity-0"
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-label="Animated defeated cow"
        className="h-full w-full object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.65)]"
      />
    </div>
  );
}
