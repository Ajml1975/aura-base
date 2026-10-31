'use strict';
/* AURA BASE 1.8 BETA: lector MDB/ACCDB de terceros ejecutado en el navegador.
   Requiere conexión a esm.sh. No utiliza el endpoint local /api/import-access. */
const ACCESS_READER_URL='https://esm.sh/mdb-reader@3.2.0?bundle';
const ACCESS_BUFFER_URL='https://esm.sh/buffer@6.0.3?bundle';
async function accessSqlId(name){return '"'+String(name).replace(/"/g,'""')+'"'}
async function accessSqlType(col){
 const t=String(col?.type||col?.dataType||'').toLowerCase();
 if(/int|long|short|byte|counter|auto|bool/.test(t))return 'INTEGER';
 if(/currency|numeric|decimal|money/.test(t))return 'TEXT'; // Evitar pérdida de precisión decimal.
 if(/float|double|single/.test(t))return 'REAL';
 if(/binary|ole|blob|attachment/.test(t))return 'BLOB';
 return 'TEXT';
}
async function accessValue(v){
 if(v===null||v===undefined)return null;
 if(v instanceof Date)return Number.isFinite(v.getTime())?v.toISOString():null;
 if(v instanceof Uint8Array)return v;
 if(v instanceof ArrayBuffer)return new Uint8Array(v);
 if(typeof v==='boolean')return v?1:0;
 if(typeof v==='bigint')return v.toString();
 if(typeof v==='number')return Number.isFinite(v)?v:null;
 if(typeof v==='object')return JSON.stringify(v);
 return String(v);
}
async function importAccessFile(file){
 if(!file)return;
 if(!SQL){await auraAlert('Espera a que SQLite termine de iniciarse.');return}
 if(dirty&&!await auraConfirm('La importación sustituirá la base abierta. Descarga primero tus cambios. ¿Continuar?'))return;
 if(file.size>40*1024*1024){await auraAlert('El archivo supera el límite experimental de 40 MB.');return}
 let candidate=null;
 try{
  notify('Cargando lector Access web…');
  let module;
  try{module=await import(ACCESS_READER_URL)}catch(err){throw Error('No se pudo descargar el lector Access. Comprueba la conexión a Internet o el bloqueo de scripts externos. Detalle: '+err.message)}
  const MDBReader=module.default||module.MDBReader;
  if(typeof MDBReader!=='function')throw Error('El módulo lector no ofrece la API esperada.');
  // mdb-reader requiere Buffer de Node, no ArrayBuffer nativo.
  let bufferModule;
  try{bufferModule=await import(ACCESS_BUFFER_URL)}catch(err){throw Error('No se pudo cargar la compatibilidad Buffer para el navegador: '+err.message)}
  const BufferClass=bufferModule.Buffer||bufferModule.default?.Buffer;
  if(typeof BufferClass?.from!=='function')throw Error('No se ha podido inicializar Buffer para leer Access.');
  const fileBytes=new Uint8Array(await file.arrayBuffer());
  if(fileBytes.length<32)throw Error('El archivo Access está vacío o es demasiado pequeño.');
  const header=String.fromCharCode(...fileBytes.subarray(4,19));
  if(!header.startsWith('Standard Jet DB')&&!header.startsWith('Standard ACE DB'))throw Error('La cabecera del archivo no corresponde a una base Access Jet/ACE reconocida.');
  const reader=new MDBReader(BufferClass.from(fileBytes));
  const names=reader.getTableNames().filter(n=>!/^MSys/i.test(n));
  if(!names.length)throw Error('No se encontraron tablas de usuario compatibles.');
  candidate=new SQL.Database();
  candidate.run(metaSql);
  candidate.run("CREATE TABLE IF NOT EXISTS _aura_queries (name TEXT PRIMARY KEY,sql_text TEXT NOT NULL,source_table TEXT,design_json TEXT NOT NULL DEFAULT '{}')");
  candidate.run("CREATE TABLE IF NOT EXISTS _aura_forms(name TEXT PRIMARY KEY,source_table TEXT NOT NULL,layout TEXT NOT NULL DEFAULT 'ficha',config TEXT NOT NULL DEFAULT '{}')");
  let count=0, skipped=[];
  for(const name of names){
   try{
    const table=reader.getTable(name);
    const rows=table.getData();
    const columns=table.getColumnNames();
    if(!columns.length){skipped.push(name+' (sin campos)');continue}
    const def=columns.map(c=>accessSqlId(c)+' '+accessSqlType(table.getColumns().find(x=>x.name===c))).join(',');
    candidate.run('CREATE TABLE '+accessSqlId(name)+' ('+def+')');
    const insert='INSERT INTO '+accessSqlId(name)+' ('+columns.map(accessSqlId).join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')';
    const statement=candidate.prepare(insert);
    try{for(const row of rows){statement.run(columns.map(c=>accessValue(row[c])));count++}}finally{statement.free()}
   }catch(err){skipped.push(name+' ('+err.message+')')}
  }
  const imported=names.length-skipped.length;
  if(!imported)throw Error('No se pudo convertir ninguna tabla. '+skipped.join('; '));
  const check=candidate.exec('PRAGMA integrity_check');
  if(check[0]?.values?.[0]?.[0]!=='ok')throw Error('La conversión no supera la comprobación de integridad.');
  db?.close();db=candidate;candidate=null;
  upgradeMetadata();dbName=file.name.replace(/\.(mdb|accdb)$/i,'')+'_importada.db';currentTable=null;dirty=true;show('welcome');
  const message='Importadas '+imported+' tablas y '+count+' registros.'+(skipped.length?' No importadas: '+skipped.join('; '):'')+' Guarda una copia .db.';
  notify(message);await auraAlert('Importación Access (BETA)\n\n'+message+'\n\nLas consultas, formularios, macros y relaciones de Access no se convierten automáticamente.');
 }catch(err){console.error('Importación Access:',err);await auraAlert('No se pudo importar el archivo Access.\n\n'+err.message+'\n\nEsta función es experimental y depende de la compatibilidad del lector web.');}
 finally{if(candidate)candidate.close()}
}
