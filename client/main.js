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
        if (v.principal)
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
        MRP_CLIENT.displayHelpText(config.helpText1);

        if (IsControlJustPressed(1, 38)) {
            emit('mrp:clotheshop:show');
        }
    }
}, 1);