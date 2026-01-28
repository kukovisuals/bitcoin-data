import './style.css'
import { normalizedSeries } from './counter.js'
import * as THREE from "three";
import {fragGLSL, squareGrid} from "./frag.js"

// Setup scene
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Prepare data for shader
const dataLength = normalizedSeries.history.length;
const dataArray = new Float32Array(dataLength * 2); // v and e for each point


// Create a square-ish texture from 1D data
const width = 32;  // 32x32 = 1024 (close to 1000)
const height = 32;
const size = width * height;
const data = new Float32Array(size * 2);

for (let i = 0; i < size; i++) {
  const dataIndex = i % normalizedSeries.history.length;
  data[i * 2] = normalizedSeries.history[dataIndex].v;
  data[i * 2 + 1] = normalizedSeries.history[dataIndex].e;
}

const dataTexture = new THREE.DataTexture(
  data,
  width,  
  height,
  THREE.RGFormat,
  THREE.FloatType
);
dataTexture.wrapS = THREE.RepeatWrapping;
dataTexture.wrapT = THREE.RepeatWrapping;
dataTexture.needsUpdate = true;

// Simple shader
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uData: { value: dataTexture },
    uDataLength: { value: dataLength },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) } // ADD THIS
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv - .5;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: fragGLSL
});

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Animate
function animate(time) {
  material.uniforms.uTime.value = time * 0.001;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate(0);

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});