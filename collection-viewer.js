const collectionSelect=document.querySelector('#collection-select');
let collectionRenderer=null,selectedStone=null,loadPromise=null,selectionVersion=0;
const loadedRendererScripts=new Set();
const cutRequests=new Map();
const byId=id=>document.getElementById(id);
const automaticRendering=!new URLSearchParams(location.search).has('bake');
const pendingReasons={
  'offsets-required':'The design angles are documented. A matching model is in preparation while facet offsets are reconstructed and checked.',
  'pattern-required':'The sunstone pattern is still required. The finished design is needed before a render can be shown.',
};
for(const stone of STUDIO_CATALOG){const option=document.createElement('option');option.value=stone.id;option.textContent=`${stone.name} — ${stone.cutName}`;collectionSelect.append(option);}

function selectCollectionStone(id,updateUrl=true){
  selectionVersion++;
  const requested=STUDIO_CATALOG.find(stone=>stone.id===id);
  selectedStone=requested||STUDIO_CATALOG[0];
  collectionSelect.value=selectedStone.id;
  byId('collection-notice').textContent=id&&!requested?'That previous catalog entry is unavailable. Showing the current studio collection.':'';
  byId('collection-name').textContent=selectedStone.name;
  byId('collection-description').textContent=selectedStone.description;
  byId('collection-cut').textContent=`Cut: ${selectedStone.cutName}`;
  byId('stone-info').textContent=selectedStone.render ? '' : 'Design details in preparation.';
  byId('facet-data').textContent='';
  byId('render-status').textContent=selectedStone.render ? 'Preparing cut render...' : pendingReasons[selectedStone.status];
  byId('render-thumbnail').replaceChildren();
  if(selectedStone.render){const image=document.createElement('img');image.src=selectedStone.render;image.alt=`${selectedStone.cutName} cut render`;image.width=384;image.height=384;image.addEventListener('error',()=>image.remove());byId('render-thumbnail').append(image);}
  byId('start-render').hidden=true;byId('start-render').disabled=false;
  byId('start-render').textContent='Retry cut render';
  byId('live-render').hidden=true;byId('render-controls').hidden=true;
  if(collectionRenderer)collectionRenderer.suspend();
  if(updateUrl){const url=new URL(location.href);url.searchParams.set('stone',selectedStone.id);history.replaceState(null,'',url);}
  if(selectedStone.render&&automaticRendering)void startCollectionRender();
}
collectionSelect.addEventListener('change',()=>selectCollectionStone(collectionSelect.value));
window.addEventListener('popstate',()=>selectCollectionStone(new URLSearchParams(location.search).get('stone'),false));

function loadRenderer(){
  if(!loadPromise)loadPromise=(async()=>{
    for(const src of ['three.min.js','optics-effects.js','studio-renderer.js','cut-geometry.js','visualizer.js']){
      if(loadedRendererScripts.has(src))continue;
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=()=>{loadedRendererScripts.add(src);resolve();};script.onerror=()=>{script.remove();reject(new Error('Unable to load renderer files.'));};document.body.append(script);});
    }
  })().catch(error=>{loadPromise=null;throw error;});
  return loadPromise;
}
async function startCollectionRender(){
  const stone=selectedStone,version=selectionVersion;
  if(!stone.render)return;
  byId('start-render').hidden=true;
  byId('start-render').disabled=true;byId('start-render').textContent='Preparing cut render…';
  try{
    if(!cutRequests.has(stone.cutId)){
      cutRequests.set(stone.cutId,fetch(`data/cuts/${stone.cutId}.json`).then(response=>{
        if(!response.ok)throw new Error('The cut data is unavailable.');
        return response.json();
      }).catch(error=>{cutRequests.delete(stone.cutId);throw error;}));
    }
    const [cut]=await Promise.all([cutRequests.get(stone.cutId),loadRenderer()]);
    if(version!==selectionVersion)return;
    byId('live-render').hidden=false;byId('render-controls').hidden=false;
    if(!collectionRenderer){
      collectionRenderer=new GemVisualizer(byId('gem-canvas'),stone,cut);window.gemVisualizer=collectionRenderer;
      wireCollectionControls(collectionRenderer);
    }else{
      if(collectionRenderer.currentStone!==stone.id){
        collectionRenderer.useStone(stone,cut);
      }
      collectionRenderer.resize();collectionRenderer.studioPreview.invalidate();collectionRenderer.resume();
    }
    collectionRenderer.updateInfo();
    byId('start-render').hidden=true;byId('render-thumbnail').replaceChildren();
    byId('render-status').textContent='Interactive cut render - '+stone.cutName;
  }catch(error){
    if(version!==selectionVersion)return;
    cutRequests.delete(stone.cutId);
    if(collectionRenderer)collectionRenderer.suspend();
    byId('live-render').hidden=true;byId('render-controls').hidden=true;
    byId('render-status').textContent=`${error.message} The baked cut render and details remain available. Try again in a browser with WebGL enabled.`;
    byId('start-render').hidden=false;byId('start-render').disabled=false;byId('start-render').textContent='Retry cut render';
  }
}
byId('start-render').addEventListener('click',startCollectionRender);

function wireCollectionControls(viewer){
  for(const id of ['show-facets','show-wireframe','show-light-rays','show-glints'])byId(id).addEventListener('change',()=>viewer.updateDisplay());
  byId('transparency').addEventListener('input',event=>{const value=Number(event.target.value);byId('transparency-value').textContent=value;viewer.transparency=value/100;viewer.updateTransparency();viewer.updateRays();});
  byId('lighting-preset').addEventListener('change',event=>{viewer.lightingPreset=event.target.value;viewer.updateLighting();});
  byId('light-direction').addEventListener('input',event=>{const angle=Number(event.target.value);byId('light-direction-value').textContent=angle;viewer.lightRig.rotation.y=THREE.MathUtils.degToRad(angle);viewer.updateOptics();viewer.updateRays();});
  byId('brightness').addEventListener('input',event=>{byId('brightness-value').textContent=event.target.value;viewer.brightness=Number(event.target.value)/100;viewer.updateLighting();});
  byId('auto-rotate').addEventListener('change',event=>viewer.setAutoRotation(event.target.checked));
  byId('show-dispersion').addEventListener('change',()=>viewer.updateOptics());
  byId('reset-view').addEventListener('click',()=>viewer.resetView());
  byId('download-data').addEventListener('click',()=>{
    const data={stoneId:viewer.sourceStone.id,cut:viewer.sourceCut,material:{ior:viewer.sourceStone.ior,status:'representative, not measured'},photoIdentification:viewer.sourceStone.photoIdentification};
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=`${viewer.sourceStone.id}-cut.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  byId('gem-canvas').addEventListener('keydown',event=>{
    const turns={ArrowLeft:[0,-.12],ArrowRight:[0,.12],ArrowUp:[-.12,0],ArrowDown:[.12,0]};
    if(turns[event.key]){event.preventDefault();viewer.group.rotation.x+=turns[event.key][0];viewer.group.rotation.y+=turns[event.key][1];viewer.updateRays();}
    else if(['+','=','-','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')viewer.resetView();else viewer.setZoom(viewer.zoom*(event.key==='-'?1.1:.9));}
  });
}

selectCollectionStone(new URLSearchParams(location.search).get('stone'),false);
