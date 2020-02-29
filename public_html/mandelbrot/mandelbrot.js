var mandelbrot = function () {
    this.canvas = undefined;
    this.gl = undefined;
    this.shaderProgram = undefined;

    this.init = function () {
        this.canvas = document.getElementById("glCanvas");
        this.canvas.width = innerWidth;
        this.canvas.height = innerHeight;

        this.gl = this.initGl(this.canvas);
        if (!this.gl) {
            alert("Could not initialize WebGL");
            return;
        }

        this.gl.viewport( 0, 0, this.canvas.width, this.canvas.height );

        this.shaderProgram = this.initShaders();
        if (!this.shaderProgram) {
            alert("Could not initialize shaders");
            return;
        }

        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(
            this.gl.ARRAY_BUFFER,
            new Float32Array([
                -1.0, -1.0,
                1.0, -1.0,
                -1.0, 1.0,
                1.0, 1.0,
            ]),
            this.gl.STATIC_DRAW
        );

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);

        this.position = this.gl.getAttribLocation(this.shaderProgram, "position");
        this.gl.enableVertexAttribArray(this.position);
        this.gl.vertexAttribPointer(this.position, 2, this.gl.FLOAT, false, 0, 0);

        this.draw();
    };

    this.draw = function () {
        window.requestAnimationFrame(this.draw.bind(this));

        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    };


    this.initGl = function (inCanvas) {
        this.gl = false;

        try {
            this.gl = inCanvas.getContext("webgl") || inCanvas.getContext("experimental-webgl");
        } catch (e) {
        }

        return !this.gl ? false : this.gl;
    };

    this.initShaders = function() {
        this.vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(this.vertexShader, document.getElementById("VertexShader").innerText);

        this.gl.compileShader(this.vertexShader);
        if (!this.gl.getShaderParameter(this.vertexShader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(this.vertexShader));
            return false;
        }

        this.fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(this.fragmentShader, document.getElementById("FragmentShader").innerText);

        this.gl.compileShader(this.fragmentShader);
        if (!this.gl.getShaderParameter(this.fragmentShader, this.gl.COMPILE_STATUS)) {
            alert(this.gl.getShaderInfoLog(this.fragmentShader));
            return false;
        }

        this.shaderProgram = this.gl.createProgram();
        this.gl.attachShader(this.shaderProgram, this.vertexShader);
        this.gl.attachShader(this.shaderProgram, this.fragmentShader);
        this.gl.linkProgram(this.shaderProgram);

        if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) return false;
        this.gl.useProgram(this.shaderProgram);

        return this.shaderProgram;
    }
};

var sketch = new mandelbrot();
sketch.init();