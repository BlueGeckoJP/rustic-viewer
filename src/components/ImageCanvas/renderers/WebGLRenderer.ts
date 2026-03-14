import imageCache from "../../../utils/imageCache";
import { replaceCacheWithResampledImage } from "../../../utils/imageLoader";
import type { ImageRenderer } from ".";

export class WebGLRenderer implements ImageRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;

  private positionLocation: number = -1;
  private texCoordLocation: number = -1;
  private resolutionUniformLocation: WebGLUniformLocation | null = null;
  private imageResolutionUniformLocation: WebGLUniformLocation | null = null;
  private offsetUniformLocation: WebGLUniformLocation | null = null;
  private scaleUniformLocation: WebGLUniformLocation | null = null;

  private timeoutId: number | null = null;
  private currentResizeId = 0;
  private currentImagePath: string | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });

    if (!this.gl) {
      console.error("WebGL not supported");
      return;
    }

    const gl = this.gl;

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;

      uniform vec2 u_resolution;
      uniform vec2 u_imageResolution;
      uniform vec2 u_offset;
      uniform float u_scale;

      varying vec2 v_texCoord;

      void main() {
        // scale the image
        vec2 scaledPosition = a_position * u_imageResolution * u_scale;

        // add offset
        vec2 position = scaledPosition + u_offset;

        // convert the position from pixels to 0.0 to 1.0
        vec2 zeroToOne = position / u_resolution;

        // convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;

        // convert from 0->2 to -1->+1 (clip space)
        vec2 clipSpace = zeroToTwo - 1.0;

        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

        // pass the texCoord to the fragment shader
        // The GPU will interpolate this value between points.
        v_texCoord = a_texCoord;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      // our texture
      uniform sampler2D u_image;

      // the texCoords passed in from the vertex shader.
      varying vec2 v_texCoord;

      void main() {
        gl_FragColor = texture2D(u_image, v_texCoord);
      }
    `;

    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    this.program = this.createProgram(gl, vertexShader, fragmentShader);
    if (!this.program) return;

    this.positionLocation = gl.getAttribLocation(this.program, "a_position");
    this.texCoordLocation = gl.getAttribLocation(this.program, "a_texCoord");

    this.resolutionUniformLocation = gl.getUniformLocation(this.program, "u_resolution");
    this.imageResolutionUniformLocation = gl.getUniformLocation(this.program, "u_imageResolution");
    this.offsetUniformLocation = gl.getUniformLocation(this.program, "u_offset");
    this.scaleUniformLocation = gl.getUniformLocation(this.program, "u_scale");

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    this.setRectangle(gl, 0, 0, 1, 1);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0,
      ]),
      gl.STATIC_DRAW,
    );

    this.texture = gl.createTexture();
  }

  private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;

    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  private createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);

    // Shaders are no longer needed after linking; detach and delete them to free GPU memory.
    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (success) return program;

    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  private setRectangle(gl: WebGLRenderingContext, x: number, y: number, width: number, height: number) {
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2,
      ]),
      gl.STATIC_DRAW,
    );
  }

  draw(
    image: ImageBitmap,
    imagePath: string,
    zoom: number,
    panOffset: { x: number; y: number },
  ): void {
    if (!this.gl || !this.program) return;

    const gl = this.gl;

    // Use WebGL canvas bounds for resolution, as it matches CSS bounds and handles DPR via viewport
    const cssW = (gl.canvas as HTMLCanvasElement).clientWidth || gl.canvas.width;
    const cssH = (gl.canvas as HTMLCanvasElement).clientHeight || gl.canvas.height;

    const imgRatio = image.width / image.height;
    const canvasRatio = cssW / cssH;

    let baseWidth: number, baseHeight: number;
    if (imgRatio > canvasRatio) {
      baseWidth = cssW;
      baseHeight = cssW / imgRatio;
    } else {
      baseHeight = cssH;
      baseWidth = cssH * imgRatio;
    }

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    const centerX = cssW / 2;
    const centerY = cssH / 2;

    const offsetX = centerX - drawWidth / 2 + panOffset.x;
    const offsetY = centerY - drawHeight / 2 + panOffset.y;

    this.markHighQualityStale(imagePath, drawWidth, drawHeight);

    // Update texture if image or imagePath changed
    if (this.currentImagePath !== imagePath) {
      this.currentImagePath = imagePath;
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);

    gl.enableVertexAttribArray(this.positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(this.texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    gl.uniform2f(this.resolutionUniformLocation, cssW, cssH);
    gl.uniform2f(this.imageResolutionUniformLocation, baseWidth, baseHeight);
    gl.uniform2f(this.offsetUniformLocation, offsetX, offsetY);
    gl.uniform1f(this.scaleUniformLocation, zoom);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.currentResizeId++;
    const resizeId = this.currentResizeId;

    this.timeoutId = window.setTimeout(() => {
      this.performLazyResize(
        resizeId,
        imagePath,
        drawWidth,
        drawHeight,
        zoom,
        offsetX,
        offsetY,
        baseWidth,
        baseHeight,
        cssW,
        cssH
      );
    }, 500);
  }

  private markHighQualityStale(
    path: string,
    drawWidth: number,
    drawHeight: number,
  ): void {
    const item = imageCache.get(path);
    if (!item?.isHighQuality || !item.resampledDimensions) return;

    const roundedWidth = Math.round(drawWidth);
    const roundedHeight = Math.round(drawHeight);
    const widthMatch =
      Math.abs(item.resampledDimensions.width - roundedWidth) < 2;
    const heightMatch =
      Math.abs(item.resampledDimensions.height - roundedHeight) < 2;

    if (widthMatch && heightMatch) return;

    imageCache.put(path, {
      ...item,
      isHighQuality: false,
      resampledDimensions: undefined,
    });
  }

  private performLazyResize = async (
    resizeId: number,
    path: string,
    drawWidth: number,
    drawHeight: number,
    zoom: number,
    offsetX: number,
    offsetY: number,
    baseWidth: number,
    baseHeight: number,
    cssW: number,
    cssH: number,
  ) => {
    if (resizeId !== this.currentResizeId) return;

    try {
      const highQualityBitmap = await replaceCacheWithResampledImage(
        path,
        Math.round(drawWidth),
        Math.round(drawHeight),
      );

      if (!highQualityBitmap || resizeId !== this.currentResizeId) return;

      if (!this.gl || !this.program) return;
      const gl = this.gl;

      // Re-upload high quality texture
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, highQualityBitmap);

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);

      gl.enableVertexAttribArray(this.positionLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.enableVertexAttribArray(this.texCoordLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
      gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      gl.uniform2f(this.resolutionUniformLocation, cssW, cssH);
      gl.uniform2f(this.imageResolutionUniformLocation, baseWidth, baseHeight);
      gl.uniform2f(this.offsetUniformLocation, offsetX, offsetY);
      gl.uniform1f(this.scaleUniformLocation, zoom);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    } catch (error) {
      console.error("Error during lazy resize:", error);
    }
  };

  postResize(): void {
    // handled inside draw by calling gl.viewport
  }

  clear(): void {
    if (!this.gl) return;
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  dispose(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.clear();

    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
      if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }

    this.gl = null;
    this.program = null;
    this.positionBuffer = null;
    this.texCoordBuffer = null;
    this.texture = null;
    this.currentImagePath = null;
  }
}
