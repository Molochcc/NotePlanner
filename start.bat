@echo off
chcp 65001 >nul
cd /d "H:\NotePlanner"
start "" "http://localhost:4173"
py -3 workspace_server.py
