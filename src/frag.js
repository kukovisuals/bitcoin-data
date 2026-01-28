export const fragGLSL = `

uniform sampler2D uData;
varying vec2 vUv;

void main() {
  float gridSize = 40.0;
  vec2 cellId = floor(vUv * gridSize);
  vec2 cellUv = fract(vUv * gridSize);
  
  float cellIndex = cellId.y * gridSize + cellId.x;
  
  // Black out cells beyond 1000 data points
  if(cellIndex >= 1000.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  
  float dataIdx = cellIndex / 1000.0;    
  float price = texture2D(uData, vec2(dataIdx, 0.5)).r;
  
  float brightness = pow(price * 4.5, 9.4);
  
  float border = step(0.06, cellUv.x) * step(0.016, cellUv.y) * 
                 step(cellUv.x, 0.94) * step(cellUv.y, 0.94);
  
  vec3 col = vec3(brightness) * border;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const squareGrid = `

uniform sampler2D uData;
uniform float uTime;
varying vec2 vUv;

// Rotation matrix
mat2 R2(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

// Box SDF
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float map(vec3 p) {
  // Grid parameters
  float gridSize = 32.0;
  float spacing = 0.1513;
  
  // Which grid cell are we in?
  vec2 cellId = floor(p.xz / spacing + gridSize * 0.5);
  
  // Repeat space for boxes
  vec3 p0 = p;
  p0.xz = mod(p.xz + gridSize * spacing * 0.5, spacing) - spacing * 0.5;
  
 // Get data for this cell
float cellIndex = cellId.y * gridSize + cellId.x;
float dataIdx = cellIndex / (gridSize * gridSize);
float price = texture2D(uData, vec2(dataIdx, 0.5)).r;

// Gentle curve for height - keeps values reasonable
float height = pow(price, 0.5) * 3.0; // sqrt, then scale to 0-3 units

// Lift box up by half its height
p0.y -= height * 0.5;

// Create box
float box = sdBox(p0, vec3(0.0512, height * 0.5, 0.012));
  
  return box;
}

vec3 calcNorm(vec3 p) {
  float e = 0.001;
  return normalize(vec3(
    map(p + vec3(e,0,0)) - map(p - vec3(e,0,0)),
    map(p + vec3(0,e,0)) - map(p - vec3(0,e,0)),
    map(p + vec3(0,0,e)) - map(p - vec3(0,0,e))
  ));
}

float rayMarch(vec3 ro, vec3 rd) {
  float dt = 0.0;
  for(int i = 0; i < 70; i++) {
    vec3 p = ro + rd * dt;
    float d = map(p);
    dt += d;
    if(abs(d) < 0.001 || dt > 20.0) break;
  }
  return dt;
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x *= 1.0; // aspect if needed
  vec3 col = vec3(0);
  
  // Camera position
  vec3 ro = vec3(0, 3.0, -5.0 - uTime * 0.9);
  vec3 rd = normalize(vec3(uv, -1.0));
  
  float dt = rayMarch(ro, rd);
  
  if(dt > 0.0 && dt < 20.0) {
    vec3 p = ro + rd * dt;
    vec3 norm = calcNorm(p);
    
    col = norm * 0.5 + 0.5;
  }
  
  // Fog
  col = mix(col, vec3(0), 1.0 - exp(-0.0039 * dt * dt * dt));
  
  gl_FragColor = vec4(col, 1.0);
}

`;