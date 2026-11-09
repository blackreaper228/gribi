import {items} from './items.js';

const loading = document.querySelector('#loading');
function fail(error) {
  console.error(error);
  loading.classList.add('done');
  document.querySelector('#error').hidden = false;
}
let THREE;
try {
  THREE = await import('./assets/three.module.js');
} catch {
  try { THREE = await import('https://unpkg.com/three@0.170.0/build/three.module.js'); }
  catch (error) { fail(error); }
}
if (THREE) { try { await buildRoom(); } catch (error) { fail(error); } }

async function buildRoom() {
  const canvas = document.querySelector('#view');
  const renderer = new THREE.WebGLRenderer({canvas, antialias:false, powerPreference:'high-performance'});
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#171a14');
  scene.fog = new THREE.FogExp2('#171a14', .022);
  const camera = new THREE.PerspectiveCamera(43,1,.1,65);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const world = new THREE.Group(); scene.add(world);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const interactives = [];
  let activeScene=0, flight=null, hovered=null, ready=false;
  const viewTarget = new THREE.Vector3();
  const prev=document.querySelector('#scene-prev'), next=document.querySelector('#scene-next');
  const positions = [new THREE.Vector3(-2.15,2.9,9.4),new THREE.Vector3(4.45,4.65,5.25)];
  const targets = [new THREE.Vector3(-3,2.75,0),new THREE.Vector3(3.7,1.18,1.05)];
  const cameraStops=()=>{
    const portrait=innerWidth/innerHeight<.85;
    positions[0].set(-2.15,2.9,portrait?13.7:9.4);
    positions[1].set(portrait?4.1:4.45,portrait?8.2:4.65,portrait?8.9:5.25);
  };

  // A deterministic texture generator keeps the complete room self-contained.
  function textureCanvas(w,h,draw){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    t.magFilter=THREE.NearestFilter;t.anisotropy=2;return t;
  }
  let seed=731;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const wood=textureCanvas(256,512,(ctx,w,h)=>{
    ctx.fillStyle='#705337';ctx.fillRect(0,0,w,h);
    for(let i=0;i<2300;i++){
      const x=random()*w,y=random()*h;
      ctx.strokeStyle=random()>.55?'rgba(29,19,10,.14)':'rgba(201,165,106,.10)';
      ctx.lineWidth=random()*2+.3;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+3,y+35,x-3,y+70,x+random()*6-3,y+140);ctx.stroke();
    }
  });
  wood.wrapS=wood.wrapT=THREE.RepeatWrapping;
  const plaster=textureCanvas(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#676b54';ctx.fillRect(0,0,w,h);
    for(let i=0;i<10000;i++){ctx.fillStyle=random()>.5?'#ffffff07':'#00000009';ctx.fillRect(random()*w,random()*h,1,1);}
  });
  plaster.wrapS=plaster.wrapT=THREE.RepeatWrapping;plaster.repeat.set(8,4);
  const mat=(color,map=null)=>new THREE.MeshLambertMaterial({color,map});
  const walnut=mat('#ad8860',wood), darkWood=mat('#503c28',wood), edgeWood=mat('#ba965f',wood);
  const wallMat=mat('#a8ad86',plaster), panelMat=mat('#363d2e'), trimMat=mat('#596044');
  const brass=new THREE.MeshPhongMaterial({color:'#a58c51',shininess:40});
  const paper=mat('#ded2b5'), black=mat('#23251e');
  function box(parent,w,h,d,x,y,z,material,shadow=true){
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
  }
  function cylinder(parent,rt,rb,h,x,y,z,material,segments=12){
    const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  // One continuous room. Navigation changes only the camera's fixed viewpoint.
  box(world,20,.15,18,0,-.09,5,darkWood,false);
  for(let i=-10;i<10;i++)for(let j=-2;j<10;j++){
    const m=box(world,.97,.035,1.97,i+.5,.01,j*2+(i%2),mat(new THREE.Color().setHSL(.095,.22,.17+random()*.035),wood),false);
    m.receiveShadow=true;
  }
  box(world,20,7,.2,0,3.5,-1.1,wallMat,false);
  box(world,.2,7,18,-9.8,3.5,5,wallMat,false);
  box(world,.2,7,18,9.8,3.5,5,wallMat,false);
  box(world,20,.16,.18,0,.16,-.94,trimMat,false);
  box(world,20,1.1,.12,0,.66,-.95,panelMat,false);
  box(world,20,.07,.2,0,1.25,-.89,trimMat,false);
  for(let x=-9;x<10;x++)box(world,.045,1.0,.08,x,.65,-.85,trimMat,false);

  const cabinet=new THREE.Group();cabinet.position.set(-3,0,0);world.add(cabinet);
  const W=4.45,H=5.35;
  box(cabinet,W,H,.16,0,H/2+.2,-.43,darkWood);
  for(let x=-2.05;x<2.2;x+=.42)box(cabinet,.012,H-.15,.016,x,H/2+.2,-.337,mat('#31261b'),false);
  [-1,1].forEach(s=>{
    box(cabinet,.2,H,.95,s*(W/2-.1),H/2+.2,0,walnut);
    box(cabinet,.25,H+.1,.11,s*(W/2-.1),H/2+.2,.5,edgeWood);
    box(cabinet,.25,.26,.65,s*1.82,.13,0,darkWood);
  });
  box(cabinet,W+.25,.19,1.08,0,H+.3,.02,edgeWood);
  box(cabinet,W+.12,.10,1.0,0,H+.43,.0,darkWood);
  const shelfY=[];
  for(let i=0;i<6;i++){
    const y=4.55-i*.81;shelfY.push(y+.075);
    box(cabinet,W-.2,.13,.98,0,y,0,walnut);
    box(cabinet,W-.15,.075,.11,0,y-.025,.52,edgeWood);
  }
  box(cabinet,W,.25,.95,0,.25,0,darkWood);
  const contactTex=textureCanvas(64,64,(ctx,w,h)=>{
    const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#000a');g.addColorStop(.4,'#0007');g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  });
  function contactShadow(parent,x,y,z,w,d){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:contactTex,transparent:true,depthWrite:false}));
    m.rotation.x=-Math.PI/2;m.position.set(x,y,z);parent.add(m);
  }
  const loader=new THREE.TextureLoader();
  const assetPromises=[];
  const sprites=[];
  let loadedCount=0;
  function loadTexture(url){
    const promise=new Promise((resolve,reject)=>loader.load(url,t=>{
      t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;t.minFilter=THREE.LinearMipmapLinearFilter;
      loadedCount++;document.querySelector('.loading-line i').style.width=Math.min(100,loadedCount/13*100)+'%';resolve(t);
    },undefined,reject));assetPromises.push(promise);return promise;
  }
  items.forEach((item,i)=>{
    const row=Math.floor(i/3),x=(i%3-1)*1.35,y=shelfY[row]+.012;
    const baseHeight=[.65,.57,.56,.55,.6,.47,.49,.54,.48][i];
    const material=new THREE.SpriteMaterial({transparent:true,alphaTest:.12,depthWrite:false,color:'#eee3c6'});
    const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.position.set(x,y,.19);
    sprite.scale.set(.7,baseHeight,1);sprite.userData.item=i;sprite.userData.height=baseHeight;cabinet.add(sprite);sprites.push(sprite);interactives.push(sprite);
    contactShadow(cabinet,x,y+.004,.17,.7,.4);
    loadTexture(item.photo).then(t=>{
      material.map=t;material.needsUpdate=true;
      const aspect=t.image.width/t.image.height;
      sprite.scale.set(Math.min(1.08,baseHeight*aspect),baseHeight,1);
      sprite.userData.baseScale=sprite.scale.clone();
    }).catch(()=>{sprite.visible=false;});
    const b=document.createElement('button');b.textContent=item.title;b.onclick=()=>openItem(i);document.querySelector('#object-buttons').append(b);
  });

  // Table and open album: volumetric furniture, two curved paper surfaces.
  const table=new THREE.Group();table.position.set(3.7,0,1.05);table.rotation.y=-.10;world.add(table);
  box(table,3.9,.16,2.5,0,1.28,0,walnut);
  box(table,3.97,.05,2.56,0,1.38,0,edgeWood);
  [-1,1].forEach(s=>[-1,1].forEach(t=>{
    const leg=box(table,.16,1.2,.16,s*1.65,.61,t*.94,darkWood);leg.rotation.z=s*.035;
  }));
  box(table,3.5,.23,.12,0,1.08,.99,darkWood);
  box(table,3.5,.23,.12,0,1.08,-.99,darkWood);
  contactShadow(world,3.7,.06,1.05,5,3.7);
  // The album stays a real object in the room through every interaction.
  const album=new THREE.Group();table.add(album);
  const albumClosedPosition=new THREE.Vector3(-.68,1.43,.12);
  const albumOpenPosition=new THREE.Vector3(.20,2.05,.80);
  album.position.copy(albumClosedPosition);album.rotation.y=.12;
  const bookCover=mat('#3d4939');
  box(album,1.36,.06,1.88,.67,0,0,bookCover);
  const rightStack=box(album,1.27,.13,1.77,.66,.095,0,paper);
  for(let k=0;k<5;k++)box(album,1.27,.004,1.77,.66,.045+k*.022,0,mat(k%2?'#b8aa8b':'#ddd0b2'),false);
  box(album,.09,.22,1.88,0,.10,0,bookCover);
  const frontHinge=new THREE.Group();frontHinge.position.set(0,.23,0);album.add(frontHinge);
  const frontCover=box(frontHinge,1.36,.055,1.88,.67,0,0,bookCover);
  const photoCoverMat=new THREE.MeshLambertMaterial({color:'#ffffff'});
  const coverPhoto=new THREE.Mesh(new THREE.PlaneGeometry(1.24,1.75),photoCoverMat);
  coverPhoto.rotation.x=-Math.PI/2;coverPhoto.position.set(.67,.030,0);frontHinge.add(coverPhoto);
  loadTexture('assets/album-cover.jpg').then(t=>{photoCoverMat.map=t;photoCoverMat.needsUpdate=true;});
  const pageCanvases=[],photoImages=[];
  let spread=0;
  const spreads=[
    {photos:[[0,2],[1,3]],notes:['август. ещё один день.','туда, где было тихо']},
    {photos:[[2,3],[0,1]],notes:['свернуть с дороги','остаться ещё немного']},
    {photos:[[1,0],[3,2]],notes:['всё это было с нами','и будет что вспомнить']}
  ];
  function drawPage(ctx,index,spreadIndex=spread){
    const w=1024,h=1280;ctx.fillStyle='#d3c6a6';ctx.fillRect(0,0,w,h);
    for(let n=0;n<5000;n++){ctx.fillStyle=n%2?'#fff2':'#40341d0a';ctx.fillRect((n*127.7)%w,(n*79.1)%h,1,1);}
    const info=spreads[spreadIndex];
    info.photos[index].forEach((p,j)=>{
      const img=photoImages[p],x=j?130:90,y=j?695:145,pw=j?760:840,ph=j?390:490;
      ctx.save();ctx.translate(x+pw/2,y+ph/2);ctx.rotate((index?1:-1)*(j?-.025:.018));
      ctx.fillStyle='#191c15';ctx.fillRect(-pw/2-12,-ph/2-12,pw+24,ph+24);
      if(img){const ratio=pw/ph;let sw=img.width,sh=img.height;if(sw/sh>ratio)sw=sh*ratio;else sh=sw/ratio;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,-pw/2,-ph/2,pw,ph);}
      else{ctx.fillStyle='#849379';ctx.fillRect(-pw/2,-ph/2,pw,ph);}
      ctx.fillStyle='#ede0b9';
      [[-pw/2-12,-ph/2-12,1,1],[pw/2+12,-ph/2-12,-1,1],[-pw/2-12,ph/2+12,1,-1],[pw/2+12,ph/2+12,-1,-1]].forEach(([x,y,sx,sy])=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+24*sx,y);ctx.lineTo(x,y+24*sy);ctx.fill();});ctx.restore();
    });
    ctx.fillStyle='#6b6149';ctx.font='italic 28px Georgia';ctx.fillText(info.notes[index],115,1175);
    ctx.font='19px monospace';ctx.fillText(String(spreadIndex*2+index+1).padStart(2,'0'),890,1220);
    const g=ctx.createLinearGradient(index?0:w,0,index?70:w-70,0);g.addColorStop(0,'#22190d66');g.addColorStop(1,'#22190d00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  function pageTexture(index){
    const c=document.createElement('canvas');c.width=1024;c.height=1280;const ctx=c.getContext('2d');drawPage(ctx,index);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;return {ctx,tex};
  }
  function pageGeometry(side){
    const g=new THREE.BufferGeometry(),v=[],uv=[],ind=[],n=28;
    for(let z=0;z<=1;z++)for(let i=0;i<=n;i++){
      const t=i/n,x=side===0?-1.29+t*1.27:.02+t*1.27;
      v.push(x,.185+.065*Math.exp(-Math.abs(x)*8)+.012*Math.pow(Math.abs(x)/1.29,4),(z-.5)*1.77);uv.push(t,1-z);
    }
    for(let i=0;i<n;i++){const a=i,b=i+1,c=i+n+1,d=i+n+2;ind.push(a,c,b,b,c,d);}
    g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return g;
  }
  const pageMeshes=[];
  for(let i=0;i<2;i++){
    const p=pageTexture(i);pageCanvases.push(p);
    const mesh=new THREE.Mesh(pageGeometry(i),new THREE.MeshLambertMaterial({map:p.tex,side:THREE.DoubleSide}));mesh.receiveShadow=true;mesh.userData.pageSide=i;album.add(mesh);pageMeshes.push(mesh);
  }
  pageMeshes[0].visible=false;
  for(let i=0;i<4;i++){
    const promise=new Promise(resolve=>{const img=new Image();img.onload=()=>{photoImages[i]=img;pageCanvases.forEach((p,j)=>{drawPage(p.ctx,j);p.tex.needsUpdate=true;});resolve();};img.onerror=()=>resolve();img.src='assets/photo-'+i+'.jpg';});assetPromises.push(promise);
  }
  const flipFront=pageTexture(1),flipBack=pageTexture(0);
  const turningPage=new THREE.Group();album.add(turningPage);turningPage.visible=false;
  const turningFront=new THREE.Mesh(pageGeometry(1),new THREE.MeshLambertMaterial({map:flipFront.tex,side:THREE.FrontSide}));
  const turningBack=new THREE.Mesh(pageGeometry(1),new THREE.MeshLambertMaterial({map:flipBack.tex,side:THREE.BackSide}));
  turningPage.add(turningFront,turningBack);
  const albumHit=new THREE.Mesh(new THREE.BoxGeometry(1.4,.4,1.94),new THREE.MeshBasicMaterial({visible:false}));albumHit.position.set(.67,.14,0);album.add(albumHit);
  const glowTex=textureCanvas(128,128,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,5,w/2,h/2,w/2);g.addColorStop(0,'#ffe1a0aa');g.addColorStop(.5,'#ffdc8060');g.addColorStop(1,'#ffdc8000');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);});
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(2.5,3.0),new THREE.MeshBasicMaterial({map:glowTex,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  glow.rotation.x=-Math.PI/2;glow.position.set(.67,-.025,0);album.add(glow);
  let albumState='closed',albumAnimation=null,pageAnimation=null,albumHovered=false,glowAmount=0;
  let albumOpenAmount=0;
  const albumHud=document.createElement('div');albumHud.id='album-hud';albumHud.hidden=true;
  albumHud.innerHTML='<button id="page-prev" aria-label="Предыдущий разворот">←</button><span id="page-count" aria-live="polite"></span><button id="page-next" aria-label="Следующий разворот">→</button><button id="album-close" aria-label="Закрыть альбом">×</button>';
  document.querySelector('#room').append(albumHud);
  const albumAccess=document.createElement('button');albumAccess.id='album-access';albumAccess.className='sr-only';albumAccess.textContent='Открыть фотоальбом';albumAccess.hidden=true;document.querySelector('#room').append(albumAccess);
  function refreshAlbumHud(){
    document.querySelector('#page-count').textContent=(spread*2+1)+'–'+(spread*2+2)+' / '+spreads.length*2;
    document.querySelector('#page-prev').disabled=spread===0||albumState!=='open';
    document.querySelector('#page-next').disabled=spread===spreads.length-1||albumState!=='open';
    document.querySelector('#album-close').disabled=albumState!=='open';
    albumHud.hidden=!['open','turning'].includes(albumState);
  }
  function poseAlbum(amount){
    albumOpenAmount=amount;
    album.position.lerpVectors(albumClosedPosition,albumOpenPosition,amount);
    album.rotation.set(.52*amount,.12,0);
    frontHinge.rotation.z=Math.PI*amount;
    pageMeshes[0].visible=amount>.76;
    // The inside page sits above the fully opened front cover.
    pageMeshes[0].position.y=.08;
  }
  function openAlbum(){
    if(!ready||flight||activeScene!==1||albumState!=='closed')return;
    albumState='opening';albumHovered=false;
    albumAnimation={start:performance.now(),duration:reducedMotion.matches?1:1500,from:0,to:1};
    document.querySelector('#room').dataset.album='opening';setNavigation(false);
  }
  function closeAlbum(){
    if(albumState!=='open')return;
    albumState='closing';refreshAlbumHud();
    albumAnimation={start:performance.now(),duration:reducedMotion.matches?1:1100,from:1,to:0};
    document.querySelector('#room').dataset.album='closing';setNavigation(false);
  }
  function turnPage(direction){
    const dest=spread+direction;if(albumState!=='open'||dest<0||dest>=spreads.length)return;
    albumState='turning';pageAnimation={start:performance.now(),duration:reducedMotion.matches?1:850,direction,dest,swapped:false};
    drawPage(flipFront.ctx,1,direction>0?spread:dest);flipFront.tex.needsUpdate=true;
    drawPage(flipBack.ctx,0,direction>0?dest:spread);flipBack.tex.needsUpdate=true;
    turningPage.visible=true;turningPage.rotation.z=direction>0?0:Math.PI;
    refreshAlbumHud();
  }
  albumAccess.onclick=openAlbum;
  document.querySelector('#album-close').onclick=closeAlbum;
  document.querySelector('#page-prev').onclick=()=>turnPage(-1);
  document.querySelector('#page-next').onclick=()=>turnPage(1);
  function animateAlbum(now){
    if(albumAnimation){
      const t=Math.min(1,(now-albumAnimation.start)/albumAnimation.duration),ease=t*t*(3-2*t);
      const amount=THREE.MathUtils.lerp(albumAnimation.from,albumAnimation.to,ease);
      poseAlbum(amount);
      album.position.y+=Math.sin(Math.PI*t)*.22;
      if(t===1){albumState=albumAnimation.to===1?'open':'closed';albumAnimation=null;poseAlbum(albumState==='open'?1:0);document.querySelector('#room').dataset.album=albumState;refreshAlbumHud();setNavigation(false);}
    }
    if(pageAnimation){
      const a=pageAnimation,t=Math.min(1,(now-a.start)/a.duration),ease=t*t*(3-2*t);
      turningPage.rotation.z=(a.direction>0?ease:1-ease)*Math.PI;
      turningPage.position.y=.05+Math.sin(t*Math.PI)*.12;
      if(t>.5&&!a.swapped){a.swapped=true;spread=a.dest;pageCanvases.forEach((p,j)=>{drawPage(p.ctx,j);p.tex.needsUpdate=true;});}
      if(t===1){turningPage.visible=false;pageAnimation=null;albumState='open';refreshAlbumHud();}
    }
    const wanted=albumHovered&&albumState==='closed'?1:0;
    glowAmount+=(wanted-glowAmount)*.12;glow.material.opacity=glowAmount*.75;
    bookCover.emissive.set('#d9af54');bookCover.emissiveIntensity=glowAmount*.22;
    photoCoverMat.emissive.set('#ddbb75');photoCoverMat.emissiveIntensity=glowAmount*.17;
    if(albumState==='open'&&!reducedMotion.matches)album.position.y=albumOpenPosition.y+Math.sin(now*.0011)*.014;
  }
  poseAlbum(0);refreshAlbumHud();

  // A desk lamp anchors the second viewpoint and pools warm light on paper.
  cylinder(table,.25,.30,.055,1.25,1.44,-.63,brass);
  cylinder(table,.025,.025,.87,1.25,1.88,-.63,brass);
  const shade=cylinder(table,.18,.39,.35,1.25,2.35,-.63,mat('#626d4b'));
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:'#fff1b4'}));bulb.position.set(1.25,2.18,-.63);table.add(bulb);
  const lampLight=new THREE.PointLight('#ffd990',13,6,2);lampLight.position.set(1.25,2.15,-.63);table.add(lampLight);
  const coaster=cylinder(table,.16,.16,.025,-1.5,1.44,-.75,darkWood);
  cylinder(table,.11,.10,.20,-1.5,1.55,-.75,mat('#b3aa8d'));
  const coffee=cylinder(table,.095,.095,.008,-1.5,1.653,-.75,mat('#34291d'));
  // A pool of light behind the cabinet separates it from the room.
  scene.add(new THREE.HemisphereLight('#c6cbb4','#272117',2.0));
  const keyLight=new THREE.DirectionalLight('#ffdb9e',3.4);keyLight.position.set(-4,7,6);keyLight.castShadow=true;
  keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-10;keyLight.shadow.camera.right=10;keyLight.shadow.camera.top=10;keyLight.shadow.camera.bottom=-8;keyLight.shadow.normalBias=.035;scene.add(keyLight);
  const cabinetLight=new THREE.PointLight('#ffd08b',17,8,2);cabinetLight.position.set(-3,5.6,2);scene.add(cabinetLight);
  const fill=new THREE.PointLight('#9cae9b',8,12,2);fill.position.set(4,4,6);scene.add(fill);
  // Small wall fixtures; these are scenery, not additional camera stops.
  [-6.3,.2].forEach(x=>{
    box(world,.13,.36,.15,x,3.9,-.85,brass);
    const light=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),new THREE.MeshBasicMaterial({color:'#f2d195'}));light.position.set(x,4.04,-.63);world.add(light);
    const l=new THREE.PointLight('#f5ce89',4,4,2);l.position.copy(light.position);scene.add(l);
  });

  // Full-screen camera shader: a low-resolution image, ordered dithering,
  // 5-bit colour channels, mild grain and vignette. No CSS filter substitute.
  const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:true});
  const postScene=new THREE.Scene(),postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const uniforms={tDiffuse:{value:target.texture},resolution:{value:new THREE.Vector2(1,1)},time:{value:0}};
  const post=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
    fragmentShader:`
      precision highp float;
      uniform sampler2D tDiffuse;uniform vec2 resolution;uniform float time;varying vec2 vUv;
      float bayer(vec2 p){
        vec2 a=mod(floor(p),2.0);vec2 b=mod(floor(p/2.0),2.0);
        float lo=2.0*a.x+3.0*a.y-4.0*a.x*a.y;
        float hi=2.0*b.x+3.0*b.y-4.0*b.x*b.y;
        return (lo*4.0+hi)/16.0-.46875;
      }
      float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.0,1.0);}
      void main(){
        vec2 uv=(floor(vUv*resolution)+.5)/resolution;
        vec3 c=texture2D(tDiffuse,uv).rgb;
        c=pow(film(c*.80),vec3(1.0/2.2));
        float lum=dot(c,vec3(.299,.587,.114));c=mix(vec3(lum),c,.78);
        c*=vec3(1.025,1.01,.94);
        float vignette=1.0-smoothstep(.2,.88,length((vUv-.5)*vec2(1.02,1.0)));
        c*=mix(.64,1.0,vignette);
        c+=(noise(floor(vUv*resolution)+floor(time*12.0))-.5)*.013;
        c=floor(c*31.0+bayer(vUv*resolution)*.85+.5)/31.0;
        c*=1.0-.018*step(.5,fract(vUv.y*resolution.y*.5));
        gl_FragColor=vec4(c,1.0);
      }`});
  postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),post));
  function resize(){
    renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
    const height=Math.min(360,Math.floor(innerHeight*.65)),width=Math.round(height*camera.aspect);target.setSize(width,height);uniforms.resolution.value.set(width,height);
    cameraStops();if(!flight){camera.position.copy(positions[activeScene]);viewTarget.copy(targets[activeScene]);camera.lookAt(viewTarget);}
  }
  addEventListener('resize',()=>{if(flight){flight=null;setNavigation(false);}resize();});resize();
  function setNavigation(moving){prev.disabled=next.disabled=moving||!ready||(activeScene===1&&albumState!=='closed');document.querySelector('#room').setAttribute('aria-busy',String(moving));}
  function updateCaption(){
    document.querySelector('#scene-title').textContent=activeScene===0?'Шкаф с вещами':'Фотоальбом';
    document.querySelector('#scene-subtitle').textContent=activeScene===0?'У каждой вещи — своя история':'Места, в которые можно вернуться';
    document.querySelector('#scene-number').textContent=activeScene===0?'01 / 02':'02 / 02';
    document.querySelector('#scene-kind').textContent=activeScene===0?'ЛИЧНЫЙ АРХИВ':'НА ПАМЯТЬ';
    document.querySelectorAll('.scene-dots i').forEach((el,i)=>el.classList.toggle('active',i===activeScene));
    document.querySelector('#object-buttons').hidden=activeScene!==0;albumAccess.hidden=activeScene!==1;
  }
  function switchScene(){
    if(flight||!ready||document.querySelector('#detail').open||albumState!=='closed')return;
    const from=camera.position.clone(),fromTarget=viewTarget.clone();activeScene=1-activeScene;updateCaption();
    if(reducedMotion.matches){camera.position.copy(positions[activeScene]);viewTarget.copy(targets[activeScene]);camera.lookAt(viewTarget);return;}
    const to=positions[activeScene].clone();
    const middle=from.clone().lerp(to,.5);middle.z+=1.65;middle.y+=.3;
    flight={start:performance.now(),duration:2200,curve:new THREE.QuadraticBezierCurve3(from,middle,to),fromTarget,toTarget:targets[activeScene].clone()};
    setNavigation(true);setHover(null);
  }
  prev.onclick=next.onclick=switchScene;
  function setHover(sprite){
    if(hovered===sprite)return;
    if(hovered){hovered.material.color.set('#eee3c6');if(hovered.userData.baseScale)hovered.scale.copy(hovered.userData.baseScale);}
    hovered=sprite;canvas.style.cursor=sprite?'pointer':'default';
    if(sprite){sprite.material.color.set('#fff8e5');if(sprite.userData.baseScale)sprite.scale.copy(sprite.userData.baseScale).multiplyScalar(1.035);}
  }
  function pick(e){
    if(!ready||flight)return null;
    const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
    if(activeScene===1){const candidates=albumState==='closed'?[albumHit]:albumState==='open'?pageMeshes:[];return raycaster.intersectObjects(candidates).find(hit=>hit.object.visible)?.object||null;}
    return raycaster.intersectObjects(interactives).find(hit=>hit.object.visible)?.object||null;
  }
  canvas.addEventListener('pointermove',e=>{const hit=pick(e);if(activeScene===0){setHover(hit);albumHovered=false;}else{albumHovered=hit===albumHit;canvas.style.cursor=hit?'pointer':'default';}});
  canvas.addEventListener('pointerleave',()=>{setHover(null);albumHovered=false;canvas.style.cursor='default';});
  canvas.addEventListener('click',e=>{const hit=pick(e);if(!hit)return;if(activeScene===0)openItem(hit.userData.item);else if(albumState==='closed')openAlbum();else if(albumState==='open')turnPage(hit.userData.pageSide===0?-1:1);});
  const dialog=document.querySelector('#detail');
  function openItem(i){
    if(flight||activeScene!==0)return;
    const item=items[i];document.querySelector('#detail-title').textContent=item.title;document.querySelector('#detail-description').textContent=item.description;
    document.querySelector('#detail-date').textContent=item.date;const img=document.querySelector('#detail-photo');img.src=item.photo;img.alt=item.title;
    dialog.showModal();setHover(null);
  }
  document.querySelector('.close').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  addEventListener('keydown',e=>{if(dialog.open)return;if(e.key==='Escape'&&albumState==='open'){closeAlbum();return;}if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();if(albumState==='open')turnPage(e.key==='ArrowRight'?1:-1);else switchScene();}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
  function animate(now){
    if(flight){
      const t=Math.min(1,(now-flight.start)/flight.duration);const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      camera.position.copy(flight.curve.getPoint(eased));viewTarget.lerpVectors(flight.fromTarget,flight.toTarget,eased);camera.lookAt(viewTarget);
      if(t===1){flight=null;setNavigation(false);}
    }
    if(!flight&&activeScene===0&&!reducedMotion.matches){
      const t=now*.001;camera.position.copy(positions[0]);camera.position.x+=Math.sin(t*.38)*.035;camera.position.y+=Math.sin(t*.51)*.025;camera.position.z+=Math.sin(t*.22)*.035;
      camera.lookAt(targets[0]);camera.rotation.z+=Math.sin(t*.075)*.012;
    }
    animateAlbum(now);
    uniforms.time.value=reducedMotion.matches?0:now*.001;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  renderer.setAnimationLoop(animate);
  await Promise.allSettled(assetPromises);
  ready=true;setNavigation(false);loading.classList.add('done');document.body.dataset.ready='true';
}
