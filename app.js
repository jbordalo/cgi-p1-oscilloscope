const MAX_SAMPLES = 10000;

const HORIZONTAL_BLOCKS = 12;
const VERTICAL_BLOCKS = 8;

const DEFAULT_AMPLITUDE = 1.0;
const DEFAULT_PHASE = 1.0;

let $verticalScaleSelector = document.getElementById('vertical-scale-selector');
let $horizontalScaleSelector = document.getElementById('horizontal-scale-selector');
let $xNoteSelector = document.getElementById('x-note-selector');
let $wave1yNoteSelector = document.getElementById('wave1-y-note-selector');
let $wave2yNoteSelector = document.getElementById('wave2-y-note-selector');

/** @type {WebGLRenderingContext} */
let gl;

let currentYNoteWave1 = vec3(C4, 0.0, 0.0), currentYNoteWave2 = vec3(0.0, 0.0, 0.0, 0.0), currentXNote = vec3(0.0, 0.0, 0.0),
    secondsPerBlock = getHorizontalScale(parseFloat($horizontalScaleSelector.options[$horizontalScaleSelector.selectedIndex].value, 10)),
    voltsPerBlock = getVerticalScale(parseFloat($verticalScaleSelector.options[$verticalScaleSelector.selectedIndex].value, 10));

let voltsLoc, secondsLoc;
let notesLocY, notesLocX;
let timeLoc, colorLoc;

let time = 0;
let current = 0;

let gridProgram;
let program;

let bufferId;
let gridBufferId;

function getVerticalScale(voltsPerBlock) {
    return voltsPerBlock;
}

function getHorizontalScale(secondsPerBlock) {
    return secondsPerBlock;
}

$verticalScaleSelector.addEventListener("change", e = () => {
    console.log(parseFloat($verticalScaleSelector.value, 10));
    voltsPerBlock = getVerticalScale(parseFloat($verticalScaleSelector.options[$verticalScaleSelector.selectedIndex].value, 10));
});

$horizontalScaleSelector.addEventListener("change", e = () => {
    console.log(parseFloat($horizontalScaleSelector.value, 10));
    secondsPerBlock = getHorizontalScale(parseFloat($horizontalScaleSelector.options[$horizontalScaleSelector.selectedIndex].value, 10));
});

function pickNote(value) {
    switch (value) {
        case "time":
        case "zero":
            return vec3(0.0, 0.0, 0.0);
        case "C4":
            return vec3(C4, 0.0, 0.0);
        case "G4":
            return vec3(G4, 0.0, 0.0);
        case "C4M":
            return vec3(C4, G4, E4);
        case "F4F4#":
            return vec3(F4, FSHARP4, 0.0);
        default:
            break;
    }
}

$xNoteSelector.addEventListener("change", e => {
    value = $xNoteSelector.options[$xNoteSelector.selectedIndex].value;
    console.log($xNoteSelector.options[$xNoteSelector.selectedIndex].value);

    currentXNote = pickNote(value);
});

$wave1yNoteSelector.addEventListener("change", e => {
    value = $wave1yNoteSelector.options[$wave1yNoteSelector.selectedIndex].value;
    console.log($wave1yNoteSelector.options[$wave1yNoteSelector.selectedIndex].value);

    currentYNoteWave1 = pickNote(value);
});


$wave2yNoteSelector.addEventListener("change", e => {
    value = $wave2yNoteSelector.options[$wave2yNoteSelector.selectedIndex].value;
    console.log($wave2yNoteSelector.options[$wave2yNoteSelector.selectedIndex].value);

    currentYNoteWave2 = pickNote(value);
});

function genNumbers() {
    let a = [];
    for (let i = 0; i < MAX_SAMPLES; i++) {
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

function toDrawData(program, bufferId, attr, size) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

    var loc = gl.getAttribLocation(program, attr);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
}

function drawWaves(current) {
    gl.drawArrays(gl.LINE_STRIP, 0, current);
    if (currentYNoteWave2[0] != 0.0) {
        gl.uniform4fv(colorLoc, vec4(0.0, 0.0, 1.0, 1.0));
        gl.uniform3fv(notesLocY, currentYNoteWave2);
        gl.drawArrays(gl.LINE_STRIP, 0, current);
    }
}

window.onload = function init() {
    var canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    let times = genNumbers();

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // Load the data into the GPU
    bufferId = gl.createBuffer();
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(times), gl.STATIC_DRAW);

    let ampLoc = gl.getUniformLocation(program, 'amp');
    gl.uniform1f(ampLoc, DEFAULT_AMPLITUDE);
    let phaseLoc = gl.getUniformLocation(program, 'phase');
    gl.uniform1f(phaseLoc, DEFAULT_PHASE);
    colorLoc = gl.getUniformLocation(program, "vColor")
    voltsLoc = gl.getUniformLocation(program, "voltsPerBlock");
    secondsLoc = gl.getUniformLocation(program, "secondsPerBlock");

    timeLoc = gl.getUniformLocation(program, 'time');

    notesLocY = gl.getUniformLocation(program, "notesY");
    notesLocX = gl.getUniformLocation(program, "notesX");

    //
    // GRID PROGRAM
    //
    gridProgram = initShaders(gl, "grid-vertex-shader", "fragment-shader");
    gridBufferId = gl.createBuffer();
    let grid = genGridPoints(HORIZONTAL_BLOCKS, VERTICAL_BLOCKS);
    gl.useProgram(gridProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);

    let gridColorLoc = gl.getUniformLocation(gridProgram, "vColor")
    gl.uniform4fv(gridColorLoc, vec4(1.0, 0.0, 1.0, 1.0));

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    toDrawData(program, bufferId, "vTimeSample", 1);

    gl.uniform1f(timeLoc, time);
    gl.uniform4fv(colorLoc, vec4(0.0, 1.0, 1.0, 1.0));
    gl.uniform1f(voltsLoc, voltsPerBlock);
    // console.log("vScale: " + 0.25 / voltsPerBlock);
    gl.uniform1f(secondsLoc, secondsPerBlock);
    //console.log("hScale: " + secondsPerBlock * 6);
    gl.uniform3fv(notesLocY, currentYNoteWave1);
    gl.uniform3fv(notesLocX, currentXNote);

    let timeToRender = HORIZONTAL_BLOCKS * (secondsPerBlock);
    let renderTimes = timeToRender / (1 / 60);

    if (timeToRender < 1 / 60) {
        drawWaves(MAX_SAMPLES);
        time += 1 / 60;
    } else {
        let step = MAX_SAMPLES / renderTimes;
        current += step;
        if (current > MAX_SAMPLES) { current = MAX_SAMPLES; }
        drawWaves(current);
        if (current == MAX_SAMPLES) {
            time += timeToRender;
            console.log(time);
            current = 0;
        }
    }

    toDrawData(gridProgram, gridBufferId, "gPosition", 2);
    gl.drawArrays(gl.LINES, 0, (HORIZONTAL_BLOCKS + VERTICAL_BLOCKS) * 2);

    requestAnimationFrame(render);
}