// Studio cut renderer. Optional legacy compatibility lives in legacy/.
const GEM_MATERIALS = {}; // Populated from the selected studio stone.
const LIGHTING_PRESETS = {
  studio: { exposure: .9 },
  daylight: { exposure: .95 },
  contrast: { exposure: .85 },
};

// Normal points against the incoming direction; null means total internal reflection.
function refractRay(direction, normal, ratio) {
  const cosine=-direction.dot(normal);
  const discriminant=1-ratio*ratio*(1-cosine*cosine);
  if(discriminant<0) return null;
  return direction.clone().multiplyScalar(ratio)
    .addScaledVector(normal,ratio*cosine-Math.sqrt(discriminant)).normalize();
}

class GemVisualizer {
  constructor(canvas, sourceStone=null, sourceCut=null) {
    if(!sourceCut&&typeof this.setCut!=='function')throw new Error('A cut design is required; load the legacy adapter for demo cuts.');
    this.canvas=canvas;
    this.setSource(sourceStone,sourceCut);
    this.setAutoRotation(sourceStone && document.querySelector('#auto-rotate')?.checked);
    this.internalBounces=10;
    this.transparency=.92;
    this.brilliance=.65;
    this.refractionStrength=1;
    this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.scene=new THREE.Scene();
    this.scene.background=null;
    this.camera=new THREE.PerspectiveCamera(35,1,.1,100);
    // Geometry renders to sampled offscreen targets; canvas MSAA adds no edge AA.
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:true});
    this.viewportSize=new THREE.Vector2();
    this.inverseGemWorld=new THREE.Matrix4();
    this.lightDirection=new THREE.Vector3();
    if(!this.renderer.capabilities.isWebGL2 && !this.renderer.extensions.get('OES_texture_float')) {
      this.renderer.dispose();this.renderer.forceContextLoss();
      throw new Error('The studio renderer requires floating-point texture support.');
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
    this.renderer.outputEncoding=THREE.sRGBEncoding;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.createEnvironment();
    this.lightingPreset='studio';
    this.brightness=1;
    this.lightRig=new THREE.Group();
    this.scene.add(this.lightRig);
    // The custom optical shader uses the cubemap, not Three.js scene lights.
    // Keep one transform for the key direction used by rays and surface shading.
    const key=new THREE.Object3D();key.position.set(-3,4,4);
    this.lightRig.add(key);this.lights=[key];
    this.updateLighting();
    this.group=new THREE.Group();
    this.scene.add(this.group);
    this.raycaster=new THREE.Raycaster();
    this.opticalMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    this.rayPositions=new Float32Array(360);
    this.rayColors=new Float32Array(360);
    const rayGeometry=new THREE.BufferGeometry();
    rayGeometry.setAttribute('position',new THREE.BufferAttribute(this.rayPositions,3).setUsage(THREE.DynamicDrawUsage));
    rayGeometry.setAttribute('color',new THREE.BufferAttribute(this.rayColors,3).setUsage(THREE.DynamicDrawUsage));
    rayGeometry.setDrawRange(0,0);
    this.rays=new THREE.LineSegments(rayGeometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.9,depthTest:false,depthWrite:false,toneMapped:false}));
    this.rays.frustumCulled=false;
    this.rays.renderOrder=10;
    this.rays.visible=false;
    this.scene.add(this.rays);
    this.rayGlow=new RayGlow(this.scene);
    if(this.sourceCut){this.generateGem();this.resetView();}
    else this.setCut(this.currentCut);
    this.setupControls();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.studioPreview=new StudioPreview(this.renderer);
    this.lastTime=null;
    this.active=true;this.inViewport=true;this.animation=null;
    this.animate=(time)=>{
      this.animation=null;
      if(!this.active||!this.inViewport||document.visibilityState==='hidden')return;
      const dt=this.lastTime===null ? 0 : Math.max(0,(time-this.lastTime)/1000);
      this.lastTime=time;
      this.group.rotation.y+=dt*this.rotationSpeed/100;
      const effectTime=this.reducedMotion.matches ? 0 : time/1000;
      this.rayGlow.material.uniforms.time.value=effectTime;
      if(this.glints?.visible) {
        this.glints.material.uniforms.time.value=effectTime;
        this.glints.material.uniforms.lightDirection.value.copy(this.lights[0].getWorldPosition(this.lightDirection)).normalize();
      }
      if(this.rays.visible && (this.lastRayTime===undefined || time-this.lastRayTime>=33)) {
        this.updateRays();
        this.lastRayTime=time;
      }
      this.prepareStudioFrame();
      const uniforms=this.gem.material.uniforms;
      const signature=[this.gem.geometry.uuid,this.group.rotation.x,this.group.rotation.y,this.group.rotation.z,this.camera.position.z,this.transparency,this.brilliance,this.refractionStrength,this.brightness,this.lightingPreset,this.lightRig.rotation.y,uniforms.bounceLimit.value,uniforms.dispersion.value,this.gem.visible,this.edges.visible].join('|');
      const moving=this.dragging || this.rotationSpeed>0 || this.rays.visible || this.glints.visible;
      this.studioPreview.render(this.scene,this.camera,signature,moving);
      this.animation=requestAnimationFrame(this.animate);
    };
    this.onVisibilityChange=()=>this.syncAnimation();
    document.addEventListener('visibilitychange',this.onVisibilityChange);
    if(sourceStone&&!new URLSearchParams(location.search).has('bake')&&typeof IntersectionObserver!=='undefined'){
      this.visibilityObserver=new IntersectionObserver(entries=>{this.inViewport=entries[0].isIntersecting;this.syncAnimation();});
      this.visibilityObserver.observe(canvas);
    }
    this.syncAnimation();
  }
  syncAnimation(){
    if(this.active&&this.inViewport&&document.visibilityState!=='hidden'){
      if(this.animation===null)this.animation=requestAnimationFrame(this.animate);
    }else{
      if(this.animation!==null)cancelAnimationFrame(this.animation);
      this.animation=null;this.lastTime=null;
    }
  }
  suspend(){this.active=false;this.syncAnimation();}
  resume(){this.active=true;this.lastTime=null;this.syncAnimation();}
  setSource(stone,cut){
    this.sourceStone=stone;this.sourceCut=cut;
    this.currentCut=cut ? cut.id : 'brilliant';this.currentMaterial=stone ? stone.material : 'diamond';this.currentStone=stone ? stone.id : '';
    if(stone)GEM_MATERIALS[stone.material]={label:stone.name,color:stone.color,ior:stone.ior};
  }
  useStone(stone,cut){
    const sameCut=this.gem&&this.sourceCut?.id===cut.id;
    const previousStone=this.sourceStone,previousCut=this.sourceCut;
    this.setSource(stone,cut);
    try{
      if(sameCut){this.updateOptics();this.updateInfo();}else this.generateGem();
    }catch(error){
      this.setSource(previousStone,previousCut);
      throw error;
    }
    this.resetView();
  }
  setAutoRotation(enabled){this.rotationSpeed=enabled ? 100*2*Math.PI/40 : 0;}
  setZoom(value){
    this.zoom=THREE.MathUtils.clamp(value,.55,2.5);
    this.camera.position.z=this.fitDistance*this.zoom;
  }
  createEnvironment() {
    // An asymmetric studio: broad key softbox, narrow fill, rim, and overhead card.
    const cards=[
      {position:[-3,4,4],width:.55,height:.65,energy:.95},
      {position:[4,1,2],width:.18,height:.75,energy:.65},
      {position:[-2,3,-4],width:.65,height:.35,energy:.85},
      {position:[0,6,.1],width:.65,height:.65,energy:.55},
    ].map(card=>{
      const normal=new THREE.Vector3(...card.position).normalize();
      const up=Math.abs(normal.y)>.98 ? new THREE.Vector3(0,0,1) : new THREE.Vector3(0,1,0);
      const right=new THREE.Vector3().crossVectors(up,normal).normalize();
      return {...card,normal,right,up:new THREE.Vector3().crossVectors(normal,right).normalize()};
    });
    const faces=Array.from({length:6},(_,face)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
      const ctx=canvas.getContext('2d');const pixels=ctx.createImageData(256,256);
      for(let y=0;y<256;y++)for(let x=0;x<256;x++) {
        const u=(x+.5)/128-1,v=(y+.5)/128-1;
        const coordinates=[[1,-v,-u],[-1,-v,u],[u,1,v],[u,-1,-v],[u,-v,1],[-u,-v,-1]][face];
        const direction=new THREE.Vector3(...coordinates).normalize();
        let radiance=direction.y<-.25 ? .025 : .045;
        for(const card of cards) {
          const facing=direction.dot(card.normal);
          if(facing<=0)continue;
          const horizontal=Math.abs(direction.dot(card.right)/facing/card.width);
          const vertical=Math.abs(direction.dot(card.up)/facing/card.height);
          const edge=Math.max(horizontal,vertical);
          if(edge<1)radiance+=card.energy*(1-THREE.MathUtils.smoothstep(edge,.88,1));
        }
        const color=Math.round(Math.pow(Math.min(radiance,1),1/2.2)*255);
        const offset=(y*256+x)*4;
        pixels.data[offset]=color;pixels.data[offset+1]=color;pixels.data[offset+2]=color;pixels.data[offset+3]=255;
      }
      ctx.putImageData(pixels,0,0);return canvas;
    });
    const cube=new THREE.CubeTexture(faces);cube.encoding=THREE.sRGBEncoding;cube.needsUpdate=true;
    cube.generateMipmaps=true;cube.minFilter=THREE.LinearMipmapLinearFilter;
    this.studioCube=cube;
  }
  resize() {
    const {width,height}=this.canvas.parentElement.getBoundingClientRect();
    if(!width || !height) return;
    const size=this.renderer.getSize(this.viewportSize);
    if(size.x!==width||size.y!==height)this.renderer.setSize(width,height,false);
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
    const framing=this.rays?.visible ? 1.95 : 1.15;
    this.fitDistance=Math.max(4, this.radius/Math.sin(THREE.MathUtils.degToRad(17.5))*framing/Math.min(1,this.camera.aspect));
    this.setZoom(this.zoom || 1);
    if(this.rayGlow) this.rayGlow.material.uniforms.resolution.value.set(width,height);
  }
  updateLighting() {
    const preset=LIGHTING_PRESETS[this.lightingPreset];
    this.renderer.toneMappingExposure=preset.exposure;
    if(this.gem) this.updateOptics();
    if(this.rays) {
      this.rays.material.opacity=.18*Math.min(this.brightness,1);
      this.rayGlow.material.uniforms.intensity.value=.85*Math.min(this.brightness,1);
      this.updateRays();
    }
  }
  setupControls() {
    let pointer=null, previous;
    this.canvas.addEventListener('pointerdown',e=>{
      if(pointer!==null) return;
      pointer=e.pointerId; previous=[e.clientX,e.clientY];
      this.dragging=true;
      this.canvas.setPointerCapture(pointer);
    });
    this.canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==pointer) return;
      this.group.rotation.y+=(e.clientX-previous[0])*.01;
      this.group.rotation.x+=(e.clientY-previous[1])*.01;
      previous=[e.clientX,e.clientY];
    });
    const stop=()=>{pointer=null;this.dragging=false;};
    this.canvas.addEventListener('pointerup',stop);
    this.canvas.addEventListener('pointercancel',stop);
    this.canvas.addEventListener('lostpointercapture',stop);
    this.canvas.addEventListener('wheel',e=>{
      e.preventDefault();
      this.setZoom((this.zoom || 1)*Math.exp(e.deltaY*.001));
    },{passive:false});
  }
  generateGem() {
    // Validate/build the replacement before disposing the last usable mesh.
    const geometry=this.sourceCut ? geometryFromCut(this.sourceCut) : this.generateLegacyGeometry();
    centerGemGeometry(geometry);
    while(this.group.children.length) {
      const child=this.group.children[0];
      this.group.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
    this.radius=geometry.boundingSphere.radius;
    this.gem=new THREE.Mesh(geometry,createStudioGemMaterial(geometry,this.studioCube));
    this.opticalMesh=new THREE.Mesh(geometry,this.opticalMaterial);
    this.edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,1),new THREE.LineBasicMaterial({color:0xe6c581}));
    this.group.add(this.gem,this.edges);
    this.glints=createFacetGlints(geometry);
    this.group.add(this.glints);
    this.updateOptics();
    this.updateDisplay();
    this.resize();
    this.updateInfo();
    this.updateRays();
  }
  updateDisplay() {
    this.studioPreview?.invalidate();
    this.gem.visible=document.querySelector('#show-facets').checked;
    this.edges.visible=document.querySelector('#show-wireframe').checked;
    this.glints.visible=this.gem.visible && this.brilliance>0 && document.querySelector('#show-glints').checked;
    this.rays.visible=document.querySelector('#show-light-rays').checked;
    this.rayGlow.mesh.visible=this.rays.visible;
    document.querySelector('#ray-legend').hidden=!this.rays.visible;
    this.updateRays();
    this.resize();
  }
  updateTransparency() {
    this.updateOptics();
  }
  prepareStudioFrame() {
    if(!this.gem) return;
    this.scene.updateMatrixWorld(true);
    const uniforms=this.gem.material.uniforms;
    uniforms.gemWorld.value.copy(this.gem.matrixWorld);
    uniforms.localCamera.value.copy(this.camera.position).applyMatrix4(this.inverseGemWorld.copy(this.gem.matrixWorld).invert());
    uniforms.lightDirection.value.copy(this.lights[0].getWorldPosition(this.lightDirection)).normalize();
  }
  updateOptics() {
    if(!this.gem) return;
    this.studioPreview?.invalidate();
    const material=this.gem.material;
    const uniforms=material.uniforms;
    const properties=GEM_MATERIALS[this.currentMaterial];
    const color=new THREE.Color(properties.color).convertSRGBToLinear();
    uniforms.gemIOR.value=properties.ior;
    uniforms.transmission.value=this.transparency;
    uniforms.refractionStrength.value=this.refractionStrength;
    uniforms.brilliance.value=this.brilliance;
    uniforms.brightness.value=this.brightness;
    uniforms.bodyColor.value.copy(color);
    // Beer-Lambert absorption is scaled to the preview's arbitrary model units.
    const density=this.currentMaterial==='diamond' ? .18 : .42;
    uniforms.absorption.value.set(-Math.log(Math.max(color.r,.015))*density,-Math.log(Math.max(color.g,.015))*density,-Math.log(Math.max(color.b,.015))*density);
    uniforms.bounceLimit.value=Number(document.querySelector('#render-quality')?.value || this.internalBounces);
    uniforms.dispersion.value=document.querySelector('#show-dispersion')?.checked ? (properties.dispersion || .018) : 0;
    uniforms.studioRotation.value=this.lightRig.rotation.y;
    uniforms.studioMode.value=['studio','daylight','contrast'].indexOf(this.lightingPreset);
    if(this.glints) {
      this.glints.visible=this.gem.visible && this.brilliance>0 && document.querySelector('#show-glints').checked;
      this.glints.material.uniforms.strength.value=this.brilliance*.35;
      this.glints.material.uniforms.brightness.value=Math.min(this.brightness,1.5);
      this.glints.material.uniforms.pixelRatio.value=this.renderer.getPixelRatio();
    }
    this.prepareStudioFrame();
  }
  updateRays() {
    if(!this.rays?.visible || !this.opticalMesh) return;
    this.scene.updateMatrixWorld(true);
    this.opticalMesh.matrixWorld.copy(this.gem.matrixWorld);
    const normalMatrix=new THREE.Matrix3().getNormalMatrix(this.opticalMesh.matrixWorld);
    const incoming=this.lights[0].getWorldPosition(new THREE.Vector3()).normalize().negate();
    const u=new THREE.Vector3().crossVectors(incoming,new THREE.Vector3(0,1,0)).normalize();
    const v=new THREE.Vector3().crossVectors(incoming,u).normalize();
    const ior=1+(GEM_MATERIALS[this.currentMaterial].ior-1)*this.refractionStrength;
    const epsilon=this.radius*1e-4;
    let cursor=0;
    const palette={incoming:0xf5cc79,inside:0x72e4ff,reflection:0xff90c1,exit:0xaff0bd};
    const segment=(a,b,type)=>{
      const color=new THREE.Color(palette[type]).convertSRGBToLinear();
      for(const point of [a,b]) {
        point.toArray(this.rayPositions,cursor);
        color.toArray(this.rayColors,cursor);
        cursor+=3;
      }
    };
    this.rayStats={entered:0,exited:0,reflections:0,truncated:0};
    for(const [x,y] of [[0,0],[-.22,0],[.22,0],[0,-.22],[0,.22]]) {
      const origin=incoming.clone().multiplyScalar(-this.radius*1.6).addScaledVector(u,x*this.radius).addScaledVector(v,y*this.radius);
      this.raycaster.set(origin,incoming);
      const entry=this.raycaster.intersectObject(this.opticalMesh,false)[0];
      if(!entry) continue;
      this.rayStats.entered++;
      segment(origin,entry.point,'incoming');
      const entryNormal=entry.face.normal.clone().applyMatrix3(normalMatrix).normalize();
      if(entryNormal.dot(incoming)>0) entryNormal.negate();
      let direction=refractRay(incoming,entryNormal,1/ior);
      let point=entry.point;
      let type='inside';
      for(let bounce=0;bounce<8;bounce++) {
        this.raycaster.set(point.clone().addScaledVector(direction,epsilon),direction);
        const hit=this.raycaster.intersectObject(this.opticalMesh,false).find(h=>h.distance>epsilon);
        if(!hit) break;
        segment(point,hit.point,type);
        const normal=hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
        if(normal.dot(direction)>0) normal.negate();
        const outgoing=refractRay(direction,normal,ior);
        if(outgoing) {
          segment(hit.point,hit.point.clone().addScaledVector(outgoing,this.radius*.85),'exit');
          this.rayStats.exited++;
          break;
        }
        direction=direction.clone().reflect(normal).normalize();
        this.rayStats.reflections++;
        point=hit.point;
        type='reflection';
        if(bounce===7) this.rayStats.truncated++;
      }
    }
    this.rays.geometry.setDrawRange(0,cursor/3);
    this.rays.geometry.attributes.position.needsUpdate=true;
    this.rays.geometry.attributes.color.needsUpdate=true;
    this.rayGlow.update(this.rayPositions,this.rayColors,cursor/3);
  }
  resetView() {
    this.zoom=this.sourceCut ? .55 : 1;
    this.group.rotation.set(this.sourceCut ? 0 : 1.05, .35, 0);
    this.resize();
    this.updateRays();
  }
  updateInfo() {
    if(this.sourceStone){
      const cut=this.sourceCut;
      document.querySelector('#stone-info').textContent=`${cut.designer ? 'Designer: '+cut.designer : 'Design: '+cut.sourceTitle} | Material IOR: ${this.sourceStone.ior} | Design IOR: ${cut.designIor}`;
      document.querySelector('#facet-data').textContent=`${this.gem.geometry.userData.designFacets.length} facets | ${cut.indexGear}-index design`;
      return;
    }
    this.updateLegacyInfo();
  }
}
