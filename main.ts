import{mkdirSync,readdirSync,readFileSync,writeFileSync}from'node:fs';
const T="@AADFJKO00000000IIIIIIIEIIIEIII0III0000000000000@DD@@00000000000EH00000000000000DDAD";
function run(p:Uint8Array,q:Uint8Array):[number,Uint8Array]{
 const D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),o=new Uint8Array(65536);
 let s=0,c=0,pc=0,ip=0,t=0,l=0;
 const d=(x:number):[number,Uint8Array]=>[x,o.subarray(0,l)];
 for(;;){
  if(t===1e6)return d(10);
  if(pc<0||pc>=p.length)return d(9);
  const b=p[pc];
  if(b>83)return d(5);
  const k=T.charCodeAt(b)-48;
  if(k<16)return d(5);
  const m=b===1?1:b===2?4:b>=48&&b<=51?2:0;
  if(pc+m>=p.length)return d(9);
  t++;
  const n=pc+1+m,u=(k>>2)&3,v=k&3;
  if(s<u)return d(2);
  if(s-u+v>256)return d(3);
  pc=n;
  switch(b){
   case 0:return d(0);
   case 1:D[s++]=(p[n-1]<<24)>>24;break;
   case 2:D[s++]=p[n-4]|p[n-3]<<8|p[n-2]<<16|p[n-1]<<24;break;
   case 3:s--;break;
   case 4:D[s]=D[s-1];s++;break;
   case 5:{const x=D[s-1];D[s-1]=D[s-2];D[s-2]=x;break;}
   case 6:D[s]=D[s-2];s++;break;
   case 7:{const x=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=x;break;}
   case 23:D[s-1]=-D[s-1]|0;break;
   case 27:D[s-1]=~D[s-1];break;
   case 48:case 49:case 50:{
    const r=(p[n-2]|p[n-1]<<8)<<16>>16;
    let f=b===48;
    if(b!==48){const w=D[--s];f=b===49?w===0:w!==0;}
    if(f)pc=n+r;
    break;}
   case 51:
    if(c===64)return d(7);
    C[c++]=n;pc=p[n-2]|p[n-1]<<8;
    break;
   case 52:
    if(c===0)return d(8);
    pc=C[--c];
    break;
   case 64:{
    const a=D[s-1];
    if(a<0||a>=256)return d(6);
    D[s-1]=M[a];
    break;}
   case 65:{
    const a=D[s-1],w=D[s-2];
    if(a<0||a>=256)return d(6);
    s-=2;M[a]=w;
    break;}
   case 80:{
    const g=String(D[s-1]);
    if(l+g.length>65536)return d(11);
    s--;
    for(let i=0;i<g.length;i++)o[l++]=g.charCodeAt(i);
    break;}
   case 81:
    if(l+1>65536)return d(11);
    o[l++]=D[--s]&255;
    break;
   case 82:D[s++]=ip<q.length?q[ip++]:-1;break;
   case 83:return d(D[--s]&255);
   default:{
    const y=D[s-1],x=D[s-2];
    let r:number;
    if(b===16)r=(x+y)|0;
    else if(b===17)r=(x-y)|0;
    else if(b===18)r=Math.imul(x,y);
    else if(b===19){if(!y)return d(4);r=x===-2147483648&&y===-1?x:(x/y)|0;}
    else if(b===20){if(!y)return d(4);r=y===-1?0:(x%y)|0;}
    else if(b===21){if(!y)return d(4);r=Math.floor((x>>>0)/(y>>>0))|0;}
    else if(b===22){if(!y)return d(4);r=((x>>>0)%(y>>>0))|0;}
    else if(b===24)r=x&y;
    else if(b===25)r=x|y;
    else if(b===26)r=x^y;
    else if(b===28)r=x<<(y&31);
    else if(b===29)r=x>>(y&31);
    else if(b===30)r=(x>>>(y&31))|0;
    else if(b===32)r=x===y?1:0;
    else if(b===33)r=x<y?1:0;
    else r=(x>>>0)<(y>>>0)?1:0;
    s-=2;D[s++]=r;
    break;}
  }
 }
}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output';
for(const id of readdirSync(I).sort()){
 const[c,out]=run(readFileSync(`${I}/${id}/program.bin`),readFileSync(`${I}/${id}/input.bin`));
 mkdirSync(`${O}/${id}`,{recursive:true});
 writeFileSync(`${O}/${id}/stdout.bin`,out);
 writeFileSync(`${O}/${id}/exit.txt`,c+'\n');
}
