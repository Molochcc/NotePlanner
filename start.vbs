' NotePlanner Launcher
' 后台启动 Flask 服务器并自动打开浏览器

Dim WshShell, FSO, ScriptDir, ServerScript
Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

' 获取脚本所在目录（即项目根目录）
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
ServerScript = ScriptDir & "\workspace_server.py"

' 检查服务器文件是否存在
If Not FSO.FileExists(ServerScript) Then
    MsgBox "找不到 workspace_server.py，请确保此脚本放在项目根目录。", vbExclamation, "NotePlanner"
    WScript.Quit 1
End If

' 检查 python3 或 python
Dim PythonCmd
PythonCmd = ""
On Error Resume Next
WshShell.Run "python3 --version", 0, True
If Err.Number = 0 Then PythonCmd = "python3"
Err.Clear
If PythonCmd = "" Then
    WshShell.Run "python --version", 0, True
    If Err.Number = 0 Then PythonCmd = "python"
End If
Err.Clear
On Error GoTo 0

If PythonCmd = "" Then
    MsgBox "未找到 Python。请先安装 Python 3。", vbExclamation, "NotePlanner"
    WScript.Quit 1
End If

' 后台启动 Flask 服务器（隐藏窗口，工作目录设为项目根目录）
Dim ServerCmd
ServerCmd = "cmd /c cd /d """ & ScriptDir & """ && " & PythonCmd & " workspace_server.py"
WshShell.Run ServerCmd, 0, False

' 等待服务器启动（3秒）
WScript.Sleep 3000

' 打开浏览器
WshShell.Run "http://localhost:4173", 1, False

Set WshShell = Nothing
Set FSO = Nothing
