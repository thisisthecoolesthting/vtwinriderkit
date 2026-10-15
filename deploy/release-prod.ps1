$ssh='C:\Program Files\Git\usr\bin\ssh.exe'; $scp='C:\Program Files\Git\usr\bin\scp.exe'
$KA='C:\CLAUDE-UNIFIED\CREDENTIALS\.ssh\huely_deploy_20261009'; $KB='C:\CLAUDE-UNIFIED\CREDENTIALS\.ssh\prod_recovery_20260830'
$oa=@('-i',$KA,'-o','BatchMode=yes','-o','IdentitiesOnly=yes'); $ob=@('-i',$KB,'-o','BatchMode=yes','-o','IdentitiesOnly=yes')
$A='root@187.124.246.154'; $B='root@2.24.195.45'; $APP='/var/www/vtwinriderkit'; $ts=Get-Date -Format 'yyyyMMddHHmmss'
$tmp=Join-Path $env:TEMP 'vtrk_env_xfer'
& $scp @oa "${A}:$APP/shared/.env" $tmp
& $ssh @ob $B "mkdir -p $APP/releases/$ts $APP/shared/orders"
& $scp @ob $tmp "${B}:$APP/shared/.env"; Remove-Item $tmp
& $scp @ob "dist\vtwinriderkit.tgz" "${B}:$APP/releases/$ts/app.tgz"
$unit="[Unit]`nDescription=vtwinriderkit`nAfter=network.target`n[Service]`nWorkingDirectory=$APP/current`nExecStart=/usr/bin/env node server.js`nRestart=always`nUser=root`n[Install]`nWantedBy=multi-user.target`n"
$u=Join-Path $env:TEMP 'vtrk.service'; [IO.File]::WriteAllText($u,($unit -replace "`r`n","`n"),(New-Object Text.UTF8Encoding($false)))
& $scp @ob $u "${B}:/etc/systemd/system/vtwinriderkit.service"
& $ssh @ob $B "chmod 600 $APP/shared/.env; cd $APP/releases/$ts && tar -xzf app.tgz && rm app.tgz && ln -sfn $APP/shared/.env .env && rm -rf data/orders && ln -sfn $APP/shared/orders data/orders && ln -sfn $APP/releases/$ts $APP/current && systemctl daemon-reload && systemctl enable vtwinriderkit >/dev/null 2>&1; systemctl restart vtwinriderkit; sleep 3; curl -fsS http://127.0.0.1:3126/api/health"
