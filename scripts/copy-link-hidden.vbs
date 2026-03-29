Option Explicit

Dim shell, args, targetPath, launcherPath, command
Set shell = CreateObject("WScript.Shell")
Set args = WScript.Arguments

If args.Count < 3 Then
  WScript.Quit 1
End If

launcherPath = args.Item(0)
Dim secondaryPath
secondaryPath = args.Item(1)
targetPath = args.Item(2)

command = """" & Replace(launcherPath, """", """""") & """"
If Len(secondaryPath) > 0 Then
  command = command & " """ & Replace(secondaryPath, """", """""") & """"
End If
command = command & " copy """ & Replace(targetPath, """", """""") & """"
shell.Run command, 0, False
