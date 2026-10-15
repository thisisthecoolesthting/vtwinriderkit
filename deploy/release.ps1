# Uploads dist/vtwinriderkit.tgz to the VPS and (re)starts the pm2 app. Run on the local machine (builds never happen on the VPS).
# First run also writes /var/www/vtwinriderkit/shared/.env from a local env file (path in $env:VTRK_ENV_SRC); secrets are never printed.
param([string]$Domain = 'vtwinriderkit.org')
$K = 'C:\CLAUDE-UNIFIED\CREDENTIALS\.ssh\huely_deploy_20261009'; $H = 'root@187.124.246.154'
$o = @('-i', $K, '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes'); $ssh = 'C:\Program Files\Git\usr\bin\ssh.exe'; $scp = 'C:\Program Files\Git\usr\bin\scp.exe'
$root = Split-Path $PSScriptRoot; $ts = Get-Date -Format 'yyyyMMddHHmmss'; $APP = '/var/www/vtwinriderkit'
& $ssh @o $H "mkdir -p $APP/releases/$ts $APP/shared/orders"
& $scp @o "$root\dist\vtwinriderkit.tgz" "${H}:$APP/releases/$ts/app.tgz"
$has = & $ssh @o $H "test -f $APP/shared/.env && echo yes || echo no"
if ($has -eq 'no') {
  $src = $env:VTRK_ENV_SRC; if (-not $src) { throw 'set VTRK_ENV_SRC to an env file holding PRINTIFY_API_TOKEN, PRINTIFY_SHOP_ID, STRIPE_SECRET_KEY' }
  $keep = Get-Content $src | Where-Object { $_ -match '^(PRINTIFY_API_TOKEN|PRINTIFY_SHOP_ID|STRIPE_SECRET_KEY)=' }
  $extra = @('PORT=3126', "SITE_URL=https://$Domain", 'PRINTIFY_AUTO_SUBMIT=1', "CONTACT_EMAIL=hello@$Domain", 'BRAND_NAME=V-Twin Rider Kit', "DATA_DIR=$APP/shared")
  $tmp = Join-Path $env:TEMP 'vtrk.env'; [IO.File]::WriteAllText($tmp, (($keep + $extra) -join "`n") + "`n", (New-Object Text.UTF8Encoding($false)))
  & $scp @o $tmp "${H}:$APP/shared/.env"; Remove-Item $tmp; & $ssh @o $H "chmod 600 $APP/shared/.env"
}
$cmd = "cd $APP/releases/$ts && tar -xzf app.tgz && rm app.tgz && ln -sfn $APP/shared/.env .env && rm -rf data/orders && ln -sfn $APP/shared/orders data/orders && ln -sfn $APP/releases/$ts $APP/current && cd $APP/current && (pm2 describe vtwinriderkit >/dev/null 2>&1 && pm2 restart vtwinriderkit --update-env || pm2 start server.js --name vtwinriderkit --cwd $APP/current) && pm2 save >/dev/null && sleep 2 && curl -fsS http://127.0.0.1:3126/api/health"
& $ssh @o $H $cmd
