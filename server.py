"""AURA BASE local server. Import Access only with Windows ACE/Jet OLEDB available."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json, sqlite3, tempfile, subprocess, os
from email.parser import BytesParser
from email import policy

ROOT=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_POST(self):
        if self.path!='/api/import-access':return self.error_json(404,'Ruta no encontrada')
        try:
            if os.name!='nt':raise RuntimeError('La importación automática de Access requiere Windows y Microsoft Access Database Engine.')
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>45*1024*1024:raise ValueError('Archivo demasiado grande (máximo 40 MB)')
            content=self.rfile.read(length)
            message=BytesParser(policy=policy.default).parsebytes(('Content-Type: '+self.headers.get('Content-Type','')+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+content)
            items=[part for part in message.iter_parts() if part.get_param('name',header='content-disposition')=='file']
            if len(items)!=1:raise ValueError('Debe adjuntarse un archivo')
            item=items[0]
            filename=Path(item.get_filename() or '').name
            if Path(filename).suffix.lower() not in ('.mdb','.accdb'):raise ValueError('Solo se admiten archivos .mdb o .accdb')
            raw=item.get_payload(decode=True)
            if len(raw)>40*1024*1024:raise ValueError('Archivo superior a 40 MB')
            with tempfile.TemporaryDirectory(prefix='aurabase_') as td:
                source=Path(td)/('entrada'+Path(filename).suffix.lower());source.write_bytes(raw)
                dest=Path(td)/'datos.json'
                cmd=['powershell.exe','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',str(ROOT/'import_access.ps1'),'-InputPath',str(source),'-OutputPath',str(dest)]
                result=subprocess.run(cmd,capture_output=True,text=True,timeout=120)
                if result.returncode or not dest.exists():raise RuntimeError('Error del controlador Access: '+(result.stderr or result.stdout)[-900:])
                payload=json.loads(dest.read_text(encoding='utf-8-sig'))
                out=Path(td)/'convertida.db';con=sqlite3.connect(str(out))
                try:
                    for table in payload.get('tables',[]):
                        name=table['name'];columns=table.get('columns',[])
                        if not columns or name.lower().startswith('_aura_'):continue
                        def qi(s):return '"'+s.replace('"','""')+'"'
                        def dtype(x):
                            x=x.lower()
                            if any(k in x for k in ['int','boolean']):return 'INTEGER'
                            if any(k in x for k in ['double','decimal','single','float']):return 'REAL'
                            return 'TEXT'
                        cols=[qi(c['name'])+' '+dtype(c.get('type','')) for c in columns]
                        con.execute('CREATE TABLE '+qi(name)+' ('+', '.join(cols)+')')
                        rows=table.get('rows',[])
                        if rows:
                            placeholders=','.join('?' for _ in columns)
                            con.executemany('INSERT INTO '+qi(name)+' VALUES ('+placeholders+')',[tuple(str(v) if isinstance(v,(dict,list)) else v for v in row) for row in rows])
                    con.commit()
                finally:con.close()
                data=out.read_bytes()
            self.send_response(200);self.send_header('Content-Type','application/octet-stream');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
        except Exception as e:self.error_json(422,str(e))
    def error_json(self,code,message):
        data=json.dumps({'error':message},ensure_ascii=False).encode('utf-8');self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
if __name__=='__main__':
    print('AURA BASE 1.6: http://127.0.0.1:8765/ (solo acceso local)')
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
