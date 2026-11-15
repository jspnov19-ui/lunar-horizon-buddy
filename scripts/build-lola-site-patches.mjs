import fs from 'node:fs';
import path from 'node:path';

let dem;
try { dem = fs.readFileSync('public/lunar-ldem-75s-240m.img'); }
catch {
  const response = await fetch('https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_75s_240m.img');
  if (!response.ok) throw new Error(`NASA PDS download failed: ${response.status}`);
  dem = Buffer.from(await response.arrayBuffer());
}
const N = 3812, STEP = 240, OFFSET = 1905.5, R = 1737400;
const GRID = 65, SPAN = 15360;
const sites = [
  ['shackleton-rim',-89.45,-137],['de-gerlache-rim',-88.72,-68.5],['malapert-massif',-85.99,2.9],['haworth',-87.45,-2.1],
  ['nobile-rim',-85.35,31.4],['leibnitz-beta',-85.2,33.2],['amundsen-rim',-84.3,82.8],['faustini-rim',-87.2,84],
];
const index = (x,y) => y * N + x;
function valueAt(x,y) {
  if (x < 0 || y < 0 || x >= N-1 || y >= N-1) return NaN;
  const x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
  const a=dem.readInt16LE(index(x0,y0)*2)*.5, b=dem.readInt16LE(index(x0+1,y0)*2)*.5;
  const c=dem.readInt16LE(index(x0,y0+1)*2)*.5, d=dem.readInt16LE(index(x0+1,y0+1)*2)*.5;
  return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
}
const manifest={source:'NASA LRO LOLA LDEM_75S_240M, PDS3 V2.0',sourceUrl:'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_75s_240m.img',resolutionM:240,frame:'MEAN EARTH/POLAR AXIS of DE421',spanM:SPAN,grid:GRID,sites:{}};
fs.mkdirSync('public/lola-sites',{recursive:true});
for(const [id,lat,lon] of sites){
 const p=Math.abs(lat)*Math.PI/180, l=lon*Math.PI/180, rho=2*R*Math.tan((Math.PI/2-p)/2);
 const cx=rho*Math.sin(l), cy=rho*Math.cos(l);
 const col=OFFSET+cx/STEP, row=OFFSET-cy/STEP;
 const heights=new Float32Array(GRID*GRID); let valid=0;
 for(let y=0;y<GRID;y++) for(let x=0;x<GRID;x++){
  const east=(x/(GRID-1)-.5)*SPAN, north=(.5-y/(GRID-1))*SPAN;
  const xx=col+east/STEP, yy=row-north/STEP;
  const z=valueAt(xx,yy); heights[y*GRID+x]=Number.isFinite(z)?z:0;if(Number.isFinite(z)) valid++;
 }
 const filename=`${id}.f32`;
 fs.writeFileSync(path.join('public/lola-sites',filename),Buffer.from(heights.buffer));
 manifest.sites[id]={file:filename,lat,lon,validFraction:valid/heights.length};
 console.log(id,manifest.sites[id].validFraction.toFixed(3));
}
fs.writeFileSync('public/lola-sites/manifest.json',JSON.stringify(manifest));
