let cvReady=false, sourceImage=null;
const file=document.getElementById("file");
const scan=document.getElementById("scan");
const reset=document.getElementById("reset");
const statusEl=document.getElementById("status");
const inputCanvas=document.getElementById("inputCanvas");
const outputCanvas=document.getElementById("outputCanvas");
const download=document.getElementById("download");

function setStatus(s){statusEl.textContent=s}
function waitForCV(){
  if(typeof cv!=="undefined" && cv.Mat){cvReady=true;return;}
  setTimeout(waitForCV,300);
}
waitForCV();

file.addEventListener("change",e=>{
  const f=e.target.files?.[0]; if(!f)return;
  const url=URL.createObjectURL(f);
  const img=new Image();
  img.onload=()=>{
    sourceImage=img;
    const max=1800, scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
    inputCanvas.width=Math.round(img.naturalWidth*scale);
    inputCanvas.height=Math.round(img.naturalHeight*scale);
    inputCanvas.getContext("2d").drawImage(img,0,0,inputCanvas.width,inputCanvas.height);
    scan.disabled=false; download.hidden=true;
    setStatus("Photo ready. Tap Scan CNIC.");
    URL.revokeObjectURL(url);
  };
  img.src=url;
});

function orderPoints(pts){
  pts.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  const tl=pts[0], br=pts[3];
  const other=[pts[1],pts[2]].sort((a,b)=>(a.x-b.x));
  return [tl,other[0],br,other[1]];
}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

function perspectiveWarp(src, p){
  const q=orderPoints(p);
  const W=Math.max(dist(q[0],q[1]),dist(q[3],q[2]));
  const H=Math.max(dist(q[0],q[3]),dist(q[1],q[2]));
  const targetW=1200, targetH=Math.max(1,Math.round(targetW/1.586));
  const srcPts=cv.matFromArray(4,1,cv.CV_32FC2,[
    q[0].x,q[0].y,q[1].x,q[1].y,q[2].x,q[2].y,q[3].x,q[3].y
  ]);
  const dstPts=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,targetW-1,0,targetW-1,targetH-1,0,targetH-1]);
  const M=cv.getPerspectiveTransform(srcPts,dstPts);
  const dst=new cv.Mat();
  cv.warpPerspective(src,dst,M,new cv.Size(targetW,targetH));
  srcPts.delete();dstPts.delete();M.delete();
  return dst;
}

function scanCNIC(){
  if(!cvReady){setStatus("OpenCV is still loading. Please wait a moment.");return}
  try{
    setStatus("Detecting CNIC...");
    let src=cv.imread(inputCanvas);
    let scale=1;
    const max=1400;
    if(Math.max(src.cols,src.rows)>max){
      scale=max/Math.max(src.cols,src.rows);
      let r=new cv.Mat();
      cv.resize(src,r,new cv.Size(Math.round(src.cols*scale),Math.round(src.rows*scale)));
      src.delete();src=r;
    }
    let gray=new cv.Mat(), blur=new cv.Mat(), edges=new cv.Mat();
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray,blur,new cv.Size(5,5),0,0,cv.BORDER_DEFAULT);
    cv.Canny(blur,edges,60,160);

    let contours=new cv.MatVector(), hierarchy=new cv.Mat();
    cv.findContours(edges,contours,hierarchy,cv.RETR_LIST,cv.CHAIN_APPROX_SIMPLE);
    let best=null,bestScore=-1;
    const imgArea=src.cols*src.rows;

    for(let i=0;i<contours.size();i++){
      const c=contours.get(i), peri=cv.arcLength(c,true), approx=new cv.Mat();
      cv.approxPolyDP(c,approx,0.025*peri,true);
      if(approx.rows===4 && cv.isContourConvex(approx)){
        const rect=cv.boundingRect(approx);
        const area=rect.width*rect.height;
        if(area/imgArea<0.08){approx.delete();c.delete();continue}
        const ratio=Math.max(rect.width,rect.height)/Math.max(1,Math.min(rect.width,rect.height));
        if(ratio<1.15||ratio>2.2){approx.delete();c.delete();continue}
        const ratioScore=Math.exp(-Math.pow((ratio-1.586)/0.35,2));
        const areaScore=Math.min(1,area/(imgArea*0.65));
        const score=0.72*ratioScore+0.28*areaScore;
        if(score>bestScore){
          const pts=[];
          for(let j=0;j<4;j++){
            pts.push({x:approx.intPtr(j,0)[0],y:approx.intPtr(j,0)[1]});
          }
          best=pts;bestScore=score;
        }
      }
      approx.delete();c.delete();
    }
    hierarchy.delete();contours.delete();edges.delete();blur.delete();gray.delete();

    if(!best){
      setStatus("CNIC not detected. Try a clearer photo with the full card visible.");
      src.delete();return;
    }
    const dst=perspectiveWarp(src,best);
    cv.imshow(outputCanvas,dst);
    const data=outputCanvas.toDataURL("image/jpeg",0.95);
    download.href=data; download.hidden=false;
    setStatus("CNIC detected and straightened successfully.");
    dst.delete();src.delete();
  }catch(err){
    console.error(err);
    setStatus("Could not process this photo. Try another image.");
  }
}

scan.addEventListener("click",scanCNIC);
reset.addEventListener("click",()=>{
  file.value=""; sourceImage=null; scan.disabled=true; download.hidden=true;
  inputCanvas.width=inputCanvas.height=0;outputCanvas.width=outputCanvas.height=0;
  setStatus("Choose a photo to begin.");
});
