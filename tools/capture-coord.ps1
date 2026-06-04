# ============================================================
# capture-coord.ps1
# Captura a coordenada EXATA que o The Isle copia pro clipboard,
# pra eu (Claude) acertar o parser no formato real do jogo.
#
# COMO USAR:
#   1. Abra o The Isle e entre num jogo (ou onde apareça sua coord).
#   2. Rode este script:  powershell -ExecutionPolicy Bypass -File capture-coord.ps1
#   3. Volte ao jogo, abra o Profile (TAB) e clique em "Asset Location".
#   4. O script detecta o texto copiado, mostra na tela e salva em
#      captured-coord.txt (na mesma pasta). Me avise que eu leio.
#
# Não toca no jogo. Só lê a área de transferência do Windows. Seguro pro EAC.
# ============================================================

$ErrorActionPreference = 'Stop'
$saidaTxt = Join-Path $PSScriptRoot 'captured-coord.txt'

Write-Host ''
Write-Host '  Isle Buddy Map - Capturador de coordenada' -ForegroundColor Cyan
Write-Host '  -----------------------------------------'
Write-Host '  Aguardando voce COPIAR a coordenada no jogo...'
Write-Host '  (abra o Profile com TAB e clique em "Asset Location")'
Write-Host '  Ctrl+C para cancelar.'
Write-Host ''

$inicial = ''
try { $inicial = Get-Clipboard -Raw } catch { $inicial = '' }

while ($true) {
    Start-Sleep -Milliseconds 400
    $atual = ''
    try { $atual = Get-Clipboard -Raw } catch { continue }

    if ($atual -and $atual -ne $inicial) {
        # Salva o texto bruto (preserva formatacao exata)
        $atual | Out-File -FilePath $saidaTxt -Encoding utf8 -NoNewline

        Write-Host '=== CAPTURADO ===' -ForegroundColor Green
        Write-Host ('Texto : "{0}"' -f $atual)
        Write-Host ('Chars : {0}' -f $atual.Length)

        # Dump de diagnostico: mostra cada caractere e seu codigo,
        # pra eu ver virgulas/pontos/sinais/espacos sem ambiguidade.
        Write-Host ''
        Write-Host 'Diagnostico (char -> codigo):' -ForegroundColor DarkGray
        $linha = ''
        foreach ($ch in $atual.ToCharArray()) {
            $code = [int][char]$ch
            if ($code -eq 9)  { $vis = '\t' }
            elseif ($code -eq 10) { $vis = '\n' }
            elseif ($code -eq 13) { $vis = '\r' }
            elseif ($code -eq 32) { $vis = '(espaco)' }
            else { $vis = $ch }
            $linha += ('{0}[{1}] ' -f $vis, $code)
        }
        Write-Host $linha -ForegroundColor DarkGray

        Write-Host ''
        Write-Host ('Salvo em: {0}' -f $saidaTxt) -ForegroundColor Green
        Write-Host 'Pronto! Pode me avisar que eu leio o arquivo.'
        break
    }
}
