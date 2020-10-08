const SIN = 0;
const COS = 1;
const TAN = 2;

/** @type {WebGLRenderingContext} */
var gl;
let currentFunction = SIN;
let funcLoc, ampLoc, angFreqLoc, phaseLoc;
let $selectFunc = document.getElementById('select-func');
let currentAmp = 0.0, currentFreq = 2 * Math.PI, currentPhase = 2 * Math.PI;

let timeLoc;
let time = 0;

let $amplitudeSlider = document.getElementById('amplitude-slider');
$amplitudeSlider.oninput = () => {
    console.log($amplitudeSlider.value);
    currentAmp = $amplitudeSlider.value;
}

let $frequencySlider = document.getElementById('frequency-slider');
$frequencySlider.oninput = () => {
    console.log($frequencySlider.value);
    currentFreq = $frequencySlider.value;
};

let $phaseSlider = document.getElementById('phase-slider');
$phaseSlider.oninput = () => {
    console.log($phaseSlider.value);
    currentPhase = $phaseSlider.value;
};


function genNumbers() {
    let a = [];
    for (let i = 0; i < 10000; i++) {
        a.push(i);
    }
    return a;
}

$selectFunc.addEventListener("change", e => {
    value = $selectFunc.options[$selectFunc.selectedIndex].value;
    console.log($selectFunc.options[$selectFunc.selectedIndex].value);

    switch (value) {
        case "sin":
            currentFunction = SIN;
            break;
        case "cos":
            currentFunction = COS;
            break;
        case "tan":
            currentFunction = TAN;
            break;
        default:
            break;
    }
});

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    var times = genNumbers();

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 0.89, 1.0);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(times), gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    var vTimeSample = gl.getAttribLocation(program, "vTimeSample");
    gl.vertexAttribPointer(vTimeSample, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTimeSample);

    funcLoc = gl.getUniformLocation(program, 'func');
    ampLoc = gl.getUniformLocation(program, 'amp');
    angFreqLoc = gl.getUniformLocation(program, 'angFreq');
    phaseLoc = gl.getUniformLocation(program, 'phase');

    timeLoc = gl.getUniformLocation(program, 'time');

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.lineWidth(2.5);

    gl.uniform1i(funcLoc, currentFunction);

    gl.uniform1f(ampLoc, currentAmp);
    gl.uniform1f(angFreqLoc, 2 * Math.PI * currentFreq);
    gl.uniform1f(phaseLoc, currentPhase);
    gl.uniform1f(timeLoc, time);
    time += .01;
    gl.drawArrays(gl.LINE_STRIP, 0, 10000);
    requestAnimationFrame(render);
}