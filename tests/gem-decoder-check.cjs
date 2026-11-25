const {assertClosedPolygons,signedMeshVolume}=require('./helpers/geometry.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {decodeGem}=require('../tools/decode-gem.cjs');
const root=path.resolve(__dirname,'..');
const cut=JSON.parse(fs.readFileSync(path.join(root,'data/cuts/squartuguese.json')));
assert.equal(cut.facetCount,85);assert.equal(cut.tiers.length,13);
assert.equal(cut.designer,'Marco Voltolini');assert.equal(cut.designIor,1.83);assert.equal(cut.indexGear,96);
const context=vm.createContext({THREE:require('../three.min.js')});
for(const file of ['cut-geometry.js','studio-renderer.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const geometry=context.geometryFromCut(cut);
assert.equal(geometry.userData.designFacets.length,85);
assert.equal(context.getGemPlanes(geometry).count,85);
for(let i=0;i<cut.planes.length;i++){
  const source=cut.planes[i],face=geometry.userData.designFacets[i];
  for(const a of source.vertices)assert(face.vertices.some(b=>Math.hypot(...a.map((n,k)=>n-b[k]))<1e-6),'Rebuilt polygon differs from binary source');
  for(const a of face.vertices)assert(source.vertices.some(b=>Math.hypot(...a.map((n,k)=>n-b[k]))<1e-6),'Additional polygon vertex absent from source');
  for(const vertex of source.vertices){
    assert(Math.abs(source.normal.reduce((sum,n,k)=>sum+n*vertex[k],0)-source.distance)<1e-10);
    for(const p of cut.planes)assert(p.normal.reduce((sum,n,k)=>sum+n*vertex[k],0)-p.distance<1e-7,'Nonconvex source');
  }
}
assertClosedPolygons(geometry.userData.designFacets,{precision:6,label:'Decoded GEM'});
const volume=signedMeshVolume(geometry);
assert(volume>0,'Inward winding');

// Independent synthetic cube exercises binary parsing without private email assets.
const parts=[];
const real=n=>{const b=Buffer.alloc(8);b.writeDoubleLE(n);parts.push(b);};
const int=n=>{const b=Buffer.alloc(4);b.writeInt32LE(n);parts.push(b);};
const string=s=>{const b=Buffer.from(s,'latin1');parts.push(Buffer.from([b.length]),b);};
const cube=[
  [[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],
  [[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],
  [[0,1,0],[[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]],
  [[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]],
  [[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
  [[0,0,-1],[[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]],
];
for(const [i,[normal,vertices]] of cube.entries()){
  normal.forEach(real);int(i+1);string(`${i+1}\tTest facet`);
  for(const vertex of vertices){int(1);vertex.forEach(real);}int(0);
}
real(-99999);int(4);int(1);int(96);real(1.5);int(32767);real(0);
for(const s of ['Cube','Test author','','','Notes','','',''])string(s);
const fixture=Buffer.concat(parts),decoded=decodeGem(fixture);
assert.equal(decoded.facetCount,6);assert.equal(decoded.sourceBytes,fixture.length);
assert.equal(decoded.metadata.footnotes[0],'Notes');assert.equal(decoded.tiers[0].indices[0],24);
assert.equal(context.geometryFromCut(decoded).userData.designFacets.length,6);
const lastFaceStart=decoded.planes[5].sourceByteOffset;
const trailerStart=fixture.indexOf(Buffer.from('00000000f069f8c0','hex'),lastFaceStart);
assert.throws(()=>decodeGem(Buffer.concat([fixture.subarray(0,lastFaceStart),fixture.subarray(trailerStart)])),/open or nonmanifold/);
for(const length of [0,7,24,29,fixture.length-1])assert.throws(()=>decodeGem(fixture.subarray(0,length)),/truncated/);
const corrupt=Buffer.from(fixture);corrupt.writeDoubleLE(NaN,0);assert.throws(()=>decodeGem(corrupt),/nonfinite/);
const marker=Buffer.from(fixture);marker.writeInt32LE(2,29+Buffer.byteLength('1\tTest facet'));assert.throws(()=>decodeGem(marker),/vertex marker/);
assert.throws(()=>decodeGem(Buffer.concat([fixture,Buffer.from('preform')])),/trailing data/);
const source=path.join(root,'TemporaryResources/Squartuguese.gem');
if(fs.existsSync(source))assert.equal(JSON.stringify(decodeGem(fs.readFileSync(source),{id:'squartuguese',source})),JSON.stringify(cut),'Converter output is not reproducible');
console.log('Passed GEM decoder metadata, malformed-input rejection, independent cube fixture, 85 source/rebuilt polygons, closure, convexity, winding, and local-source reproducibility.');
