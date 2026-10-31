'use strict';
/* AURA BASE 1.5 — consultas educativas; SQL de usuario: solo lectura */
let selectedQuery=null;
const Q=id=>document.getElementById(id);
function ensureQueries(){if(!db)throw Error('Abre una base de datos');db.run("CREATE TABLE IF NOT EXISTS _aura_queries (name TEXT PRIMARY KEY,sql_text TEXT NOT NULL,source_table TEXT,design_json TEXT NOT NULL DEFAULT '{}')")}
function queryList(){const root=Q('queriesList');root.replaceChildren();if(!db)return;ensureQueries();const b=document.createElement('button');b.className='table-item';b.textContent='＋ Nueva consulta';b.onclick=()=>showQueries();root.append(b);for(const x of query('SELECT name FROM _aura_queries ORDER BY name')){const e=document.createElement('button');e.className='table-item';e.textContent='⌕ '+x.name;e.onclick=()=>showQueries(x.name);root.append(e)}}
function renderQueryList(){queryList()}
function fillSelect(id,values,selected){const el=Q(id);el.replaceChildren();for(const v of values){const op=document.createElement('option');op.value=v;op.textContent=v;el.append(op)}if(selected&&values.includes(selected))el.value=selected}
function fields(){const t=Q('queryTable').value;return t?getFields(t).map(f=>f.name):[]}
function fillFields(){const f=fields();for(const id of ['updateField','crossRow','crossCol','crossValue','paramField'])fillSelect(id,f);renderQueryGrid()}
function renderQueryGrid(rows=[]){const body=Q('queryGrid').tBodies[0];body.replaceChildren();const saved=new Map(rows.map(x=>[x.name,x]));for(const name of fields()){const cfg=saved.get(name)||{};const tr=document.createElement('tr');tr.dataset.field=name;const c1=tr.insertCell(),c2=tr.insertCell(),c3=tr.insertCell(),c4=tr.insertCell();const ck=document.createElement('input');ck.type='checkbox';ck.className='qshow';ck.checked=cfg.show!==false;c1.append(ck);c2.textContent=name;const criterion=document.createElement('input');criterion.className='qcriterion';criterion.placeholder='Ej. >=18, Madrid';criterion.value=cfg.criterion||'';c3.append(criterion);const order=document.createElement('select');order.className='qsort';for(const [v,l] of [['','Sin ordenar'],['ASC','Ascendente'],['DESC','Descendente']]){const o=document.createElement('option');o.value=v;o.textContent=l;order.append(o)}order.value=cfg.sort||'';c4.append(order);body.append(tr)}}
function queryFieldRows(){return [...Q('queryGrid').tBodies[0].rows].map(tr=>({name:tr.dataset.field,show:tr.querySelector('.qshow').checked,criterion:tr.querySelector('.qcriterion').value.trim(),sort:tr.querySelector('.qsort').value}))}
function qType(){return Q('queryType').value}
function qView(){return Q('queryMode').value}
function updateQueryUI(){const type=qType();const sqlOnly=type==='sql';if(sqlOnly)Q('queryMode').value='sql';if(!['select','sql'].includes(type))Q('queryMode').value='visual';Q('queryMode').disabled=sqlOnly||!['select','sql'].includes(type);Q('queryVisual').hidden=qView()!=='visual'||sqlOnly;Q('querySqlPanel').hidden=qView()!=='sql'&&!sqlOnly;Q('queryExtra').hidden=!['make','append','update','cross','parameter'].includes(type);Q('actionTargetWrap').hidden=!['make','append'].includes(type);Q('updateWrap').hidden=type!=='update';Q('crossWrap').hidden=type!=='cross';Q('paramWrap').hidden=type!=='parameter';Q('queryExecute').textContent=['make','append','update','delete'].includes(type)?'⚠ Ejecutar acción':'▶ Ejecutar';Q('queryCount').textContent=''}
function showQueries(name=null){try{ensureQueries();selectedQuery=name;show('queries');Q('queryResults').tHead.replaceChildren();Q('queryResults').tBodies[0].replaceChildren();Q('queryCount').textContent='';fillSelect('queryTable',tableNames());fillFields();Q('queryName').value='Consulta'+(query('SELECT COUNT(*) AS n FROM _aura_queries')[0].n+1);Q('querySql').value='';Q('queryType').value='select';Q('queryMode').value='visual';Q('queryTarget').value='';Q('updateValue').value='';Q('paramLabel').value='Introduce el valor';Q('paramOperator').value='=';
 if(name){const r=query('SELECT * FROM _aura_queries WHERE name=?',[name])[0];if(!r)throw Error('Consulta no encontrada');let cfg={};try{cfg=JSON.parse(r.design_json||'{}')}catch(_){}Q('queryName').value=r.name;Q('querySql').value=r.sql_text;Q('queryType').value=cfg.type||'select';Q('queryMode').value=cfg.mode||'visual';fillSelect('queryTable',tableNames(),r.source_table);fillFields();renderQueryGrid(cfg.rows||[]);for(const [id,key] of [['queryTarget','target'],['updateValue','updateValue'],['paramLabel','paramLabel'],['paramOperator','paramOperator']])if(cfg[key]!==undefined)Q(id).value=cfg[key];for(const [id,key] of [['updateField','updateField'],['crossRow','crossRow'],['crossCol','crossCol'],['crossValue','crossValue'],['paramField','paramField'],['crossAgg','crossAgg']])if(cfg[key]!==undefined)Q(id).value=cfg[key]}
 updateQueryUI();Q('queryHeading').textContent=name||'Nueva consulta';queryList()}catch(e){fail(e)}}
function parseCriterion(raw){if(!raw)return null;const m=raw.match(/^(>=|<=|<>|!=|=|>|<)\s*(.*)$/);const op=m?m[1]:'=',value=(m?m[2]:raw).trim();if(!value)throw Error('Criterio vacío');if(/^null$/i.test(value))return {sql:['<>','!='].includes(op)?'IS NOT NULL':'IS NULL',values:[]};let v=value;if(/^['"].*['"]$/.test(v))v=v.slice(1,-1);else if(/^[-+]?\d+(?:[.,]\d+)?$/.test(v))v=Number(v.replace(',','.'));return {sql:(op==='!='?'<>':op)+' ?',values:[v]}}
function visualBase(){const t=Q('queryTable').value;if(!t)throw Error('Crea primero una tabla');const rows=queryFieldRows(),visible=rows.filter(x=>x.show),clauses=[],params=[],order=[];for(const r of rows){if(r.criterion){const c=parseCriterion(r.criterion);clauses.push(ident(r.name)+' '+c.sql);params.push(...c.values)}if(r.sort)order.push(ident(r.name)+' '+r.sort)}return {t,rows,visible,where:clauses.length?' WHERE '+clauses.join(' AND '):'',order:order.length?' ORDER BY '+order.join(', '):'',params}}
function readOnlySQL(raw){const sql=raw.trim().replace(/;\s*$/,'');if(!/^(SELECT\b|WITH\b)/i.test(sql))throw Error('SQL específico admite SELECT, WITH y UNION de lectura');if(sql.includes(';'))throw Error('Solo una sentencia SQL');if(/\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|VACUUM|REPLACE|LOAD_EXTENSION)\b/i.test(sql))throw Error('Operación no admitida en SQL de lectura');return sql}
function makePlan(forSave=false){
 const type=qType(),mode=qView(),v=visualBaseOrNull();
 if(type==='sql'||mode==='sql'&&type==='select')return {type:'select',sql:readOnlySQL(Q('querySql').value),params:[],action:false};
 if(!v)throw Error('Selecciona una tabla de origen');
 const all=v.visible.length?v.visible.map(x=>ident(x.name)).join(', '):'*';
 const base=' FROM '+ident(v.t)+v.where;
 if(type==='select'||type==='parameter'){
  if(!v.visible.length)throw Error('Selecciona al menos un campo');
  if(type==='select')return {type,sql:'SELECT '+all+base+v.order+' LIMIT 500',params:v.params,action:false};
  const field=Q('paramField').value,op=Q('paramOperator').value;
  if(!field||!['=','>','<','>=','<=','<>'].includes(op))throw Error('Parámetro incorrecto');
  const value=forSave?'__PARAMETER__':prompt(Q('paramLabel').value||'Introduce el valor');if(value===null)return null;
  const p=/^[-+]?\d+(?:[.,]\d+)?$/.test(value)?Number(value.replace(',','.')):value;
  const sql='SELECT '+all+base+(v.where?' AND ':' WHERE ')+ident(field)+' '+op+' ?'+v.order+' LIMIT 500';
  return {type,sql,params:[...v.params,p],action:false};
 }
 if(type==='cross'){
  const row=Q('crossRow').value,col=Q('crossCol').value,val=Q('crossValue').value,agg=Q('crossAgg').value;
  if(!row||!col||!val)throw Error('Selecciona fila, columna y valor');
  if(row===col)throw Error('Fila y columna deben ser diferentes');
  const values=query('SELECT DISTINCT '+ident(col)+' AS v FROM '+ident(v.t)+' ORDER BY 1 LIMIT 31').map(x=>x.v);
  if(values.length>30)throw Error('Máximo 30 columnas diferentes por tabla cruzada');
  const projections=values.map((x,i)=>agg+'(CASE WHEN '+ident(col)+' = ? THEN '+ident(val)+' END) AS '+ident(String(x??'Sin valor'))).join(', ');
  return {type,sql:'SELECT '+ident(row)+(projections?', '+projections:'')+' FROM '+ident(v.t)+v.where+' GROUP BY '+ident(row)+' ORDER BY '+ident(row)+' LIMIT 500',params:[...values,...v.params],action:false};
 }
 if(type==='delete')return {type,sql:'DELETE'+base,params:v.params,action:true,where:v.where};
 if(type==='update'){
  const field=Q('updateField').value;if(!field)throw Error('Selecciona el campo a actualizar');
  const raw=Q('updateValue').value;const value=/^[-+]?\d+(?:[.,]\d+)?$/.test(raw)?Number(raw.replace(',','.')):raw;
  return {type,sql:'UPDATE '+ident(v.t)+' SET '+ident(field)+' = ?'+v.where,params:[value,...v.params],action:true,where:v.where};
 }
 const target=Q('queryTarget').value.trim();if(!/^[\p{L}_][\p{L}\p{N}_ ]{0,63}$/u.test(target)||target.startsWith('_aura_'))throw Error('Nombre de tabla de destino no válido');
 if(type==='make'){
  if(tableNames().includes(target))throw Error('Ya existe la tabla '+target);
  return {type,sql:'CREATE TABLE '+ident(target)+' AS SELECT '+all+base,params:v.params,action:true,where:v.where,target};
 }
 if(type==='append'){
  if(!tableNames().includes(target))throw Error('La tabla de destino no existe');
  if(target===v.t)throw Error('Para evitar duplicados accidentales, utiliza una tabla de destino distinta');
  if(!v.visible.length)throw Error('Selecciona los campos para anexar');
  const targetFields=getFields(target).map(f=>f.name);for(const r of v.visible)if(!targetFields.includes(r.name))throw Error('El destino no tiene el campo '+r.name);
  const cols=v.visible.map(r=>ident(r.name)).join(', ');
  return {type,sql:'INSERT INTO '+ident(target)+' ('+cols+') SELECT '+cols+base,params:v.params,action:true,where:v.where,target};
 }
 throw Error('Tipo de consulta no implementado');
}
function visualBaseOrNull(){if(qType()==='sql'||qView()==='sql'&&qType()==='select')return null;return visualBase()}
function sqlPreview(plan){let i=0;return plan.sql.replace(/\?/g,()=>{const v=plan.params[i++];return typeof v==='number'?String(v):"'"+String(v).replaceAll("'","''")+"'"})}
function previewQuery(){try{const p=makePlan();if(!p)return;Q('querySql').value=sqlPreview(p);Q('queryCount').textContent=p.action?'Vista previa del SQL de acción (sin ejecutar)':'SQL generado. Pulsa Ejecutar para ver los resultados'}catch(e){fail(e)}}
function renderResults(cols,rows){const head=Q('queryResults').tHead,body=Q('queryResults').tBodies[0];head.replaceChildren();body.replaceChildren();const tr=document.createElement('tr');for(const c of cols){const th=document.createElement('th');th.textContent=c;tr.append(th)}head.append(tr);for(const r of rows){const tr=document.createElement('tr');for(const c of cols){const td=document.createElement('td');const value=r[c];td.textContent=value===null?'':value instanceof Uint8Array?'[BLOB]':String(value);tr.append(td)}body.append(tr)}}
function executeQuery(){
 try{const plan=makePlan();if(!plan)return;Q('querySql').value=sqlPreview(plan);
  if(plan.action){
   const v=visualBase(),count=query('SELECT COUNT(*) AS n FROM '+ident(v.t)+v.where,v.params)[0].n;
   if(['update','delete'].includes(plan.type)&&!v.where)throw Error('Por seguridad, añade al menos un criterio antes de actualizar o eliminar registros');
   if(plan.type==='make'&&tableNames().includes(plan.target))throw Error('La tabla ya existe');
   const msg='Consulta de acción: '+plan.type+'\nRegistros de origen: '+count+'\n\nSe modificará la base de datos abierta. Guarda antes una copia .db.\n\n¿Continuar?';
   if(!confirm(msg))return;
   db.run('BEGIN');
   try{db.run(plan.sql,plan.params);db.run('COMMIT')}catch(e){db.run('ROLLBACK');throw e}
   dirty=true;refreshStatus();renderTables();queryList();Q('queryCount').textContent='Acción ejecutada. Guarda el archivo .db para conservarla';notify('Acción completada');
  }else{
   const sql=readOnlySQL(plan.sql);const st=db.prepare(sql);const rows=[];let cols=[];try{st.bind(plan.params);cols=st.getColumnNames();while(st.step()&&rows.length<500)rows.push(st.getAsObject())}finally{st.free()}
   renderResults(cols,rows);Q('queryCount').textContent=rows.length+' filas mostradas (máximo 500)';
  }
 }catch(e){fail(e)}
}
function saveQuery(){try{ensureQueries();const name=Q('queryName').value.trim();if(!name||name.length>80||/[\\/:*?"<>|]/.test(name))throw Error('Nombre de consulta no válido');
 const type=qType(),mode=qView();let sql='',source=null;
 if(type==='sql'||mode==='sql'&&type==='select'){sql=readOnlySQL(Q('querySql').value);db.prepare(sql).free()}else{source=Q('queryTable').value;if(!source)throw Error('Selecciona una tabla');const p=makePlan(true);if(!p)return;sql=p.sql}
 const cfg={type,mode,rows:queryFieldRows(),target:Q('queryTarget').value,updateField:Q('updateField').value,updateValue:Q('updateValue').value,crossRow:Q('crossRow').value,crossCol:Q('crossCol').value,crossValue:Q('crossValue').value,crossAgg:Q('crossAgg').value,paramField:Q('paramField').value,paramLabel:Q('paramLabel').value,paramOperator:Q('paramOperator').value};
 const exists=query('SELECT name FROM _aura_queries WHERE name=?',[name]).length;if(exists&&selectedQuery!==name&&!confirm('¿Sobrescribir consulta existente?'))return;
 db.run('INSERT OR REPLACE INTO _aura_queries(name,sql_text,source_table,design_json) VALUES (?,?,?,?)',[name,sql,source,JSON.stringify(cfg)]);
 if(selectedQuery&&selectedQuery!==name)db.run('DELETE FROM _aura_queries WHERE name=?',[selectedQuery]);
 selectedQuery=name;dirty=true;refreshStatus();queryList();Q('queryHeading').textContent=name;notify('Consulta guardada. Descarga .db para conservarla')
 }catch(e){fail(e)}}
function deleteQuery(){try{if(!selectedQuery)throw Error('Abre una consulta guardada');if(!confirm('¿Eliminar '+selectedQuery+'?'))return;db.run('DELETE FROM _aura_queries WHERE name=?',[selectedQuery]);dirty=true;refreshStatus();showQueries()}catch(e){fail(e)}}
Q('queryNew').onclick=()=>showQueries();
Q('querySave').onclick=saveQuery;Q('queryExecute').onclick=executeQuery;Q('queryPreview').onclick=previewQuery;Q('queryDelete').onclick=deleteQuery;
Q('queryType').onchange=updateQueryUI;Q('queryMode').onchange=updateQueryUI;Q('queryTable').onchange=fillFields;
