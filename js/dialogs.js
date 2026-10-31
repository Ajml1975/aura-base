
/* Diálogos propios compatibles con iframes de Google Sites (sin window.alert/confirm/prompt). */
(function(){
 let queue=Promise.resolve();
 function dialog(message,mode,initial=''){
  const task=()=>new Promise(resolve=>{
   const overlay=document.createElement('div');overlay.className='aura-dialog-overlay';
   const panel=document.createElement('section');panel.className='aura-dialog-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
   const heading=document.createElement('h3');heading.textContent='AURA BASE';
   const desc=document.createElement('p');desc.textContent=String(message);desc.style.whiteSpace='pre-wrap';
   const actions=document.createElement('div');actions.className='aura-dialog-actions';
   const input=document.createElement('input');input.type='text';input.value=String(initial??'');
   const finish=(value)=>{document.removeEventListener('keydown',key);overlay.remove();resolve(value)};
   const key=(e)=>{if(e.key==='Escape'){e.preventDefault();finish(mode==='confirm'?false:null)}if(e.key==='Enter'&&mode==='prompt'){e.preventDefault();finish(input.value)}};
   if(mode==='prompt')panel.append(heading,desc,input);else panel.append(heading,desc);
   const ok=document.createElement('button');ok.type='button';ok.textContent=mode==='alert'?'Aceptar':'Continuar';ok.className='primary';ok.onclick=()=>finish(mode==='prompt'?input.value:true);
   if(mode!=='alert'){const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';cancel.onclick=()=>finish(mode==='confirm'?false:null);actions.append(cancel)}
   actions.append(ok);panel.append(actions);overlay.append(panel);document.body.append(overlay);document.addEventListener('keydown',key);
   (mode==='prompt'?input:ok).focus();
  });
  const result=queue.then(task,task);queue=result.then(()=>{},()=>{});return result;
 }
 window.auraConfirm=message=>dialog(message,'confirm');
 window.auraPrompt=(message,initial='')=>dialog(message,'prompt',initial);
 window.auraAlert=message=>dialog(message,'alert');
})();
