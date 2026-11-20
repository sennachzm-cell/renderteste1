Option Explicit
Dim sh, fso, root, command
Set sh=CreateObject("WScript.Shell")
Set fso=CreateObject("Scripting.FileSystemObject")
root=fso.GetParentFolderName(WScript.ScriptFullName)
command="node.exe " & Chr(34) & fso.BuildPath(root,"stop-local.js") & Chr(34)
sh.Run command,0,True
