@echo off
echo Compilation BriefAI Client...

where g++ >nul 2>&1
if %errorlevel% == 0 (
    g++ -std=c++17 -O2 -o briefai.exe client.cpp -lws2_32
) else (
    echo g++ absent, compilation via Docker...
    docker run --rm -v "%cd%":/app -w /app gcc:latest g++ -std=c++17 -O2 -o briefai.exe client.cpp -lws2_32
)

if %errorlevel% == 0 (
    echo OK - briefai.exe cree
    echo Usage: briefai.exe "votre sujet"
) else (
    echo ERREUR de compilation
)
pause
