'use strict';
/* Conversión local mediante servidor Python y Microsoft ACE/Jet OLEDB (Windows). */
async function importAccessFile(file){
 if(!file)return;
 if(dirty&&!confirm('La importación sustituirá la base de datos abierta. Guarda antes tus cambios. ¿Continuar?'))return;
 if(file.size>40*1024*1024){fail(Error('Archivo Access superior a 40 MB; esta versión no admite su importación'));return}
 try{
  notify('Comprobando conversor local de Access…');
  const body=new FormData();body.append('file',file,file.name);
  const response=await fetch('/api/import-access',{method:'POST',body});
  if(!response.ok){let message='El conversor no está disponible';try{const j=await response.json();message=j.error||message}catch(_){}throw Error(message)}
  const bytes=new Uint8Array(await response.arrayBuffer());
  const candidate=new SQL.Database(bytes);const result=candidate.exec('PRAGMA integrity_check');if(result[0]?.values?.[0]?.[0]!=='ok')throw Error('El archivo convertido no supera la verificación');
  db?.close();db=candidate;db.run(metaSql);upgradeMetadata();db.run("CREATE TABLE IF NOT EXISTS _aura_queries (name TEXT PRIMARY KEY,sql_text TEXT NOT NULL,source_table TEXT,design_json TEXT NOT NULL DEFAULT '{}')");
  db.run("CREATE TABLE IF NOT EXISTS _aura_forms(name TEXT PRIMARY KEY,source_table TEXT NOT NULL,layout TEXT NOT NULL DEFAULT 'ficha',config TEXT NOT NULL DEFAULT '{}')");
  dbName=file.name.replace(/\.(mdb|accdb)$/i,'')+'_importada.db';currentTable=null;dirty=true;show('welcome');
  notify('Importación completada: '+tableNames().length+' tablas. Guarda ahora la base .db');
 }catch(e){fail(e);alert('No se pudo importar el archivo Access.\n\n'+e.message+'\n\nComprueba que utilizas INICIAR_AURA_BASE.bat y que tienes instalado el controlador Microsoft Access Database Engine compatible.')}
}
