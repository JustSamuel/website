#ifdef GL_FRAGEMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
precision mediump int;

uniform float zoom;
uniform int maxIters;

uniform float minViewportX;
uniform float minViewportY;

uniform float viewportWidth;
uniform float viewportHeight;

uniform float width;
uniform float height;

#define MAX_ITERATIONS 2000
#define XMIN -5.5
#define YMIN -3.0
#define WH 4.0 * zoom

void main() {
    // Normalized pixel position to complex plane position
    float maxPwh = max(640.0, 480.0);
    float x = minViewportX+(gl_FragCoord.x/width)*viewportWidth;
    float y = minViewportY+(gl_FragCoord.y/height)*viewportWidth;

    // Complex plane window offsets for pixel windows that are not square
    float halfDelta = WH/maxPwh*0.5;
    x -= min((640.0-480.0)*halfDelta, 0.0);
    y -= min((480.0-640.0)*halfDelta, 0.0);

    // Mandelbrot Set code
    float zr = x;
    float zi = y;
    int iterations = 0;
    for (int i = 0; i < MAX_ITERATIONS; i++) {
        iterations = i;

        float sqZr = zr*zr;
        float sqZi = zi*zi;
        float twoZri = 2.0*zr*zi;
        zr = sqZr-sqZi+x;
        zi = twoZri+y;

        if (sqZr+sqZi > 16.0) break;
    }

    float color = 1.0;
    float iter = float(iterations)*20.0;
    float maxIter = float(MAX_ITERATIONS);

    if (iterations != MAX_ITERATIONS-1) {
        color = iter/maxIter;
    }

    gl_FragColor = vec4(vec3(color), 1.0);
}