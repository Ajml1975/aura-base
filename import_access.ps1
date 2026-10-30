param([Parameter(Mandatory=$true)][string]$InputPath,[Parameter(Mandatory=$true)][string]$OutputPath)
$ErrorActionPreference='Stop'
# Microsoft ACE/Jet OLE DB provider is required; only tables and rows are imported.
$providers = @('Microsoft.ACE.OLEDB.16.0','Microsoft.ACE.OLEDB.12.0','Microsoft.Jet.OLEDB.4.0')
$conn=$null;$errors=@()
foreach($provider in $providers){
 try {
  $cs="Provider=$provider;Data Source=$InputPath;Mode=Read;Persist Security Info=False;"
  $c=New-Object System.Data.OleDb.OleDbConnection($cs);$c.Open();$conn=$c;break
 } catch {$errors+=($_.Exception.Message);if($c){$c.Dispose()}}
}
if($null -eq $conn){throw 'No se ha podido abrir Access. Instala Microsoft Access Database Engine (ACE) con la arquitectura correcta o comprueba que el archivo no tiene contraseña.'}
try {
 $tables=@();$schema=$conn.GetSchema('Tables')
 foreach($item in $schema.Rows){
  $type=[string]$item['TABLE_TYPE'];$name=[string]$item['TABLE_NAME']
  if($type -ne 'TABLE' -or $name.StartsWith('MSys') -or $name.StartsWith('~')){continue}
  $cmd=$conn.CreateCommand();$cmd.CommandText='SELECT * FROM ['+$name.Replace(']',']]')+']'
  $reader=$cmd.ExecuteReader()
  try {
   $columns=@();for($i=0;$i -lt $reader.FieldCount;$i++){$columns+=@{name=$reader.GetName($i);type=$reader.GetFieldType($i).FullName}}
   $rows=New-Object System.Collections.ArrayList
   while($reader.Read()){
    $values=@();for($i=0;$i -lt $reader.FieldCount;$i++){
     if($reader.IsDBNull($i)){$values+=,$null}
     elseif($reader.GetValue($i) -is [byte[]]){$values+=,[Convert]::ToBase64String([byte[]]$reader.GetValue($i))}
     elseif($reader.GetValue($i) -is [DateTime]){$values+=,([DateTime]$reader.GetValue($i)).ToString('yyyy-MM-dd HH:mm:ss')}
     else{$values+=,$reader.GetValue($i)}
    }
    [void]$rows.Add(@($values))
   }
   $tables+=@{name=$name;columns=@($columns);rows=@($rows.ToArray())}
  } finally {$reader.Close();$reader.Dispose();$cmd.Dispose()}
 }
 $payload=@{tables=@($tables)} | ConvertTo-Json -Depth 12 -Compress
 [System.IO.File]::WriteAllText($OutputPath,$payload,[System.Text.UTF8Encoding]::new($false))
} finally {$conn.Close();$conn.Dispose()}
