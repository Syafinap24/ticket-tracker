@echo off
title Ticket Tracker & Realtime NOC Web Server
cd /d "%~dp0"
echo Menjalankan Web Server Ticket Tracker...
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause
