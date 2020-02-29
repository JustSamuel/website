#ifdef GL_ES
precision mediump float;
#endif

#extension GL_OES_standard_derivatives : enable

uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;
varying vec2 surfacePosition;

float checkIfBelongsToMandelbrotSet(vec2 p) {
    float realComponentOfResult = p.x;
    float imaginaryComponentOfResult = p.y;
    const float maxIterations = 100.0;
    for(float i = 0.0; i < maxIterations; i+= 1.0) {
        float tempRealComponent = realComponentOfResult * realComponentOfResult
        - imaginaryComponentOfResult * imaginaryComponentOfResult
        + p.x;
        float tempImaginaryComponent = 2.0 * realComponentOfResult * imaginaryComponentOfResult
        + p.y;
        realComponentOfResult = tempRealComponent;
        imaginaryComponentOfResult = tempImaginaryComponent;

        if(realComponentOfResult * imaginaryComponentOfResult > 5.0)
        return (i / maxIterations);
    }
    return 0.0;   // Return zero if in set
}



void main( void ) {
    vec2 p = surfacePosition;
    p -= 0.5;

    float color = checkIfBelongsToMandelbrotSet(p);
    gl_FragColor = vec4(vec3(color), 1.0);
}


