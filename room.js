import {items} from './items.js?v=belaz-case-1';

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
  let activeScene=0, flight=null, hovered=null, ready=false, focusState=null;
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
  box(world,20,30,.2,0,15,-1.1,wallMat,false);
  box(world,.2,30,18,-9.8,15,5,wallMat,false);
  box(world,.2,30,18,9.8,15,5,wallMat,false);
  box(world,20,.16,.18,0,.16,-.94,trimMat,false);
  box(world,20,1.1,.12,0,.66,-.95,panelMat,false);
  box(world,20,.07,.2,0,1.25,-.89,trimMat,false);
  // Continue the skirting, lower panel and cap around the left corner.
  box(world,.18,.16,18,-9.64,.16,5,trimMat,false);
  box(world,.12,1.1,18,-9.65,.66,5,panelMat,false);
  box(world,.2,.07,18,-9.59,1.25,5,trimMat,false);
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
      loadedCount++;document.querySelector('.loading-line i').style.width=Math.min(100,loadedCount/(items.length+1)*100)+'%';resolve(t);
    },undefined,reject));assetPromises.push(promise);return promise;
  }
  items.forEach((item,i)=>{
    const row=Math.floor(i/3),x=(i%3-1)*1.35,y=shelfY[row]+.012;
    const baseHeight=.68;
    const sizeFactor=['Потус','Котик «Верим»'].includes(item.title)?1:1/3;
    const material=new THREE.SpriteMaterial({transparent:true,alphaTest:.12,depthWrite:false,color:'#eee3c6'});
    const sprite=new THREE.Sprite(material);sprite.center.set(.5,0);sprite.position.set(x,y,.19);
    sprite.scale.set(.7,baseHeight,1);sprite.userData.item=i;sprite.userData.height=baseHeight;cabinet.add(sprite);sprites.push(sprite);interactives.push(sprite);
    contactShadow(cabinet,x,y+.004,.17,.7*sizeFactor,.4*sizeFactor);
    loadTexture(item.photo).then(t=>{
      material.map=t;material.needsUpdate=true;
      const aspect=t.image.width/t.image.height;
      const height=Math.min(baseHeight,1.30/aspect)*sizeFactor;
      sprite.scale.set(height*aspect,height,1);sprite.userData.height=height;
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
    {photos:[[],[0,1,2]],notes:['%ВСТАВИТЬ_ТЕКСТ%','%ВСТАВИТЬ_ТЕКСТ%']},
    {photos:[[3,4,5],[6,7,8]],notes:['%ВСТАВИТЬ_ТЕКСТ%','%ВСТАВИТЬ_ТЕКСТ%']}
  ];
  function photoRect(side,slot,spreadIndex=spread){
    const list=spreads[spreadIndex].photos[side],img=photoImages[list[slot]];
    const col=slot%2,row=Math.floor(slot/2),wide=list.length===3&&slot===2;
    const bx=wide?92:92+col*458,by=155+row*462,mw=wide?840:382,mh=400;
    const scale=img?Math.min(mw/img.width,mh/img.height):1;
    const w=img?img.width*scale:mw,h=img?img.height*scale:mh;
    return {x:bx+(mw-w)/2,y:by+(mh-h)/2,w,h,angle:(side?1:-1)*[.018,-.025,-.012,.02][slot]};
  }
  function drawPage(ctx,index,spreadIndex=spread){
    const w=1024,h=1280;ctx.fillStyle='#d3c6a6';ctx.fillRect(0,0,w,h);
    for(let n=0;n<5000;n++){ctx.fillStyle=n%2?'#fff2':'#40341d0a';ctx.fillRect((n*127.7)%w,(n*79.1)%h,1,1);}
    const info=spreads[spreadIndex];
    info.photos[index].forEach((p,j)=>{
      const img=photoImages[p];if(!img)return;
      const {x,y,w:pw,h:ph,angle}=photoRect(index,j,spreadIndex);
      ctx.save();ctx.translate(x+pw/2,y+ph/2);ctx.rotate(angle);
      ctx.fillStyle='#191c15';ctx.fillRect(-pw/2-12,-ph/2-12,pw+24,ph+24);
      ctx.drawImage(img,-pw/2,-ph/2,pw,ph);
      ctx.fillStyle='#ede0b9';
      [[-pw/2-12,-ph/2-12,1,1],[pw/2+12,-ph/2-12,-1,1],[-pw/2-12,ph/2+12,1,-1],[pw/2+12,ph/2+12,-1,-1]].forEach(([x,y,sx,sy])=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+24*sx,y);ctx.lineTo(x,y+24*sy);ctx.fill();});ctx.restore();
    });
    ctx.fillStyle='#6b6149';ctx.font='italic 28px Georgia';ctx.fillText(info.notes[index],115,1175);
    ctx.font='19px monospace';ctx.fillText(String(spreadIndex*2+index+1).padStart(2,'0'),890,1220);
    if((index===0&&spreadIndex>0)||(index===1&&spreadIndex<spreads.length-1)){
      const x=index===0?0:w,dx=index===0?1:-1;
      ctx.fillStyle='#a89a79';ctx.beginPath();ctx.moveTo(x,h);ctx.lineTo(x+dx*150,h);ctx.lineTo(x,h-170);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#6b6149';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+dx*32,h-50);ctx.lineTo(x+dx*64,h-50);ctx.moveTo(x+dx*48,h-66);ctx.lineTo(x+dx*32,h-50);ctx.lineTo(x+dx*48,h-34);ctx.stroke();
    }
    const g=ctx.createLinearGradient(index?0:w,0,index?70:w-70,0);g.addColorStop(0,'#22190d66');g.addColorStop(1,'#22190d00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  function pageTexture(index,spreadIndex=spread){
    const c=document.createElement('canvas');c.width=1024;c.height=1280;const ctx=c.getContext('2d');drawPage(ctx,index,spreadIndex);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=THREE.NearestFilter;return {ctx,tex};
  }
  function pageGeometry(side){
    const g=new THREE.BufferGeometry(),v=[],uv=[],ind=[],n=28;
    for(let z=0;z<=1;z++)for(let i=0;i<=n;i++){
      const t=i/n,x=side===0?-1.29+t*1.27:.02+t*1.27;
      v.push(x,.185+.025*Math.exp(-Math.abs(x)*8),(z-.5)*1.77);uv.push(t,1-z);
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
  const albumHighlights=pageMeshes.map((page,side)=>{
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1280;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(pageGeometry(side),material);mesh.position.y=.004;mesh.renderOrder=2;album.add(mesh);
    return {canvas,texture,mesh};
  });
  let albumHighlightKey='',albumHighlightSide=-1;
  function highlightAlbumAction(page,action){
    const side=page?.userData.pageSide;
    const key=action?side+':'+(action.direction?'corner':action.slot):'';
    if(key===albumHighlightKey)return;
    albumHighlightKey=key;albumHighlightSide=action?side:-1;
    if(!action)return;
    const h=albumHighlights[side],ctx=h.canvas.getContext('2d');ctx.clearRect(0,0,1024,1280);
    ctx.strokeStyle='#fff3bb';ctx.fillStyle='#fff1b930';ctx.lineWidth=12;ctx.shadowColor='#ffe7a0';ctx.shadowBlur=18;
    if(action.direction){
      const x=side===0?0:1024,dx=side===0?1:-1;
      ctx.beginPath();ctx.moveTo(x,1280);ctx.lineTo(x+dx*150,1280);ctx.lineTo(x,1110);ctx.closePath();ctx.fill();ctx.stroke();
    }else{
      const {x,y,w,h,angle}=photoRect(side,action.slot);
      ctx.save();ctx.translate(x+w/2,y+h/2);ctx.rotate(angle);
      ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeRect(-w/2-6,-h/2-6,w+12,h+12);ctx.restore();
    }
    h.texture.needsUpdate=true;
  }
  for(let i=0;i<9;i++){
    const promise=new Promise(resolve=>{const img=new Image();img.onload=()=>{photoImages[i]=img;pageCanvases.forEach((p,j)=>{drawPage(p.ctx,j);p.tex.needsUpdate=true;});resolve();};img.onerror=()=>resolve();img.src='assets/album-photo-'+i+'.webp';});assetPromises.push(promise);
  }
  // Cache every spread once, after all photographs have decoded.
  let pageCache=[];
  function showSpread(index){
    pageMeshes.forEach((mesh,side)=>{mesh.material.map=pageCache[index][side].tex;});
    pageMeshes[0].visible=index>0&&albumOpenAmount>.76;
  }
  const turningPage=new THREE.Group();album.add(turningPage);turningPage.visible=false;
  const turnGeometry=new THREE.PlaneGeometry(1.27,1.77,28,1);
  const turnBackGeometry=turnGeometry.clone();
  const turnUV=turnGeometry.attributes.uv,backUV=turnBackGeometry.attributes.uv;
  for(let i=0;i<backUV.count;i++)backUV.setXY(i,1-turnUV.getX(i),turnUV.getY(i));
  const turningFront=new THREE.Mesh(turnGeometry,new THREE.MeshLambertMaterial({side:THREE.FrontSide}));
  const turningBack=new THREE.Mesh(turnBackGeometry,new THREE.MeshLambertMaterial({side:THREE.BackSide}));
  turningPage.add(turningFront,turningBack);
  function poseTurningSheet(angle){
    // The hinge is above BOTH resting pages. Rotation never sends a sheet
    // below the page stack; a small arch adds clearance during the turn.
    const c=Math.cos(angle),sn=Math.sin(angle);
    for(let i=0;i<turnUV.count;i++){
      const u=turnUV.getX(i),v=turnUV.getY(i),r=.02+u*1.27;
      const x=r*c,y=.190+.025*Math.exp(-r*8)+r*sn+.07*Math.sin(Math.PI*u)*sn,z=(.5-v)*1.77;
      turnGeometry.attributes.position.setXYZ(i,x,y,z);
      turnBackGeometry.attributes.position.setXYZ(i,x,y,z);
    }
    for(const g of [turnGeometry,turnBackGeometry]){g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
  }
  const albumHit=new THREE.Mesh(new THREE.BoxGeometry(1.4,.4,1.94),new THREE.MeshBasicMaterial({visible:false}));albumHit.position.set(.67,.14,0);album.add(albumHit);
  const closeTexture=textureCanvas(16,16,(ctx)=>{
    ctx.fillStyle='#ffffff';
    for(let i=3;i<=12;i++){ctx.fillRect(i,i,2,2);ctx.fillRect(15-i,i,2,2);}
  });
  closeTexture.magFilter=THREE.NearestFilter;closeTexture.minFilter=THREE.NearestFilter;
  const albumCloseMark=new THREE.Mesh(new THREE.PlaneGeometry(.18,.18),new THREE.MeshBasicMaterial({map:closeTexture,color:'#342b1d',transparent:true,alphaTest:.15,depthWrite:false,side:THREE.DoubleSide}));
  albumCloseMark.rotation.x=-Math.PI/2;albumCloseMark.position.set(1.20,.245,-.80);album.add(albumCloseMark);
  const albumCloseHit=new THREE.Mesh(new THREE.BoxGeometry(.28,.10,.28),new THREE.MeshBasicMaterial({visible:false}));
  albumCloseHit.position.copy(albumCloseMark.position);album.add(albumCloseHit);
  let albumState='closed',albumAnimation=null,pageAnimation=null,albumHovered=false,hoverLift=0;
  let albumOpenAmount=0;
  const albumHud=document.createElement('div');albumHud.id='album-hud';albumHud.hidden=true;
  albumHud.innerHTML='<button id="page-prev" aria-label="Предыдущий разворот">←</button><span id="page-count" aria-live="polite"></span><button id="page-next" aria-label="Следующий разворот">→</button><button id="album-close" aria-label="Закрыть альбом">×</button>';
  document.querySelector('#room').append(albumHud);
  for(const id of ['page-prev','page-next']){const button=document.getElementById(id);button.className='sr-only';button.style.position='absolute';}
  const photoModal=document.createElement('dialog');photoModal.id='album-photo-modal';photoModal.setAttribute('aria-label','Фотография из альбома');
  photoModal.innerHTML='<button type="button" autofocus aria-label="Закрыть фотографию">×</button><img alt="Фотография из альбома">';
  const photoStyle=document.createElement('style');
  photoStyle.textContent=`
    #album-photo-modal{padding:0;border:0;background:transparent;width:fit-content;max-width:94vw;max-height:92dvh;overflow:visible;box-shadow:none;color:#fff}
    #album-photo-modal::backdrop{background:#080a07ed;backdrop-filter:blur(8px)}
    #album-photo-modal img{display:block;max-width:94vw;max-height:88dvh;width:auto;height:auto;object-fit:contain}
    #album-photo-modal button{position:fixed;right:max(28px,env(safe-area-inset-right));top:max(28px,env(safe-area-inset-top));width:42px;height:42px;padding:0;border:0;border-radius:0;background:transparent;color:#fff;font:36px/1 Arial;z-index:1}
    #album-photo-modal[open]{animation:photo-modal-appear .3s ease both}
    #album-photo-modal[open] img{animation:photo-image-appear .4s cubic-bezier(.16,1,.3,1) both}
    #album-photo-modal[open]::backdrop{animation:photo-modal-appear .3s ease both}
    @keyframes photo-modal-appear{from{opacity:0}to{opacity:1}}
    @keyframes photo-image-appear{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media(max-width:700px){#album-photo-modal button{right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top))}}
    @media(prefers-reduced-motion:reduce){#album-photo-modal[open],#album-photo-modal[open] img,#album-photo-modal[open]::backdrop{animation:none}}
  `;
  document.head.append(photoStyle);document.body.append(photoModal);
  photoModal.querySelector('button').onclick=()=>photoModal.close();
  photoModal.addEventListener('click',e=>{if(e.target===photoModal)photoModal.close();});
  function openAlbumPhoto(index){highlightAlbumAction(null,null);photoModal.querySelector('img').src=photoImages[index].src;photoModal.showModal();}
  function albumPageAction(mesh,uv){
    if(!uv||albumState!=='open')return null;
    const side=mesh.userData.pageSide,x=uv.x*1024,y=(1-uv.y)*1280;
    if(y>1110&&(side===0?x<150:x>874)){
      const direction=side===0?-1:1;
      return spread+direction>=0&&spread+direction<spreads.length?{direction}:null;
    }
    for(let j=0;j<spreads[spread].photos[side].length;j++){
      const {x:px,y:py,w,h,angle}=photoRect(side,j);
      const dx=x-(px+w/2),dy=y-(py+h/2);
      const localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle);
      if(Math.abs(localX)<=w/2&&Math.abs(localY)<=h/2)return {photo:spreads[spread].photos[side][j],slot:j};
    }
    return null;
  }
  const albumAccess=document.createElement('button');albumAccess.id='album-access';albumAccess.className='sr-only';albumAccess.textContent='Открыть фотоальбом';albumAccess.hidden=true;document.querySelector('#room').append(albumAccess);
  function refreshAlbumHud(){
    albumAccess.textContent=albumState==='open'?'Закрыть фотоальбом':'Открыть фотоальбом';
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
    frontHinge.position.y=.23-.10*amount;
    pageMeshes[0].visible=spread>0&&amount>.76;
    // The inside page sits above the fully opened front cover.
    pageMeshes[0].position.y=0;
  }
  function openAlbum(){
    if(!ready||flight||activeScene!==1||albumState!=='closed')return;
    albumState='opening';albumHovered=false;
    albumAnimation={start:performance.now(),duration:reducedMotion.matches?1:1500,from:0,to:1};
    document.querySelector('#room').dataset.album='opening';setNavigation(false);
  }
  function closeAlbum(){
    highlightAlbumAction(null,null);
    if(albumState!=='open')return;
    albumState='closing';refreshAlbumHud();
    albumAnimation={start:performance.now(),duration:reducedMotion.matches?1:1100,from:1,to:0};
    document.querySelector('#room').dataset.album='closing';setNavigation(false);
  }
  function turnPage(direction){
    const dest=spread+direction;if(albumState!=='open'||dest<0||dest>=spreads.length||!pageCache.length)return;
    albumState='turning';highlightAlbumAction(null,null);
    pageAnimation={start:performance.now(),duration:reducedMotion.matches?1:1100,direction,dest};
    if(direction>0){
      turningFront.material.map=pageCache[spread][1].tex;
      turningBack.material.map=pageCache[dest][0].tex;
      pageMeshes[1].material.map=pageCache[dest][1].tex;
    }else{
      turningFront.material.map=pageCache[dest][1].tex;
      turningBack.material.map=pageCache[spread][0].tex;
      pageMeshes[0].material.map=pageCache[dest][0].tex;
      pageMeshes[0].visible=dest>0;
    }
    poseTurningSheet(direction>0?0:Math.PI);turningPage.visible=true;
    refreshAlbumHud();
  }
  albumAccess.onclick=()=>albumState==='open'?closeAlbum():openAlbum();
  document.querySelector('#album-close').onclick=closeAlbum;
  document.querySelector('#page-prev').onclick=()=>turnPage(-1);
  document.querySelector('#page-next').onclick=()=>turnPage(1);
  function animateAlbum(now){
    albumCloseMark.visible=albumState==='open'||albumState==='turning';
    albumHighlights.forEach((h,side)=>{
      const visible=albumState==='open'&&!photoModal.open&&pageMeshes[side].visible;
      h.mesh.visible=visible;
      const target=visible&&albumHighlightSide===side?1:0;
      h.mesh.material.opacity=reducedMotion.matches?target:THREE.MathUtils.lerp(h.mesh.material.opacity,target,.22);
    });
    if(albumAnimation){
      const t=Math.min(1,(now-albumAnimation.start)/albumAnimation.duration),ease=t*t*(3-2*t);
      const amount=THREE.MathUtils.lerp(albumAnimation.from,albumAnimation.to,ease);
      poseAlbum(amount);
      album.position.y+=Math.sin(Math.PI*t)*.22;
      if(t===1){albumState=albumAnimation.to===1?'open':'closed';albumAnimation=null;poseAlbum(albumState==='open'?1:0);if(albumState==='closed'){spread=0;showSpread(0);turningPage.visible=false;highlightAlbumAction(null,null);}document.querySelector('#room').dataset.album=albumState;refreshAlbumHud();setNavigation(false);}
    }
    if(pageAnimation){
      const a=pageAnimation,t=Math.min(1,(now-a.start)/a.duration),ease=t*t*(3-2*t);
      poseTurningSheet((a.direction>0?ease:1-ease)*Math.PI);
      if(t===1){spread=a.dest;showSpread(spread);turningPage.visible=false;pageAnimation=null;albumState='open';refreshAlbumHud();}
    }
    const wanted=albumHovered&&albumState==='closed'?1:0;
    hoverLift+=(wanted-hoverLift)*.10;
    if(albumState==='closed'){
      album.position.copy(albumClosedPosition);album.position.y+=hoverLift*.025;
      album.rotation.set(0,.12,reducedMotion.matches?0:Math.sin(now*.0018)*.018*hoverLift);
    }
    if(albumState==='open'&&!reducedMotion.matches)album.position.y=albumOpenPosition.y+Math.sin(now*.0011)*.014;
  }
  poseAlbum(0);refreshAlbumHud();

  // A desk lamp anchors the second viewpoint and pools warm light on paper.
  cylinder(table,.25,.30,.055,1.25,1.44,-.63,brass);
  cylinder(table,.025,.025,.87,1.25,1.88,-.63,brass);
  const shade=cylinder(table,.18,.39,.35,1.25,2.35,-.63,mat('#626d4b'));
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:'#fff1b4'}));bulb.position.set(1.25,2.18,-.63);table.add(bulb);
  const lampLight=new THREE.PointLight('#ffd990',13,6,2);lampLight.position.set(1.25,2.15,-.63);table.add(lampLight);
  const lampCord=new THREE.Group();lampCord.position.set(1.43,2.23,-.50);table.add(lampCord);
  const cordMaterial=mat('#c3b18d');
  cylinder(lampCord,.014,.014,.36,0,-.18,0,cordMaterial,6);
  const cordKnob=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),mat('#a78c54'));cordKnob.position.y=-.40;lampCord.add(cordKnob);
  const cordHit=new THREE.Mesh(new THREE.BoxGeometry(.22,.56,.22),new THREE.MeshBasicMaterial({visible:false}));cordHit.position.y=-.21;lampCord.add(cordHit);
  let lampOn=true,lampPullStart=-Infinity;
  let lampAudio=null;
  function playLampClick(){
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    try{
      lampAudio??=new Audio();
      if(lampAudio.state==='suspended')lampAudio.resume().catch(()=>{});
      const now=lampAudio.currentTime,rate=lampAudio.sampleRate;
      // Two tiny, filtered noise impulses mimic a mechanical pull switch.
      for(const [delay,duration,volume] of [[0,.018,.24],[.025,.012,.12]]){
        const buffer=lampAudio.createBuffer(1,Math.ceil(rate*duration),rate),data=buffer.getChannelData(0);
        for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,3);
        const source=lampAudio.createBufferSource(),filter=lampAudio.createBiquadFilter(),gain=lampAudio.createGain();
        source.buffer=buffer;filter.type='bandpass';filter.frequency.value=lampOn?1800:1400;filter.Q.value=.7;gain.gain.value=volume;
        source.connect(filter);filter.connect(gain);gain.connect(lampAudio.destination);
        source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(now+delay);
      }
    }catch{}
  }
  function toggleLamp(){
    lampOn=!lampOn;lampPullStart=performance.now();playLampClick();
    bulb.material.color.set(lampOn?'#fff1b4':'#514a36');
  }
  function animateLamp(now){
    lampLight.intensity=THREE.MathUtils.lerp(lampLight.intensity,lampOn?13:0,.18);
    const t=Math.min(1,(now-lampPullStart)/500);
    lampCord.position.y=2.23-(reducedMotion.matches?0:Math.sin(t*Math.PI)*.08);
  }
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
    cameraStops();if(!flight&&!focusState){camera.position.copy(positions[activeScene]);viewTarget.copy(targets[activeScene]);camera.lookAt(viewTarget);}
  }
  addEventListener('resize',()=>{if(flight){const complete=flight.complete;flight=null;complete?.();setNavigation(false);}resize();if(focusState?.phase==='open'){const pose=itemCameraPose(focusState.point);camera.position.copy(pose.position);viewTarget.copy(pose.target);camera.lookAt(viewTarget);placeDescription();}});resize();
  function setNavigation(moving){prev.disabled=next.disabled=moving||!ready||!!focusState||(activeScene===1&&albumState!=='closed');document.querySelector('#room').setAttribute('aria-busy',String(moving));}
  function updateCaption(){
    document.querySelector('#scene-title').textContent=activeScene===0?'Шкаф':'Альбом';
    document.querySelector('#scene-subtitle').textContent='%ВСТАВИТЬ_ТЕКСТ%';
    document.querySelector('#scene-number').textContent=activeScene===0?'01 / 02':'02 / 02';
    document.querySelector('#scene-kind').textContent=activeScene===0?'ЛИЧНЫЙ АРХИВ':'НА ПАМЯТЬ';
    document.querySelectorAll('.scene-dots i').forEach((el,i)=>el.classList.toggle('active',i===activeScene));
    document.querySelector('#object-buttons').hidden=activeScene!==0;albumAccess.hidden=activeScene!==1;
  }
  function switchScene(){
    if(flight||!ready||focusState||albumState!=='closed')return;
    const from=camera.position.clone(),fromTarget=viewTarget.clone();activeScene=1-activeScene;updateCaption();
    if(reducedMotion.matches){camera.position.copy(positions[activeScene]);viewTarget.copy(targets[activeScene]);camera.lookAt(viewTarget);return;}
    playCameraWhoosh(activeScene===0,true);
    const to=positions[activeScene].clone();
    const middle=from.clone().lerp(to,.5);middle.z+=1.65;middle.y+=.3;
    flight={start:performance.now(),duration:2200,curve:new THREE.QuadraticBezierCurve3(from,middle,to),fromTarget,toTarget:targets[activeScene].clone(),fromQuaternion:camera.quaternion.clone(),toQuaternion:cameraQuaternion(to,targets[activeScene]),endPosition:to.clone(),followShelf:activeScene===0};
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
    if(activeScene===1){const candidates=albumState==='closed'?[cordHit,albumHit]:albumState==='open'?[cordHit,albumCloseHit,...pageMeshes]:[];const hit=raycaster.intersectObjects(candidates).find(hit=>hit.object.visible);if(hit)hit.object.userData.hitUV=hit.uv;return hit?.object||null;}
    return raycaster.intersectObjects(interactives).find(hit=>hit.object.visible)?.object||null;
  }
  canvas.addEventListener('pointermove',e=>{const hit=pick(e);if(activeScene===0){setHover(hit);albumHovered=false;highlightAlbumAction(null,null);}else{albumHovered=hit===albumHit;cordKnob.material.color.set(hit===cordHit?'#ffe3a0':'#a78c54');const action=hit&&hit!==albumHit&&hit!==albumCloseHit&&hit!==cordHit?albumPageAction(hit,hit.userData.hitUV):null;albumCloseMark.material.color.set(hit===albumCloseHit?'#100e09':'#342b1d');albumCloseMark.scale.setScalar(hit===albumCloseHit?1.15:1);highlightAlbumAction(hit,action);canvas.style.cursor=hit&&(hit===albumHit||hit===albumCloseHit||hit===cordHit||action)?'pointer':'default';}});
  canvas.addEventListener('pointerleave',()=>{highlightAlbumAction(null,null);setHover(null);albumHovered=false;canvas.style.cursor='default';});
  canvas.addEventListener('click',e=>{const hit=pick(e);if(!hit){
      if(ready&&!flight&&activeScene===1&&albumState==='open'&&!photoModal.open){
        const onBook=raycaster.intersectObject(album,true).some(({object})=>{
          if(object===albumHit||object===albumCloseHit)return false;
          for(let node=object;node&&node!==album.parent;node=node.parent)if(!node.visible)return false;
          return true;
        });
        if(!onBook)closeAlbum();
      }
      return;
    }if(hit===cordHit){toggleLamp();return;}if(activeScene===0)openItem(hit.userData.item);else if(albumState==='closed')openAlbum();else if(albumState==='open'){if(hit===albumCloseHit){closeAlbum();return;}const action=albumPageAction(hit,hit.userData.hitUV);if(action?.direction)turnPage(action.direction);else if(action?.photo!==undefined)openAlbumPhoto(action.photo);}});
  const descriptionPanel=document.createElement('aside');
  descriptionPanel.id='item-description';descriptionPanel.hidden=true;
  descriptionPanel.setAttribute('role','dialog');descriptionPanel.setAttribute('aria-labelledby','item-description-title');
  descriptionPanel.innerHTML='<img class="item-modal-photo" alt=""><div class="item-modal-copy"><button class="focus-close" aria-label="Вернуться к шкафу">×</button><h2 id="item-description-title"></h2><p></p></div>';
  document.querySelector('#room').append(descriptionPanel);
  const objectCloseButton=descriptionPanel.querySelector('button');
  objectCloseButton.classList.add('object-screen-close');
  document.querySelector('#room').append(objectCloseButton);
  let focusReturnElement=null;
  function itemCameraPose(point){
    const portrait=innerWidth/innerHeight<.85,distance=portrait?3.1:2.65;
    return {position:point.clone().add(new THREE.Vector3(.16,.09,distance)),target:point.clone().add(new THREE.Vector3(portrait?0:.52,portrait?-.30:0,0))};
  }
  const poseCamera=new THREE.PerspectiveCamera();
  function cameraQuaternion(position,target,roll=0){
    poseCamera.position.copy(position);poseCamera.up.copy(camera.up);
    poseCamera.lookAt(target);poseCamera.rotation.z+=roll;
    return poseCamera.quaternion.clone();
  }
  function shelfCameraPose(now){
    const position=positions[0].clone(),t=now*.001;
    let roll=0;
    if(!reducedMotion.matches){
      position.x+=Math.sin(t*.38)*.035;position.y+=Math.sin(t*.51)*.025;
      position.z+=Math.sin(t*.22)*.035;roll=Math.sin(t*.075)*.012;
    }
    return {position,quaternion:cameraQuaternion(position,targets[0],roll)};
  }
  let cameraWhoosh=null;
  function playCameraWhoosh(returning,sceneChange=false){
    if(reducedMotion.matches)return;
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    try{
      lampAudio??=new Audio();const ctx=lampAudio;
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      // Interrupt an unfinished swish when a camera flight is replaced.
      if(cameraWhoosh){try{cameraWhoosh.stop();}catch{}}
      const duration=sceneChange?.24:.42,now=ctx.currentTime,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
      let smooth=0;
      for(let i=0;i<data.length;i++){smooth=.92*smooth+.08*(Math.random()*2-1);data[i]=smooth;}
      const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      source.buffer=buffer;filter.type='lowpass';filter.Q.value=.45;
      filter.frequency.setValueAtTime(returning?650:180,now);
      filter.frequency.exponentialRampToValueAtTime(returning?180:650,now+duration*.78);
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(sceneChange?.05:.07,now+duration*.3);
      gain.gain.linearRampToValueAtTime(0,now+duration);
      source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
      cameraWhoosh=source;
      source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();if(cameraWhoosh===source)cameraWhoosh=null;};
      source.start(now);source.stop(now+duration);
    }catch{}
  }
  function flyToItem(position,target,complete,followShelf=false){
    playCameraWhoosh(followShelf);
    const from=camera.position.clone(),middle=from.clone().lerp(position,.5);middle.z+=.2;
    flight={start:performance.now(),duration:reducedMotion.matches?1:1250,curve:new THREE.QuadraticBezierCurve3(from,middle,position),fromTarget:viewTarget.clone(),toTarget:target.clone(),fromQuaternion:camera.quaternion.clone(),toQuaternion:cameraQuaternion(position,target),endPosition:position.clone(),followShelf,complete};
    setNavigation(true);setHover(null);
  }
  // The image centre and fade boundary share the same CSS anchor.
  function placeDescription(){}
  function openItem(i){
    if(!ready||flight||activeScene!==0||(focusState&&(focusState.phase!=='open'||focusState.index===i)))return;
    const item=items[i],sprite=sprites[i],point=sprite.getWorldPosition(new THREE.Vector3());point.y+=sprite.userData.height*.5;
    if(!focusState)focusReturnElement=document.activeElement;
    descriptionPanel.classList.remove('visible');descriptionPanel.hidden=true;
    focusState={index:i,point,phase:'zooming'};
    document.querySelector('#room').dataset.object='zooming';
    descriptionPanel.querySelector('.item-modal-photo').src=item.photo;
    descriptionPanel.querySelector('.item-modal-photo').alt=item.title;
    descriptionPanel.querySelector('h2').textContent=item.title;
    descriptionPanel.querySelector('h2').style.textTransform=item.title==='BELAz'?'none':'';
    descriptionPanel.querySelector('p').textContent=item.description;
    const pose=itemCameraPose(point);
    flyToItem(pose.position,pose.target,()=>{
      focusState.phase='open';descriptionPanel.hidden=false;placeDescription();
      requestAnimationFrame(()=>{descriptionPanel.classList.add('visible');document.querySelector('#room').dataset.object='open';});
      objectCloseButton.focus({preventScroll:true});
    });
  }
  function returnToCabinet(){
    if(!focusState||focusState.phase==='returning')return;
    descriptionPanel.classList.remove('visible');setTimeout(()=>{descriptionPanel.hidden=true;},460);
    focusState.phase='returning';
    document.querySelector('#room').dataset.object='closing';
    flyToItem(positions[0].clone(),targets[0].clone(),()=>{focusState=null;delete document.querySelector('#room').dataset.object;focusReturnElement?.focus?.({preventScroll:true});},true);
  }
  objectCloseButton.onclick=returnToCabinet;
  addEventListener('keydown',e=>{
    if(photoModal.open)return;
    if(focusState){if(e.key==='Escape'){e.preventDefault();returnToCabinet();}return;}
    if(e.key==='Escape'&&albumState==='open'){closeAlbum();return;}
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();if(albumState==='open')turnPage(e.key==='ArrowRight'?1:-1);else switchScene();}
  });

  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('WebGL context lost'));});
  function animate(now){
    if(flight){
      const t=Math.min(1,(now-flight.start)/flight.duration);const eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      camera.position.copy(flight.curve.getPoint(eased));
      viewTarget.lerpVectors(flight.fromTarget,flight.toTarget,eased);
      if(flight.fromQuaternion){
        let destinationQuaternion=flight.toQuaternion;
        if(flight.followShelf){
          const shelfPose=shelfCameraPose(now);
          camera.position.addScaledVector(shelfPose.position.sub(flight.endPosition),eased);
          destinationQuaternion=shelfPose.quaternion;
        }
        camera.quaternion.slerpQuaternions(flight.fromQuaternion,destinationQuaternion,eased);
      }else camera.lookAt(viewTarget);
      if(t===1){const complete=flight.complete;flight=null;complete?.();setNavigation(false);}
    }
    if(!flight&&!focusState&&activeScene===0){
      const pose=shelfCameraPose(now);camera.position.copy(pose.position);camera.quaternion.copy(pose.quaternion);viewTarget.copy(targets[0]);
    }
    if(focusState?.phase==='open')placeDescription();
    animateLamp(now);
    animateAlbum(now);
    uniforms.time.value=reducedMotion.matches?0:now*.001;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  renderer.setAnimationLoop(animate);
  await Promise.allSettled(assetPromises);
  pageCache=spreads.map((_,i)=>[pageTexture(0,i),pageTexture(1,i)]);
  for(const pair of pageCache)for(const page of pair)renderer.initTexture(page.tex);
  showSpread(spread);renderer.compile(scene,camera);
  ready=true;setNavigation(false);loading.classList.add('done');document.body.dataset.ready='true';
}
