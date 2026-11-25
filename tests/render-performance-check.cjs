const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const THREE=require('../three.min.js'),root=path.resolve(__dirname,'..');
const document={visibilityState:'visible'};let nextId=0;const queued=new Set();
const context=vm.createContext({THREE,document,requestAnimationFrame:()=>{const id=++nextId;queued.add(id);return id;},cancelAnimationFrame:id=>queued.delete(id)});
vm.runInContext(fs.readFileSync(path.join(root,'studio-renderer.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'cut-geometry.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'visualizer.js'),'utf8').split('function initVisualizer()')[0],context);
const Preview=vm.runInContext('StudioPreview',context),prototype=vm.runInContext('GemVisualizer.prototype',context);
let draws=0;const targets=[];
const renderer={getDrawingBufferSize:out=>out.set(384,384),setRenderTarget:target=>targets.push(target),render:()=>draws++};
const preview=new Preview(renderer),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,100);
preview.render(scene,camera,'rotating',true);
assert.equal(draws,2,'Moving frames should draw geometry and present it without a history pass');
assert(!targets.includes(preview.history[0])&&!targets.includes(preview.history[1]));
assert.equal(preview.samples,0,'Moving frames must not contaminate still-image accumulation');
for(let i=0;i<12;i++)preview.render(scene,camera,'still',false);
assert.equal(preview.samples,12);assert.equal(draws,38);
preview.render(scene,camera,'still',false);assert.equal(draws,38,'Settled frames must not issue GPU draws');
preview.render(scene,camera,'changed',false);assert.equal(draws,41,'A changed view must restart accumulation');

const view={active:true,inViewport:true,animation:null,lastTime:12,animate(){}};
for(const method of ['syncAnimation','suspend','resume'])view[method]=prototype[method];
view.syncAnimation();assert.equal(queued.size,1);
view.syncAnimation();assert.equal(queued.size,1,'Resume must not create parallel animation loops');
document.visibilityState='hidden';view.syncAnimation();assert.equal(queued.size,0);assert.equal(view.lastTime,null);
document.visibilityState='visible';view.syncAnimation();assert.equal(queued.size,1);
view.inViewport=false;view.syncAnimation();assert.equal(queued.size,0);
view.resume();assert.equal(queued.size,0,'Offscreen renderers must stay paused');
view.inViewport=true;view.syncAnimation();assert.equal(queued.size,1);
view.suspend();assert.equal(queued.size,0);assert.equal(view.active,false);
view.resume();assert.equal(queued.size,1);
const controls={camera:{position:{z:0}},fitDistance:4};
prototype.setZoom.call(controls,0);assert.equal(controls.zoom,.55);assert.equal(controls.camera.position.z,2.2);
prototype.setZoom.call(controls,3);assert.equal(controls.zoom,2.5);assert.equal(controls.camera.position.z,10);
prototype.setAutoRotation.call(controls,true);assert.equal(2*Math.PI/(controls.rotationSpeed/100),40);
prototype.setAutoRotation.call(controls,false);assert.equal(controls.rotationSpeed,0);
let rebuilds=0;
const sourceView={gem:{},sourceCut:{id:'mini'},setSource:prototype.setSource,updateOptics(){},updateInfo(){},resetView(){},generateGem(){rebuilds++;}};
prototype.useStone.call(sourceView,{id:'ruby',material:'ruby',name:'Ruby',color:0xff0000,ior:1.766},{id:'mini'});
assert.equal(rebuilds,0);assert.equal(sourceView.currentStone,'ruby');
prototype.useStone.call(sourceView,{id:'peridot',material:'peridot',name:'Peridot',color:0x88aa33,ior:1.65},{id:'peridot'});
assert.equal(rebuilds,1,'Different designs must rebuild geometry');
sourceView.generateGem=()=>{throw new Error('Bad cut');};
assert.throws(()=>prototype.useStone.call(sourceView,{id:'invalid',material:'invalid',name:'Invalid',color:0xffffff,ior:1.5},{id:'invalid'}),/Bad cut/);
assert.equal(sourceView.currentStone,'peridot');assert.equal(sourceView.sourceCut.id,'peridot');
let oldMeshDisposed=false;
const previousMesh={geometry:{dispose(){oldMeshDisposed=true;}},material:{dispose(){}}};
const failedSwitch={sourceCut:{status:'offsets-required'},group:{children:[previousMesh],remove(){this.children.pop();}}};
assert.throws(()=>prototype.generateGem.call(failedSwitch),/awaiting verified/);
assert.equal(oldMeshDisposed,false,'Invalid replacement cuts must preserve the previous mesh');
// A rejected browser must not retain a context after each retry.
let disposed=false,lost=false;
const originalThree=context.THREE;
context.THREE={Scene:class{},PerspectiveCamera:class{},Vector2:class{},Vector3:class{},Matrix4:class{},WebGLRenderer:class{
  constructor(){this.capabilities={isWebGL2:false};this.extensions={get:()=>null};}
  dispose(){disposed=true;}
  forceContextLoss(){lost=true;}
}};
context.window={matchMedia:()=>({matches:false})};document.querySelector=()=>({checked:true});
const Viewer=vm.runInContext('GemVisualizer',context);
assert.throws(()=>new Viewer({}, {material:'test',name:'Test',color:0xffffff,ior:1.5},{id:'test'}),/floating-point texture support/);
assert(disposed&&lost,'Rejected WebGL contexts must be released before retry');
context.THREE=originalThree;
console.log('Passed two-pass moving frames, 12-sample still refinement, settled GPU idle, hidden/offscreen suspension, and single animation-loop resumption.');
