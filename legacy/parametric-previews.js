// Archived parametric demo engine. Load after visualizer.js and call initVisualizer()
// only with the archived interface; the public collection never loads this file.
Object.assign(GEM_MATERIALS, {
  diamond: { label: 'Diamond', color: 0xf5ead1, ior: 2.417, dispersion: .044 },
  sapphire: { label: 'Blue Sapphire', color: 0x356bdd, ior: 1.766 },
  ruby: { label: 'Ruby', color: 0xc72346, ior: 1.766 },
  emerald: { label: 'Emerald', color: 0x219b68, ior: 1.576 },
  topaz: { label: 'Imperial Topaz', color: 0xe8a441, ior: 1.62 },
  aquamarine: { label: 'Aquamarine', color: 0x72cfde, ior: 1.577 },
});
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

function initVisualizer() {
  // Public collection has its own on-demand initializer; retain the legacy demo.
  if(document.querySelector('#collection-page'))return;
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

// Compatibility hooks used only by the archived interface.
GemVisualizer.prototype.setCut=function(cut){
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
  };
GemVisualizer.prototype.selectStone=function(id){
    const stone=STONES[id];
    this.currentStone=stone ? id : '';
    this.currentMaterial=stone ? stone.material : 'diamond';
    document.querySelector('#gem-select').value=this.currentStone;
    this.setCut(stone ? stone.cut : 'brilliant');
  };
GemVisualizer.prototype.generateLegacyGeometry=function(){return GeometryGenerator.generate(this.currentCut,this.currentParams);};
GemVisualizer.prototype.updateLegacyInfo=function(){
    const stone=STONES[this.currentStone];
    document.querySelector('#stone-info').textContent=`${GEM_MATERIALS[this.currentMaterial].label}${stone ? ` · ${stone.carats} ct` : ''} · ${this.currentCut} preview. Parametric illustration; not measured stone geometry.${this.currentStone==='topaz-001' ? ' Fantasy cut data is unavailable; showing a brilliant preview.' : ''}`;
    document.querySelector('#facet-data').textContent=`${this.gem.geometry.attributes.position.count/3} mesh triangles. ${Object.entries(this.currentParams).map(([key,value])=>`${key}: ${value}`).join(' · ')}. Triangles are not a GemCAD facet count.`;
};
