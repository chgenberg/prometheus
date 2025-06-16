(function(){
    let curVer = null;

    async function fetchVersion(){
        try{
            const resp = await fetch('/version.txt', {cache: 'no-store'});
            return (await resp.text()).trim();
        }catch(_){ return null; }
    }

    async function init(){
        curVer = await fetchVersion();
        if(!curVer) return;
        setInterval(async ()=>{
            const latest = await fetchVersion();
            if(latest && latest !== curVer){
                console.log('Ny deploy upptäckt – laddar om.');
                location.reload(true);
            }
        }, 30000);
    }

    init();
})(); 