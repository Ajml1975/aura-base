'use strict';
/* Exportación interoperable: paquete JSON para conversor local Access COM. */
function auraBridgePackage(){
 if(!db)throw Error('Abre o crea una base primero');
 const names=tableNames();
 const tables=names.map(name=>({name,columns:query('PRAGMA table_info('+ident(name)+')').map(c=>({name:c.name,type:c.type,notnull:!!c.notnull,pk:!!c.pk})),rows:query('SELECT * FROM '+ident(name)).map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Uint8Array?Array.from(v):v])))}));
 const exists=name=>query('SELECT name FROM sqlite_master WHERE type="table" AND name=?',[name]).length>0;
 const metadata={};
 for(const name of ['_aura_relations','_aura_queries','_aura_forms','_aura_reports','_aura_macros','_aura_fields','_aura_settings'])if(exists(name))metadata[name]=query('SELECT * FROM '+ident(name));
 return {format:'AURA-ACCESS-BRIDGE',version:1,source:dbName,created:new Date().toISOString(),tables,metadata};
}
function auraDownloadBridge(format,base){
 const pack=auraBridgePackage();pack.target=format;
 const blob=new Blob([JSON.stringify(pack)],{type:'application/json;charset=utf-8'});
 saveBlobByDownload(blob,base+'.aura-access.json');
 notify('Paquete de conversión descargado. Ejecuta el conversor Windows incluido en el ZIP.');
}
