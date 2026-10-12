// Incremental convex hull: the optical volume and the visible facets share a surface.
function buildGemHull(coordinates) {
  const points=[];const unique=new Set();
  for(let i=0;i<coordinates.length;i+=3) {
    const p=new THREE.Vector3().fromArray(coordinates,i);
    const key=p.toArray().map(n=>n.toFixed(7)).join(',');
    if(!unique.has(key)){unique.add(key);points.push(p);}
  }
  const a=0;
  let b=1,c=2,d=3;
  for(let i=0;i<points.length;i++)if(points[i].distanceToSquared(points[a])>points[b].distanceToSquared(points[a]))b=i;
  const axis=points[b].clone().sub(points[a]);
  let area=-1;
  for(let i=0;i<points.length;i++) {
    const size=new THREE.Vector3().crossVectors(axis,points[i].clone().sub(points[a])).lengthSq();
    if(size>area){area=size;c=i;}
  }
  const initialNormal=new THREE.Vector3().crossVectors(axis,points[c].clone().sub(points[a])).normalize();
  let separation=-1;
  for(let i=0;i<points.length;i++) {
    const distance=Math.abs(initialNormal.dot(points[i].clone().sub(points[a])));
    if(distance>separation){separation=distance;d=i;}
  }
  if(separation<1e-7)throw new Error('Gem geometry must enclose a volume.');
  const inside=points[a].clone().add(points[b]).add(points[c]).add(points[d]).multiplyScalar(.25);
  const face=(i,j,k)=>{
    let normal=new THREE.Vector3().crossVectors(points[j].clone().sub(points[i]),points[k].clone().sub(points[i])).normalize();
    if(normal.dot(inside.clone().sub(points[i]))>0){[j,k]=[k,j];normal.negate();}
    return {indices:[i,j,k],normal,distance:normal.dot(points[i])};
  };
  let faces=[face(a,b,c),face(a,d,b),face(a,c,d),face(b,d,c)];
  for(let i=0;i<points.length;i++) {
    if([a,b,c,d].includes(i))continue;
    const visible=faces.filter(f=>f.normal.dot(points[i])-f.distance>1e-7);
    if(!visible.length)continue;
    const boundary=new Map();
    for(const f of visible)for(let j=0;j<3;j++) {
      const from=f.indices[j],to=f.indices[(j+1)%3];
      const reverse=`${to},${from}`;
      if(boundary.has(reverse))boundary.delete(reverse);else boundary.set(`${from},${to}`,[from,to]);
    }
    faces=faces.filter(f=>!visible.includes(f));
    for(const [from,to] of boundary.values())faces.push(face(from,to,i));
  }
  const vertices=[];
  for(const f of faces)for(const i of f.indices)points[i].toArray(vertices,vertices.length);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

function getGemPlanes(geometry) {
  const planes=[];const p=geometry.attributes.position,n=geometry.attributes.normal;
  for(let i=0;i<p.count;i+=3) {
    const normal=new THREE.Vector3().fromBufferAttribute(n,i);
    const distance=normal.dot(new THREE.Vector3().fromBufferAttribute(p,i));
    if(!planes.some(q=>normal.dot(new THREE.Vector3(q.x,q.y,q.z))>1-1e-6 && Math.abs(distance-q.w)<1e-5)) {
      planes.push(new THREE.Vector4(normal.x,normal.y,normal.z,distance));
    }
  }
  if(planes.length>256)throw new Error('Gem exceeds the studio renderer facet limit.');
  const count=planes.length;
  while(planes.length<256)planes.push(new THREE.Vector4());
  return {planes,count};
}

// A bounded RGB ray tracer for convex preview gems. No screen-space alpha trick.
function createStudioGemMaterial(geometry,cube) {
  const {planes,count}=getGemPlanes(geometry);
  const planeData=new Float32Array(256*4);
  planes.forEach((plane,i)=>plane.toArray(planeData,i*4));
  const facetTexture=new THREE.DataTexture(planeData,256,1,THREE.RGBAFormat,THREE.FloatType);
  facetTexture.minFilter=facetTexture.magFilter=THREE.NearestFilter;
  facetTexture.needsUpdate=true;
  const material=new THREE.ShaderMaterial({
    uniforms:{
      studioCube:{value:cube},facetTexture:{value:facetTexture},facetCount:{value:count},
      localCamera:{value:new THREE.Vector3()},gemWorld:{value:new THREE.Matrix4()},
      gemIOR:{value:1.5},absorption:{value:new THREE.Vector3()},bodyColor:{value:new THREE.Color()},
      transmission:{value:.92},refractionStrength:{value:1},brilliance:{value:.65},
      brightness:{value:1},studioRotation:{value:0},bounceLimit:{value:8},
      lightDirection:{value:new THREE.Vector3(-3,4,4).normalize()},radius:{value:geometry.boundingSphere.radius},
      dispersion:{value:0},studioMode:{value:0},
    },
    vertexShader:`
      varying vec3 localPoint,facetNormal;
      void main(){
        localPoint=position;facetNormal=normal;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader:`
      uniform samplerCube studioCube;
      uniform sampler2D facetTexture;
      uniform int facetCount,bounceLimit;
      uniform vec3 localCamera,absorption,bodyColor,lightDirection;
      uniform mat4 gemWorld;
      uniform float gemIOR,transmission,refractionStrength,brilliance,brightness,studioRotation,radius,dispersion,studioMode;
      varying vec3 localPoint,facetNormal;
      vec3 environment(vec3 direction){
        vec3 world=normalize(mat3(gemWorld)*direction);
        float c=cos(studioRotation),s=sin(studioRotation);
        world=vec3(c*world.x-s*world.z,world.y,s*world.x+c*world.z);
        world.x=-world.x;
        vec3 value=pow(textureCube(studioCube,world,(1.0-brilliance)*2.2).rgb,vec3(2.2));
        if(studioMode>0.5 && studioMode<1.5)value=mix(value,vec3(0.32),0.22)*vec3(1.03,1.0,0.96);
        if(studioMode>1.5)value=pow(value,vec3(1.25));
        return value*3.2*brightness;
      }
      float fresnel(float cosine,float fromIOR,float toIOR){
        if(abs(fromIOR-toIOR)<0.000001)return 0.0;
        float sineSquared=pow(fromIOR/toIOR,2.0)*max(0.0,1.0-cosine*cosine);
        if(sineSquared>=1.0)return 1.0;
        float transmittedCosine=sqrt(1.0-sineSquared);
        float rs=(fromIOR*cosine-toIOR*transmittedCosine)/(fromIOR*cosine+toIOR*transmittedCosine);
        float rp=(toIOR*cosine-fromIOR*transmittedCosine)/(toIOR*cosine+fromIOR*transmittedCosine);
        return 0.5*(rs*rs+rp*rp);
      }
      float nextFacet(vec3 point,vec3 direction,out vec3 normal){
        float nearest=1.0e6;
        normal=vec3(0.0);
        for(int i=0;i<256;i++){
          if(i>=facetCount)break;
          vec4 plane=texture2D(facetTexture,vec2((float(i)+0.5)/256.0,0.5));
          float denominator=dot(plane.xyz,direction);
          if(denominator>0.00001){
            float distance=(plane.w-dot(plane.xyz,point))/denominator;
            if(distance>radius*0.00001 && distance<nearest){nearest=distance;normal=plane.xyz;}
          }
        }
        return nearest;
      }
      vec3 traceVolume(vec3 incident,vec3 entryNormal,float ior){
        float entryReflectance=fresnel(max(0.0,-dot(incident,entryNormal)),1.0,ior);
        vec3 radiance=environment(reflect(incident,entryNormal))*entryReflectance;
        vec3 throughput=vec3(1.0-entryReflectance);
        vec3 direction=normalize(refract(incident,entryNormal,1.0/ior));
        vec3 point=localPoint+direction*radius*0.0002;
        for(int bounce=0;bounce<10;bounce++){
          if(bounce>=bounceLimit)break;
          vec3 normal;
          float distance=nextFacet(point,direction,normal);
          if(distance>1.0e5)break;
          throughput*=exp(-absorption*distance/radius);
          point+=direction*distance;
          float reflectance=fresnel(max(0.0,dot(direction,normal)),ior,1.0);
          vec3 exiting=refract(direction,-normal,ior);
          if(reflectance<1.0){
            radiance+=throughput*(1.0-reflectance)*environment(normalize(exiting));
          }
          throughput*=reflectance;
          if(max(max(throughput.r,throughput.g),throughput.b)<0.008)break;
          direction=normalize(reflect(direction,normal));
          point+=direction*radius*0.0002;
        }
        return radiance;
      }
      void main(){
        vec3 incident=normalize(localPoint-localCamera);
        vec3 normal=normalize(facetNormal);
        if(dot(incident,normal)>0.0)normal=-normal;
        float ior=1.0+(gemIOR-1.0)*refractionStrength;
        vec3 volume;
        if(transmission<0.001)volume=vec3(0.0);
        else if(dispersion>0.0001 && refractionStrength>0.001){
          volume=vec3(traceVolume(incident,normal,max(1.0,ior-dispersion*0.5*refractionStrength)).r,
                      traceVolume(incident,normal,ior).g,
                      traceVolume(incident,normal,ior+dispersion*0.5*refractionStrength).b);
        }else volume=traceVolume(incident,normal,ior);
        vec3 worldNormal=normalize(mat3(gemWorld)*normal);
        float surfaceLight=0.12+0.88*max(dot(worldNormal,lightDirection),0.0);
        float reflection=fresnel(max(0.0,-dot(incident,normal)),1.0,ior);
        vec3 opaque=bodyColor*surfaceLight*brightness*0.5+environment(reflect(incident,normal))*reflection;
        vec3 radiance=mix(opaque,volume,transmission);
        // The control tunes polish/contrast, not an extra coating or emitted glitter.
        radiance=mix(radiance*0.85,radiance,brilliance);
        gl_FragColor=vec4(radiance,1.0);
        #include <tonemapping_fragment>
        #include <encodings_fragment>
      }`,
    toneMapped:true,depthWrite:true,
  });
  // Compatibility with the existing control model; uniforms drive the shader.
  material.transmission=.92;material.opacity=1;
  material.addEventListener('dispose',()=>facetTexture.dispose());
  return material;
}

// Accumulate subpixel views while still; reset immediately when the view changes.
class StudioPreview {
  constructor(renderer) {
    this.renderer=renderer;this.samples=0;this.signature='';this.width=0;this.height=0;
    const options={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};
    this.sample=new THREE.WebGLRenderTarget(1,1,{...options,depthBuffer:true});
    this.history=[new THREE.WebGLRenderTarget(1,1,options),new THREE.WebGLRenderTarget(1,1,options)];
    this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.scene=new THREE.Scene();
    this.material=new THREE.ShaderMaterial({
      uniforms:{current:{value:null},previous:{value:null},weight:{value:1}},
      vertexShader:'varying vec2 texUV;void main(){texUV=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:`
        uniform sampler2D current,previous;
        uniform float weight;
        varying vec2 texUV;
        void main(){
          vec4 fresh=texture2D(current,texUV);
          gl_FragColor=weight>=1.0 ? fresh : mix(texture2D(previous,texUV),fresh,weight);
          #include <encodings_fragment>
        }`,
      depthTest:false,depthWrite:false,toneMapped:false,
    });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
  }
  invalidate() {this.samples=0;this.signature='';}
  render(scene,camera,signature,moving) {
    const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const scale=moving ? .65 : 1;
    const width=Math.max(1,Math.round(size.x*scale)),height=Math.max(1,Math.round(size.y*scale));
    if(width!==this.width || height!==this.height) {
      this.width=width;this.height=height;
      this.sample.setSize(width,height);this.history.forEach(target=>target.setSize(width,height));
      this.signature='';
    }
    if(signature!==this.signature || moving){this.samples=0;this.signature=signature;}
    if(this.samples>=12)return;
    const halton=(index,base)=>{let value=0,fraction=1;while(index){fraction/=base;value+=fraction*(index%base);index=Math.floor(index/base);}return value;};
    if(!moving)camera.setViewOffset(this.width,this.height,halton(this.samples+1,2)-.5,halton(this.samples+1,3)-.5,this.width,this.height);
    try {
      this.renderer.setRenderTarget(this.sample);this.renderer.render(scene,camera);
      const output=this.history[this.samples%2],previous=this.history[(this.samples+1)%2];
      const uniforms=this.material.uniforms;
      uniforms.current.value=this.sample.texture;uniforms.previous.value=previous.texture;uniforms.weight.value=1/(this.samples+1);
      this.renderer.setRenderTarget(output);this.renderer.render(this.scene,this.camera);
      uniforms.current.value=output.texture;uniforms.weight.value=1;
      this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
      this.samples++;
    } finally {
      camera.clearViewOffset();this.renderer.setRenderTarget(null);
    }
  }
}
