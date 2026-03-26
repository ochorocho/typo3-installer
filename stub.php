<?php

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
@set_time_limit(0);

if (PHP_SAPI === 'cli') {
    echo "TYPO3 Installer\n";
    echo "===============\n\n";
    echo "Please access this installer via your web browser.\n";
    echo "Example: http://your-domain.com/typo3-installer.phar\n\n";
    exit(0);
}

// Check Phar extension availability
if (!class_exists('Phar')) {
    header('Content-Type: application/json', true, 500);
    echo json_encode([
        'error' => true,
        'message' => "PHP's phar extension is missing. The TYPO3 Installer requires it to run.",
        'details' => 'Enable the phar extension in your PHP configuration or contact your hosting provider.',
    ], JSON_PRETTY_PRINT);
    exit(1);
}

// Pre-flight integrity check: verify PHAR end-of-file magic bytes (GBMB = 0x47424D42)
$fileSize = @filesize(__FILE__);
$integrityError = null;
if ($fileSize !== false && $fileSize > 8) {
    $fh = @fopen(__FILE__, 'rb');
    if ($fh !== false) {
        fseek($fh, -4, SEEK_END);
        $magic = fread($fh, 4);
        fclose($fh);
        if ($magic !== "GBMB") {
            $integrityError = 'truncated';
        }
    }
}

if ($integrityError === 'truncated') {
    header('Content-Type: text/html; charset=UTF-8', true, 500);
    echo renderIntegrityErrorPage(
        'Incomplete File',
        'The installer file appears to be truncated or incomplete.',
        'The upload may have been interrupted before it finished.',
        $fileSize
    );
    exit(1);
}

try {
    Phar::mapPhar('typo3-installer.php');
    require 'phar://typo3-installer.php/src/bootstrap.php';
} catch (\Throwable $e) {
    $isSignatureError = stripos($e->getMessage(), 'signature') !== false;

    if ($isSignatureError) {
        header('Content-Type: text/html; charset=UTF-8', true, 500);
        echo renderIntegrityErrorPage(
            'File Integrity Error',
            'The installer file\'s digital signature does not match its contents. '
                . 'The file was modified or corrupted during upload.',
            'FTP transfers in <strong>ASCII/text mode</strong> alter line endings in binary files, '
                . 'breaking the signature. This is the most common cause on shared hosting.',
            $fileSize,
            $e->getMessage()
        );
        exit(1);
    }

    // Non-signature errors: return JSON for diagnostics
    $diagnostics = [
        'phar_stream_registered' => in_array('phar', stream_get_wrappers(), true),
        'open_basedir' => ini_get('open_basedir') ?: '(none)',
        'phar_readonly' => ini_get('phar.readonly'),
        'file_path' => __FILE__,
        'file_readable' => is_readable(__FILE__),
        'file_size' => $fileSize,
    ];

    header('Content-Type: application/json', true, 500);
    echo json_encode([
        'error' => true,
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString(),
        'diagnostics' => $diagnostics,
    ], JSON_PRETTY_PRINT);
    exit(1);
}

/**
 * Render a self-contained HTML error page for PHAR integrity failures.
 * Must be defined in the stub because the PHAR contents are not loadable.
 */
function renderIntegrityErrorPage(
    string $title,
    string $description,
    string $cause,
    int|false $fileSize,
    ?string $technicalDetail = null,
): string {
    $sizeInfo = $fileSize !== false
        ? number_format($fileSize) . ' bytes'
        : 'unknown';

    $technicalHtml = '';
    if ($technicalDetail !== null) {
        $detail = htmlspecialchars($technicalDetail, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $technicalHtml = <<<HTML
            <details style="margin-top:1.5rem">
                <summary style="cursor:pointer;color:#555;font-size:0.9rem">Technical details</summary>
                <pre style="margin-top:0.5rem;padding:0.75rem;background:#f5f5f5;border-radius:4px;
                    font-size:0.85rem;overflow-x:auto;white-space:pre-wrap;word-break:break-word">{$detail}</pre>
            </details>
        HTML;
    }

    return <<<HTML
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TYPO3 Installer — {$title}</title>
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
                background:#f8f9fa;color:#333;line-height:1.6;padding:2rem}
            .container{max-width:640px;margin:3rem auto;background:#fff;border-radius:8px;
                box-shadow:0 2px 12px rgba(0,0,0,.08);padding:2.5rem}
            h1{color:#c0392b;font-size:1.5rem;margin-bottom:0.25rem}
            .subtitle{color:#555;font-size:0.95rem;margin-bottom:1.5rem}
            .section{margin-bottom:1.25rem}
            .section h2{font-size:1rem;color:#333;margin-bottom:0.25rem}
            .section p{color:#555;font-size:0.95rem}
            .fix-list{margin:0.5rem 0 0 1.25rem;color:#555;font-size:0.95rem}
            .fix-list li{margin-bottom:0.35rem}
            .fix-list code{background:#f0f0f0;padding:0.15rem 0.4rem;border-radius:3px;font-size:0.9em}
            .file-info{margin-top:1.5rem;padding:0.75rem 1rem;background:#fff3cd;border:1px solid #ffc107;
                border-radius:4px;font-size:0.9rem;color:#856404}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>{$title}</h1>
            <p class="subtitle">{$description}</p>

            <div class="section">
                <h2>Likely cause</h2>
                <p>{$cause}</p>
            </div>

            <div class="section">
                <h2>How to fix</h2>
                <ul class="fix-list">
                    <li>Re-upload the file using <strong>SFTP</strong> instead of FTP</li>
                    <li>Or set your FTP client to <strong>binary transfer mode</strong> before uploading</li>
                    <li>In FileZilla: <em>Transfer &gt; Transfer Type &gt; Binary</em></li>
                    <li>Verify the uploaded file size matches the original</li>
                </ul>
            </div>

            <div class="file-info">
                File size on server: <strong>{$sizeInfo}</strong>
                — compare this with the original file on your computer.
            </div>
            {$technicalHtml}
        </div>
    </body>
    </html>
    HTML;
}

__HALT_COMPILER();
