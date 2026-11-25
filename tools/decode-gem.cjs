// Structural reader for the legacy binary GEM layout observed in Squartuguese.gem.
// Independent implementation; format notes and limits: GEM_FORMAT.md.
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');

function decodeGem(bytes,{id='imported-gem',source='imported.gem'}={}){
  const data=Buffer.from(bytes);let offset=0;
  if(data.length>16*1024*1024)throw new Error('GEM exceeds the 16 MiB import limit.');
  const fail=message=>{throw new Error(`Invalid or unsupported GEM at byte ${offset}: ${message}`);};
  const need=count=>{if(offset+count>data.length)fail('truncated record');};
  const int=()=>{need(4);const n=data.readInt32LE(offset);offset+=4;return n;};
  const real=()=>{need(8);const n=data.readDoubleLE(offset);offset+=8;if(!Number.isFinite(n))fail('nonfinite number');return n;};
  const string=()=>{need(1);const length=data[offset++];need(length);const value=new TextDecoder('windows-1252').decode(data.subarray(offset,offset+length));offset+=length;return value;};
  const point=()=>[real(),real(),real()];
  const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
  const faces=[];
  while(true){
    const start=offset,x=real();
    if(x===-99999)break;
    const vector=[x,real(),real()],tier=int(),text=string();
    if(tier<=0||tier>4096)fail('invalid facet tier');
    const vertices=[];
    while(true){
      const flag=int();if(flag===0)break;if(flag!==1)fail('unsupported vertex marker');
      vertices.push(point());if(vertices.length>4096)fail('too many polygon vertices');
    }
    if(vertices.length<3)fail('facet has fewer than three vertices');
    const length=Math.hypot(...vector);if(length<1e-12)fail('zero plane vector');
    const normal=vector.map(n=>n/length),distance=1/length;
    for(const vertex of vertices)if(Math.abs(dot(normal,vertex)-distance)>1e-7)fail('polygon does not lie on stored plane');
    const tab=text.indexOf('\t');
    faces.push({tier,label:tab<0?text:text.slice(0,tab),instruction:tab<0?'':text.slice(tab+1),normal,distance,vertices,sourceByteOffset:start});
    if(faces.length>4096)fail('too many facets');
  }
  if(!faces.length)fail('empty design');
  const symmetry=int(),mirror=int(),signedGear=int(),designIor=real(),trailerFlags=int(),gearOffset=real();
  if(symmetry<1||symmetry>4096||![0,1].includes(mirror)||!signedGear||Math.abs(signedGear)>4096||designIor<1||designIor>5)fail('unsupported trailer metadata');
  const lines=Array.from({length:8},string);
  if(offset!==data.length)fail('trailing data or preform section is not supported');
  // GemCAD uses Z as its vertical axis. Rotate into the viewer's Y-up frame.
  const rotate=([x,y,z])=>[x,z,-y];
  const allVertices=faces.flatMap(f=>f.vertices);
  for(const face of faces)for(const vertex of allVertices)if(dot(face.normal,vertex)-face.distance>1e-7)fail('nonconvex or inconsistent facet data');
  const edges=new Map();
  for(const face of faces){
    const area=[0,0,0];
    for(let i=0;i<face.vertices.length;i++){
      const a=face.vertices[i],b=face.vertices[(i+1)%face.vertices.length];
      area[0]+=(a[1]-b[1])*(a[2]+b[2]);area[1]+=(a[2]-b[2])*(a[0]+b[0]);area[2]+=(a[0]-b[0])*(a[1]+b[1]);
      const key=[a,b].map(p=>p.map(n=>Number(n.toFixed(7))).join(',')).sort().join('|');
      edges.set(key,(edges.get(key)||0)+1);
    }
    if(Math.hypot(...area)<1e-10)fail('degenerate polygon');
  }
  if([...edges.values()].some(count=>count!==2))fail('open or nonmanifold polygon surface');
  const indexGear=Math.abs(signedGear),tiers=new Map();
  const planes=faces.map(face=>{
    const [x,y,z]=face.normal;
    let index=(Math.atan2(x,y)*indexGear/(2*Math.PI)+gearOffset)%indexGear;
    if(index<0)index+=indexGear;
    if(Math.abs(index-Math.round(index))<1e-8)index=Math.round(index);
    if(index===0||Math.hypot(x,y)<1e-10)index=indexGear;
    const angle=Math.acos(Math.min(1,Math.abs(z)))*180/Math.PI*(z< -1e-10?-1:1);
    if(!tiers.has(face.tier))tiers.set(face.tier,{number:face.tier,label:face.label||`Tier ${face.tier}`,instruction:face.instruction,angle,distance:face.distance,indices:[]});
    tiers.get(face.tier).indices.push(index);
    return {normal:rotate(face.normal),distance:face.distance,label:face.label||`Tier ${face.tier}`,tier:face.tier,index,vertices:face.vertices.map(rotate),sourceByteOffset:face.sourceByteOffset};
  });
  return {id,name:lines[0]||id,sourceTitle:lines[0]||id,designer:lines[1]||null,source:path.basename(source),sourceSha256:createHash('sha256').update(data).digest('hex'),sourceBytes:data.length,status:'source-geometry',designIor,indexGear,facetCount:faces.length,coordinateTransform:'source (x,y,z) to viewer (x,z,-y)',metadata:{symmetry,mirror:!!mirror,signedGear,gearOffset,trailerFlags,headings:lines.slice(0,4),footnotes:lines.slice(4)},tiers:[...tiers.values()],planes,note:'Decoded from binary GEM facet planes and polygon vertices. Represents the supplied design, not a scan of the finished stone. The source design IOR is separate from the displayed material IOR.'};
}

module.exports={decodeGem};
if(require.main===module){
  const [input,output,id]=process.argv.slice(2);
  if(!input||!output){console.error('Usage: node tools/decode-gem.cjs input.gem output.json [cut-id]');process.exitCode=1;}
  else{try{const cut=decodeGem(fs.readFileSync(input),{id:id||path.basename(input,path.extname(input)).toLowerCase(),source:input});fs.writeFileSync(output,JSON.stringify(cut,null,2)+'\n');console.log(`Decoded ${cut.name}: ${cut.facetCount} facets, ${cut.tiers.length} tiers, gear ${cut.indexGear}, design IOR ${cut.designIor}.`);}catch(error){console.error(error.message);process.exitCode=1;}}
}
