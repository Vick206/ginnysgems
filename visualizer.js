// Parametric previews, not a GemCAD parser or optical ray tracer.
const GEM_MATERIALS = {
  diamond: { label: 'Diamond', color: 0xf5ead1 },
  sapphire: { label: 'Blue Sapphire', color: 0x356bdd },
  ruby: { label: 'Ruby', color: 0xc72346 },
  emerald: { label: 'Emerald', color: 0x219b68 },
  topaz: { label: 'Imperial Topaz', color: 0xe8a441 },
  aquamarine: { label: 'Aquamarine', color: 0x72cfde },
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
      rings.push([table+(1-table)*t, crown*(1-t)]);
    }
    rings.push([1,0], [1,-.035]);
    for (let i=1; i<steps; i++) {
      const t=i/steps;
      rings.push([1-t,-.035-pavilion*t]);
    }
    rings.push([.015,-.035-pavilion]);
    const vertices = [], indices = [];
    for (const [scale,y] of rings) for (const [x,z] of outline) vertices.push(x*scale,y,z*scale);
    for (let r=0; r<rings.length-1; r++) for(let i=0;i<count;i++) {
      const a=r*count+i, b=r*count+(i+1)%count, c=b+count, d=a+count;
      indices.push(a,b,c,a,c,d);
    }
    // Seal the table and culet. Winding faces outward on every surface.
    const top=vertices.length/3;
    vertices.push(0,crown,0);
    const bottom=vertices.length/3;
    vertices.push(0,-.035-pavilion,0);
    const last=(rings.length-1)*count;
    for(let i=0;i<count;i++) {
      const next=(i+1)%count;
      indices.push(top,next,i,bottom,last+i,last+next);
    }
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    indexed.setIndex(indices);
    // Separate triangle normals preserve crisp facets instead of smoothing rings.
    const geometry=indexed.toNonIndexed();
    indexed.dispose();
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

class GemVisualizer {
  constructor(canvas) {
    this.canvas=canvas;
    this.currentCut='brilliant';
    this.currentMaterial='diamond';
    this.currentStone='';
    this.rotationSpeed=0;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x102523);
    this.camera=new THREE.PerspectiveCamera(40,1,.1,100);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
    this.renderer.outputEncoding=THREE.sRGBEncoding;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.scene.add(new THREE.HemisphereLight(0xe7f5ff,0x24332a,.75));
    this.lights=[];
    for(const [position,intensity] of [[[3,5,4],1.4],[[-4,1,2],.8],[[1,-2,-4],1.1]]) {
      const light=new THREE.DirectionalLight(0xffffff,intensity);
      light.position.set(...position);
      this.scene.add(light);
      this.lights.push([light,intensity]);
    }
    this.group=new THREE.Group();
    this.scene.add(this.group);
    this.setCut(this.currentCut);
    this.setupControls();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.lastTime=null;
    this.animate=(time)=>{
      const dt=this.lastTime===null ? 0 : Math.min((time-this.lastTime)/1000,.1);
      this.lastTime=time;
      this.group.rotation.y+=dt*this.rotationSpeed/100;
      this.renderer.render(this.scene,this.camera);
      this.animation=requestAnimationFrame(this.animate);
    };
    this.animation=requestAnimationFrame(this.animate);
  }
  resize() {
    const {width,height}=this.canvas.parentElement.getBoundingClientRect();
    if(!width || !height) return;
    this.renderer.setSize(width,height,false);
    this.camera.aspect=width/height;
    this.camera.updateProjectionMatrix();
    this.fitDistance=Math.max(4, this.radius/Math.sin(THREE.MathUtils.degToRad(20))*1.15/Math.min(1,this.camera.aspect));
    this.camera.position.z=this.fitDistance*(this.zoom || 1);
  }
  setupControls() {
    let pointer=null, previous;
    this.canvas.addEventListener('pointerdown',e=>{
      if(pointer!==null) return;
      pointer=e.pointerId; previous=[e.clientX,e.clientY];
      this.canvas.setPointerCapture(pointer);
    });
    this.canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==pointer) return;
      this.group.rotation.y+=(e.clientX-previous[0])*.01;
      this.group.rotation.x+=(e.clientY-previous[1])*.01;
      previous=[e.clientX,e.clientY];
    });
    const stop=()=>{pointer=null;};
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
    this.gem=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:GEM_MATERIALS[this.currentMaterial].color,metalness:.18,roughness:.22,flatShading:true}));
    this.edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,1),new THREE.LineBasicMaterial({color:0xe6c581}));
    this.group.add(this.gem,this.edges);
    this.updateDisplay();
    this.resize();
    this.updateInfo();
  }
  updateDisplay() {
    this.gem.visible=document.querySelector('#show-facets').checked;
    this.edges.visible=document.querySelector('#show-wireframe').checked;
  }
  resetView() {
    this.zoom=1;
    this.group.rotation.set(.35, .4, 0);
    this.resize();
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
    for(const id of ['show-facets','show-wireframe']) document.querySelector(`#${id}`).addEventListener('change',()=>visualizer.updateDisplay());
    document.querySelector('#brightness').addEventListener('input',e=>{
      const value=Number(e.target.value);
      document.querySelector('#brightness-value').textContent=value;
      for(const [light,intensity] of visualizer.lights) light.intensity=intensity*value/100;
    });
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
