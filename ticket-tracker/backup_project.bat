@echo off
title Backup Project Ticket Tracker
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0backup-project.ps1"
pause
