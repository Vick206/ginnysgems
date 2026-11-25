const assert=require('node:assert/strict');
const THREE=require('../../three.min.js');

function assertClosedPolygons(faces,{precision=5,label='Geometry'}={}){
  const edges=new Map();
  for(const face of faces)for(let i=0;i<face.vertices.length;i++){
    const key=[face.vertices[i],face.vertices[(i+1)%face.vertices.length]].map(p=>p.map(n=>Number(n.toFixed(precision))).join(',')).sort().join('|');
    edges.set(key,(edges.get(key)||0)+1);
  }
  assert(edges.size>0&&[...edges.values()].every(count=>count===2),label+': open or nonmanifold polygon surface');
}

function signedMeshVolume(geometry){
  const p=geometry.attributes.position;let volume=0;
  for(let i=0;i<p.count;i+=3){
    const [a,b,c]=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,i+k));
    volume+=a.dot(b.cross(c))/6;
  }
  return volume;
}

function assertConvexGeometry(geometry,{planes,count},{tolerance=1e-5,label='Geometry'}={}){
  const p=geometry.attributes.position;
  for(const plane of planes.slice(0,count))for(let i=0;i<p.count;i++)assert(plane.x*p.getX(i)+plane.y*p.getY(i)+plane.z*p.getZ(i)-plane.w<tolerance,label+': vertex outside optical volume');
}

module.exports={assertClosedPolygons,signedMeshVolume,assertConvexGeometry};
