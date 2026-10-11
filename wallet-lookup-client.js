const token=document.querySelector('meta[name="session-token"]').content;
const expectedAddress=document.querySelector('meta[name="expected-address"]').content;
const status=document.querySelector('#status');
const button=document.querySelector('#start');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(route,method='GET',value){
  const response=await fetch(route,{method,headers:{'x-session-token':token,...(value?{'content-type':'application/json'}:{})},body:value?JSON.stringify(value):undefined,cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||`HTTP ${response.status}`);
  return data;
}
button.addEventListener('click',async()=>{
  button.disabled=true;
  let started=false;
  try{
    status.textContent='OKX 지갑 연결 요청 중…';
    const provider=window.okxwallet?.solana;
    if(!provider)throw Error('OKX Solana 브라우저 확장 프로그램이 보이지 않습니다. OKX가 설치된 Chrome/Edge에서 이 로컬 주소를 여세요.');
    const connected=await provider.connect();
    const address=connected.publicKey?.toString()??provider.publicKey?.toString();
    if(address!==expectedAddress)throw Error(`선택된 주소가 다릅니다: ${address||'없음'}. OKX에서 기대 지갑으로 바꿔 주세요.`);
    status.textContent='공식 SDK 조회 시작. 지갑의 메시지 서명 창을 기다리는 중…';
    await api('/start','POST',{address});
    started=true;
    let signed=false;
    for(let i=0;i<180;i++){
      const result=await api('/status');
      if(result.phase==='done'){
        status.textContent=`조회 성공: ${result.title}\n출처: ${result.source}\nSHA-256: ${result.scopeSha256}\n저장: ${result.file}`;
        return;
      }
      if(result.phase==='error')throw Error(result.error);
      if(result.challenge&&!signed){
        signed=true;
        const message=new Uint8Array(result.challenge);
        status.textContent=`메시지 서명을 확인하세요. 이 요청은 거래 서명이 아닙니다.\n\n${new TextDecoder().decode(message)}`;
        const reply=await provider.signMessage(message,'utf8');
        const signature=reply?.signature??reply;
        await api('/signature','POST',{signature:Array.from(signature)});
        status.textContent='서명 완료. Gibwork 응답을 기다리는 중…';
      }
      await pause(1000);
    }
    throw Error('조회 시간이 초과됐습니다.');
  }catch(error){
    status.textContent=`중단됨: ${error.message}`;
    if(!started)button.disabled=false;
  }
});
