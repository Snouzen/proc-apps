$p = "c:\Procurement Apps\proc-apps\src\app\retur\page.tsx"
$c = [System.IO.File]::ReadAllText($p)
$idx1 = $c.IndexOf("REFERENSI PEMBAYARAN")
$idx2 = $c.IndexOf("const isEditing = editingId === item.id;")

if ($idx1 -ge 0 -and $idx2 -gt $idx1) {
    $r = "REFERENSI PEMBAYARAN</th>`r`n                    <th className=`"px-6 py-5`">TANGGAL PEMBAYARAN</th>`r`n                    <th className=`"px-6 py-5`">REMARKS</th>`r`n                    <th className=`"px-6 py-5`">SDI RETUR</th>`r`n                    <th className=`"sticky right-0 z-20 bg-slate-50/95 backdrop-blur px-6 py-5 text-right border-l border-slate-100`">AKSI</th>`r`n                  </tr>`r`n                </thead>`r`n                <tbody className={`divide-y divide-slate-50 transition-all duration-300 ${isFetchingPage ? `"opacity-50 pointer-events-none scale-[0.998]`" : `"opacity-100`"}`}>`r`n                  {paginatedData.map((item, idx) => {`r`n                    const isEditing = editingId === item.id;"
    
    $c_new = $c.Substring(0, $idx1) + $r + $c.Substring($idx2 + 40)
    [System.IO.File]::WriteAllText($p, $c_new)
    Write-Output "Successfully repaired retur/page.tsx"
} else {
    Write-Output "Search markers not found or in wrong order: idx1=$idx1, idx2=$idx2"
}
