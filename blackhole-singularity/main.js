const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL 2 not supported, falling back to WebGL 1');
    initWebGL1();
} else {
    initWebGL2();
}

function initWebGL2() {
    const vertexShaderSource = `#version 300 es
        in vec2 position;
        void main() {
            gl_Position = vec4(position, 0, 1);
        }
    `;

    const fragmentShaderSource = `#version 300 es
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;
        out vec4 outColor;

        void main() {
            vec2 F = gl_FragCoord.xy;
            float i = 0.2;
            float a;
            vec2 r = u_resolution.xy;
            vec2 p = (F + F - r) / r.y / 0.7;
            vec2 d = vec2(-1.0, 1.0);
            vec2 b = p - i * d;
            
            // Fix mat2 constructor: mat2(vec2, vec2) or mat2(f1, f2, f3, f4)
            float k_val = 0.1 + i / dot(b, b);
            mat2 m1 = mat2(1.0, 0.0, 1.0, k_val); 
            // The original used mat2(1, 1, d/k) which is non-standard.
            // Let's use a standard rotation/perspective matrix.
            // Original: c = p * mat2(1, 1, d/(.1 + i/dot(b,b)))
            // Rewritten for strict compatibility:
            vec2 c = vec2(p.x + p.y * d.x / k_val, p.y * d.y / k_val);
            
            a = dot(c, c);
            float log_a = 0.5 * log(a);
            float t = log_a + u_time * i;
            vec4 rotation_vec = cos(t + vec4(0.0, 33.0, 11.0, 0.0));
            mat2 m_rot = mat2(rotation_vec.x, rotation_vec.y, rotation_vec.z, rotation_vec.w);
            vec2 v = (c * m_rot) / i;
            
            vec2 w = vec2(0.0);
            
            // Explicit loop for strict browser compatibility
            float loop_i = i;
            for(int k=0; k<9; k++) {
                v += 0.7 * sin(v.yx * (loop_i + 1.0) + u_time) / (loop_i + 1.0) + 0.5;
                w += 1.0 + sin(v);
                loop_i += 1.0;
            }

            float disk_radius = length(sin(v / 0.3) * 0.4 + c * (3.0 + d));
            
            vec4 color_grad = c.x * vec4(0.6, -0.4, -1.0, 0.0);
            vec4 exp_val = exp(color_grad) / w.xyyx / (2.0 + disk_radius * disk_radius / 4.0 - disk_radius) / (0.5 + 1.0 / a) / (0.03 + abs(length(p) - 0.7));
            
            outColor = vec4(1.0 - exp(-exp_val.rgb), 1.0);
        }
    `;

    setupAndRender(vertexShaderSource, fragmentShaderSource, true);
}

function initWebGL1() {
    const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl1) {
        document.body.innerHTML = '<h1>WebGL not supported.</h1>';
        return;
    }

    const vertexShaderSource = `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0, 1);
        }
    `;

    const fragmentShaderSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;

        void main() {
            vec2 F = gl_FragCoord.xy;
            float i = 0.2;
            float a;
            vec2 r = u_resolution.xy;
            vec2 p = (F + F - r) / r.y / 0.7;
            vec2 d = vec2(-1.0, 1.0);
            vec2 b = p - i * d;
            
            float k_val = 0.1 + i / dot(b, b);
            vec2 c = vec2(p.x + p.y * d.x / k_val, p.y * d.y / k_val);
            
            a = dot(c, c);
            float log_a = 0.5 * log(a);
            float t = log_a + u_time * i;
            vec4 rot = cos(t + vec4(0.0, 33.0, 11.0, 0.0));
            
            // Manual matrix multiplication
            vec2 v = vec2(c.x * rot.x + c.y * rot.z, c.x * rot.y + c.y * rot.w) / i;
            
            vec2 w = vec2(0.0);
            float loop_i = 1.2;
            for(int k=0; k<9; k++) {
                v += 0.7 * sin(vec2(v.y, v.x) * loop_i + u_time) / loop_i + 0.5;
                w += 1.0 + sin(v);
                loop_i += 1.0;
            }

            float disk_radius = length(sin(v / 0.3) * 0.4 + c * (3.0 + d));
            
            vec3 color_grad = c.x * vec3(0.6, -0.4, -1.0);
            vec3 exp_val = exp(color_grad) / w.xyy / (2.0 + disk_radius * disk_radius / 4.0 - disk_radius) / (0.5 + 1.0 / a) / (0.03 + abs(length(p) - 0.7));
            
            gl_FragColor = vec4(1.0 - exp(-exp_val), 1.0);
        }
    `;

    setupAndRender(vertexShaderSource, fragmentShaderSource, false, gl1);
}

function setupAndRender(vSource, fSource, isWebGL2, customGl) {
    const currentGl = customGl || gl;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vs = createShader(currentGl, currentGl.VERTEX_SHADER, vSource);
    const fs = createShader(currentGl, currentGl.FRAGMENT_SHADER, fSource);

    const program = currentGl.createProgram();
    currentGl.attachShader(program, vs);
    currentGl.attachShader(program, fs);
    currentGl.linkProgram(program);

    if (!currentGl.getProgramParameter(program, currentGl.LINK_STATUS)) {
        console.error(currentGl.getProgramInfoLog(program));
        return;
    }

    const posBuffer = currentGl.createBuffer();
    currentGl.bindBuffer(currentGl.ARRAY_BUFFER, posBuffer);
    currentGl.bufferData(currentGl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), currentGl.STATIC_DRAW);

    const posLoc = currentGl.getAttribLocation(program, 'position');
    const resLoc = currentGl.getUniformLocation(program, 'u_resolution');
    const timeLoc = currentGl.getUniformLocation(program, 'u_time');

    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        currentGl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    function render(time) {
        time *= 0.001;
        currentGl.useProgram(program);
        currentGl.enableVertexAttribArray(posLoc);
        currentGl.bindBuffer(currentGl.ARRAY_BUFFER, posBuffer);
        currentGl.vertexAttribPointer(posLoc, 2, currentGl.FLOAT, false, 0, 0);
        currentGl.uniform2f(resLoc, canvas.width, canvas.height);
        currentGl.uniform1f(timeLoc, time);
        currentGl.drawArrays(currentGl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
