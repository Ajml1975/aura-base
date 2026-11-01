param([Parameter(Mandatory=$true)][string]$Entrada,[ValidateSet('mdb','accdb')][string]$Formato='accdb',[string]$Salida='')
$ErrorActionPreference='Stop'
$Entrada=(Resolve-Path -LiteralPath $Entrada).Path
$pack=Get-Content -LiteralPath $Entrada -Raw -Encoding UTF8 | ConvertFrom-Json
if($pack.format -ne 'AURA-ACCESS-BRIDGE' -or $pack.version -ne 1){throw 'Paquete AURA BASE no reconocido'}
if(!$Salida){$Salida=[IO.Path]::ChangeExtension($Entrada,".$Formato");$Salida=$Salida -replace '\.aura-access\.', '.'}
$Salida=[IO.Path]::GetFullPath($Salida)
if(Test-Path -LiteralPath $Salida){throw "El archivo de salida ya existe: $Salida. No se sobrescribe."}
$access=$null;$database=$null;$created=$false;$report=[Collections.Generic.List[string]]::new()
function DaoType($col){
 $t=[string]$col.type
 if($t -match 'INT|BOOL'){return 4}
 if($t -match 'REAL|FLOA|DOUB|DEC|NUM'){return 7}
 if($t -match 'BLOB'){return 12}
 if($t -match 'DATE|TIME'){return 8}
 if($t -match 'CHAR|TEXT|CLOB' -and $t -match 'LONG'){return 12}
 return 10
}
try{
 $access=New-Object -ComObject Access.Application
 if($Formato -eq 'accdb'){
   $access.NewCurrentDatabase($Salida)
   $database=$access.CurrentDb()
 }else{
   # DAO dbVersion40 (64) crea un archivo Jet 4.0 MDB real.
   $engine=$access.DBEngine
   $database=$engine.CreateDatabase($Salida,';LANGID=0x0409;CP=1252;COUNTRY=0',64)
 }
 $created=$true
 foreach($table in $pack.tables){
   try{
     $td=$database.CreateTableDef([string]$table.name)
     foreach($column in $table.columns){
       $typ=DaoType $column
       $field=$td.CreateField([string]$column.name,[int]$typ)
       if($typ -eq 10){$field.Size=255}
       $td.Fields.Append($field)
     }
     $database.TableDefs.Append($td)
     $rs=$database.OpenRecordset([string]$table.name,2)
     try{
       foreach($row in $table.rows){
         $rs.AddNew()
         foreach($column in $table.columns){
           $key=[string]$column.name;$value=$row.PSObject.Properties[$key].Value
           if($null -eq $value){continue}
           if($value -is [array]){continue}
           $typ=DaoType $column
           if($typ -eq 10){$value=[string]$value;if($value.Length -gt 255){$value=$value.Substring(0,255);$report.Add("TRUNCADO: $($table.name).$key")}}
           try{$rs.Fields.Item($key).Value=$value}catch{$report.Add("VALOR NO CONVERTIDO: $($table.name).$key : $($_.Exception.Message)")}
         }
         $rs.Update()
       }
     }finally{$rs.Close()}
     $report.Add("TABLA: $($table.name) ($($table.rows.Count) registros)")
   }catch{$report.Add("ERROR EN TABLA $($table.name): $($_.Exception.Message)")}
 }
 # Los objetos de AURA BASE se conservan en el paquete original, pero los diseños
 # de Access no se generan aquí. No afirmar compatibilidad inexistente.
 $report.Add('CONSULTAS / FORMULARIOS / INFORMES / MACROS: no convertidos en esta versión; conservados en paquete JSON de origen.')
}finally{
 if($null -ne $database){try{$database.Close()}catch{};[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($database)}
 if($null -ne $access){try{$access.Quit()}catch{};[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($access)}
}
$reportPath=[IO.Path]::ChangeExtension($Salida,'.informe.txt')
$report | Out-File -LiteralPath $reportPath -Encoding UTF8
Write-Host "Archivo generado: $Salida"
Write-Host "Informe: $reportPath"
