Option Explicit

Dim shell, args, targetPath, fso, leaf, parentLeaf
Set shell = CreateObject("WScript.Shell")
Set args = WScript.Arguments
Set fso = CreateObject("Scripting.FileSystemObject")

If args.Count < 1 Then
  WScript.Quit 1
End If

targetPath = args.Item(0)
leaf = ""
parentLeaf = ""

On Error Resume Next
leaf = fso.GetFileName(targetPath)
parentLeaf = fso.GetFileName(fso.GetParentFolderName(targetPath))
On Error GoTo 0

WScript.Sleep 500

If Len(leaf) > 0 Then
  If shell.AppActivate(leaf) Then
    WScript.Quit 0
  End If
End If

If Len(parentLeaf) > 0 Then
  If shell.AppActivate(parentLeaf) Then
    WScript.Quit 0
  End If
End If

If shell.AppActivate("File Explorer") Then
  WScript.Quit 0
End If

If shell.AppActivate("Windows Explorer") Then
  WScript.Quit 0
End If
