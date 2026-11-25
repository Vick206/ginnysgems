const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {checkBake,wireframeSvg,bakeInputs,sourceHash}=require('../tools/bake-previews.cjs');
assert.equal(sourceHash(Buffer.from('first\r\nsecond\r\n')),sourceHash(Buffer.from('first\nsecond\n')),'Source hashes must be stable across Git line endings');
const root=path.resolve(__dirname,'..'),manifest=checkBake();
assert.equal(manifest.jobs.length,5);assert.equal(manifest.skipped.length,1);assert.equal(manifest.skipped[0].stoneId,'sunstone-001');
const expected=bakeInputs();
let invalid=structuredClone(manifest);invalid.jobs[0].render='images/renders/wrong.png';
assert.throws(()=>checkBake(expected,invalid),/metadata mismatch/);
invalid=structuredClone(manifest);invalid.jobs[1]=invalid.jobs[0];
assert.throws(()=>checkBake(expected,invalid),/Missing or duplicate/);
invalid=structuredClone(manifest);invalid.recipe.camera.fov=60;
assert.throws(()=>checkBake(expected,invalid),/recipe does not match/);

function pngPixels(bytes){
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  assert.equal(bytes[24],8);assert.equal(bytes[25],6,'Expected RGBA PNG');assert.equal(bytes[28],0);
  const chunks=[];for(let o=8;o<bytes.length;){const size=bytes.readUInt32BE(o),type=bytes.subarray(o+4,o+8).toString();if(type==='IDAT')chunks.push(bytes.subarray(o+8,o+8+size));o+=size+12;}
  const packed=zlib.inflateSync(Buffer.concat(chunks)),stride=width*4,pixels=Buffer.alloc(width*height*4);
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){
    const filter=packed[y*(stride+1)];assert(filter<=4);
    for(let x=0;x<stride;x++){
      const i=y*stride+x,a=x>=4?pixels[i-4]:0,b=y?pixels[i-stride]:0,c=y&&x>=4?pixels[i-stride-4]:0;
      const predictor=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];pixels[i]=(packed[y*(stride+1)+x+1]+predictor)&255;
    }
  }
  return {width,height,pixels};
}
for(const job of manifest.jobs){
  const image=pngPixels(fs.readFileSync(path.join(root,job.render)));
  assert.equal(image.width,manifest.recipe.size.width);assert.equal(image.height,manifest.recipe.size.height);
  const alpha=[];for(let i=3;i<image.pixels.length;i+=4)alpha.push(image.pixels[i]);
  assert.equal(alpha[0],0);assert.equal(alpha[image.width-1],0);assert.equal(alpha.at(-1),0);
  assert(alpha.filter(a=>a===0).length>alpha.length*.2,'Preview background is not clear');
  assert(alpha.some(a=>a>250),'Render is empty');
  const cut=JSON.parse(fs.readFileSync(path.join(root,job.cutFile)));
  const svg=fs.readFileSync(path.join(root,job.wireframe),'utf8');
  assert.equal(svg,wireframeSvg(cut,manifest.recipe),'Wireframe must reproduce byte-for-byte');
  assert(!svg.includes('<rect'),'Wireframe background must be clear');
}
console.log('Passed five transparent RGBA renders, deterministic wireframe exports, recipe/output hashes, and skipped sunstone.');
