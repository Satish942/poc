$testScenarios = @(
    @{ "rps" = 50; "samplesPerMin" = 3000; "expected" = 1 },
    @{ "rps" = 150; "samplesPerMin" = 9000; "expected" = 2 },
    @{ "rps" = 300; "samplesPerMin" = 18000; "expected" = 3 },
    @{ "rps" = 500; "samplesPerMin" = 30000; "expected" = 5 }
)

$resultsFile = "C:\Users\Administrator-satish\.gemini\antigravity-ide\brain\87a46df5-bbf6-477d-9a84-6ca2e4d1393b\test_results.md"
$jmxFile = "C:\POC\stress-test-dynamic.jmx"

Set-Content $resultsFile "# HPA JMeter Load Test Results`n`n| Target RPS | Target Samples/Min | Expected Replicas | Max Replicas Reached |`n|---|---|---|---|`n"

foreach ($scenario in $testScenarios) {
    Write-Host "Starting Test: $($scenario.rps) RPS ($($scenario.samplesPerMin) samples/min)..."
    
    # Start JMeter
    $jmeterProcess = Start-Process -FilePath "jmeter.bat" -ArgumentList "-n", "-t", $jmxFile, "-Jthroughput=$($scenario.samplesPerMin)", "-l", "C:\POC\test_results_$($scenario.rps).csv" -PassThru -NoNewWindow
    
    $maxReplicas = 1
    
    # Monitor HPA while JMeter is running
    while (!$jmeterProcess.HasExited) {
        $hpaOutput = kubectl get hpa frontend-hpa -o jsonpath="{.status.currentReplicas}" 2>$null
        if ($hpaOutput -as [int]) {
            $replicas = [int]$hpaOutput
            if ($replicas -gt $maxReplicas) {
                $maxReplicas = $replicas
                Write-Host "-> Replicas scaled to $maxReplicas"
            }
        }
        Start-Sleep -Seconds 3
    }
    
    Write-Host "Test $($scenario.rps) RPS complete. Max Replicas: $maxReplicas"
    Add-Content $resultsFile "| $($scenario.rps) | $($scenario.samplesPerMin) | $($scenario.expected) | **$maxReplicas** |"
    
    # Wait for scale down stabilization (30 sec should be enough for the custom 10s window we set earlier)
    if ($scenario.rps -ne 500) {
        Write-Host "Waiting 45 seconds for stabilization window to scale down pods..."
        Start-Sleep -Seconds 45
    }
}

Write-Host "All tests completed!"
