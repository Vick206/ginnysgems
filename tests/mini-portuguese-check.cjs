const {assertClosedPolygons,signedMeshVolume,assertConvexGeometry}=require('./helpers/geometry.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {buildMiniPortugueseCut}=require('../tools/build-mini-portuguese.cjs');
const root=path.resolve(__dirname,'..'),THREE=require('../three.min.js');
const cut=JSON.parse(fs.readFileSync(path.join(root,'data/cuts/mini-portuguese.json')));
assert.deepEqual(buildMiniPortugueseCut(),cut,'Reconstruction must be reproducible');
assert.equal(cut.designIor,1.740);assert.equal(cut.designer,'Greg Glenn');
assert.deepEqual(cut.tiers.map(t=>t.angle),[-46,90,-43,-40,32,28,25,0]);
assert.equal(cut.indexGear,96);
const odd=Array.from({length:16},(_,i)=>3+i*6),even=Array.from({length:16},(_,i)=>i===0?96:i*6);
for(const tier of cut.tiers)assert.deepEqual(tier.indices,tier.label==='T'?[96]:['P2','C2'].includes(tier.label)?even:odd);
const context=vm.createContext({THREE,document:{querySelector:()=>null}});
for(const file of ['cut-geometry.js','studio-renderer.js','catalog.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const geometry=context.geometryFromCut(cut),faces=geometry.userData.designFacets;
assert.equal(faces.length,113);assert.equal(context.getGemPlanes(geometry).count,113);
const counts=faces.reduce((a,f)=>(a[f.label]=(a[f.label]||0)+1,a),{});
assert.deepEqual(counts,{P1:16,G:16,P2:16,P3:16,C1:16,C2:16,C3:16,T:1});
assertClosedPolygons(faces,{precision:6,label:'Mini-Portuguese'});
const volume=signedMeshVolume(geometry);
assert(volume>0,'Triangles must face outward');
assert(Math.abs(volume-.194)/.194<.005,'Volume must agree with PDF within reconstruction tolerance (0.5%)');
assert(Math.abs(volume-cut.reconstruction.validation.volumeWidthCubed)<1e-6,'Documented reconstruction volume is stale');
assertConvexGeometry(geometry,context.getGemPlanes(geometry),{tolerance:1e-6,label:'Mini-Portuguese'});
const table=faces.find(f=>f.label==='T');assert.equal(table.vertices.length,16);
assert(Math.abs(2*Math.max(...table.vertices.map(([x,,z])=>Math.hypot(x,z)))-.583)<1e-7);
assert.equal(Number(cut.reconstruction.crownHeight.toFixed(3)),.111);
const minY=Math.min(...faces.flatMap(f=>f.vertices.map(v=>v[1])));
assert(Math.abs(minY+.440)<1e-7);
// Independently check the reconstructed silhouette against PDF vector coordinates.
const projected=faces.flatMap(f=>f.vertices.map(([x,y])=>[318.95999-y*134.64,654+x*134.64]));
for(const anchor of [[339.35999,699.35999],[351.84,685.91998],[307.44,705.83997],[300.72,693.35999]]){
  assert(Math.min(...projected.map(p=>Math.hypot(p[0]-anchor[0],p[1]-anchor[1])))<.36,'Profile disagrees with quantized PDF drawing');
}
const catalog=vm.runInContext('STUDIO_CATALOG',context),ruby=catalog.find(s=>s.id==='ruby-studio-001'),garnet=catalog.find(s=>s.id==='garnet-red-001'),sunstone=catalog.find(s=>s.id==='sunstone-001');
assert.equal(ruby.cutId,'mini-portuguese');assert.equal(garnet.cutId,ruby.cutId);
assert(ruby.render&&garnet.render);assert.notEqual(ruby.ior,cut.designIor);assert.notEqual(ruby.color,garnet.color);
assert.equal(sunstone.cutId,null);assert.equal(sunstone.render,null);
console.log('Passed 113 Mini-Portuguese facets, PDF angles/indices, drawing profile, printed proportions, closed convex surface, optical planes, material separation, and photo-only sunstone.');
