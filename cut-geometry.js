// Reconstruct convex faceting planes without replacing them with parametric cuts.
function geometryFromCut(cut) {
  if(!['source-geometry','source-reconstruction'].includes(cut.status))throw new Error('This cut is awaiting verified plane offsets.');
  const planes=[];
  if(cut.planes){
    for(const plane of cut.planes){
      if(!Array.isArray(plane.normal)||plane.normal.length!==3||!plane.normal.every(Number.isFinite)||!Number.isFinite(plane.distance))throw new Error('Invalid explicit cut plane.');
      const normal=new THREE.Vector3(...plane.normal),length=normal.length();
      if(Math.abs(length-1)>1e-6)throw new Error('Cut plane normal is not normalized.');
      planes.push({normal,d:plane.distance,label:plane.label,index:plane.index});
    }
  }else for(const tier of cut.tiers){
    if(!Number.isFinite(tier.distance))throw new Error('Missing plane distance: '+tier.label);
    const angle=Math.abs(tier.angle)*Math.PI/180,sine=Math.sin(angle),vertical=Math.sign(tier.angle||1)*Math.cos(angle);
    for(const index of tier.indices){
      const theta=index/cut.indexGear*Math.PI*2;
      const normal=new THREE.Vector3(sine*Math.cos(theta),vertical,sine*Math.sin(theta));
      planes.push({normal,d:tier.distance,label:tier.label,index});
    }
  }
  if(planes.length>256)throw new Error('Cut exceeds the 256 optical plane limit.');
  const faces=[];const positions=[],normals=[],opticalPlanes=[];const epsilon=1e-9;
  // For each plane, start with a large coplanar square and clip by every other plane.
  for(const plane of planes){
    const n=plane.normal,origin=n.clone().multiplyScalar(plane.d);
    const axis=Math.abs(n.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
    const u=new THREE.Vector3().crossVectors(axis,n).normalize(),v=new THREE.Vector3().crossVectors(n,u);
    let polygon=[[-8,-8],[8,-8],[8,8],[-8,8]].map(([x,y])=>origin.clone().addScaledVector(u,x).addScaledVector(v,y));
    for(const clip of planes){
      if(clip===plane)continue;
      const next=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];const da=clip.normal.dot(a)-clip.d,db=clip.normal.dot(b)-clip.d;
        if(da<=epsilon)next.push(a);
        if((da>epsilon)!==(db>epsilon))next.push(a.clone().lerp(b,da/(da-db)));
      }
      polygon=next;if(!polygon.length)break;
    }
    polygon=polygon.filter((p,i)=>p.distanceTo(polygon[(i+1)%polygon.length])>epsilon);
    if(polygon.length<3)continue;
    if(polygon.some(p=>p.length()>7))throw new Error('Unbounded cut geometry.');
    let area=0;
    for(let i=1;i<polygon.length-1;i++)area+=new THREE.Vector3().subVectors(polygon[i],polygon[0]).cross(new THREE.Vector3().subVectors(polygon[i+1],polygon[0])).length()/2;
    if(area<epsilon)continue;
    faces.push({label:plane.label,index:plane.index,vertices:polygon.map(p=>p.toArray())});
    opticalPlanes.push([n.x,n.y,n.z,plane.d]);
    for(let i=1;i<polygon.length-1;i++)for(const p of [polygon[0],polygon[i],polygon[i+1]]){positions.push(...p.toArray());normals.push(n.x,n.y,n.z);}
  }
  if(!faces.length)throw new Error('Empty cut geometry.');
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();
  geometry.userData.designFacets=faces;geometry.userData.cutId=cut.id;geometry.userData.opticalPlanes=opticalPlanes;
  return geometry;
}

// Keep the rendered surface and optical planes in the same centered frame.
function centerGemGeometry(geometry){
  const center=geometry.boundingSphere.center.clone();
  geometry.translate(-center.x,-center.y,-center.z);
  if(geometry.userData.opticalPlanes)for(const plane of geometry.userData.opticalPlanes)plane[3]-=plane[0]*center.x+plane[1]*center.y+plane[2]*center.z;
  geometry.computeBoundingSphere();
  return geometry;
}
