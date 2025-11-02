@echo off

setlocal enabledelayedexpansion

:: Default values
set "TARGET_DIR=%CD%"
set "OUTPUT_FILE="
set "SHOW_HELP=0"

:: Parse command-line arguments
:parse_args
if "%~1"=="" goto after_parse

if "%~1"=="-d" (
    if "%~2"=="" (
        call :error "Error: -d requires a folder argument."
    )
    set "TARGET_DIR=%~2"
    shift
    shift
    goto parse_args
)

if "%~1"=="-o" (
    if "%~2"=="" (
        call :error "Error: -o requires a file argument."
    )
    set "OUTPUT_FILE=%~2"
    shift
    shift
    goto parse_args
)

if "%~1"=="-h" goto show_help
if "%~1"=="--help" goto show_help

:: Unknown option

echo Unknown option: %~1

goto show_help

:after_parse
:: Validate target directory exists
if not exist "%TARGET_DIR%\" (
    call :error "Error: Invalid folder path"
)

:: If an output file is specified, ensure its directory exists or can be created
if not "%OUTPUT_FILE%"=="" (
    for %%F in ("%OUTPUT_FILE%") do set "OUTPUT_DIR=%%~dpF"
    if not exist "%OUTPUT_DIR%" (
        mkdir "%OUTPUT_DIR%" 2>nul
        if errorlevel 1 (
            call :error "Error: Cannot create output directory \"%OUTPUT_DIR%\""
        )
    )
)

:: Core file‑listing logic
if not "%OUTPUT_FILE%"=="" (
    dir /s /b "%TARGET_DIR%" > "%OUTPUT_FILE%"
    if errorlevel 1 (
        call :error "Error: Failed to list files."
    )
    echo Successfully wrote file list to "%OUTPUT_FILE%".
    exit /b 0
) else (
    dir /s /b "%TARGET_DIR%"
    if errorlevel 1 (
        call :error "Error: Failed to list files."
    )
    exit /b 0
)

:show_help

echo Usage: %~nx0 [options]

echo.

echo Options:

echo   -d ^<folder^>   Set target directory (default: current directory)

echo   -o ^<file^>     Set output file (optional)

echo   -h, --help      Show this help message

exit /b 1

:: Error handling subroutine
:error
:: %~1 contains the error message
    echo %~1 >&2
    exit /b 1
