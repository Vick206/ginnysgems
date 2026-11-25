// Shared public catalog. Photo matches are provisional visual identifications.
// Unknown facts stay null; no weights or origins are inherited from demo records.
const STUDIO_CATALOG = [
  {id:'peridot-001',name:'Peridot',cutId:'peridot-round',cutName:'Peridot Round Brilliant',material:'peridot',color:0x8aa82c,ior:1.65,photoSource:'PXL_20260922_030536764.jpg',alt:'Green round faceted stone on a pale surface',status:'offsets-required',description:'A green round stone paired with the Jim Perkins peridot round brilliant diagram.'},
  {id:'garnet-red-001',name:'Red Garnet',cutId:'mini-portuguese',cutName:'Mini-Portuguese',material:'garnetRed',color:0x9e351e,ior:1.76,photoSource:'PXL_20260922_030957481.jpg',alt:'Small red-orange round faceted stone on a pale surface',status:'offsets-required',description:'The small red garnet uses the Mini-Portuguese design, according to the studio notes.'},
  {id:'ruby-studio-001',name:'Ruby',cutId:'mini-portuguese',cutName:'Mini-Portuguese',material:'ruby',color:0xc72346,ior:1.766,photoSource:'PXL_20260624_162853043.jpg',alt:'Pink-red round faceted stone resting in a white display case',status:'offsets-required',description:'A pink-red ruby shaped in the intricate Mini-Portuguese pattern.'},
  {id:'cz-001',name:'Cubic Zirconia',cutId:'squartuguese',cutName:'Squartuguese',material:'cz',color:0xe7dfc8,ior:2.15,photoSource:'PXL_20260922_030845845.jpg',alt:'Pale clipped-square faceted stone on a light surface',status:'source-geometry',description:'The studio identifies Squartuguese as the design used for the CZ.'},
  {id:'garnet-ghana-001',name:'Purple Color-change Garnet',cutId:'sophia-dome',cutName:'Sophia Dome',material:'garnetPurple',color:0x86416f,ior:1.76,photoSource:'PXL_20260922_030101702.jpg',alt:'Purple round faceted stone reflecting pink highlights',status:'source-geometry',origin:'Ghana',description:'The studio identifies this Ghana garnet as color-changing and cut in the Sophia Dome pattern.'},
  {id:'sunstone-001',name:'Sunstone',cutId:'snowfall',cutName:'Snowfall',material:'sunstone',color:0xd2a37d,ior:1.54,photoSource:'PXL_20260922_030403675.jpg',alt:'Pale peach round faceted stone on a light surface',status:'source-geometry',description:'A pale peach sunstone cut in Michael Holmes’s Snowfall pattern.'},
].map(stone=>{
  if(stone.id==='peridot-001')stone.status='source-reconstruction';
  if(stone.cutId==='mini-portuguese')stone.status='source-reconstruction';
  const ready=['source-geometry','source-reconstruction'].includes(stone.status);
  return {...stone,carats:null,dimensions:null,photoIdentification:'provisional',materialConstants:'representative, not measured',provenance:'Studio email dated 2026-10-13',photo:`images/showcase/${stone.id}-1200.jpg`,photoSmall:`images/showcase/${stone.id}-600.jpg`,render:ready?`images/renders/${stone.id}.png`:null,wireframe:ready?`images/renders/${stone.id}-wireframe.svg`:null};
});
