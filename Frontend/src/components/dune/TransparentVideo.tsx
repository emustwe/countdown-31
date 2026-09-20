"use client";

import { useEffect, useRef } from "react";
import { useSettingsStore } from "../../stores/settings-store";

interface TransparentVideoProps {
  src: string;
  className?: string;
  width?: number;
  height?: number;
  audioEnabled?: boolean;
  /** Playback speed multiplier (e.g. 1.35 for snappy animation) */
  playbackRate?: number;
  /** When false (default) the clip plays through once and holds its last frame. */
  loop?: boolean;
  /** Drives one-shot playback: flip to true to play from frame 0; false pauses + resets to
   * frame 0 (an idle pose). Undefined keeps the legacy autoplay behavior. */
  playing?: boolean;
  /** Bump this to replay the clip from frame 0 WITHOUT remounting. Re-keying the component instead
   * would tear down and rebuild the whole WebGL pipeline (context, shaders, texture, observers) and
   * re-decode the clip — which stutters, and can exhaust the browser's WebGL context budget so other
   * cows on screen stop rendering. A seek costs nothing by comparison. */
  restartKey?: string | number;
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
    float ownLight = lightness(source.rgb);

    vec2 radius = u_texel * 2.8;
    float localLight = ownLight;
    localLight = max(localLight, lightness(texture2D(u_video, v_texCoord + vec2( radius.x, 0.0)).rgb));
    localLight = max(localLight, lightness(texture2D(u_video, v_texCoord + vec2(-radius.x, 0.0)).rgb));
    localLight = max(localLight, lightness(texture2D(u_video, v_texCoord + vec2(0.0,  radius.y)).rgb));
    localLight = max(localLight, lightness(texture2D(u_video, v_texCoord + vec2(0.0, -radius.y)).rgb));

    float subjectMatte = smoothstep(0.05, 0.18, localLight);
    float detailMatte = smoothstep(0.015, 0.08, ownLight);
    float alpha = max(detailMatte, subjectMatte * 0.95);
    alpha *= smoothstep(0.01, 0.05, ownLight + localLight * 0.2);

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
  width = 280,
  height = 360,
  audioEnabled = true,
  playbackRate = 1.0,
  loop = false,
  playing,
  restartKey,
  onEnded,
}: TransparentVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !soundEnabled || !audioEnabled;
    video.volume = 0.85;
    video.playbackRate = playbackRate;
  }, [audioEnabled, soundEnabled, src, playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playing !== undefined) return;
    video.loop = loop;
    video.playbackRate = playbackRate;
    try {
      video.currentTime = 0;
    } catch {
      /* ignored */
    }
    video.play().catch(() => undefined);
  }, [loop, playing, playbackRate]);

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

  // Replay from frame 0 in place (see `restartKey`) — deliberately NOT part of the WebGL setup
  // effect below, so the context and texture survive untouched.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || restartKey === undefined) return;
    try {
      video.currentTime = 0;
    } catch {
      /* ignored */
    }
    video.play().catch(() => undefined);
  }, [restartKey]);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!container || !video || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const positionBuffer = gl.createBuffer();
    const textureBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    if (!positionBuffer || !textureBuffer || !texture) return;

    gl.useProgram(program);
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
    const texelLocation = gl.getUniformLocation(program, "u_texel");

    let frameId = 0;
    let videoFrameId = 0;
    let stopped = false;
    let textureReady = false;
    let isOnScreen = true;
    let lastFallbackTime = -1;

    const resizeDrawingBuffer = () => {
      const bounds = canvas.getBoundingClientRect();
      // Cap the render buffer resolution — the per-frame WebGL matte (5 texture taps) is the main
      // cost, so 1.5x is plenty crisp for the cow while keeping the dance smooth on phones.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      // CONTAIN the video's NATIVE aspect inside the element box so the cow is never stretched — the
      // `object-contain` canvas then letterboxes it. (Previously the buffer took the container aspect,
      // which squashed/stretched clips whose ratio ≠ the container's.)
      const vw = video.videoWidth || width;
      const vh = video.videoHeight || height;
      const boxW = Math.max(2, (bounds.width || width) * dpr);
      const boxH = Math.max(2, (bounds.height || height) * dpr);
      const scale = Math.min(boxW / vw, boxH / vh) || 1;
      const renderWidth = Math.max(2, Math.round(vw * scale));
      const renderHeight = Math.max(2, Math.round(vh * scale));
      if (canvas.width !== renderWidth) canvas.width = renderWidth;
      if (canvas.height !== renderHeight) canvas.height = renderHeight;
      gl.viewport(0, 0, renderWidth, renderHeight);
    };

    const syncPlayback = () => {
      const canPlay = isOnScreen && document.visibilityState === "visible";
      const wantsPlayback = playing === undefined ? loop || !video.ended : playing;
      if (canPlay && wantsPlayback) video.play().catch(() => undefined);
      else video.pause();
    };

    const uploadAndDraw = () => {
      if (stopped || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (textureReady) {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        textureReady = true;
      }
      gl.uniform2f(
        texelLocation,
        1 / Math.max(1, video.videoWidth),
        1 / Math.max(1, video.videoHeight),
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const drawFallback = () => {
      if (stopped) return;
      if (!video.paused && video.currentTime !== lastFallbackTime) {
        lastFallbackTime = video.currentTime;
        uploadAndDraw();
      }
      frameId = requestAnimationFrame(drawFallback);
    };

    const videoWithFrames = video as unknown as {
      requestVideoFrameCallback?: (callback: () => void) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
    };
    const scheduleVideoFrame = () => {
      if (stopped || !videoWithFrames.requestVideoFrameCallback) return;
      videoFrameId = videoWithFrames.requestVideoFrameCallback(() => {
        uploadAndDraw();
        scheduleVideoFrame();
      });
    };

    const resizeObserver = new ResizeObserver(resizeDrawingBuffer);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isOnScreen = entry?.isIntersecting ?? true;
        syncPlayback();
      },
      { rootMargin: "80px" },
    );
    intersectionObserver.observe(container);
    const handleVisibility = () => syncPlayback();
    const handleFrameReady = () => uploadAndDraw();
    const handleMeta = () => {
      resizeDrawingBuffer();
      uploadAndDraw();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    video.addEventListener("loadedmetadata", handleMeta);
    video.addEventListener("loadeddata", handleFrameReady);
    video.addEventListener("seeked", handleFrameReady);

    resizeDrawingBuffer();
    syncPlayback();
    if (videoWithFrames.requestVideoFrameCallback) scheduleVideoFrame();
    else drawFallback();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      if (videoFrameId && videoWithFrames.cancelVideoFrameCallback)
        videoWithFrames.cancelVideoFrameCallback(videoFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      video.removeEventListener("loadedmetadata", handleMeta);
      video.removeEventListener("loadeddata", handleFrameReady);
      video.removeEventListener("seeked", handleFrameReady);
      video.pause();
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(textureBuffer);
      gl.deleteProgram(program);
    };
  }, [height, loop, playing, src, width]);

  return (
    <div
      ref={containerRef}
      className={`transparent-video-shell relative flex items-center justify-center select-none pointer-events-none ${className}`}
    >
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
        className="absolute h-px w-px opacity-0 pointer-events-none"
      />
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-label="Animated cow"
        className="h-full w-full object-contain pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.7)]"
      />
    </div>
  );
}
