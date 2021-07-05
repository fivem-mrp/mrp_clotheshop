MRP_CLIENT = null;

emit('mrp:getSharedObject', obj => MRP_CLIENT = obj);

while (MRP_CLIENT == null) {
    print('Waiting for shared object....');
}

configFile = LoadResourceFile(GetCurrentResourceName(), 'config/config.json');

config = JSON.parse(configFile);

if (config.showBlips) {
    for (let v of config.shops) {
        let blip = AddBlipForCoord(v.x, v.y, v.z);
        SetBlipSprite(blip, v.id);
        SetBlipScale(blip, 0.8);
        SetBlipAsShortRange(blip, true);
        SetBlipColour(blip, config.blipColor);

        BeginTextCommandSetBlipName("STRING");
        AddTextComponentString(v.name);
        EndTextCommandSetBlipName(blip);
    }
}

function nearShop() {
    let [x, y, z] = GetEntityCoords(PlayerPedId());

    for (let search of config.shops) {
        let distance = GetDistanceBetweenCoords(search.x, search.y, search.z, x, y, z, true);
        if (distance <= 2)
            return true;
    }
}

setInterval(() => {
    if (nearShop()) {
        //TODO add radial menu for changing and adding outfits
        MRP_CLIENT.displayHelpText(config.helpText1);

        if (IsControlJustPressed(1, 38)) {
            console.log(`Open shop menu`);
            emit('mrp:clotheshop:show');
        }
    }
}, 1);

on('mrp:clotheshop:show', () => {
    console.log('Opening cloth shop');

    let cfg = {
        ped: false,
        headBlend: false,
        faceFeatures: false,
        headOverlays: false,
        components: true,
        props: true
    };

    let ped = PlayerPedId();
    if (!ped) {
        console.log("No PED for player");
        return;
    }

    let appearanceBeforeChanging = exports["fivem-appearance"].getPedAppearance(ped);

    let char = MRP_CLIENT.GetPlayerData();

    if (char) {
        exports["fivem-appearance"].startPlayerCustomization(appearance => {
            if (appearance) {
                if (char.stats.cash >= config.clothPrice) {
                    emitNet('mrp:bankin:server:pay:cash', GetPlayerServerId(PlayerId()), config.clothPrice);
                    console.log('Saved and paid for');
                    console.log(JSON.stringify(appearance));
                } else {
                    console.log("Can't afford cloths");
                    emit('chat:addMessage', {
                        template: '<div class="chat-message nonemergency">{0}</div>',
                        args: [
                            config.poor
                        ]
                    });
                    exports["fivem-appearance"].setPedAppearance(ped, appearanceBeforeChanging);
                }
            } else {
                console.log('Canceled cloth shopping');
            }
        }, cfg);
    }
});