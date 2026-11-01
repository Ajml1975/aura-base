'use strict';
/* AURA BASE 1.2 — SQLite in-memory, export/import via sql.js. No remote data calls. */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
let objectTabs=[];let relationPositions={};let SQL,db=null,dbName='Sin nombre',currentTable=null,view='welcome',draft=[],selectedField=0,editingRow=null,dirty=false,installPrompt=null;
const types=['Texto corto','Texto largo','Número','Número decimal','Fecha/Hora','Moneda','Sí/No','Autonumeración'];
const ident=s=>'"'+String(s).replaceAll('"','""')+'"';
const notify=(message)=>{const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('show'),4200)};
const fail=e=>{console.error(e);notify('Error: '+(e?.message||e))};
const query=(sql,params=[])=>{if(!db)throw Error('Primero crea o abre una base de datos');const st=db.prepare(sql);try{st.bind(params);const result=[];while(st.step())result.push(st.getAsObject());return result}finally{st.free()}};
const run=(sql,params=[])=>{if(!db)throw Error('No hay base de datos abierta');db.run(sql,params);dirty=true;refreshStatus()};
const metaSql=`CREATE TABLE IF NOT EXISTS _aura_relations (id INTEGER PRIMARY KEY AUTOINCREMENT,parent_table TEXT NOT NULL,parent_field TEXT NOT NULL,child_table TEXT NOT NULL,child_field TEXT NOT NULL,UNIQUE(parent_table,parent_field,child_table,child_field));CREATE TABLE IF NOT EXISTS _aura_tables (name TEXT PRIMARY KEY,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);CREATE TABLE IF NOT EXISTS _aura_fields (table_name TEXT NOT NULL,position INTEGER NOT NULL,name TEXT NOT NULL,kind TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',size INTEGER,required INTEGER NOT NULL DEFAULT 0,unique_field INTEGER NOT NULL DEFAULT 0,indexed INTEGER NOT NULL DEFAULT 0,primary_field INTEGER NOT NULL DEFAULT 0,default_value TEXT,format TEXT NOT NULL DEFAULT '',mask TEXT NOT NULL DEFAULT '',PRIMARY KEY(table_name,name));CREATE TABLE IF NOT EXISTS _aura_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);`;
const extraProps={caption:"TEXT NOT NULL DEFAULT ''",validation_rule:"TEXT NOT NULL DEFAULT ''",validation_text:"TEXT NOT NULL DEFAULT ''",decimals:"INTEGER",allow_zero:"INTEGER NOT NULL DEFAULT 0",unicode_compression:"INTEGER NOT NULL DEFAULT 0"};
function upgradeMetadata(){if(!db)return;const exists=db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='_aura_fields'");if(!exists.length)return;const columns=new Set(query('PRAGMA table_info(_aura_fields)').map(c=>c.name));for(const [name,type] of Object.entries(extraProps))if(!columns.has(name))db.run('ALTER TABLE _aura_fields ADD COLUMN '+name+' '+type)}
const hasMeta=()=>query("SELECT name FROM sqlite_master WHERE type='table' AND name='_aura_fields'").length>0;
const tableNames=()=>query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_aura_%' ORDER BY name").map(x=>x.name);
function refreshStatus(){ $('#dbTitle').textContent=db?dbName:'Sin base de datos';$('#tableTitle').textContent=currentTable?' / '+currentTable:'';$('#status').textContent=db?(dirty?'● Cambios sin descargar':'● Archivo cargado'):'Sin archivo';$('#footerText').textContent=db?'SQLite · '+tableNames().length+' tabla(s) · datos locales':'SQLite en el navegador';}
function renderTables(){const list=$('#tablesList');list.replaceChildren();if(!db)return;for(const name of tableNames()){const b=document.createElement('button');b.className='table-item'+(name===currentTable?' active':'');b.textContent='▦ '+name;b.onclick=()=>{currentTable=name;showData()};list.append(b)}const rel=$('#relationshipsList');rel.replaceChildren();if(db){const b=document.createElement('button');b.className='table-item';b.textContent='↗ Diseñador de relaciones';b.onclick=showRelations;rel.append(b)}if(typeof renderQueryList==='function')renderQueryList();if(typeof renderFormsList==='function')renderFormsList();if(typeof renderAdvancedLists==='function')renderAdvancedLists()}
function show(section){view=section;for(const id of ['welcome','designer','datasheet','relations','queries','forms','reports','macros','code'])$('#'+id).hidden=id!==section;refreshStatus();renderTables();renderObjectTabs()}
function newDb(){if(dirty&&!confirm('Los cambios no descargados se perderán. ¿Continuar?'))return;const name=prompt('Nombre de la nueva base de datos:','Empresa_Comercial');if(name===null)return;db?.close();db=new SQL.Database();db.run(metaSql);db.run('CREATE TABLE IF NOT EXISTS _aura_queries (name TEXT PRIMARY KEY,sql_text TEXT NOT NULL,source_table TEXT,design_json TEXT NOT NULL DEFAULT \'{}\')');upgradeMetadata();db.run("INSERT OR REPLACE INTO _aura_settings(key,value) VALUES('version','1.0')");dbName=(name.trim()||'Nueva_base').replace(/\.db$/i,'')+'.db';currentTable=null;dirty=true;show('welcome');notify('Base creada. Añade una tabla para comenzar.')}
async function openDb(file){if(!file)return;if(dirty&&!confirm('Los cambios no descargados se perderán. ¿Continuar?'))return;try{const bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length>50*1024*1024)throw Error('Archivo superior a 50 MB: no admitido en esta versión');const candidate=new SQL.Database(bytes);const st=candidate.prepare('PRAGMA integrity_check');st.step();const check=st.get()[0];st.free();if(check!=='ok')throw Error('El archivo SQLite no supera la comprobación de integridad');db?.close();db=candidate;db.run('CREATE TABLE IF NOT EXISTS _aura_relations (id INTEGER PRIMARY KEY AUTOINCREMENT,parent_table TEXT NOT NULL,parent_field TEXT NOT NULL,child_table TEXT NOT NULL,child_field TEXT NOT NULL,UNIQUE(parent_table,parent_field,child_table,child_field))');upgradeMetadata();db.run('CREATE TABLE IF NOT EXISTS _aura_queries (name TEXT PRIMARY KEY,sql_text TEXT NOT NULL,source_table TEXT,design_json TEXT NOT NULL DEFAULT \'{}\')');dbName=file.name;currentTable=null;dirty=false;show('welcome');notify('Archivo abierto correctamente'+(hasMeta()?'':' (SQLite externo: edición de diseño limitada)'))}catch(e){fail(e)}}
function validateSaveName(value){
 const base=value.trim().replace(/\.db$/i,'').trim();
 if(!base||/[\\/:*?"<>|\x00-\x1f]/.test(base)||base==='.'||base==='..'||/[. ]$/.test(base))throw Error('Nombre no válido. Evita caracteres especiales y puntos o espacios finales');
 return base+'.db';
}
function saveBlobByDownload(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
async function saveDbAs(){
 try{
  if(!db)throw Error('Primero crea o abre una base de datos');
  const modal=$('#saveAsDialog');
  $('#saveAsName').value=dbName.replace(/\.db$/i,'');
  $('#saveAsFormat').value='db';
  $('#saveAsDestination').value=typeof window.showSaveFilePicker==='function'?'choose':'downloads';
  $('#saveAsChooseHint').textContent=typeof window.showSaveFilePicker==='function'?'El navegador mostrará el selector de archivos de Windows.':'Tu navegador no permite seleccionar directamente una carpeta; se usará su sistema de descargas.';
  modal.hidden=false;$('#saveAsName').focus();$('#saveAsName').select();
 }catch(e){fail(e)}
}
async function confirmSaveAs(){
 const btn=$('#saveAsConfirm');
 try{
  if(!db)throw Error('Primero crea o abre una base de datos');
  const format=$('#saveAsFormat').value;
  if(!['db','mdb','accdb'].includes(format))throw Error('Formato no disponible');
  const filename=validateSaveName($('#saveAsName').value);
  if(format!=='db'){auraDownloadBridge(format,filename.slice(0,-3));$('#saveAsDialog').hidden=true;return;}
  const destination=$('#saveAsDestination').value;
  btn.disabled=true;
  const bytes=db.export(),blob=new Blob([bytes],{type:'application/vnd.sqlite3'});
  if(destination==='choose'&&typeof window.showSaveFilePicker==='function'){
   let handle;
   try{handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'Base de datos AURA BASE / SQLite',accept:{'application/octet-stream':['.db']}}],excludeAcceptAllOption:true})}
   catch(e){if(e.name==='AbortError')return;throw e}
   const writable=await handle.createWritable();await writable.write(blob);await writable.close();
   notify('Archivo guardado en la ubicación seleccionada');
  }else{
   saveBlobByDownload(blob,filename);
   notify('Descarga iniciada. El navegador controla la carpeta de destino.');
  }
  dbName=filename;dirty=false;refreshStatus();$('#saveAsDialog').hidden=true;
 }catch(e){fail(e)}finally{btn.disabled=false}
}
function downloadDb(){try{if(!db)throw Error('Primero crea una base de datos');const bytes=db.export();const blob=new Blob([bytes],{type:'application/vnd.sqlite3'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=dbName.endsWith('.db')?dbName:dbName+'.db';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);dirty=false;refreshStatus();notify('Descarga iniciada. Comprueba la carpeta Descargas.')}catch(e){fail(e)}}
function emptyField(){return{name:'Campo'+(draft.length+1),kind:'Texto corto',description:'',size:255,required:false,unique_field:false,indexed:false,primary_field:false,default_value:'',format:'',mask:'',caption:'',validation_rule:'',validation_text:'',decimals:null,allow_zero:false,unicode_compression:false}}
function newTable(){try{if(!db)throw Error('Crea o abre una base de datos primero');if(!hasMeta())throw Error('Este archivo no tiene metadatos AURA BASE; crea un proyecto AURA BASE para diseñar tablas');const name=prompt('Nombre de la nueva tabla:','Clientes');if(name===null)return;const clean=name.trim();if(!/^[\p{L}_][\p{L}\p{N}_ ]{0,63}$/u.test(clean))throw Error('Nombre no válido. Usa letras, números, espacios y guion bajo');if(tableNames().some(t=>t.toLowerCase()===clean.toLowerCase()))throw Error('Ya existe una tabla con ese nombre');currentTable=clean;draft=[{...emptyField(),name:'Id'+clean.replaceAll(' ','').replace(/s$/i,''),kind:'Autonumeración',size:null,primary_field:true,required:true},{...emptyField(),name:'Nombre',size:100,required:true}];selectedField=0;showDesign()}catch(e){fail(e)}}
function getFields(name){if(hasMeta()){const f=query('SELECT * FROM _aura_fields WHERE table_name=? ORDER BY position',[name]);if(f.length)return f.map(x=>({...x,required:!!x.required,unique_field:!!x.unique_field,indexed:!!x.indexed,primary_field:!!x.primary_field,default_value:x.default_value??'',allow_zero:!!x.allow_zero,unicode_compression:!!x.unicode_compression}))}return query('PRAGMA table_info('+ident(name)+')').map(x=>({name:x.name,kind:x.type.includes('INT')?'Número':'Texto corto',description:'',size:null,required:!!x.notnull,unique_field:false,indexed:false,primary_field:!!x.pk,default_value:x.dflt_value??'',format:'',mask:'',caption:'',validation_rule:'',validation_text:'',decimals:null,allow_zero:false,unicode_compression:false}))}
function showDesign(){try{if(!currentTable)throw Error('Selecciona una tabla');if(draft._table!==currentTable){draft=tableNames().includes(currentTable)?getFields(currentTable):draft;draft._table=currentTable;}selectedField=Math.max(0,Math.min(selectedField,draft.length-1));show('designer');$('#designName').textContent=currentTable;renderDesign()}catch(e){fail(e)}}
function renderDesign(){const tbody=$('#fieldTable tbody');tbody.replaceChildren();draft.forEach((f,i)=>{const tr=document.createElement('tr');if(i===selectedField)tr.className='selected';const tdPk=document.createElement('td'),pk=document.createElement('input');pk.type='checkbox';pk.checked=!!f.primary_field;pk.title='Clave primaria';pk.onchange=()=>{draft.forEach((x,j)=>x.primary_field=j===i&&pk.checked);if(pk.checked)f.required=true;renderDesign()};tdPk.append(pk);tr.append(tdPk);for(const prop of ['name','kind','description']){const td=document.createElement('td');let input;if(prop==='kind'){input=document.createElement('select');for(const type of types){const o=document.createElement('option');o.value=type;o.textContent=type;input.append(o)}input.value=f.kind}else{input=document.createElement('input');input.value=f[prop]||''}input.onfocus=()=>{selectedField=i;renderProps()};input.onchange=()=>{f[prop]=input.value;if(prop==='kind'&&input.value==='Autonumeración'){draft.forEach((x,j)=>x.primary_field=j===i);f.required=true;f.size=null}renderDesign()};td.append(input);tr.append(td)}const action=document.createElement('td'),remove=document.createElement('button');remove.textContent='✕';remove.title='Eliminar campo';remove.onclick=()=>{draft.splice(i,1);selectedField=Math.max(0,Math.min(i,draft.length-1));renderDesign()};action.append(remove);tr.append(action);tbody.append(tr)});renderProps()}
function renderProps(){const f=draft[selectedField];for(const id of ['propSize','propDefault','propFormat','propMask','propRequired','propUnique','propIndexed','propCaption','propValidation','propValidationText','propDecimals','propAllowZero','propUnicode'])$('#'+id).disabled=!f;if(!f)return;$('#propSize').value=f.size??'';$('#propDefault').value=f.default_value??'';$('#propFormat').value=f.format??'';$('#propMask').value=f.mask??'';$('#propRequired').checked=!!f.required;$('#propUnique').checked=!!f.unique_field;$('#propIndexed').checked=!!f.indexed;$('#propCaption').value=f.caption||'';$('#propValidation').value=f.validation_rule||'';$('#propValidationText').value=f.validation_text||'';$('#propDecimals').value=f.decimals??'';$('#propAllowZero').checked=!!f.allow_zero;$('#propUnicode').checked=!!f.unicode_compression}
const fieldType=f=>f.kind==='Autonumeración'?'INTEGER':f.kind==='Número'?'INTEGER':f.kind==='Número decimal'||f.kind==='Moneda'?'REAL':f.kind==='Sí/No'?'INTEGER':'TEXT';
function fieldSql(f){let s=ident(f.name)+' '+fieldType(f);if(f.primary_field&&f.kind==='Autonumeración')return s+' PRIMARY KEY AUTOINCREMENT';if(f.primary_field)s+=' PRIMARY KEY';if(f.required&&!f.primary_field)s+=' NOT NULL';if(f.unique_field&&!f.primary_field)s+=' UNIQUE';const checks=[];if(f.kind==='Texto corto'&&f.size)checks.push('length('+ident(f.name)+') <= '+Number(f.size));if(f.kind==='Sí/No')checks.push(ident(f.name)+' IN (0,1)');if(checks.length)s+=' CHECK ('+checks.join(' AND ')+')';if(f.default_value!==''&&f.default_value!=null&&f.kind!=='Autonumeración'){const val=coerce(f,f.default_value);s+=' DEFAULT '+(val===null?'NULL':typeof val==='number'?String(val):"'"+String(val).replaceAll("'","''")+"'")}return s}
function validateDraft(){if(!draft.length)throw Error('Añade al menos un campo');const seen=new Set();let pk=0;for(const f of draft){if(!/^[\p{L}_][\p{L}\p{N}_ ]{0,63}$/u.test(f.name))throw Error('Nombre de campo no válido: '+f.name);const key=f.name.toLowerCase();if(seen.has(key))throw Error('Campo duplicado: '+f.name);seen.add(key);if(f.primary_field)pk++;if(f.kind==='Autonumeración'&&!f.primary_field)throw Error('Autonumeración debe ser clave primaria');if(f.size!==null&&f.size!==''&&(!Number.isInteger(Number(f.size))||Number(f.size)<1||Number(f.size)>1000000))throw Error('Tamaño inválido en '+f.name)}if(pk!==1)throw Error('La fase 1 exige exactamente una clave primaria')}
function saveStructure(){
 if(!db||!currentTable)return;
 try{
  validateDraft();
  if(tableNames().includes(currentTable)&&getRelations().some(r=>r.parent_table===currentTable||r.child_table===currentTable))throw Error('La tabla participa en relaciones. Elimina las relaciones antes de modificar su estructura para evitar pérdida de integridad.');
  const exists=tableNames().includes(currentTable);
  const original=exists?getFields(currentTable):[];
  const count=exists?query('SELECT COUNT(*) AS n FROM '+ident(currentTable))[0].n:0;
  const oldNames=new Set(original.map(f=>f.name.toLowerCase()));
  const newNames=new Set(draft.map(f=>f.name.toLowerCase()));
  const removed=original.filter(f=>!newNames.has(f.name.toLowerCase()));
  const added=draft.filter(f=>!oldNames.has(f.name.toLowerCase()));
  // Positional mapping for renamed fields is explicit and must be approved by the user.
  const renames=[];
  for(let i=0;i<Math.min(original.length,draft.length);i++){
   const old=original[i],next=draft[i];
   if(!newNames.has(old.name.toLowerCase())&&!oldNames.has(next.name.toLowerCase()))renames.push([old.name,next.name]);
  }
  const mapped=new Map(draft.map(f=>[f.name,original.find(o=>o.name.toLowerCase()===f.name.toLowerCase())?.name||null]));
  for(const [oldName,newName] of renames)mapped.set(newName,oldName);
  const lost=removed.filter(f=>!renames.some(r=>r[0]===f.name));
  if(count){
   const notes=[];
   if(renames.length)notes.push('Posibles cambios de nombre por posición: '+renames.map(r=>r.join(' → ')).join(', '));
   if(lost.length)notes.push('Se eliminarán los datos de: '+lost.map(f=>f.name).join(', '));
   if(added.length)notes.push('Campos nuevos: '+added.map(f=>f.name).join(', '));
   notes.push('Se reconstruirá la tabla y se validarán '+count+' registros. Descarga antes una copia de seguridad .db.');
   if(!confirm('Modificar estructura de '+currentTable+'\n\n'+notes.join('\n')+'\n\n¿Continuar?'))return;
  }
  const tmp='_aura_migrate_'+Date.now();
  db.run('BEGIN');
  try{
   if(exists){db.run('ALTER TABLE '+ident(currentTable)+' RENAME TO '+ident(tmp));}
   db.run('CREATE TABLE '+ident(currentTable)+' ('+draft.map(fieldSql).join(',')+')');
   if(exists&&count){
    const targets=[],sources=[];
    for(const f of draft){
     const old=mapped.get(f.name);
     if(old){targets.push(ident(f.name));sources.push(ident(old));}
     else if(f.default_value!==''&&f.default_value!=null){targets.push(ident(f.name));const val=coerce(f,f.default_value);sources.push(val===null?'NULL':typeof val==='number'?String(val):"'"+String(val).replaceAll("'","''")+"'");}
     else if(f.required&&!f.primary_field)throw Error('El campo nuevo '+f.name+' es obligatorio y no tiene valor predeterminado');
    }
    if(targets.length)db.run('INSERT INTO '+ident(currentTable)+' ('+targets.join(',')+') SELECT '+sources.join(',')+' FROM '+ident(tmp));
    else db.run('INSERT INTO '+ident(currentTable)+' DEFAULT VALUES');
    const migrated=query('SELECT COUNT(*) AS n FROM '+ident(currentTable))[0].n;
    if(migrated!==count)throw Error('No coinciden los registros originales y los migrados');
   }
   if(exists)db.run('DROP TABLE '+ident(tmp));
   db.run('DELETE FROM _aura_fields WHERE table_name=?',[currentTable]);
   db.run('INSERT OR IGNORE INTO _aura_tables(name) VALUES (?)',[currentTable]);
   draft.forEach((f,i)=>{
    db.run('INSERT INTO _aura_fields(table_name,position,name,kind,description,size,required,unique_field,indexed,primary_field,default_value,format,mask,caption,validation_rule,validation_text,decimals,allow_zero,unicode_compression) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[currentTable,i,f.name,f.kind,f.description||'',f.size===''?null:f.size,Number(!!f.required),Number(!!f.unique_field),Number(!!f.indexed),Number(!!f.primary_field),f.default_value===''?null:f.default_value,f.format||'',f.mask||'',f.caption||'',f.validation_rule||'',f.validation_text||'',f.decimals===''?null:f.decimals??null,Number(!!f.allow_zero),Number(!!f.unicode_compression)]);
    if(f.indexed&&!f.primary_field&&!f.unique_field)db.run('CREATE INDEX '+ident('idx_'+currentTable+'_'+f.name)+' ON '+ident(currentTable)+'('+ident(f.name)+')');
   });
   const check=query('PRAGMA foreign_key_check');if(check.length)throw Error('La modificación rompería relaciones existentes');
   db.run('COMMIT');
  }catch(e){db.run('ROLLBACK');throw e}
  dirty=true;draft._table=currentTable;notify('Estructura guardada; registros conservados');showData();
 }catch(e){fail(e)}
}
function coerce(f,raw){if(raw===''||raw==null)return null;switch(f.kind){case 'Número':{if(!/^-?\d+$/.test(String(raw)))throw Error(f.name+': introduce un entero');const n=Number(raw);if(!Number.isSafeInteger(n))throw Error(f.name+': número fuera de rango');return n}case 'Número decimal':case 'Moneda':{const n=Number(String(raw).replace(',','.'));if(!Number.isFinite(n))throw Error(f.name+': número no válido');return n}case 'Sí/No':return raw===true||raw===1||raw==='1'||raw==='Sí'?1:0;case 'Fecha/Hora':{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(raw))||Number.isNaN(Date.parse(raw))||new Date(raw).toISOString().slice(0,10)!==raw)throw Error(f.name+': fecha no válida (AAAA-MM-DD)');return raw}default:return String(raw)}}
function showData(){try{if(!currentTable||!tableNames().includes(currentTable))throw Error('Guarda primero la estructura de la tabla');show('datasheet');$('#dataName').textContent=currentTable;editingRow=null;renderRecords();renderEditor()}catch(e){fail(e)}}
function renderRecords(){const fields=getFields(currentTable);const head=$('#recordsTable thead'),body=$('#recordsTable tbody');head.replaceChildren();body.replaceChildren();const tr=document.createElement('tr');for(const f of fields){const th=document.createElement('th');th.textContent=f.caption||f.name;tr.append(th)}const th=document.createElement('th');th.textContent='Acciones';tr.append(th);head.append(tr);const needle=$('#filterRecords').value.toLowerCase();const rows=query('SELECT rowid AS _aura_rowid_, * FROM '+ident(currentTable)+' ORDER BY rowid DESC LIMIT 500');for(const row of rows.filter(r=>fields.some(f=>String(r[f.name]??'').toLowerCase().includes(needle)))){const line=document.createElement('tr');for(const f of fields){const cell=document.createElement('td');cell.textContent=row[f.name]===null?'':f.kind==='Sí/No'?(Number(row[f.name])?'Sí':'No'):f.kind==='Moneda'?Number(row[f.name]).toLocaleString('es-ES',{style:'currency',currency:'EUR'}):String(row[f.name]);line.append(cell)}const actions=document.createElement('td');const edit=document.createElement('button');edit.textContent='Editar';edit.onclick=()=>{editingRow=row._aura_rowid_;renderEditor(row)};const del=document.createElement('button');del.textContent='Eliminar';del.className='danger';del.onclick=()=>{if(!confirm('¿Eliminar este registro?'))return;try{run('DELETE FROM '+ident(currentTable)+' WHERE rowid=?',[row._aura_rowid_]);renderRecords();notify('Registro eliminado')}catch(e){fail(e)}};actions.append(edit,del);line.append(actions);body.append(line)}}
function renderEditor(row={}){const root=$('#recordEditor');root.replaceChildren();$('#recordEditorTitle').textContent=editingRow===null?'Nuevo registro':'Editar registro';for(const f of getFields(currentTable)){if(f.kind==='Autonumeración')continue;const label=document.createElement('label');label.textContent=(f.caption||f.name)+(f.required?' *':'');const input=document.createElement('input');input.dataset.field=f.name;if(f.kind==='Sí/No'){input.type='checkbox';input.checked=Boolean(row[f.name])}else{input.type=f.kind==='Fecha/Hora'?'date':f.kind==='Número'||f.kind==='Número decimal'||f.kind==='Moneda'?'number':'text';if(input.type==='number')input.step=f.kind==='Número'?'1':'any';input.value=row[f.name]??'';if(f.kind==='Texto corto'&&f.size)input.maxLength=f.size}label.append(input);root.append(label)}}
function checkRule(f,val){const rule=(f.validation_rule||'').trim();if(!rule||val===null)return;const match=rule.match(/^(>=|<=|<>|!=|=|>|<)\s*(-?\d+(?:[.,]\d+)?|"[^"]*"|'[^']*')$/);if(!match)throw Error(f.name+': regla no admitida. Usa comparaciones como >=18 o <>""');let expected=match[2];if(/^["']/.test(expected))expected=expected.slice(1,-1);else expected=Number(expected.replace(',','.'));const left=typeof expected==='number'?Number(val):String(val);const op=match[1];const valid=op==='>='?left>=expected:op==='<='?left<=expected:op==='>'?left>expected:op==='<'?left<expected:op==='='?left===expected:left!==expected;if(!valid)throw Error(f.validation_text||f.name+': no cumple la regla '+rule)}
function saveRecord(){try{const fields=getFields(currentTable).filter(f=>f.kind!=='Autonumeración');const vals=[];const cols=[];for(const f of fields){const input=$$('#recordEditor input').find(x=>x.dataset.field===f.name);const raw=f.kind==='Sí/No'?(input.checked?'1':'0'):input.value;let val=coerce(f,raw);if(val===null&&editingRow===null&&f.default_value!=='')val=coerce(f,f.default_value);if(val===null&&f.required)throw Error(f.name+' es obligatorio');if(val!==null&&f.kind==='Texto corto'&&f.size&&String(val).length>f.size)throw Error(f.name+': supera el tamaño máximo');if(val===''&&!f.allow_zero)throw Error(f.name+': no permite longitud cero');checkRule(f,val);cols.push(f.name);vals.push(val)}if(editingRow===null){const sql=cols.length?'INSERT INTO '+ident(currentTable)+' ('+cols.map(ident).join(',')+') VALUES ('+cols.map(()=>'?').join(',')+')':'INSERT INTO '+ident(currentTable)+' DEFAULT VALUES';run(sql,vals)}else{run('UPDATE '+ident(currentTable)+' SET '+cols.map(c=>ident(c)+'=?').join(',')+' WHERE rowid=?',[...vals,editingRow])}editingRow=null;renderEditor();renderRecords();notify('Registro guardado')}catch(e){fail(e)}}
function deleteTable(){if(!currentTable||!tableNames().includes(currentTable))return;if(getRelations().some(r=>r.parent_table===currentTable||r.child_table===currentTable)){fail(Error('Elimina primero las relaciones de esta tabla'));return}if(!confirm('¿Eliminar la tabla '+currentTable+' y todos sus registros?'))return;try{db.run('BEGIN');try{db.run('DROP TABLE '+ident(currentTable));if(hasMeta()){db.run('DELETE FROM _aura_fields WHERE table_name=?',[currentTable]);db.run('DELETE FROM _aura_tables WHERE name=?',[currentTable])}db.run('COMMIT')}catch(e){db.run('ROLLBACK');throw e}dirty=true;currentTable=null;show('welcome');notify('Tabla eliminada')}catch(e){fail(e)}}
async function start(){try{if(typeof initSqlJs!=='function')throw Error('Falta vendor/sql-wasm.js. Consulta INSTRUCCIONES.txt');SQL=await initSqlJs({locateFile:f=>'vendor/'+f});$('#status').textContent='SQLite preparado';notify('AURA BASE preparada. Crea una base de datos.');}catch(e){$('#status').textContent='SQLite no disponible';fail(e)} }
$('#newDb').onclick=()=>{if(SQL)newDb();else notify('SQLite no está cargado')};$('#openDb').onclick=()=>$('#fileInput').click();$('#fileInput').onchange=e=>{const f=e.target.files[0];if(f){if(/\.(mdb|accdb)$/i.test(f.name))importAccessFile(f);else openDb(f)}e.target.value=''};$('#downloadDb').onclick=downloadDb;$('#newTable').onclick=newTable;$('#designView').onclick=()=>{if(currentTable){draft=[];showDesign()}};$('#dataView').onclick=showData;$('#deleteTable').onclick=deleteTable;$('#addField').onclick=()=>{draft.push(emptyField());selectedField=draft.length-1;renderDesign()};$('#saveStructure').onclick=saveStructure;$('#addRecord').onclick=()=>{editingRow=null;renderEditor()};$('#saveRecord').onclick=saveRecord;$('#filterRecords').oninput=()=>{if(view==='datasheet')renderRecords()};$('#reloadRecords').onclick=()=>{if(view==='datasheet')renderRecords()};
for(const [id,prop,checkbox] of [['propSize','size',false],['propDefault','default_value',false],['propFormat','format',false],['propMask','mask',false],['propRequired','required',true],['propUnique','unique_field',true],['propIndexed','indexed',true],['propCaption','caption',false],['propValidation','validation_rule',false],['propValidationText','validation_text',false],['propDecimals','decimals',false],['propAllowZero','allow_zero',true],['propUnicode','unicode_compression',true]]){$('#'+id).onchange=e=>{if(!draft[selectedField])return;draft[selectedField][prop]=checkbox?e.target.checked:(prop==='size'||prop==='decimals')?(e.target.value===''?null:Number(e.target.value)):e.target.value}}
const ribbons={
archivo:[['Nueva base','newDb'],['Abrir .db / Access','openDb'],['Guardar .db','downloadDb'],['Guardar como…','saveDbAs']],
inicio:[['Nueva base','newDb'],['Abrir .db / Access','openDb'],['Guardar .db','downloadDb'],['Guardar como…','saveDbAs'],['Nueva tabla','newTable'],['Vista Diseño','designView'],['Hoja de datos','dataView'],['Eliminar tabla','deleteTable']],
crear:[['Tabla','newTable'],['Diseño de tabla','newTable'],['Relaciones','relationsAction'],['Diseño de consulta','queriesAction'],['Diseño de formulario','formsAction'],['Diseño de informe','reportsAction'],['Nueva macro','macrosAction'],['Editor de código','codeAction']],
datos:[['Importar SQLite o Access','openDb'],['Exportar SQLite','downloadDb'],['Exportar CSV','exportCsv'],['Exportar Access .mdb',null],['Exportar Access .accdb',null]],
herramientas:[['Comprobar integridad','integrityBtn'],['Compactar base','compactBtn'],['Relaciones','relationsAction'],['Documentador','documentBtn']]
};

function getRelations(){return db?query("SELECT name FROM sqlite_master WHERE type='table' AND name='_aura_relations'").length?query('SELECT * FROM _aura_relations ORDER BY id'):[]:[]}
function renderObjectTabs(){
 const root=$('#objectTabs');root.replaceChildren();
 const items=[['datasheet','Hoja de datos'],['designer','Vista Diseño'],['relations','Relaciones'],['queries','Consultas'],['forms','Formularios'],['reports','Informes'],['macros','Macros'],['code','Código']];
 for(const [id,label] of items){const b=document.createElement('button');b.textContent=label;b.className=view===id?'active':'';b.onclick=()=>{if(id==='relations')showRelations();else if(id==='queries')showQueries();else if(id==='forms')showForms();else if(id==='reports')showReports();else if(id==='macros')showMacros();else if(id==='code')showCode();else if(currentTable){if(id==='designer'){draft=[];showDesign()}else showData()}else notify('Selecciona una tabla')};root.append(b)}
}
function relationTriggerNames(id){return ['_aura_rel_'+id+'_insert','_aura_rel_'+id+'_update','_aura_rel_'+id+'_parent_delete','_aura_rel_'+id+'_parent_update']}
function createRelationTriggers(r){
 const parent=ident(r.parent_table),child=ident(r.child_table),pf=ident(r.parent_field),cf=ident(r.child_field);
 const [ins,upd,del,pupd]=relationTriggerNames(r.id).map(ident);
 const exists='NOT EXISTS(SELECT 1 FROM '+parent+' WHERE '+pf+' = NEW.'+cf+')';
 const message="'Integridad referencial: relación "+r.id+"'";
 db.run('CREATE TRIGGER '+ins+' BEFORE INSERT ON '+child+' WHEN NEW.'+cf+' IS NOT NULL AND '+exists+' BEGIN SELECT RAISE(ABORT,'+message+'); END');
 db.run('CREATE TRIGGER '+upd+' BEFORE UPDATE OF '+cf+' ON '+child+' WHEN NEW.'+cf+' IS NOT NULL AND '+exists+' BEGIN SELECT RAISE(ABORT,'+message+'); END');
 db.run('CREATE TRIGGER '+del+' BEFORE DELETE ON '+parent+' WHEN EXISTS(SELECT 1 FROM '+child+' WHERE '+cf+'=OLD.'+pf+') BEGIN SELECT RAISE(ABORT,'+message+'); END');
 db.run('CREATE TRIGGER '+pupd+' BEFORE UPDATE OF '+pf+' ON '+parent+' WHEN OLD.'+pf+' IS NOT NEW.'+pf+' AND EXISTS(SELECT 1 FROM '+child+' WHERE '+cf+'=OLD.'+pf+') BEGIN SELECT RAISE(ABORT,'+message+'); END');
}
function showRelations(){
 try{if(!db)throw Error('Abre una base de datos');show('relations');renderRelations()}catch(e){fail(e)}
}
function orphanRows(pt,pf,ct,cf){
 return query('SELECT c.'+ident(cf)+' AS missing_value, COUNT(*) AS total FROM '+ident(ct)+' c WHERE c.'+ident(cf)+' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM '+ident(pt)+' p WHERE p.'+ident(pf)+'=c.'+ident(cf)+') GROUP BY c.'+ident(cf)+' ORDER BY total DESC LIMIT 30');
}
function createRelationBetween(pt,pf,ct,cf){
 try{
  if(pt===ct)throw Error('Selecciona dos tablas distintas');
  const principal=getFields(pt).find(f=>f.name===pf),dependent=getFields(ct).find(f=>f.name===cf);
  if(!principal||!dependent)throw Error('Uno de los campos no existe');
  if(!principal.primary_field&&!principal.unique_field)throw Error('El campo principal '+pt+'.'+pf+' debe ser clave primaria o único. Arrastra desde la tabla principal.');
  const group=f=>['Número','Autonumeración'].includes(f.kind)?'integer':['Número decimal','Moneda'].includes(f.kind)?'real':f.kind;
  if(group(principal)!==group(dependent))throw Error('Tipos incompatibles: '+pt+'.'+pf+' y '+ct+'.'+cf);
  if(getRelations().some(r=>r.parent_table===pt&&r.parent_field===pf&&r.child_table===ct&&r.child_field===cf))throw Error('Esta relación ya existe');
  const orphans=orphanRows(pt,pf,ct,cf);
  if(orphans.length){const count=orphans.reduce((n,r)=>n+Number(r.total),0);const detail=orphans.slice(0,15).map(r=>'Código '+String(r.missing_value)+' ('+r.total+' registro/s)').join('\n');
   alert('No se puede activar la integridad referencial.\n\n'+count+' registro(s) de '+ct+' no tienen correspondencia en '+pt+'.\n\n'+detail+'\n\nLos registros de '+pt+' sin '+ct+' son válidos. Corrige los códigos huérfanos en '+ct+' y vuelve a intentarlo.');return;
  }
  if(!confirm('Crear relación 1:N\n'+pt+'.'+pf+' (1) → '+ct+'.'+cf+' (∞)\n\nSe impedirá guardar préstamos sin vídeo y eliminar vídeos con préstamos. ¿Continuar?'))return;
  db.run('BEGIN');try{db.run('INSERT INTO _aura_relations(parent_table,parent_field,child_table,child_field) VALUES (?,?,?,?)',[pt,pf,ct,cf]);const id=query('SELECT last_insert_rowid() AS id')[0].id;createRelationTriggers({id,parent_table:pt,parent_field:pf,child_table:ct,child_field:cf});db.run('COMMIT')}catch(e){db.run('ROLLBACK');throw e}
  dirty=true;refreshStatus();renderRelations();notify('Relación 1:N creada. Guarda el archivo .db');
 }catch(e){fail(e)}
}
function createRelation(){
 try{const tables=tableNames();if(tables.length<2)throw Error('Crea al menos dos tablas');
 const pt=prompt('Tabla principal (lado 1)',tables[0]);if(pt===null)return;if(!tables.includes(pt))throw Error('Tabla no encontrada');
 const pf=prompt('Campo principal',getFields(pt).find(f=>f.primary_field)?.name||getFields(pt)[0].name);if(pf===null)return;
 const ct=prompt('Tabla relacionada (lado varios)',tables.find(t=>t!==pt));if(ct===null)return;if(!tables.includes(ct))throw Error('Tabla no encontrada');
 const cf=prompt('Campo relacionado',getFields(ct).find(f=>f.name===pf)?.name||getFields(ct)[0].name);if(cf===null)return;
 createRelationBetween(pt,pf,ct,cf)}catch(e){fail(e)}
}
let relationDrag=null;
function finishRelationDrop(from,to){
 if(!from||!to||from.table===to.table)return;
 const source=getFields(from.table).find(f=>f.name===from.field);
 const target=getFields(to.table).find(f=>f.name===to.field);
 if(source&&(source.primary_field||source.unique_field))createRelationBetween(from.table,from.field,to.table,to.field);
 else if(target&&(target.primary_field||target.unique_field))createRelationBetween(to.table,to.field,from.table,from.field);
 else fail(Error('Uno de los campos debe ser clave principal o único. Marca VIDEOS.CÓDIGO como clave principal.'));
}
function bindRelationField(line,table,field){
 line.classList.add('relation-draggable');
 line.title='Arrastra hasta otro campo o pulsa primero este campo y luego el destino';
 line.draggable=false;
 const origin={table,field};
 line.addEventListener('click',e=>{
  if(line.dataset.suppressClick==='1'){line.dataset.suppressClick='';return}
  if(!relationDrag){relationDrag=origin;line.classList.add('relation-selected');notify('Campo origen: '+table+'.'+field+'. Ahora pulsa el campo destino.')}
  else{const from=relationDrag;relationDrag=null;document.querySelectorAll('.relation-selected').forEach(x=>x.classList.remove('relation-selected'));finishRelationDrop(from,origin)}
 });
 line.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  e.preventDefault();
  const x=e.clientX,y=e.clientY;
  let active=false,ghost=null,target=null;
  const move=ev=>{
   if(!active&&Math.hypot(ev.clientX-x,ev.clientY-y)<7)return;
   if(!active){active=true;relationDrag=origin;ghost=document.createElement('div');ghost.className='relation-drag-ghost';ghost.textContent=table+' → '+field;document.body.append(ghost);line.classList.add('relation-selected')}
   ghost.style.left=(ev.clientX+14)+'px';ghost.style.top=(ev.clientY+12)+'px';
   const hit=document.elementFromPoint(ev.clientX,ev.clientY);
   const next=hit?.closest('.relation-card .field');
   if(target&&target!==next)target.classList.remove('relation-drop');
   target=next&&next!==line?next:null;
   if(target)target.classList.add('relation-drop');
  };
  const up=ev=>{
   window.removeEventListener('pointermove',move);
   window.removeEventListener('pointerup',up);
   window.removeEventListener('pointercancel',cancel);
   if(target)target.classList.remove('relation-drop');
   ghost?.remove();
   if(active){
    line.dataset.suppressClick='1';
    line.classList.remove('relation-selected');
    relationDrag=null;
    const dest=target?.closest('.relation-card');
    if(dest&&target?.dataset.field)finishRelationDrop(origin,{table:dest.dataset.table,field:target.dataset.field});
    else notify('Suelta el campo sobre un campo de otra tabla.');
   }
  };
  const cancel=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);target?.classList.remove('relation-drop');ghost?.remove();line.classList.remove('relation-selected');relationDrag=null};
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up,{once:true});
  window.addEventListener('pointercancel',cancel,{once:true});
 });
}
function deleteRelation(id){
 if(!confirm('¿Eliminar esta relación y sus restricciones?'))return;
 try{db.run('BEGIN');try{for(const name of relationTriggerNames(id))db.run('DROP TRIGGER IF EXISTS '+ident(name));db.run('DELETE FROM _aura_relations WHERE id=?',[id]);db.run('COMMIT')}catch(e){db.run('ROLLBACK');throw e}dirty=true;refreshStatus();renderRelations()}catch(e){fail(e)}
}
function renderRelations(){
 const cards=$('#relationsCards'),list=$('#relationsTable'),canvas=$('#relationsCanvas');cards.replaceChildren();list.replaceChildren();
 const tables=tableNames(),rels=getRelations();
 for(const [i,t] of tables.entries()){
  const pos=relationPositions[t]||{x:25+(i%3)*265,y:20+Math.floor(i/3)*245};relationPositions[t]=pos;
  const card=document.createElement('div');card.className='relation-card';card.dataset.table=t;
  card.style.left=pos.x+'px';card.style.top=pos.y+'px';
  const head=document.createElement('header');head.textContent=t;card.append(head);
  for(const f of getFields(t)){const line=document.createElement('div');line.className='field'+(f.primary_field?' pk':'');line.textContent=(f.primary_field?'🔑 ':'')+f.name;line.dataset.field=f.name;bindRelationField(line,t,f.name);card.append(line)}
  head.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();head.setPointerCapture(e.pointerId);const x=e.clientX,y=e.clientY,oldX=pos.x,oldY=pos.y;head.onpointermove=ev=>{pos.x=Math.max(0,oldX+ev.clientX-x);pos.y=Math.max(0,oldY+ev.clientY-y);card.style.left=pos.x+'px';card.style.top=pos.y+'px';drawRelationLines()};head.onpointerup=()=>{head.onpointermove=null;head.onpointerup=null}};
  cards.append(card);
 }
 for(const r of rels){const item=document.createElement('div');item.className='relation-entry';const text=document.createElement('span');text.textContent=r.parent_table+'.'+r.parent_field+' (1) → '+r.child_table+'.'+r.child_field+' (∞) · Integridad RESTRICT';const b=document.createElement('button');b.textContent='Eliminar relación';b.onclick=()=>deleteRelation(r.id);item.append(text,b);list.append(item)}
 if(!rels.length){const p=document.createElement('p');p.className='hint';p.textContent='Todavía no hay relaciones. Pulsa «Crear relación».';list.append(p)}
 const maxY=Math.max(480,...tables.map(t=>relationPositions[t].y+230));canvas.style.minHeight=maxY+'px';drawRelationLines();
}
function drawRelationLines(){
 const svg=$('#relationsLines');svg.replaceChildren();const canvas=$('#relationsCanvas');const base=canvas.getBoundingClientRect();
 for(const r of getRelations()){
  const parent=[...document.querySelectorAll('.relation-card')].find(c=>c.dataset.table===r.parent_table);
  const child=[...document.querySelectorAll('.relation-card')].find(c=>c.dataset.table===r.child_table);
  if(!parent||!child)continue;
  const p=[...parent.querySelectorAll('.field')].find(e=>e.dataset.field===r.parent_field);
  const c=[...child.querySelectorAll('.field')].find(e=>e.dataset.field===r.child_field);
  if(!p||!c)continue;
  const a=p.getBoundingClientRect(),b=c.getBoundingClientRect();
  const x1=a.right-base.left+canvas.scrollLeft,y1=a.top+a.height/2-base.top+canvas.scrollTop;
  const x2=b.left-base.left+canvas.scrollLeft,y2=b.top+b.height/2-base.top+canvas.scrollTop;
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x1} ${y1} C ${x1+60} ${y1}, ${x2-60} ${y2}, ${x2} ${y2}`);path.setAttribute('stroke','#68243b');path.setAttribute('stroke-width','2.5');path.setAttribute('fill','none');svg.append(path);
 }
}
$('#addRelation').onclick=createRelation;$('#refreshRelations').onclick=renderRelations;
window.addEventListener('resize',()=>{if(view==='relations')drawRelationLines()});

function exportCsv(){try{if(!currentTable)throw Error('Selecciona una tabla');const fields=getFields(currentTable),rows=query('SELECT * FROM '+ident(currentTable));const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';const csv='\uFEFF'+[fields.map(f=>q(f.name)).join(';'),...rows.map(r=>fields.map(f=>q(r[f.name])).join(';'))].join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=currentTable+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}catch(e){fail(e)}}
function ribbonTab(tab){const r=$('#ribbon');if(!$('#legacyActions')){const legacy=document.createElement('div');legacy.id='legacyActions';legacy.hidden=true;while(r.firstChild)legacy.append(r.firstChild);document.body.append(legacy)}r.replaceChildren();for(const [label,id] of ribbons[tab]||ribbons.inicio){const b=document.createElement('button');b.textContent=label;if(!id){b.disabled=true;b.title='Pendiente de desarrollo: no disponible en esta entrega'}else if(id==='saveDbAs')b.onclick=saveDbAs;else if(id==='relationsAction')b.onclick=showRelations;else if(id==='queriesAction')b.onclick=()=>showQueries();else if(id==='formsAction')b.onclick=()=>showForms();else if(id==='reportsAction')b.onclick=()=>showReports();else if(id==='macrosAction')b.onclick=()=>showMacros();else if(id==='codeAction')b.onclick=()=>showCode();else if(id==='exportCsv')b.onclick=exportCsv;else if(id==='integrityBtn')b.onclick=()=>{try{notify('Integridad: '+query('PRAGMA integrity_check')[0].integrity_check)}catch(e){fail(e)}};else if(id==='compactBtn')b.onclick=()=>{try{db.run('VACUUM');dirty=true;refreshStatus();notify('Base compactada; descarga el archivo .db')}catch(e){fail(e)}};else if(id==='documentBtn')b.onclick=()=>{try{notify('Tablas: '+tableNames().join(', ')||'Sin tablas')}catch(e){fail(e)}};else b.onclick=()=>$('#'+id).click();r.append(b)}}
$$('nav button').forEach(b=>b.onclick=()=>{$$('nav button').forEach(x=>x.classList.toggle('active',x===b));ribbonTab(b.dataset.tab)});
ribbonTab('inicio');
$('#saveAsConfirm').onclick=confirmSaveAs;$('#saveAsCancel').onclick=()=>{$('#saveAsDialog').hidden=true};$('#saveAsDialog').addEventListener('click',e=>{if(e.target.id==='saveAsDialog')e.currentTarget.hidden=true});$('#saveAsName').addEventListener('keydown',e=>{if(e.key==='Enter')confirmSaveAs();if(e.key==='Escape')$('#saveAsDialog').hidden=true});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;($('#installBtn')||{}).hidden=false});document.addEventListener('click',()=>{});const installButton=$('#installBtn');if(installButton)installButton.onclick=async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;($('#installBtn')||{}).hidden=true};
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(console.warn);
start();
