const HORIZONTAL_BLOCKS = 12;
const VERTICAL_BLOCKS = 8;

const STANDARD_HORIZONTAL_SCALE = 72.0 / HORIZONTAL_BLOCKS;
const STANDARD_VERTICAL_SCALE = 2.0 / VERTICAL_BLOCKS;

/** @type {WebGLRenderingContext} */
var gl;
let currentFunction = 0; // TODO
let funcLoc, ampLoc, phaseLoc, vScaleLoc, hScaleLoc;
let currentAmp = 1.0 /* V */, currentYNote = vec3(C4,0.0,0.0) /* Hz */, currentPhase = 1.5, currentHScale = STANDARD_HORIZONTAL_SCALE, currentVScale = STANDARD_VERTICAL_SCALE;
let nYnotes = 1;
let notesLoc, numNLoc;

let timeLoc;
let time = 0;
var gridProgram;
var program;

var bufferId;
var bufferId1;

function getVerticalScale(voltsPerBlock) {
    return STANDARD_VERTICAL_SCALE / voltsPerBlock;
}

function getHorizontalScale(secondsPerBlock) {
    return (STANDARD_HORIZONTAL_SCALE * secondsPerBlock);
}

let $verticalScaleSelector = document.getElementById('vertical-scale-selector');
$verticalScaleSelector.addEventListener("change", e = () => {
    console.log(parseFloat($verticalScaleSelector.value, 10));
    currentVScale = getVerticalScale(parseFloat($verticalScaleSelector.options[$verticalScaleSelector.selectedIndex].value, 10));
});

let $horizontalScaleSelector = document.getElementById('horizontal-scale-selector');
$horizontalScaleSelector.addEventListener("change", e = () => {
    console.log(parseFloat($horizontalScaleSelector.value, 10));
    currentHScale = getHorizontalScale(parseFloat($horizontalScaleSelector.options[$horizontalScaleSelector.selectedIndex].value, 10));
});

let $xNoteSelector = document.getElementById('x-note-selector');
$xNoteSelector.addEventListener("change", e => {
    value = $xNoteSelector.options[$xNoteSelector.selectedIndex].value;
    console.log($xNoteSelector.options[$xNoteSelector.selectedIndex].value);

    switch (value) {
        case "time":
            currentXNote = time;
            break;
        case "zero":
            currentXNote = 0;
            break;
        case "C4":
            currentXNote = [C4];
            break;
        case "C4M":
            currentXNote = [C4, G4, E4];
            break;
        case "F4F4#":
            currentXNote = [F4, FSHARP4];
            break;
        default:
            break;
    }
});

let $yNoteSelector = document.getElementById('y-note-selector');
$yNoteSelector.addEventListener("change", e => {
    value = $yNoteSelector.options[$yNoteSelector.selectedIndex].value;
    console.log($yNoteSelector.options[$yNoteSelector.selectedIndex].value);

    switch (value) {
        case "zero":
            currentYNote = vec3(0.0,0.0,0.0);
            nYnotes = 0;
            break;
        case "C4":
            currentYNote = vec3(C4,0.0,0.0);
            nYnotes = 1;
            break;
        case "C4M":
            currentYNote = vec3(C4, G4, E4);
            nYnotes = 3;
            break;
        case "F4F4#":
            currentYNote = vec3(F4, FSHARP4,0.0);
            nYnotes = 2;
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

function toDrawData(program, bufferId, attr, size) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);

    var loc = gl.getAttribLocation(program, attr);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);
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

    funcLoc = gl.getUniformLocation(program, 'func');
    ampLoc = gl.getUniformLocation(program, 'amp');
    phaseLoc = gl.getUniformLocation(program, 'phase');
    let colorLoc = gl.getUniformLocation(program, "vColor")
    gl.uniform4fv(colorLoc, vec4(0.0, 1.0, 1.0, 1.0));
    vScaleLoc = gl.getUniformLocation(program, "vScale");
    hScaleLoc = gl.getUniformLocation(program, "hScale");
    
    timeLoc = gl.getUniformLocation(program, 'time');

    notesLoc = gl.getUniformLocation(program, "notes");
    numNLoc = gl.getUniformLocation(program,"numNotes");

    gridProgram = initShaders(gl, "grid-vertex-shader", "fragment-shader");
    bufferId1 = gl.createBuffer();
    let grid = genGridPoints(HORIZONTAL_BLOCKS, VERTICAL_BLOCKS);
    gl.useProgram(gridProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId1);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);

    colorLoc = gl.getUniformLocation(gridProgram, "vColor")
    gl.uniform4fv(colorLoc, vec4(1.0, 0.0, 1.0, 1.0));

    render();
}

function render() {
    toDrawData(program, bufferId, "vTimeSample", 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // gl.lineWidth(2.5);

    gl.uniform1i(funcLoc, currentFunction);

    gl.uniform1f(ampLoc, currentAmp);
    gl.uniform1f(phaseLoc, currentPhase);
    gl.uniform1f(timeLoc, time);
    gl.uniform1f(vScaleLoc, currentVScale);
    gl.uniform1f(hScaleLoc, currentHScale);
    gl.uniform1i(numNLoc, nYnotes);
    gl.uniform3fv(notesLoc, currentYNote);
    time += .00;

    gl.drawArrays(gl.LINE_STRIP, 0, 10000);

    toDrawData(gridProgram, bufferId1, "gPosition", 2);
    gl.drawArrays(gl.LINES, 0, (HORIZONTAL_BLOCKS + VERTICAL_BLOCKS) * 2);

    requestAnimationFrame(render);
}