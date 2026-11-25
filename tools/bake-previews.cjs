// Dependency-free bake runner. Node 22+ (fetch/WebSocket) and Chrome or Edge.
// One browser page and one reused renderer produce every transparent PNG.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const http=require('node:http'),{spawn}=require('node:child_process'),{createHash}=require('node:crypto');
const THREE=require('../three.min.js');
const root=path.resolve(__dirname,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceHash=bytes=>sha(bytes.toString('utf8').replace(/\r\n/g,'\n'));
const read=file=>fs.readFileSync(path.join(root,file));

function bakeInputs(){
  const recipe=JSON.parse(read('render-bake.json'));
  if(recipe.schemaVersion!==1||recipe.size.width!==recipe.size.height||recipe.background.alpha!==0||recipe.camera.type!=='perspective'||recipe.quality.samples!==12||recipe.quality.pixelRatio!==1||recipe.outputDirectory!=='images/renders')throw new Error('Unsupported bake recipe.');
  if(!Number.isInteger(recipe.size.width)||recipe.size.width<64||recipe.size.width>2048||!recipe.camera.rotationRadians.every(Number.isFinite)||recipe.camera.rotationRadians.length!==3||!(recipe.camera.fov>0&&recipe.camera.fov<120)||!(recipe.camera.distanceFactor>=1))throw new Error('Invalid bake dimensions or camera.');
  const context=vm.createContext({document:{querySelector:()=>null}});vm.runInContext(read('catalog.js').toString(),context);
  const catalog=vm.runInContext('STUDIO_CATALOG',context);
  const files=['.gitattributes','render-bake.json','catalog.js','three.min.js','studio-renderer.js','cut-geometry.js','optics-effects.js','visualizer.js','collection-viewer.js','visualizer.html','tools/bake-previews.cjs'];
  for(const stone of catalog.filter(s=>s.render))files.push(`data/cuts/${stone.cutId}.json`);
  const inputs=Object.fromEntries([...new Set(files)].sort().map(file=>[file,sourceHash(read(file))]));
  const jobs=catalog.filter(s=>s.render).map(stone=>({stoneId:stone.id,cutId:stone.cutId,cutFile:`data/cuts/${stone.cutId}.json`,material:{color:stone.color,ior:stone.ior},render:stone.render,wireframe:stone.wireframe}));
  return {schemaVersion:1,recipe,inputs,inputHash:sha(JSON.stringify(inputs)),jobs,skipped:catalog.filter(s=>!s.render).map(s=>({stoneId:s.id,reason:s.status}))};
}

function wireframeSvg(cut,recipe){
  const context=vm.createContext({THREE});vm.runInContext(read('cut-geometry.js').toString(),context);
  const geometry=context.centerGemGeometry(context.geometryFromCut(cut));
  const radius=geometry.boundingSphere.radius,camera=new THREE.PerspectiveCamera(recipe.camera.fov,1,.1,100);
  camera.position.z=radius/Math.sin(recipe.camera.fov*Math.PI/360)*recipe.camera.distanceFactor;camera.updateMatrixWorld();
  const rotation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...recipe.camera.rotationRadians));
  const edges=new THREE.EdgesGeometry(geometry,recipe.wireframe.edgeThresholdDegrees),position=edges.attributes.position;
  const width=recipe.size.width,height=recipe.size.height;let d='';
  for(let i=0;i<position.count;i+=2){
    const points=[i,i+1].map(j=>new THREE.Vector3().fromBufferAttribute(position,j).applyMatrix4(rotation).project(camera));
    d+=`M${((points[0].x+1)*width/2).toFixed(3)},${((1-points[0].y)*height/2).toFixed(3)}L${((points[1].x+1)*width/2).toFixed(3)},${((1-points[1].y)*height/2).toFixed(3)}`;
  }
  geometry.dispose();edges.dispose();
  const style=recipe.wireframe;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>${cut.name.replace(/[<>&]/g,'')} facet wireframe</title><g fill="none" stroke-linejoin="round" stroke-linecap="round"><path stroke="${style.outline}" stroke-width="${style.outlineWidth}" d="${d}"/><path stroke="${style.stroke}" stroke-width="${style.strokeWidth}" d="${d}"/></g></svg>\n`;
}

function checkBake(manifest=bakeInputs(),saved){
  const file=path.join(root,manifest.recipe.outputDirectory,'manifest.json');
  if(!saved){
    if(!fs.existsSync(file))throw new Error('No baked asset manifest. Run node tools/bake-previews.cjs.');
    saved=JSON.parse(fs.readFileSync(file));
  }
  if(saved.inputHash!==manifest.inputHash)throw new Error('Baked previews are stale: source inputs changed.');
  if(saved.schemaVersion!==manifest.schemaVersion||JSON.stringify(saved.recipe)!==JSON.stringify(manifest.recipe))throw new Error('Baked manifest recipe does not match the source recipe.');
  if(!Array.isArray(saved.jobs)||saved.jobs.length!==manifest.jobs.length)throw new Error('Incomplete baked output manifest.');
  for(const expected of manifest.jobs){
    const matches=saved.jobs.filter(job=>job.stoneId===expected.stoneId);
    if(matches.length!==1)throw new Error('Missing or duplicate baked job: '+expected.stoneId);
    const job=matches[0];
    for(const key of ['cutId','cutFile','render','wireframe','material'])if(JSON.stringify(job[key])!==JSON.stringify(expected[key]))throw new Error('Baked job metadata mismatch: '+expected.stoneId);
    const outputs=job.outputHashes||{};
    if(Object.keys(outputs).length!==2||![expected.render,expected.wireframe].every(file=>Object.hasOwn(outputs,file)))throw new Error('Incomplete baked output manifest.');
    for(const file of [expected.render,expected.wireframe])if(!fs.existsSync(path.join(root,file))||sha(read(file))!==outputs[file])throw new Error('Baked asset missing or changed: '+file);
  }
  return saved;
}

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function bake(){
  const manifest=bakeInputs(),recipe=manifest.recipe;
  const candidates=[process.env.BAKE_BROWSER,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const browser=candidates.find(file=>fs.existsSync(file));if(!browser)throw new Error('Set BAKE_BROWSER to a Chrome/Edge executable.');
  const server=http.createServer((request,response)=>{
    const url=new URL(request.url,'http://localhost'),relative=decodeURIComponent(url.pathname).slice(1)||'index.html';
    const target=path.resolve(root,relative);
    if(!target.startsWith(root+path.sep)||relative.split(/[\\/]/).some(p=>p.startsWith('.')||['TemporaryResources','tmp','legacy'].includes(p))){response.writeHead(403);response.end();return;}
    fs.readFile(target,(error,data)=>{if(error){response.writeHead(404);response.end();return;}response.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');response.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=`http://127.0.0.1:${server.address().port}`;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'ginnys-gem-bake-'));
  let child,socket;
  try{
    child=spawn(browser,['--headless=new','--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','about:blank'],{windowsHide:true,stdio:'ignore'});
    let startupError=null;child.on('error',error=>startupError=error);
    const portFile=path.join(profile,'DevToolsActivePort');
    for(let i=0;!fs.existsSync(portFile);i++){if(startupError)throw startupError;if(i>150)throw new Error('Browser startup timed out.');await delay(100);}
    const port=Number(fs.readFileSync(portFile,'utf8').split('\n')[0]);
    const pages=await(await fetch(`http://127.0.0.1:${port}/json`)).json();
    socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    let nextId=0;const pending=new Map();
    socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const waiting=pending.get(message.id);if(waiting){clearTimeout(waiting.timer);pending.delete(message.id);message.error?waiting.reject(new Error(message.error.message)):waiting.resolve(message.result);}}};
    const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(new Error(method+' timed out'));},60000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
    await call('Page.navigate',{url:address+'/visualizer.html?bake=1'});
    for(let i=0;!await evaluate('typeof selectCollectionStone === "function"');i++){if(i>100)throw new Error('Bake page failed to load');await delay(100);}
    manifest.rendererEnvironment=await evaluate('navigator.userAgent');
    const wireframes=new Map();
    for(const job of manifest.jobs){
      const result=await evaluate(`(async()=>{
        const stone=STUDIO_CATALOG.find(s=>s.id===${JSON.stringify(job.stoneId)}),cut=await(await fetch(${JSON.stringify(job.cutFile)})).json();
        selectCollectionStone(stone.id);await loadRenderer();
        document.querySelector('#live-render').hidden=false;document.querySelector('#render-controls').hidden=false;
        let v=window.gemVisualizer;
        if(!v){v=new GemVisualizer(document.querySelector('#gem-canvas'),stone,cut);window.gemVisualizer=v;}
        v.suspend();
        const recipe=${JSON.stringify(recipe)};
        v.rotationSpeed=0;v.transparency=recipe.material.transmission;v.brilliance=recipe.material.brilliance;v.refractionStrength=recipe.material.refractionStrength;
        v.lightingPreset=recipe.lighting.preset;v.brightness=recipe.lighting.brightness;
        v.lightRig.rotation.y=recipe.lighting.directionDegrees*Math.PI/180;
        v.internalBounces=recipe.quality.internalBounces;
        document.querySelector('#show-dispersion').checked=recipe.material.dispersion;
        for(const id of ['show-wireframe','show-glints','show-light-rays'])document.getElementById(id).checked=false;
        document.querySelector('#show-facets').checked=true;v.useStone(stone,cut);v.updateLighting();
        v.renderer.setPixelRatio(recipe.quality.pixelRatio);v.renderer.setSize(recipe.size.width,recipe.size.height,false);v.renderer.setClearColor(0,0);v.scene.background=null;
        v.camera.fov=recipe.camera.fov;v.camera.aspect=recipe.size.width/recipe.size.height;v.camera.position.z=v.radius/Math.sin(recipe.camera.fov*Math.PI/360)*recipe.camera.distanceFactor;v.camera.updateProjectionMatrix();
        v.group.rotation.set(...recipe.camera.rotationRadians);v.prepareStudioFrame();v.studioPreview.invalidate();
        for(let i=0;i<recipe.quality.samples;i++)v.studioPreview.render(v.scene,v.camera,'bake-'+stone.id,false);
        if(v.renderer.info.programs.some(p=>p.diagnostics&&p.diagnostics.runnable===false))throw Error('Shader compilation failed');
        const png=v.canvas.toDataURL('image/png').split(',')[1];
        return {png,facets:v.gem.geometry.userData.designFacets.length,error:v.renderer.getContext().getError()};
      })()`);
      if(result.error)throw new Error(job.stoneId+': WebGL error '+result.error);
      fs.mkdirSync(path.dirname(path.join(root,job.render)),{recursive:true});
      fs.writeFileSync(path.join(root,job.render),Buffer.from(result.png,'base64'));
      if(!wireframes.has(job.cutFile))wireframes.set(job.cutFile,wireframeSvg(JSON.parse(read(job.cutFile)),recipe));
      fs.writeFileSync(path.join(root,job.wireframe),wireframes.get(job.cutFile));
      job.facets=result.facets;job.outputHashes=Object.fromEntries([job.render,job.wireframe].map(file=>[file,sha(read(file))]));
      console.log(`Baked ${job.stoneId}: transparent render + wireframe (${job.facets} facets)`);
    }
    fs.writeFileSync(path.join(root,recipe.outputDirectory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    checkBake(manifest);
    await call('Browser.close').catch(()=>{});
  }finally{
    socket?.close();child?.kill();server.close();
    // Remove only this task's explicitly created temporary browser profile.
    const resolved=path.resolve(profile),temp=path.resolve(os.tmpdir())+path.sep;
    if(resolved.startsWith(temp)&&path.basename(resolved).startsWith('ginnys-gem-bake-'))try{fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:150});}catch{}
  }
}

module.exports={bakeInputs,wireframeSvg,checkBake,sourceHash};
if(require.main===module){
  if(process.argv.includes('--check')){try{const manifest=checkBake();console.log(`Baked assets current: ${manifest.jobs.length} stone pairs.`);}catch(error){console.error(error.message);process.exitCode=1;}}
  else bake().catch(error=>{console.error(error);process.exitCode=1;});
}
