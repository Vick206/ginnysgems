// Parametric previews with illustrative geometric rays, not a GemCAD parser.
const GEM_MATERIALS = {
  diamond: { label: 'Diamond', color: 0xf5ead1, ior: 2.417, dispersion: .044 },
  sapphire: { label: 'Blue Sapphire', color: 0x356bdd, ior: 1.766 },
  ruby: { label: 'Ruby', color: 0xc72346, ior: 1.766 },
  emerald: { label: 'Emerald', color: 0x219b68, ior: 1.576 },
  topaz: { label: 'Imperial Topaz', color: 0xe8a441, ior: 1.62 },
  aquamarine: { label: 'Aquamarine', color: 0x72cfde, ior: 1.577 },
};
const STONES = {
  'emerald-001': { material: 'emerald', cut: 'radiant', carats: 12.4 },
  'sapphire-001': { material: 'sapphire', cut: 'cushion', carats: 8.7 },
  'diamond-001': { material: 'diamond', cut: 'oval', carats: 5.2 },
  'ruby-001': { material: 'ruby', cut: 'oval', carats: 3.5 },
  'topaz-001': { material: 'topaz', cut: 'brilliant', carats: 9.1 },
  'aquamarine-001': { material: 'aquamarine', cut: 'emerald', carats: 15.3 },
};
const PARAMS = {
  brilliant: [ ['crownAngle', 'Crown angle', 25, 45, 1, 34], ['pavilionAngle', 'Pavilion angle', 35, 50, 0.1, 40.8], ['facets', 'Outline segments', 8, 32, 4, 16] ],
  emerald: [['facetsPerSide', 'Steps per side', 2, 6, 1, 3]],
  asscher: [['facetsPerSide', 'Steps per side', 2, 6, 1, 4]],
  radiant: [['facetRings', 'Facet rings', 2, 6, 1, 3]],
  cushion: [['facetsPerSide', 'Outline detail', 3, 8, 1, 4]],
  oval: [['lengthRatio', 'Length ratio', 1.1, 2, 0.1, 1.4]],
  marquise: [['lengthRatio', 'Length ratio', 1.5, 2.5, 0.1, 2]],
  pear: [['lengthRatio', 'Length ratio', 1.2, 2, 0.1, 1.5]],
};
const LIGHTING_PRESETS = {
  studio: { ambient: .22, key: 1.2, fill: .3, rim: .7, exposure: .9, keyColor: 0xffffff, fillColor: 0xffffff },
  daylight: { ambient: .45, key: .95, fill: .5, rim: .35, exposure: .95, keyColor: 0xfff5e8, fillColor: 0xe8f1ff },
  contrast: { ambient: .08, key: 1.5, fill: .08, rim: .85, exposure: .85, keyColor: 0xffffff, fillColor: 0xffffff },
};

// Normal points against the incoming direction; null means total internal reflection.
function refractRay(direction, normal, ratio) {
  const cosine=-direction.dot(normal);
  const discriminant=1-ratio*ratio*(1-cosine*cosine);
  if(discriminant<0) return null;
  return direction.clone().multiplyScalar(ratio)
    .addScaledVector(normal,ratio*cosine-Math.sqrt(discriminant)).normalize();
}

class GeometryGenerator {
  static generate(cut, params) {
    const stepCut = ['emerald', 'asscher', 'radiant'].includes(cut);
    const count = stepCut ? 8 : cut === 'cushion' ? params.facetsPerSide * 4 : (params.facets || 16);
    const outline = [];
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      let x = Math.cos(angle), z = Math.sin(angle);
      if (stepCut) {
        const corners = [[1,.7],[.7,1],[-.7,1],[-1,.7],[-1,-.7],[-.7,-1],[.7,-1],[1,-.7]];
        [x,z] = corners[i];
        if (cut === 'emerald') z *= 1.45;
      } else if (cut === 'cushion') {
        x = Math.sign(x) * Math.pow(Math.abs(x), .5);
        z = Math.sign(z) * Math.pow(Math.abs(z), .5);
      } else if (cut === 'oval') z *= params.lengthRatio;
      else if (cut === 'marquise') {
        x *= Math.abs(Math.cos(angle));
        z *= params.lengthRatio;
      } else if (cut === 'pear') {
        x *= (1 - .55 * z);
        z *= params.lengthRatio;
      }
      outline.push([x,z]);
    }
    const table = .55;
    const crown = (1 - table) * Math.tan((params.crownAngle || 34) * Math.PI / 180);
    const pavilion = Math.tan((params.pavilionAngle || 40.8) * Math.PI / 180);
    const rings = [[table,crown]];
    const steps = stepCut ? (params.facetsPerSide || params.facetRings || 3) : 1;
    for (let i=1; i<steps; i++) {
      const t=i/steps;
      rings.push([table+(1-table)*t, crown*Math.pow(1-t,.8)]);
    }
    rings.push([1,0], [1,-.035]);
    for (let i=1; i<steps; i++) {
      const t=i/steps;
      rings.push([1-t,-.035-pavilion*Math.pow(t,.8)]);
    }
    rings.push([.015,-.035-pavilion]);
    const vertices=[];
    const addRing=(scale,y,stride=1,offset=0)=>{
      for(let i=0;i<count;i+=stride) {
        const [x,z]=outline[(i+offset)%count];
        vertices.push(x*scale,y,z*scale);
      }
    };
    if(stepCut) for(const [scale,y] of rings)addRing(scale,y);
    else {
      // Alternating crown and pavilion tiers produce actual star/main facets.
      addRing(table,crown,2);
      addRing(.78,crown*.56,2,1);
      addRing(1,0);
      addRing(1,-.035);
      addRing(.52,-.035-pavilion*.56,2,1);
      addRing(.008,-.035-pavilion,2);
    }
    return buildGemHull(vertices);
  }
}

class GemVisualizer {
  constructor(canvas) {
    this.canvas=canvas;
    this.currentCut='brilliant';
    this.currentMaterial='diamond';
    this.currentStone='';
    this.rotationSpeed=0;
    this.transparency=.92;
    this.brilliance=.65;
    this.refractionStrength=1;
    this.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    this.scene=new THREE.Scene();
    this.scene.background=null;
    this.camera=new THREE.PerspectiveCamera(35,1,.1,100);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    if(!this.renderer.capabilities.isWebGL2 && !this.renderer.extensions.get('OES_texture_float')) {
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
    this.ambientLight=new THREE.HemisphereLight(0xffffff,0x303038,0);
    this.scene.add(this.ambientLight);
    this.lights=[];
    for(const position of [[-3,4,4],[4,-2,3],[2,3,-4]]) {
      const light=new THREE.DirectionalLight(0xffffff,0);
      light.position.set(...position);
      this.lightRig.add(light);
      this.lights.push(light);
    }
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
    this.setCut(this.currentCut);
    this.setupControls();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.studioPreview=new StudioPreview(this.renderer);
    this.lastTime=null;
    this.animate=(time)=>{
      const dt=this.lastTime===null ? 0 : Math.min((time-this.lastTime)/1000,.1);
      this.lastTime=time;
      this.group.rotation.y+=dt*this.rotationSpeed/100;
      const effectTime=this.reducedMotion.matches ? 0 : time/1000;
      this.rayGlow.material.uniforms.time.value=effectTime;
      if(this.glints) {
        this.glints.material.uniforms.time.value=effectTime;
        this.glints.material.uniforms.lightDirection.value.copy(this.lights[0].getWorldPosition(new THREE.Vector3())).normalize();
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
    this.animation=requestAnimationFrame(this.animate);
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
    this.scene.environment=cube;
    this.studioCube=cube;
  }
  resize() {
    const {width,height}=this.canvas.parentElement.getBoundingClientRect();
    if(!width || !height) return;
    this.renderer.setSize(width,height,false);
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
    const framing=this.rays?.visible ? 1.95 : 1.15;
    this.fitDistance=Math.max(4, this.radius/Math.sin(THREE.MathUtils.degToRad(17.5))*framing/Math.min(1,this.camera.aspect));
    this.camera.position.z=this.fitDistance*(this.zoom || 1);
    if(this.rayGlow) this.rayGlow.material.uniforms.resolution.value.set(width,height);
  }
  updateLighting() {
    const preset=LIGHTING_PRESETS[this.lightingPreset];
    this.renderer.toneMappingExposure=preset.exposure;
    this.ambientLight.intensity=preset.ambient*this.brightness;
    const intensities=[preset.key,preset.fill,preset.rim];
    const colors=[preset.keyColor,preset.fillColor,0xffffff];
    this.lights.forEach((light,i)=>{
      light.intensity=intensities[i]*this.brightness;
      light.color.setHex(colors[i]).convertSRGBToLinear();
    });
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
      this.zoom=THREE.MathUtils.clamp((this.zoom || 1)*Math.exp(e.deltaY*.001),.55,2.5);
      this.camera.position.z=this.fitDistance*this.zoom;
    },{passive:false});
  }
  setCut(cut) {
    this.currentCut=cut;
    this.currentParams=Object.fromEntries(PARAMS[cut].map(p=>[p[0],p[5]]));
    document.querySelector('#cut-select').value=cut;
    const container=document.querySelector('#params-container');
    container.innerHTML=PARAMS[cut].map(([key,label,min,max,step,value])=>`<div class="control-group"><label for="param-${key}">${label}</label><input id="param-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-param="${key}"><output for="param-${key}">${value}</output></div>`).join('');
    container.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{
      this.currentParams[input.dataset.param]=Number(input.value);
      input.nextElementSibling.textContent=input.value;
      this.generateGem();
    }));
    this.generateGem();
    this.resetView();
  }
  generateGem() {
    while(this.group.children.length) {
      const child=this.group.children[0];
      this.group.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }
    const geometry=GeometryGenerator.generate(this.currentCut,this.currentParams);
    const center=geometry.boundingSphere.center.clone();
    geometry.translate(-center.x,-center.y,-center.z);
    geometry.computeBoundingSphere();
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
    this.gem.material.transmission=this.transparency;
    this.updateOptics();
  }
  prepareStudioFrame() {
    if(!this.gem) return;
    this.scene.updateMatrixWorld(true);
    const uniforms=this.gem.material.uniforms;
    uniforms.gemWorld.value.copy(this.gem.matrixWorld);
    uniforms.localCamera.value.copy(this.camera.position).applyMatrix4(this.gem.matrixWorld.clone().invert());
    uniforms.lightDirection.value.copy(this.lights[0].getWorldPosition(new THREE.Vector3())).normalize();
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
    uniforms.bounceLimit.value=Number(document.querySelector('#render-quality')?.value || 8);
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
    this.zoom=1;
    this.group.rotation.set(1.05, .35, 0);
    this.resize();
    this.updateRays();
  }
  selectStone(id) {
    const stone=STONES[id];
    this.currentStone=stone ? id : '';
    this.currentMaterial=stone ? stone.material : 'diamond';
    document.querySelector('#gem-select').value=this.currentStone;
    this.setCut(stone ? stone.cut : 'brilliant');
  }
  updateInfo() {
    const stone=STONES[this.currentStone];
    document.querySelector('#stone-info').textContent=`${GEM_MATERIALS[this.currentMaterial].label}${stone ? ` · ${stone.carats} ct` : ''} · ${this.currentCut} preview. Parametric illustration; not measured stone geometry.${this.currentStone==='topaz-001' ? ' Fantasy cut data is unavailable; showing a brilliant preview.' : ''}`;
    document.querySelector('#facet-data').textContent=`${this.gem.geometry.attributes.position.count/3} mesh triangles. ${Object.entries(this.currentParams).map(([key,value])=>`${key}: ${value}`).join(' · ')}. Triangles are not a GemCAD facet count.`;
  }
}

function initVisualizer() {
  const loading=document.querySelector('#loading');
  try {
    if(typeof THREE==='undefined') throw new Error('Three.js failed to load.');
    const visualizer=new GemVisualizer(document.querySelector('#gem-canvas'));
    // Expose the preview for inspection in browser DevTools.
    window.gemVisualizer=visualizer;
    document.querySelector('#cut-select').addEventListener('change',e=>visualizer.setCut(e.target.value));
    document.querySelector('#gem-select').addEventListener('change',e=>visualizer.selectStone(e.target.value));
    for(const id of ['show-facets','show-wireframe','show-light-rays','show-glints']) document.querySelector(`#${id}`).addEventListener('change',()=>visualizer.updateDisplay());
    document.querySelector('#transparency').addEventListener('input',e=>{
      const value=Number(e.target.value);
      document.querySelector('#transparency-value').textContent=value;
      visualizer.transparency=value/100;
      visualizer.updateTransparency();
    });
    for(const [id,property] of [['brilliance','brilliance'],['refraction','refractionStrength']]) {
      document.querySelector(`#${id}`).addEventListener('input',e=>{
        const value=Number(e.target.value);
        document.querySelector(`#${id}-value`).textContent=value;
        visualizer[property]=value/100;
        visualizer.updateOptics();
        visualizer.updateRays();
      });
    }
    document.querySelector('#brightness').addEventListener('input',e=>{
      const value=Number(e.target.value);
      document.querySelector('#brightness-value').textContent=value;
      visualizer.brightness=value/100;
      visualizer.updateLighting();
    });
    document.querySelector('#lighting-preset').addEventListener('change',e=>{
      visualizer.lightingPreset=e.target.value;
      visualizer.updateLighting();
    });
    document.querySelector('#light-direction').addEventListener('input',e=>{
      const angle=Number(e.target.value);
      document.querySelector('#light-direction-value').textContent=angle;
      visualizer.lightRig.rotation.y=THREE.MathUtils.degToRad(angle);
      visualizer.updateOptics();
      visualizer.updateRays();
    });
    for(const id of ['render-quality','show-dispersion']) document.querySelector('#'+id).addEventListener('change',()=>visualizer.updateOptics());
    document.querySelector('#rotation-speed').addEventListener('input',e=>{visualizer.rotationSpeed=Number(e.target.value);});
    document.querySelector('#reset-view').addEventListener('click',()=>visualizer.resetView());
    document.querySelector('#download-data').addEventListener('click',()=>{
      const data={cut:visualizer.currentCut,material:visualizer.currentMaterial,parameters:visualizer.currentParams,preview:true};
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const a=document.createElement('a'); a.href=url; a.download=`gem-${visualizer.currentCut}.json`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    const id=new URLSearchParams(window.location.search).get('stone');
    if(STONES[id]) visualizer.selectStone(id);
    loading.style.display='none';
  } catch(error) {
    console.error(error);
    loading.textContent=`Unable to start the visualizer: ${error.message} Try a browser with WebGL enabled.`;
  }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initVisualizer);
else initVisualizer();
