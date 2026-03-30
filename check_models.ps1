
# Script de Verificación de Vertex AI para Antigravity
$PROJECT_ID = "antigravity-ai-dev-491607"
$LOCATION = "us-central1"
$API_KEY = "AIzaSyBAzafUOAqklERLuDYzgDEOqtWpb3qmHpg"

Write-Host "--- Verificando Modelos Disponibles en Vertex AI ---" -ForegroundColor Cyan
Write-Host "Proyecto: $PROJECT_ID"
Write-Host "Ubicación: $LOCATION"
Write-Host ""

# Usando el endpoint de Generative AI para listar modelos con la API Key
$url = "https://generativelanguage.googleapis.com/v1beta/models?key=$API_KEY"

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction Stop
    
    Write-Host "--- Modelos Prioritarios Configurados ---" -ForegroundColor Yellow
    $response.models | ForEach-Object {
        if ($_.name -match "gemini-1.5-pro" -or $_.name -match "command-r") {
            Write-Host "[ALTA CAPACIDAD]  $($_.displayName) ($($code = $_.name; $code.Replace('models/','')))" -ForegroundColor Green
        }
    }
    Write-Host ""
    Write-Host "--- Otros Modelos Disponibles ($($response.models.Count) en total) ---" -ForegroundColor Gray
    $response.models | ForEach-Object {
        if (!($_.name -match "gemini-1.5-pro" -or $_.name -match "command-r")) {
            Write-Host "  - $($_.displayName) ($($code = $_.name; $code.Replace('models/','')))"
        }
    }
} catch {
    Write-Host "Error al consultar la API: $_" -ForegroundColor Red
}
