const SIN = 0;
const COS = 1;
const TAN = 2;
const HORIZONTAL_BLOCKS = 12;
const VERTICAL_BLOCKS = 8;

const STANDARD_SCALE = 1.0 / VERTICAL_BLOCKS * 2;

/** @type {WebGLRenderingContext} */
var gl;
let currentFunction = SIN;
let funcLoc, ampLoc, angFreqLoc, phaseLoc, vScaleLoc, hScaleLoc, colorLoc, colorLoc1; //TODO : color is Uniform
let currentAmp = 10.0 /* V */, currentFreq = 96 /* Hz */, currentPhase = 2 * Math.PI, currentHScale = 0.05, currentVScale = STANDARD_SCALE;

let timeLoc;
let time = 0;
var gridProgram;
var program;

var grid;
var times;
var bufferId;
var bufferId1;

function getScale(voltsPerBlock) {
    return STANDARD_SCALE / voltsPerBlock;
}

let $verticalScaleSelector = document.getElementById('vertical-scale-selector');
$verticalScaleSelector.addEventListener("change", e = () => {
    console.log(parseFloat($verticalScaleSelector.value, 10));
    currentVScale = getScale(parseFloat($verticalScaleSelector.options[$verticalScaleSelector.selectedIndex].value, 10));
});

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

let $selectFunc = document.getElementById('select-func');
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

function genNumbers() {
    let a = [];
    for (let i = 0; i < 10000; i++) {
        a.push(i);
    }
    return a;
}

function genGridPoints(vertical, horizontal) {
    let v = [];
    step = 2 / horizontal;
    for (let i = -1; i < 1; i += step) {
        v.push(vec2(1.0, i));
        v.push(vec2(-1.0, i));
    }
    step = 2 / vertical;
    for (let i = -1; i < 1; i += step) {
        v.push(vec2(i, 1.0));
        v.push(vec2(i, -1.0));
    }
    return v;
}

function toDrawData(program, bufferId, vector, attr, size) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vector), gl.STATIC_DRAW);

    var loc = gl.getAttribLocation(program, attr);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    times = genNumbers();

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // Load the data into the GPU
    bufferId = gl.createBuffer();
    toDrawData(program, bufferId, times, "vTimeSample", 1);

    funcLoc = gl.getUniformLocation(program, 'func');
    ampLoc = gl.getUniformLocation(program, 'amp');
    angFreqLoc = gl.getUniformLocation(program, 'angFreq');
    phaseLoc = gl.getUniformLocation(program, 'phase');
    colorLoc = gl.getUniformLocation(program, "vColor")
    vScaleLoc = gl.getUniformLocation(program, "vScale");
    hScaleLoc = gl.getUniformLocation(program, "hScale");

    timeLoc = gl.getUniformLocation(program, 'time');

    gridProgram = initShaders(gl, "grid-vertex-shader", "fragment-shader");
    bufferId1 = gl.createBuffer();
    grid = genGridPoints(HORIZONTAL_BLOCKS, VERTICAL_BLOCKS);
    toDrawData(gridProgram, bufferId1, grid, "gPosition", 2);
    colorLoc1 = gl.getUniformLocation(gridProgram, "vColor")

    render();
}

function render() {
    toDrawData(program, bufferId, times, "vTimeSample", 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.lineWidth(2.5);

    gl.uniform1i(funcLoc, currentFunction);

    gl.uniform1f(ampLoc, currentAmp);
    gl.uniform1f(angFreqLoc, 2 * Math.PI * currentFreq);
    gl.uniform1f(phaseLoc, currentPhase);
    gl.uniform1f(timeLoc, time);
    gl.uniform1f(vScaleLoc, currentVScale);
    gl.uniform1f(hScaleLoc, currentHScale)
    gl.uniform4fv(colorLoc, vec4(0.0, 1.0, 1.0, 1.0));

    time += .00;

    gl.drawArrays(gl.LINE_STRIP, 0, 10000);

    toDrawData(gridProgram, bufferId1, grid, "gPosition", 2);
    gl.uniform4fv(colorLoc1, vec4(1.0, 0.0, 1.0, 1.0));
    gl.drawArrays(gl.LINES, 0, 40);

    requestAnimationFrame(render);
}