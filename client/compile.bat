@echo off
echo Compilation BriefAI Client...
g++ -std=c++17 -O2 -o briefai.exe client.cpp -lws2_32 -lwinhttp
if %errorlevel% == 0 (
    echo OK - briefai.exe créé
    echo Usage: briefai.exe "votre sujet"
) else (
    echo ERREUR de compilation
)
pause
