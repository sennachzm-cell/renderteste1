' Street Admin LH STREET - inicialização local sem terminal visível.
Option Explicit
Dim sh, fso, root, gateway, config, helpFile, url, code, command, reader
Set sh=CreateObject("WScript.Shell")
Set fso=CreateObject("Scripting.FileSystemObject")
root=fso.GetParentFolderName(WScript.ScriptFullName)
gateway=fso.BuildPath(root,"local-gateway.js")
config=fso.BuildPath(root,"render-url.txt")
helpFile=fso.BuildPath(root,"Problemas-na-Inicializacao.html")
If Not fso.FileExists(gateway) Or Not fso.FileExists(config) Then
  sh.Run Chr(34) & helpFile & Chr(34),1,False
  WScript.Quit 1
End If
Set reader=fso.OpenTextFile(config,1)
url=Trim(reader.ReadAll)
reader.Close
If InStr(1,url,"https://",vbTextCompare)<>1 Or InStr(1,url,"SEU-SERVICO",vbTextCompare)>0 Then
  sh.Run Chr(34) & helpFile & Chr(34),1,False
  WScript.Quit 1
End If
code=sh.Run("cmd.exe /c where node.exe >nul 2>&1",0,True)
If code<>0 Then
  sh.Run Chr(34) & helpFile & Chr(34),1,False
  WScript.Quit 1
End If
command=Chr(34) & "node.exe" & Chr(34) & " " & Chr(34) & gateway & Chr(34)
sh.Run command,0,False
WScript.Sleep 1300
sh.Run "http://127.0.0.1:17879/",1,False
