MRP_CLIENT = null;

emit('mrp:getSharedObject', obj => MRP_CLIENT = obj);

while (MRP_CLIENT == null) {
    print('Waiting for shared object....');
}

configFile = LoadResourceFile(GetCurrentResourceName(), 'config/config.json');

const config = JSON.parse(configFile);

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
        if (distance <= 5)
            return true;
    }
}

function fillRadialMenu(char) {
    if (char && char.outfits) {
        let submenu = [];
        submenu.push({
            id: 'outfits_add',
            text: config.outfitsAdd,
            action: 'https://mrp_clotheshop/outfit_add'
        });
        submenu.push({
            id: 'outfits_remove',
            text: config.outfitsRemove,
            action: 'https://mrp_clotheshop/outfit_remove'
        });
        for (let outfit of char.outfits) {
            submenu.push({
                id: outfit.name.replaceAll(" ", "_"), //replace spaces for underscore
                text: config.useOutfit + outfit.name,
                action: 'https://mrp_clotheshop/outfit_use'
            });
        }

        emit('mrp:radial_menu:addMenuItem', {
            id: 'outfits',
            text: config.outfits,
            submenu: submenu,
            action: 'https://mrp_clotheshop/outfit_add'
        });
    }
}

let menuUpdated = false;
setInterval(() => {
    if (nearShop()) {
        let char = MRP_CLIENT.GetPlayerData();
        if (!menuUpdated) {
            fillRadialMenu(char);
            menuUpdated = true;
        }

        MRP_CLIENT.displayHelpText(config.helpText1);

        if (IsControlJustPressed(1, 38)) {
            console.log(`Open shop menu`);
            emit('mrp:clotheshop:show');
        }
    } else {
        menuUpdated = false;
        emit('mrp:radial_menu:removeMenuItem', {
            id: 'outfits'
        });
    }
}, 1);

on('mrp:clotheshop:outfit_use', (data) => {
    let char = MRP_CLIENT.GetPlayerData();
    if (!char || !char.outfits)
        return;

    let appearance;
    for (let outfit of char.outfits) {
        if (outfit.name == data.id) {
            appearance = outfit.appearance;
            char.currentOutfit = outfit.name;
        }
    }

    emit('mrp:updateCharacter', char);
    emitNet('mrp:updateCharacter', GetPlayerServerId(PlayerId()), char);

    if (appearance) {
        exports["fivem-appearance"].setPedAppearance(PlayerPedId(), appearance);

        //load tattoos
        ClearPedDecorations(PlayerPedId());
        if (char.tattoos) {
            for (let v of char.tattoos) {
                if (v.Count) {
                    for (let i = 0; i < v.Count; i++) {
                        SetPedDecoration(PlayerPedId(), v.collection, v.nameHash);
                    }
                } else {
                    SetPedDecoration(PlayerPedId(), v.collection, v.nameHash);
                }
            }
        }
    }
});

RegisterNuiCallbackType('outfit_use');
on('__cfx_nui:outfit_use', (data, cb) => {
    data.id = data.id.replaceAll("_", " "); // replace underscores for spaces back

    emit("mrp:clotheshop:outfit_use", data);

    cb({});
});

RegisterNuiCallbackType('outfit_remove');
on('__cfx_nui:outfit_remove', (data, cb) => {
    data.id = data.id.replaceAll("_", " "); // replace underscores for spaces back

    emit("mrp:clotheshop:outfit_remove", data);

    cb({});
});

on('mrp:clotheshop:outfit_remove', (data) => {
    emit('mrp:popup', {
        message: '<label for="outfitName">' + config.outfitName + ':</label><input type="text" name="outfitName">',
        actions: [{
            text: config.ok,
            url: 'https://mrp_clotheshop/outfit_remove_confirm'
        }, {
            text: config.cancel,
            url: 'https://mrp_clotheshop/outfit_add_cancel'
        }]
    });
});

RegisterNuiCallbackType('outfit_add');
on('__cfx_nui:outfit_add', (data, cb) => {
    data.id = data.id.replaceAll("_", " "); // replace underscores for spaces back

    emit("mrp:clotheshop:outfit_add", data);

    cb({});
});

on('mrp:clotheshop:outfit_add', (data) => {
    emit('mrp:popup', {
        message: '<label for="outfitName">' + config.outfitName + ':</label><input type="text" name="outfitName">',
        actions: [{
            text: config.ok,
            url: 'https://mrp_clotheshop/outfit_add_confirm'
        }, {
            text: config.cancel,
            url: 'https://mrp_clotheshop/outfit_add_cancel'
        }]
    });
});

RegisterNuiCallbackType('outfit_add_confirm');
on('__cfx_nui:outfit_add_confirm', (data, cb) => {
    cb({});

    let char = MRP_CLIENT.GetPlayerData();
    let ped = PlayerPedId();
    if (!char || !data.outfitName || !ped)
        return;

    let outfitUpdate = false;
    let appearance = exports["fivem-appearance"].getPedAppearance(ped);
    for (let outfit of char.outfits) {
        if (outfit.name == data.outfitName) {
            //update outfit
            outfitUpdate = true;
            outfit.appearance = appearance;
        }
    }

    if (!outfitUpdate) {
        //add new outfit
        let outfit = {
            name: data.outfitName,
            appearance: appearance
        };

        char.outfits.push(outfit);
    }

    char.currentOutfit = data.outfitName;

    console.log(`Add outfit [${data.outfitName}]`);
    emit('mrp:updateCharacter', char);
    emitNet('mrp:updateCharacter', GetPlayerServerId(PlayerId()), char);

    fillRadialMenu(char);
});

RegisterNuiCallbackType('outfit_remove_confirm');
on('__cfx_nui:outfit_remove_confirm', (data, cb) => {
    cb({});

    let char = MRP_CLIENT.GetPlayerData();
    if (!char || !data.outfitName)
        return;

    let i = 0;
    for (let outfit of char.outfits) {
        if (outfit.name == data.outfitName) {
            console.log(`Remove outfit [${data.outfitName}]`);
            char.outfits.splice(i, 1);
            continue;
        }
        i++;
    }

    emit('mrp:updateCharacter', char);
    emitNet('mrp:updateCharacter', GetPlayerServerId(PlayerId()), char);

    fillRadialMenu(char);
});

RegisterNuiCallbackType('outfit_add_cancel');
on('__cfx_nui:outfit_add_cancel', (data, cb) => {
    cb({});
});

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