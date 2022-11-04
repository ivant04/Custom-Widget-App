Set fso = CreateObject("Scripting.FileSystemObject")
If (fso.FileExists("../../CustomWidgetApp.exe")) Then
   createobject("wscript.shell").run """..\..\CustomWidgetApp.exe"" --dashboard", 0, true
Else
   Call MsgBox("The main script doesn't exist on the expected location." & vbCrLf & "This file can only be ran from the packaged Electron app!", 0, "Custom Widget App")
End If