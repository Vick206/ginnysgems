const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const THREE = require(path.join(root, 'three.min.js'));
const context = vm.createContext({ THREE });
vm.runInContext(fs.readFileSync(path.join(root, 'studio-renderer.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'visualizer.js'), 'utf8').split('class GemVisualizer')[0], context);
const Generator = vm.runInContext('GeometryGenerator', context);
const definitions = vm.runInContext('PARAMS', context);
const refract = vm.runInContext('refractRay', context);
let checked = 0;
for (const [cut, params] of Object.entries(definitions)) {
  for (const column of [2, 3, 5]) {
    const values = Object.fromEntries(params.map(p => [p[0], p[column]]));
    const geometry = Generator.generate(cut, values);
    const { planes, count } = context.getGemPlanes(geometry);
    const coordinates = geometry.attributes.position.array;
    const edges = new Map();
    let volume = 0;
    for (let i = 0; i < coordinates.length; i += 9) {
      const vertices = [0, 3, 6].map(offset => new THREE.Vector3().fromArray(coordinates, i + offset));
      const keys = vertices.map(p => p.toArray().map(n => n.toFixed(5)).join(','));
      for (let j = 0; j < 3; j++) {
        const key = [keys[j], keys[(j + 1) % 3]].sort().join('|');
        edges.set(key, (edges.get(key) || 0) + 1);
      }
      volume += vertices[0].dot(vertices[1].clone().cross(vertices[2])) / 6;
      assert(vertices.every(p => p.toArray().every(Number.isFinite)), `${cut}: nonfinite coordinate`);
    }
    assert(volume > 0, `${cut}: reversed winding or zero volume`);
    assert([...edges.values()].every(n => n === 2), `${cut}: open or nonmanifold surface`);
    assert(count > 0 && count <= 256, `${cut}: unsupported facet count`);
    for (const plane of planes.slice(0, count)) {
      for (let i = 0; i < coordinates.length; i += 3) {
        const distance = plane.x * coordinates[i] + plane.y * coordinates[i + 1] + plane.z * coordinates[i + 2] - plane.w;
        assert(distance < 1e-5, `${cut}: optical plane does not contain the mesh`);
      }
    }
    geometry.dispose();
    checked++;
  }
}
const normal = new THREE.Vector3(0, 1, 0);
assert(refract(new THREE.Vector3(0, -1, 0), normal, 1 / 1.7).distanceTo(new THREE.Vector3(0, -1, 0)) < 1e-9);
const bent = refract(new THREE.Vector3(.5, -Math.sqrt(.75), 0), normal, 1 / 1.7);
assert(Math.abs(bent.x - .5 / 1.7) < 1e-9, 'Snell refraction');
assert.equal(refract(new THREE.Vector3(.9, -Math.sqrt(.19), 0), normal, 1.7), null, 'Total internal reflection');
console.log(`Passed ${checked} cut configurations: closed convex surfaces, outward winding, optical plane bounds, and refraction checks.`);
