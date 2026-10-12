// Screen-space ribbons keep the ray glow smooth at every zoom level.
class RayGlow {
  constructor(scene) {
    this.capacity=60;
    this.geometry=new THREE.BufferGeometry();
    for(const [name,size] of [['position',3],['beamStart',3],['beamEnd',3],['color',3],['uv',2],['travel',1]]) {
      this.geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(this.capacity*6*size),size).setUsage(THREE.DynamicDrawUsage));
    }
    this.geometry.setDrawRange(0,0);
    this.material=new THREE.ShaderMaterial({
      uniforms:{resolution:{value:new THREE.Vector2(1,1)},time:{value:0},intensity:{value:1}},
      vertexShader:`
        attribute vec3 beamStart, beamEnd;
        attribute float travel;
        varying vec2 beamUV;
        varying vec3 beamColor;
        varying float beamTravel;
        uniform vec2 resolution;
        void main(){
          vec4 a=projectionMatrix*viewMatrix*vec4(beamStart,1.0);
          vec4 b=projectionMatrix*viewMatrix*vec4(beamEnd,1.0);
          vec2 delta=(b.xy/b.w-a.xy/a.w)*resolution;
          vec2 perpendicular=vec2(-delta.y,delta.x)/max(length(delta),0.001);
          vec4 clip=mix(a,b,uv.x);
          clip.xy+=perpendicular*(uv.y*2.0-1.0)*14.0/resolution*clip.w;
          gl_Position=clip;
          beamUV=uv;beamColor=color;beamTravel=travel;
        }`,
      fragmentShader:`
        uniform float time,intensity;
        varying vec2 beamUV;
        varying vec3 beamColor;
        varying float beamTravel;
        void main(){
          float side=abs(beamUV.y*2.0-1.0);
          float halo=exp(-side*side*5.0)*0.18;
          float core=exp(-side*side*95.0)*0.72;
          float pulse=pow(max(0.0,cos(beamTravel*9.0-time*2.0)),18.0);
          float endFade=pow(max(0.0,sin(beamUV.x*3.14159)),0.18);
          float alpha=(halo+core)*(0.65+0.35*pulse)*endFade*intensity;
          gl_FragColor=vec4(mix(beamColor,vec3(1.0),core*0.28),alpha);
          #include <encodings_fragment>
        }`,
      vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false,
    });
    this.mesh=new THREE.Mesh(this.geometry,this.material);
    this.mesh.frustumCulled=false;this.mesh.renderOrder=11;this.mesh.visible=false;
    scene.add(this.mesh);
  }
  update(positions,colors,count) {
    const corners=[[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]];
    const attrs=this.geometry.attributes;
    const segments=Math.min(count/2,this.capacity);
    let distance=0;
    for(let i=0;i<segments;i++) {
      const start=new THREE.Vector3().fromArray(positions,i*6);
      const end=new THREE.Vector3().fromArray(positions,i*6+3);
      const length=start.distanceTo(end);
      for(let j=0;j<6;j++) {
        const index=i*6+j;const [x,y]=corners[j];
        attrs.position.setXYZ(index,start.x,start.y,start.z);
        attrs.beamStart.setXYZ(index,start.x,start.y,start.z);
        attrs.beamEnd.setXYZ(index,end.x,end.y,end.z);
        attrs.color.setXYZ(index,colors[i*6],colors[i*6+1],colors[i*6+2]);
        attrs.uv.setXY(index,x,y);attrs.travel.setX(index,distance+x*length);
      }
      distance+=length;
    }
    for(const attr of Object.values(attrs)) attr.needsUpdate=true;
    this.geometry.setDrawRange(0,segments*6);
  }
}

function createFacetGlints(geometry) {
  const positions=[],normals=[];
  const p=geometry.attributes.position,n=geometry.attributes.normal;
  const stride=Math.max(1,Math.ceil(p.count/3/64));
  for(let i=0;i<p.count;i+=3*stride) {
    const normal=new THREE.Vector3().fromBufferAttribute(n,i);
    const center=new THREE.Vector3();
    for(let j=0;j<3;j++) center.add(new THREE.Vector3().fromBufferAttribute(p,i+j));
    center.multiplyScalar(1/3).addScaledVector(normal,.004);
    center.toArray(positions,positions.length);normal.toArray(normals,normals.length);
  }
  const points=new THREE.BufferGeometry();
  points.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  points.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  const material=new THREE.ShaderMaterial({
    uniforms:{lightDirection:{value:new THREE.Vector3()},strength:{value:.65},brightness:{value:1},pixelRatio:{value:1},time:{value:0}},
    vertexShader:`
      uniform vec3 lightDirection;
      uniform float strength,brightness,pixelRatio,time;
      varying float glint;
      void main(){
        vec4 world=modelMatrix*vec4(position,1.0);
        vec3 N=normalize(mat3(modelMatrix)*normal);
        vec3 V=normalize(cameraPosition-world.xyz);
        vec3 H=normalize(V+lightDirection);
        float alignment=pow(max(dot(N,H),0.0),22.0);
        glint=alignment*step(0.05,dot(N,V))*strength*brightness;
        glint*=0.88+0.12*sin(time+position.x*14.0);
        gl_Position=projectionMatrix*viewMatrix*world;
        gl_PointSize=(8.0+24.0*strength)*pixelRatio;
      }`,
    fragmentShader:`
      varying float glint;
      void main(){
        vec2 p=gl_PointCoord*2.0-1.0;
        float r=dot(p,p);
        float star=exp(-r*32.0)+0.35*exp(-min(p.x*p.x,p.y*p.y)*180.0)*exp(-r*5.0);
        float alpha=star*glint;
        if(alpha<0.005)discard;
        gl_FragColor=vec4(vec3(1.0,0.95,0.82),alpha);
        #include <encodings_fragment>
      }`,
    transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,
  });
  const glints=new THREE.Points(points,material);glints.renderOrder=9;
  return glints;
}
