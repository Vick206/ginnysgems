// Reconstruct Greg Glenn's Mini-Portugese from the supplied PDF's angles,
// ratios and vector drawing. Source measurements and assumptions stay explicit.
const fs=require('node:fs');
const path=require('node:path');
const THREE=require('../three.min.js');

function buildMiniPortugueseCut(){
  const sin=a=>Math.sin(a*Math.PI/180),cos=a=>Math.cos(a*Math.PI/180);
  const odd=Array.from({length:16},(_,i)=>3+i*6);
  const even=Array.from({length:16},(_,i)=>i===0?96:i*6);
  const width=721.44-586.80,girdle=(318.95999-315.60001)/width;
  const apothem=.5*cos(11.25),tableRadius=.583/2;
  // Fit the two silhouette junction positions at fixed published slopes. Fitting
  // plane residuals alone amplifies the drawing's rounding at shallow tier joins.
  const pavilionPoints=[[339.35999,699.35999],[351.84,685.91998]];
  const solve2=(a,b,c,d,e,f)=>[(e*d-b*f)/(a*d-b*c),(a*f-e*c)/(a*d-b*c)];
  const junctionPositions=distance=>{
    const outer=solve2(sin(46),cos(46),cos(11.25)*sin(43),cos(43),apothem*sin(46),distance);
    const inner=solve2(sin(43),cos(43),cos(11.25)*sin(40),cos(40),distance,.440*cos(40));
    return [outer[0]*cos(11.25),outer[1],inner[0],inner[1]];
  };
  const targets=pavilionPoints.flatMap(([depth,radius])=>[(radius-654)/width,(depth-318.95999)/width]);
  const intercept=junctionPositions(0),unit=junctionPositions(1),slope=unit.map((n,i)=>n-intercept[i]);
  const pavilionOffset=slope.reduce((sum,n,i)=>sum+n*(targets[i]-intercept[i]),0)/slope.reduce((sum,n)=>sum+n*n,0);
  // The drawing's crown junction is shared by C1/C2/C3. Solve radial position,
  // junction height and table height with the published angles and table ratio.
  const equations=new THREE.Matrix3().set(
    sin(32),cos(32),0,
    cos(11.25)*sin(28),cos(28),-cos(28),
    sin(25),cos(25),-cos(25)
  );
  const junction=new THREE.Vector3(apothem*sin(32),tableRadius*sin(28),tableRadius*cos(11.25)*sin(25)).applyMatrix3(equations.invert());
  const crown=junction.z;
  const distances={
    P1:apothem*sin(46),G:apothem,P2:pavilionOffset,P3:.440*cos(40),
    C1:apothem*sin(32)+girdle*cos(32),
    C2:tableRadius*sin(28)+(girdle+crown)*cos(28),
    C3:tableRadius*cos(11.25)*sin(25)+(girdle+crown)*cos(25),T:girdle+crown,
  };
  return {
    id:'mini-portuguese',name:'Mini-Portuguese',sourceTitle:'Mini-Portugese - For small gems',
    designer:'Greg Glenn',source:'Miniportugese.Ruby.pdf',designIor:1.740,indexGear:96,facetCount:113,
    ratios:{lengthWidth:1,tableWidth:.583,pavilionWidth:.440,crownWidth:.111,volumeWidthCubed:.194},
    status:'source-reconstruction',
    tiers:[['P1',-46,odd],['G',90,odd],['P2',-43,even],['P3',-40,odd],['C1',32,odd],['C2',28,even],['C3',25,odd],['T',0,[96]]].map(([label,angle,indices])=>({label,angle,indices,distance:distances[label]})),
    reconstruction:{
      method:'PDF angles and ratios with offsets reconstructed from vector drawing; not original GemCAD plane data',
      normalizedWidth:1,girdleThickness:girdle,crownHeight:crown,crownJunctionRadius:junction.x,crownJunctionHeight:junction.y,
      crownConstraint:'C1/C2/C3 share the crown junction visible in the drawing; C2/C3 meet the 16-sided table vertices',
      pavilionConstraint:'P1 meets the regular girdle; P3 meets at P/W 0.440; P2 offset is a least-squares fit to two profile points',
      drawing:{widthEnds:[586.80,721.44],radialCenter:654,girdleProfile:[315.60001,318.95999],pavilionPoints},
      validation:{volumeWidthCubed:.1946408,printedVolumeWidthCubed:.194,relativeVolumeDifference:.0033031,maximumCheckedProfileErrorPoints:.276,drawingWidthPoints:width},
      limitations:'Vector coordinates are quantized. The reconstruction assumes a regular 16-sided girdle and common design geometry for the ruby and red garnet, as requested. It does not establish stone-specific cutting adjustments.',
    },
    note:'Greg Glenn Mini-Portuguese: 113-facet PDF reconstruction. Facet offsets and girdle thickness are derived from the drawing; design IOR 1.740 is separate from material settings. Represents the design, not a scan of either finished stone.',
  };
}

module.exports={buildMiniPortugueseCut};
if(require.main===module){
  const output=process.argv[2]||path.resolve(__dirname,'../data/cuts/mini-portuguese.json');
  fs.writeFileSync(output,JSON.stringify(buildMiniPortugueseCut(),null,2)+'\n');
  console.log('Built 113-facet Mini-Portuguese PDF reconstruction: '+output);
}
